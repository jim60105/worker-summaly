import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { general } from '@/general.js';

export const name = 'nijie';

/**
 * Nijie plugin - Image completion
 * Extracts thumbnail from LD+JSON ImageObject
 * Always marks content as sensitive
 *
 * Reference: https://github.com/shikorism/tissue/blob/d69fe6a22a23eb685c4e04db84bb03f2c57311a1/app/MetadataResolver/NijieResolver.php
 * Inspired by mei23/summaly
 */

// LD+JSON ImageObject type
interface ImageObject {
	'@context'?: string;
	'@type': 'ImageObject';
	name?: string;
	description?: string;
	thumbnailUrl?: string;
}

/**
 * Test if URL is a Nijie page
 */
export function test(url: URL): boolean {
	return url.hostname === 'nijie.info';
}

/**
 * Summarize Nijie page with image extraction
 */
export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	try {
		const result = await general(url, opts);
		if (!result) return null;

		// Process view.php pages for thumbnail extraction
		if (url.pathname.includes('/view.php')) {
			const enhancedResult = await extractThumbnailFromLdJson(url, result, opts);
			return enhancedResult;
		}

		// All Nijie content is sensitive
		result.sensitive = true;
		return result;
	} catch (error) {
		console.error({
			event: 'plugin_error',
			plugin: 'nijie',
			url: url.href,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Extract thumbnail from LD+JSON ImageObject on the page
 */
async function extractThumbnailFromLdJson(
	url: URL,
	summary: Summary,
	opts?: GeneralScrapingOptions,
): Promise<Summary> {
	try {
		// We need to re-scrape to get the HTML content
		const { scraping } = await import('@/utils/fetch.js');
		const res = await scraping(url.href, opts);
		const $ = res.$;

		// Parse LD+JSON scripts
		const ldJsonElements = $('script[type="application/ld+json"]');
		const imageObjects: ImageObject[] = [];

		ldJsonElements.each(function () {
			try {
				const text = $(this).text();
				const parsed = JSON.parse(text) as ImageObject;
				if (isImageObject(parsed)) {
					imageObjects.push(parsed);
				}
			} catch {
				// Skip invalid JSON
			}
		});

		// Use first ImageObject's thumbnailUrl
		const imageObject = imageObjects[0];
		if (imageObject?.thumbnailUrl) {
			summary.thumbnail = imageObject.thumbnailUrl;
		}
	} catch (error) {
		console.debug({
			event: 'plugin_ldjson_extraction_failed',
			plugin: 'nijie',
			url: url.href,
			error: error instanceof Error ? error.message : String(error),
		});
		// Extraction failed, keep original summary
	}

	// All Nijie content is sensitive
	summary.sensitive = true;
	return summary;
}

/**
 * Type guard for ImageObject
 */
function isImageObject(obj: unknown): obj is ImageObject {
	return (
		typeof obj === 'object' &&
		obj !== null &&
		'@type' in obj &&
		(obj as Record<string, unknown>)['@type'] === 'ImageObject'
	);
}
