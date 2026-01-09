import type Summary from '@/summary.js';
import { clip } from '@/utils/clip.js';

export const name = 'bilibili';

/**
 * Bilibili plugin - Extracts video and dynamic (opus) metadata using Bilibili API
 * Reference: https://github.com/cubewhy/fxbilibili/blob/main/src/services/bilibili.rs
 */

const BILIBILI_API_HEADERS = {
	Accept: 'application/json, text/plain, */*',
	'Accept-Language': 'zh-TW,zh;q=0.8,en-US;q=0.5,en;q=0.3',
	Referer: 'https://www.bilibili.com/',
	Origin: 'https://www.bilibili.com',
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
};

// Video API response types (from fxbilibili reference)
interface BilibiliVideoApiResponse {
	code: number;
	message: string;
	data?: {
		bvid: string;
		aid: number;
		pic: string;
		title: string;
		pubdate: number;
		desc: string | null;
		duration: number;
		owner: {
			mid: number;
			name: string;
			face: string;
		};
		dimension?: {
			width: number;
			height: number;
		};
	};
}

// Dynamic (opus) API response types
interface BilibiliDynamicResponse {
	code: number;
	data?: {
		item: {
			type: 'DYNAMIC_TYPE_DRAW' | 'DYNAMIC_TYPE_ARTICLE' | 'DYNAMIC_TYPE_WORD';
			modules: {
				module_author: {
					mid: number;
					name: string;
					face: string;
				};
				module_dynamic: {
					desc?: {
						text: string;
					};
					major?: {
						draw?: {
							items: Array<{ src: string }>;
						};
						article?: {
							title: string;
							covers?: string[];
						};
					};
				};
			};
		};
	};
}

// Video ID type (BV or AV)
type VideoId =
	| { type: 'bv'; id: string }
	| { type: 'av'; id: number };

export function test(url: URL): boolean {
	if (url.hostname !== 'www.bilibili.com' && url.hostname !== 'bilibili.com') {
		return false;
	}
	// Match video pages: /video/BV*, /video/av*
	// Match dynamic pages: /opus/{dynamic_id}
	return /^\/video\/(BV[A-Za-z0-9]+|av\d+)/i.test(url.pathname) ||
		/^\/opus\/\d+$/.test(url.pathname);
}

export async function summarize(url: URL): Promise<Summary | null> {
	// Try video URL first
	const videoId = parseVideoId(url);
	if (videoId) {
		return summarizeVideo(videoId);
	}

	// Try dynamic (opus) URL
	const dynamicMatch = url.pathname.match(/^\/opus\/(\d+)$/);
	if (dynamicMatch) {
		return summarizeDynamic(dynamicMatch[1]);
	}

	return null;
}

/**
 * Parse video ID from URL (supports both BV and AV formats)
 */
function parseVideoId(url: URL): VideoId | null {
	// Match BV ID: /video/BV1xxx or /video/bv1xxx
	const bvMatch = url.pathname.match(/^\/video\/(BV[A-Za-z0-9]+)/i);
	if (bvMatch) {
		return { type: 'bv', id: bvMatch[1] };
	}

	// Match AV ID: /video/av12345 or /video/AV12345
	const avMatch = url.pathname.match(/^\/video\/av(\d+)/i);
	if (avMatch) {
		return { type: 'av', id: parseInt(avMatch[1], 10) };
	}

	return null;
}

/**
 * Summarize video using Bilibili web-interface API
 * API endpoint: https://api.bilibili.com/x/web-interface/wbi/view
 */
async function summarizeVideo(videoId: VideoId): Promise<Summary | null> {
	try {
		// Build query parameter based on video ID type
		const queryParam = videoId.type === 'bv'
			? `bvid=${videoId.id}`
			: `aid=${videoId.id}`;

		const response = await fetch(
			`https://api.bilibili.com/x/web-interface/wbi/view?${queryParam}`,
			{
				headers: BILIBILI_API_HEADERS,
				signal: AbortSignal.timeout(5000),
			},
		);

		if (!response.ok) {
			console.warn({
				event: 'plugin_api_error',
				plugin: 'bilibili',
				videoId,
				status: response.status,
			});
			return null;
		}

		const data = (await response.json()) as BilibiliVideoApiResponse;

		if (data.code !== 0 || !data.data) {
			console.warn({
				event: 'plugin_api_error',
				plugin: 'bilibili',
				videoId,
				apiCode: data.code,
				message: data.message,
			});
			return null;
		}

		return buildVideoSummary(data.data);
	} catch (error) {
		console.error({
			event: 'plugin_error',
			plugin: 'bilibili',
			type: 'video',
			videoId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Summarize dynamic (opus) content
 */
async function summarizeDynamic(dynamicId: string): Promise<Summary | null> {
	try {
		const response = await fetch(
			`https://api.bilibili.com/x/polymer/web-dynamic/v1/detail?id=${dynamicId}`,
			{
				headers: BILIBILI_API_HEADERS,
				signal: AbortSignal.timeout(5000),
			},
		);

		if (!response.ok) {
			console.warn({
				event: 'plugin_api_error',
				plugin: 'bilibili',
				dynamicId,
				status: response.status,
			});
			return null;
		}

		const data = (await response.json()) as BilibiliDynamicResponse;

		if (data.code !== 0 || !data.data) {
			console.warn({
				event: 'plugin_api_error',
				plugin: 'bilibili',
				dynamicId,
				apiCode: data.code,
			});
			return null;
		}

		return buildDynamicSummary(data.data.item);
	} catch (error) {
		console.error({
			event: 'plugin_error',
			plugin: 'bilibili',
			type: 'dynamic',
			dynamicId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Build summary from video API response
 */
function buildVideoSummary(video: NonNullable<BilibiliVideoApiResponse['data']>): Summary {
	return {
		title: video.title,
		icon: video.owner.face || 'https://www.bilibili.com/favicon.ico',
		description: video.desc ? clip(video.desc, 300) : null,
		thumbnail: video.pic || null,
		sitename: 'Bilibili',
		player: {
			url: `https://player.bilibili.com/player.html?bvid=${video.bvid}&autoplay=0`,
			width: video.dimension?.width || 1920,
			height: video.dimension?.height || 1080,
			allow: ['autoplay', 'encrypted-media', 'fullscreen'],
		},
		sensitive: false,
		activityPub: null,
		fediverseCreator: null,
	};
}

/**
 * Build summary from dynamic (opus) API response
 */
function buildDynamicSummary(item: NonNullable<BilibiliDynamicResponse['data']>['item']): Summary {
	const author = item.modules.module_author;
	const dynamic = item.modules.module_dynamic;

	let description: string | null = null;
	let thumbnail: string | null = null;

	switch (item.type) {
		case 'DYNAMIC_TYPE_DRAW':
			description = dynamic.desc?.text || null;
			thumbnail = dynamic.major?.draw?.items[0]?.src || null;
			break;
		case 'DYNAMIC_TYPE_ARTICLE':
			description = dynamic.major?.article?.title || null;
			thumbnail = dynamic.major?.article?.covers?.[0] || null;
			break;
		case 'DYNAMIC_TYPE_WORD':
			description = dynamic.desc?.text || null;
			break;
	}

	return {
		title: author.name,
		icon: author.face || 'https://www.bilibili.com/favicon.ico',
		description: description ? clip(description, 300) : null,
		thumbnail,
		sitename: 'Bilibili',
		player: { url: null, width: null, height: null, allow: [] },
		sensitive: false,
		activityPub: null,
		fediverseCreator: null,
	};
}
