import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { general } from '@/general.js';
import { get } from '@/utils/fetch.js';

/**
 * Komiflo plugin - Image completion via API
 * Extracts thumbnail from Komiflo API when default fails
 *
 * Reference: https://github.com/shikorism/tissue/blob/54e112fa577315718893c803d16223f9a9a66a01/app/MetadataResolver/KomifloResolver.php
 * Inspired by mei23/summaly
 */

// Komiflo API response type
interface KomifloApiResponse {
	content?: KomifloContent;
}

interface KomifloContent {
	children?: KomifloContent[];
	named_imgs?: {
		cover?: {
			filename?: string;
			variants?: string[];
		};
	};
}

/**
 * Test if URL is a Komiflo page
 */
export function test(url: URL): boolean {
	return url.hostname === 'komiflo.com';
}

/**
 * Summarize Komiflo page with API-based thumbnail
 */
export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	try {
		const result = await general(url, opts);
		if (!result) return null;

		// Check if it's a comics page
		const match = url.href.match(/komiflo\.com(?:\/#!)?\/comics\/(\d+)/);
		if (!match) {
			result.sensitive = true;
			return result;
		}

		// Check if thumbnail is already valid (not favicon/logo placeholder)
		if (result.thumbnail && !result.thumbnail.match(/favicon|ogp_logo/)) {
			result.sensitive = true;
			return result;
		}

		// Fetch thumbnail from API
		const comicId = match[1];
		const thumbnail = await fetchThumbnailFromApi(comicId);
		if (thumbnail) {
			result.thumbnail = thumbnail;
		}

		// All Komiflo content is sensitive
		result.sensitive = true;
		return result;
	} catch {
		return null;
	}
}

/**
 * Fetch thumbnail URL from Komiflo API
 */
async function fetchThumbnailFromApi(comicId: string): Promise<string | null> {
	try {
		const apiUrl = `https://api.komiflo.com/content/id/${comicId}`;
		const response = await get(apiUrl);
		const data = JSON.parse(response) as KomifloApiResponse;

		// Try content.named_imgs first, then children[0].named_imgs
		const namedImgs =
			data.content?.named_imgs ||
			(data.content?.children && data.content.children[0]?.named_imgs);

		if (
			namedImgs?.cover?.filename &&
			namedImgs.cover.variants?.includes('346_mobile')
		) {
			return `https://t.komiflo.com/346_mobile/${namedImgs.cover.filename}`;
		}
	} catch {
		// API request failed
	}

	return null;
}
