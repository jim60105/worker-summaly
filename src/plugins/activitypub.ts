import type Summary from '@/summary.js';
import { decode as decodeHtml } from 'html-entities';
import { clip } from '@/utils/clip.js';

export const name = 'activitypub';

// API timeout constant
const API_TIMEOUT = 3000;

/**
 * ActivityPub Object types we support
 */
const SUPPORTED_TYPES = ['Note', 'Article', 'Page', 'Video', 'Image', 'Audio'];

/**
 * ActivityPub Actor response
 */
interface ActivityPubActor {
	id: string;
	type: string;
	name?: string;
	preferredUsername?: string;
	icon?: {
		type: string;
		url: string;
	} | string;
	image?: {
		type: string;
		url: string;
	} | string;
}

/**
 * ActivityPub Object response (Note, Article, etc.)
 */
interface ActivityPubObject {
	id: string;
	type: string;
	attributedTo?: string | ActivityPubActor;
	content?: string;
	summary?: string; // Content Warning text
	name?: string; // Title for Article/Page types
	url?: string | string[];
	published?: string;
	attachment?: Array<{
		type: string;
		mediaType?: string;
		url: string;
		name?: string;
	}>;
	image?: {
		type: string;
		url: string;
	} | string;
	sensitive?: boolean;
}

/**
 * ActivityPub Activity wrapper (Create, Announce, etc.)
 */
interface ActivityPubActivity {
	type: string;
	object?: ActivityPubObject | string;
}

export function test(url: URL): boolean {
	// This plugin handles any URL that returns ActivityPub content
	// We rely on the Accept header to get ActivityPub data
	// Only match common Fediverse URL patterns
	const patterns = [
		// Mastodon: /@user/123456789
		/^\/@[^/]+\/\d+$/,
		// Mastodon: /users/user/statuses/123456789
		/^\/users\/[^/]+\/statuses\/\d+$/,
		// Pleroma/Akkoma: /notice/abc123
		/^\/notice\/[a-zA-Z0-9]+$/,
		// Pleroma/Akkoma: /objects/uuid
		/^\/objects\/[a-f0-9-]+$/,
		// GoToSocial: /@user/statuses/abc123
		/^\/@[^/]+\/statuses\/[a-zA-Z0-9]+$/,
		// Lemmy: /post/123
		/^\/post\/\d+$/,
		// Lemmy: /comment/123
		/^\/comment\/\d+$/,
		// PeerTube: /videos/watch/uuid
		/^\/videos\/watch\/[a-f0-9-]+$/,
		// PixelFed: /p/user/123
		/^\/p\/[^/]+\/\d+$/,
		// Friendica: /display/guid
		/^\/display\/[a-zA-Z0-9-]+$/,
		// Hubzilla: /item/guid
		/^\/item\/[a-zA-Z0-9-]+$/,
	];

	return patterns.some(pattern => pattern.test(url.pathname));
}

export async function summarize(url: URL): Promise<Summary | null> {
	try {
		// Fetch ActivityPub data with appropriate Accept header
		const response = await fetch(url.href, {
			headers: {
				'Accept': 'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
			},
			signal: AbortSignal.timeout(API_TIMEOUT),
		});

		if (!response.ok) {
			console.warn({
				event: 'plugin_api_error',
				plugin: 'activitypub',
				url: url.href,
				status: response.status,
			});
			return null;
		}

		// Check if response is JSON
		const contentType = response.headers.get('content-type');
		if (!contentType?.includes('json')) {
			console.debug({
				event: 'plugin_content_type_mismatch',
				plugin: 'activitypub',
				url: url.href,
				contentType,
			});
			return null;
		}

		const data = await response.json() as ActivityPubActivity | ActivityPubObject;

		// Handle Activity wrapper (e.g., Create { object: Note })
		let object: ActivityPubObject;
		if ('object' in data && data.object && typeof data.object !== 'string') {
			object = data.object;
		} else if ('type' in data && SUPPORTED_TYPES.includes(data.type)) {
			object = data as ActivityPubObject;
		} else {
			console.debug({
				event: 'plugin_unsupported_type',
				plugin: 'activitypub',
				url: url.href,
				type: data.type,
			});
			return null;
		}

		// Verify we have a supported type
		if (!SUPPORTED_TYPES.includes(object.type)) {
			console.debug({
				event: 'plugin_unsupported_object_type',
				plugin: 'activitypub',
				url: url.href,
				type: object.type,
			});
			return null;
		}

		return await buildSummary(object, url);
	} catch (error) {
		console.error({
			event: 'plugin_error',
			plugin: 'activitypub',
			url: url.href,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

async function buildSummary(object: ActivityPubObject, url: URL): Promise<Summary> {
	const domain = url.hostname;

	// Get actor information
	let actor: ActivityPubActor | null = null;
	if (object.attributedTo) {
		actor = await fetchActor(object.attributedTo);
	}

	// Build title from actor name
	const title = buildTitle(actor);

	// Build description from content
	const description = buildDescription(object);

	// Get thumbnail from attachments or image
	const thumbnail = getThumbnail(object);

	// Get actor icon
	const icon = getActorIcon(actor, domain);

	// Build fediverse creator handle
	const fediverseCreator = buildFediverseCreator(actor);

	return {
		title,
		icon,
		description,
		thumbnail,
		sitename: domain,
		sensitive: object.sensitive ?? !!object.summary,
		player: { url: null, width: null, height: null, allow: [] },
		activityPub: object.id || url.href,
		fediverseCreator,
	};
}

async function fetchActor(attributedTo: string | ActivityPubActor): Promise<ActivityPubActor | null> {
	// If already an object, return it
	if (typeof attributedTo !== 'string') {
		return attributedTo;
	}

	try {
		const response = await fetch(attributedTo, {
			headers: {
				'Accept': 'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
			},
			signal: AbortSignal.timeout(API_TIMEOUT),
		});

		if (!response.ok) {
			console.warn({
				event: 'plugin_actor_fetch_error',
				plugin: 'activitypub',
				actorUrl: attributedTo,
				status: response.status,
			});
			return null;
		}

		return await response.json() as ActivityPubActor;
	} catch (error) {
		console.warn({
			event: 'plugin_actor_fetch_error',
			plugin: 'activitypub',
			actorUrl: attributedTo,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

function buildTitle(actor: ActivityPubActor | null): string | null {
	if (!actor) return null;

	const name = actor.name || actor.preferredUsername;
	if (!name) return null;

	return name;
}

function buildDescription(object: ActivityPubObject): string | null {
	// For Article/Page, use name as primary, content as secondary
	let text = '';

	// Add summary (CW) if present
	if (object.summary) {
		text += object.summary + ' | ';
	}

	// Add content
	if (object.content) {
		// Strip HTML tags from content
		text += htmlToText(object.content);
	} else if (object.name && object.type !== 'Note') {
		// Use name for non-Note types (Article, etc.)
		text += object.name;
	}

	if (!text) return null;

	return clip(text, 300);
}

function htmlToText(html: string): string {
	if (!html) return '';

	// Decode HTML entities
	let text = decodeHtml(html);

	// Replace <br> tags with newlines
	text = text.replace(/<br\s*\/?>/gi, '\n');

	// Replace </p><p> with newlines
	text = text.replace(/<\/p>\s*<p[^>]*>/gi, '\n');

	// Remove all remaining HTML tags
	text = text.replace(/<[^>]*>/g, '');

	// Normalize whitespace
	text = text.replace(/\s+/g, ' ').trim();

	return text;
}

function getThumbnail(object: ActivityPubObject): string | null {
	// Check attachments for images
	if (object.attachment && object.attachment.length > 0) {
		const imageAttachment = object.attachment.find(att =>
			att.mediaType?.startsWith('image/') ||
			att.type === 'Image' ||
			(att.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(att.url)),
		);
		if (imageAttachment) {
			return imageAttachment.url;
		}
	}

	// Check image property
	if (object.image) {
		if (typeof object.image === 'string') {
			return object.image;
		}
		return object.image.url;
	}

	return null;
}

function getActorIcon(actor: ActivityPubActor | null, domain: string): string {
	if (!actor) {
		return `https://${domain}/favicon.ico`;
	}

	if (actor.icon) {
		if (typeof actor.icon === 'string') {
			return actor.icon;
		}
		return actor.icon.url;
	}

	return `https://${domain}/favicon.ico`;
}

function buildFediverseCreator(actor: ActivityPubActor | null): string | null {
	if (!actor) return null;

	const username = actor.preferredUsername;
	if (!username) return null;

	// Extract domain from actor id
	try {
		const actorUrl = new URL(actor.id);
		return `@${username}@${actorUrl.hostname}`;
	} catch {
		return null;
	}
}
