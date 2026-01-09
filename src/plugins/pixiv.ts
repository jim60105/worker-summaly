import * as cheerio from 'cheerio';
import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { get } from '@/utils/fetch.js';
import { clip } from '@/utils/clip.js';

export const name = 'pixiv';

/**
 * Pixiv plugin - Extracts artwork metadata using Pixiv Ajax API
 * Works without authentication for public artworks
 */

// API response type definitions
interface PixivAjaxResponse {
	error: boolean;
	message: string;
	body?: {
		title: string;
		description: string;
		userName: string;
		userId: string;
		bookmarkCount: number;
		pageCount: number;
		xRestrict?: number; // 0=SFW, 1=R-18, 2=R-18G
		tags: {
			tags: Array<{
				tag: string;
				translation?: {
					en?: string;
				};
			}>;
		};
		urls?: {
			thumb?: string;
			small?: string;
			regular?: string;
			original?: string;
		};
		userIllusts?: {
			[key: string]: {
				url?: string;
			};
		};
		extraData?: {
			meta?: {
				twitter?: {
					description?: string;
				};
			};
		};
	};
}

// Proxy service for accessing Pixiv images (which have referrer checks)
const PROXY_SERVICE = 'pximg.cocomi.eu.org';

/**
 * Test if URL is a Pixiv artwork page
 */
export function test(url: URL): boolean {
	if (url.hostname !== 'www.pixiv.net') return false;
	// Match /artworks/{id} and /en/artworks/{id}
	return /^\/(en\/)?artworks\/\d+$/.test(url.pathname);
}

/**
 * Summarize Pixiv artwork using Ajax API
 */
export async function summarize(url: URL, _opts?: GeneralScrapingOptions): Promise<Summary | null> {
	// Parse artwork ID from URL
	const match = url.pathname.match(/artworks\/(\d+)/);
	if (!match) return null;

	const artworkId = match[1];

	try {
		const response = await get(`https://www.pixiv.net/ajax/illust/${artworkId}`);
		const data = JSON.parse(response) as PixivAjaxResponse;

		if (data.error || !data.body) {
			console.warn({
				event: 'plugin_api_error',
				plugin: 'pixiv',
				artworkId,
				apiError: data.error,
				message: data.message,
			});
			return null;
		}

		return buildSummary(data.body, artworkId, url);
	} catch (error) {
		console.error({
			event: 'plugin_error',
			plugin: 'pixiv',
			artworkId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Build Summary object from API response
 */
function buildSummary(body: NonNullable<PixivAjaxResponse['body']>, artworkId: string, _url: URL): Summary {
	// Get description: prefer Twitter description, fallback to regular description
	let description = body.extraData?.meta?.twitter?.description || body.description;
	if (description) {
		// Safely extract text from HTML using cheerio
		const $ = cheerio.load(description);
		description = $.text();
		description = clip(description, 300);
	}

	// Get proxied thumbnail URL
	const thumbnail = getProxiedThumbnail(body, artworkId);

	// Extract first 5 tags
	const tags = body.tags.tags
		.slice(0, 5)
		.map(t => t.tag)
		.join(', ');

	// Combine description with metadata
	const fullDescription = [
		description,
		`作者: ${body.userName}`,
		`收藏: ${body.bookmarkCount}`,
		tags ? `標籤: ${tags}` : null,
	].filter(Boolean).join('\n');

	// xRestrict: 0=SFW, 1=R-18, 2=R-18G
	const sensitive = (body.xRestrict ?? 0) > 0;

	return {
		title: body.title,
		icon: 'https://www.pixiv.net/favicon.ico',
		description: clip(fullDescription, 300),
		thumbnail,
		sitename: 'Pixiv',
		sensitive,
		player: { url: null, width: null, height: null, allow: [] },
		activityPub: null,
		fediverseCreator: null,
	};
}

/**
 * Get thumbnail URL with proxy service to bypass referrer checks
 */
function getProxiedThumbnail(body: NonNullable<PixivAjaxResponse['body']>, artworkId: string): string | null {
	// Prefer regular size
	let imageUrl = body.urls?.regular;

	if (!imageUrl) {
		// Fallback: try to get from userIllusts
		const illustData = body.userIllusts?.[artworkId];
		if (illustData?.url) {
			// userIllusts URL format is different, need to convert
			const urlMatch = illustData.url.match(/\/img\/.*p0/);
			if (urlMatch) {
				imageUrl = `https://i.pximg.net/img-master${urlMatch[0]}_master1200.jpg`;
			}
		}
	}

	if (!imageUrl) return null;

	// Replace i.pximg.net with proxy service
	return imageUrl.replace('i.pximg.net', PROXY_SERVICE);
}
