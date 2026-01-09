import type * as cheerio from 'cheerio';
import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { general } from '@/general.js';
import { clip } from '@/utils/clip.js';

export const name = 'iwara';

/**
 * Iwara plugin - Thumbnail and description completion
 * - Extracts video poster or first image
 * - Always marked as sensitive (adult content subdomain)
 *
 * Reference: https://github.com/shikorism/tissue/blob/54e112fa577315718893c803d16223f9a9a66a01/app/MetadataResolver/IwaraResolver.php
 * Inspired by mei23/summaly
 */

/**
 * Test if URL is an Iwara page
 */
export function test(url: URL): boolean {
	return /^(?:www|ecchi)\.iwara\.tv$/.test(url.hostname);
}

/**
 * Summarize Iwara page with enhanced metadata
 */
export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	try {
		const result = await general(url, opts);
		if (!result) return null;

		// Re-scrape to get detailed HTML content
		const { scraping } = await import('@/utils/fetch.js');
		const res = await scraping(url.href, opts);
		const $ = res.$;

		// Enhance description if missing
		if (!result.description) {
			const description = extractDescription($);
			if (description && description !== result.title) {
				result.description = description;
			}
		}

		// Enhance thumbnail if missing
		if (!result.thumbnail) {
			const thumbnail = extractThumbnail($, url);
			if (thumbnail) {
				result.thumbnail = thumbnail;
			}
		}

		// All Iwara content should be treated as sensitive regardless of subdomain
		result.sensitive = true;

		return result;
	} catch (error) {
		console.error({
			event: 'plugin_error',
			plugin: 'iwara',
			url: url.href,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Extract description from page content
 */
function extractDescription($: cheerio.CheerioAPI): string | null {
	const descriptionText = $('.field-type-text-with-summary').text();
	if (!descriptionText) return null;

	// Clean up and decode entities
	const cleaned = descriptionText.trim();
	return clip(cleaned, 300);
}

/**
 * Extract thumbnail from video player or images
 */
function extractThumbnail($: cheerio.CheerioAPI, url: URL): string | null {
	// Try video player poster first
	let thumbnail = $('#video-player').first().attr('poster');

	// Fallback to first image in field
	if (!thumbnail) {
		thumbnail = $('.field-name-field-images a').first().attr('href');
	}

	if (!thumbnail) return null;

	// Resolve relative URLs
	try {
		return new URL(thumbnail, url.href).href;
	} catch {
		return null;
	}
}
