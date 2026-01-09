import type Summary from '@/summary.js';
import { DEFAULT_BOT_UA } from '@/utils/fetch.js';
import { clip } from '@/utils/clip.js';

export const name = 'bluesky';

// API timeout constants
const BSKX_API_TIMEOUT = 2500;
const OFFICIAL_API_TIMEOUT = 2000;

export function test(url: URL): boolean {
	if (url.hostname !== 'bsky.app') return false;
	return /^\/profile\/[a-zA-Z0-9.-]+\/post\/[a-zA-Z0-9]+$/.test(url.pathname);
}

export async function summarize(url: URL): Promise<Summary | null> {
	// 1. Parse handle and post_id from URL
	const pathMatch = url.pathname.match(/^\/profile\/([a-zA-Z0-9.-]+)\/post\/([a-zA-Z0-9]+)$/);
	if (!pathMatch) return null;

	const [, handle, postId] = pathMatch;

	// 2. Try bskx.app API first
	try {
		const bskxData = await fetchBskx(handle, postId);
		if (bskxData) {
			return buildSummary(bskxData, handle);
		}
	} catch (error) {
		console.warn({
			event: 'plugin_api_error',
			plugin: 'bluesky',
			api: 'bskx',
			handle,
			postId,
			error: error instanceof Error ? error.message : String(error),
			action: 'trying_official_api_fallback',
		});
	}

	// 3. Fallback: Use official Bluesky API
	try {
		const officialData = await fetchOfficialApi(handle, postId);
		if (officialData) {
			return buildSummary(officialData, handle);
		}
	} catch (error) {
		console.error({
			event: 'plugin_all_apis_failed',
			plugin: 'bluesky',
			handle,
			postId,
			error: error instanceof Error ? error.message : String(error),
		});
	}

	return null;
}

// Type definitions
interface PostData {
	authorAvatar: string | null;
	authorName: string;
	text: string | null;
	replyCount: number;
	repostCount: number;
	likeCount: number;
	thumbnail: string | null;
	sensitive: boolean;
}

// Labels that indicate sensitive content on Bluesky
const SENSITIVE_LABELS = ['nsfw', 'porn', 'nudity', 'sexual', 'graphic-media'];

interface BskxResponse {
	posts: Array<{
		author?: {
			avatar?: string;
			displayName?: string;
		};
		record?: {
			text?: string;
		};
		replyCount?: number;
		repostCount?: number;
		likeCount?: number;
		labels?: Array<{ val: string }>;
		embed?: {
			$type: string;
			thumbnail?: string;
			images?: Array<{
				fullsize: string;
				thumb?: string;
			}>;
		};
	}>;
}

interface BlueskyThreadResponse {
	thread: {
		post: {
			author: {
				avatar?: string;
				displayName?: string;
			};
			record: {
				text?: string;
			};
			replyCount: number;
			repostCount: number;
			likeCount: number;
			labels?: Array<{ val: string }>;
			embed?: {
				$type: string;
				images?: Array<{ fullsize: string }>;
			};
		};
	};
}

async function fetchBskx(handle: string, postId: string): Promise<PostData | null> {
	const response = await fetch(
		`https://bskx.app/profile/${handle}/post/${postId}/json`,
		{
			headers: {
				'User-Agent': DEFAULT_BOT_UA,
			},
			signal: AbortSignal.timeout(BSKX_API_TIMEOUT),
		},
	);

	if (!response.ok) return null;

	const data = await response.json() as BskxResponse;

	if (data.posts.length === 0) return null;

	const post = data.posts[0];

	// Check if any label indicates sensitive content
	const sensitive = post.labels?.some(label => SENSITIVE_LABELS.includes(label.val)) ?? false;

	return {
		authorAvatar: post.author?.avatar ?? null,
		authorName: post.author?.displayName ?? handle,
		text: post.record?.text ?? null,
		replyCount: post.replyCount ?? 0,
		repostCount: post.repostCount ?? 0,
		likeCount: post.likeCount ?? 0,
		thumbnail: extractThumbnail(post.embed),
		sensitive,
	};
}

function extractThumbnail(embed?: BskxResponse['posts'][0]['embed']): string | null {
	if (!embed) return null;

	if (embed.$type === 'app.bsky.embed.video#view') {
		return embed.thumbnail ?? null;
	}

	if (embed.$type === 'app.bsky.embed.images#view' && embed.images && embed.images[0]) {
		return embed.images[0].fullsize;
	}

	return null;
}

async function fetchOfficialApi(handle: string, postId: string): Promise<PostData | null> {
	// Step 1: Resolve handle to DID
	const didResponse = await fetch(
		`https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`,
		{ signal: AbortSignal.timeout(OFFICIAL_API_TIMEOUT) },
	);

	if (!didResponse.ok) return null;

	const didData = await didResponse.json() as { did: string };

	// Step 2: Get post thread
	const threadResponse = await fetch(
		`https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://${didData.did}/app.bsky.feed.post/${postId}`,
		{ signal: AbortSignal.timeout(OFFICIAL_API_TIMEOUT) },
	);

	if (!threadResponse.ok) return null;

	const threadData = await threadResponse.json() as BlueskyThreadResponse;
	const post = threadData.thread.post;

	// Check if any label indicates sensitive content
	const sensitive = post.labels?.some(label => SENSITIVE_LABELS.includes(label.val)) ?? false;

	return {
		authorAvatar: post.author.avatar ?? null,
		authorName: post.author.displayName ?? handle,
		text: post.record.text ?? null,
		replyCount: post.replyCount,
		repostCount: post.repostCount,
		likeCount: post.likeCount,
		thumbnail: post.embed?.images?.[0]?.fullsize ?? null,
		sensitive,
	};
}

function buildSummary(data: PostData, handle: string): Summary {
	return {
		title: data.authorName,
		icon: data.authorAvatar ?? 'https://bsky.app/static/favicon-32x32.png',
		description: data.text ? clip(data.text, 300) : null,
		thumbnail: data.thumbnail,
		sitename: 'Bluesky',
		sensitive: data.sensitive,
		player: { url: null, width: null, height: null, allow: [] },
		activityPub: null,
		fediverseCreator: `@${handle}`,
	};
}
