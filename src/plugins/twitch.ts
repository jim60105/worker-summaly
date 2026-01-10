import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { general } from '@/general.js';

export const name = 'twitch';

/**
 * Twitch plugin - Handles retry logic for Twitch's caching behavior
 *
 * Twitch is a live streaming platform for gamers and content creators.
 * Due to Twitch's caching mechanism, the first request often returns a generic
 * placeholder page with no specific stream/channel information.
 *
 * This plugin detects generic responses and automatically retries up to 3 times
 * with 3-second delays between attempts to fetch the actual content.
 *
 * URL patterns supported:
 * - https://www.twitch.tv/{channel} (live streams)
 * - https://twitch.tv/{channel} (live streams without www)
 * - https://www.twitch.tv/{channel}/clip/{clip_id} (clips)
 * - https://clips.twitch.tv/{clip_id} (clips subdomain)
 * - https://www.twitch.tv/videos/{video_id} (VODs)
 * - https://m.twitch.tv/{channel} (mobile)
 * - Any other twitch.tv subdomains
 */

// Generic response indicators used to detect cached placeholder pages
const GENERIC_TITLE = 'Twitch';
const GENERIC_DESCRIPTION = 'Twitch is the world\'s leading video platform and community for gamers.';

// Retry configuration for handling cached responses
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

/**
 * Test if URL is a Twitch page
 * Matches all twitch.tv domains including:
 * - www.twitch.tv (main site)
 * - twitch.tv (main site without www)
 * - clips.twitch.tv (clips subdomain)
 * - m.twitch.tv (mobile subdomain)
 * - Any other twitch.tv subdomains
 *
 * @param url - The URL to test
 * @returns true if URL is a Twitch page
 */
export function test(url: URL): boolean {
	return url.hostname === 'twitch.tv' || url.hostname.endsWith('.twitch.tv');
}

/**
 * Check if the response is a generic/cached Twitch response
 *
 * Twitch returns a generic placeholder page when content is not yet cached.
 * This function detects such responses by checking:
 * 1. Title is exactly "Twitch" (not channel/stream name)
 * 2. Description contains generic text about Twitch platform
 *
 * @param result - The Summary object to check
 * @returns true if the response is generic/cached
 */
function isGenericResponse(result: Summary): boolean {
	// Check if title is exactly "Twitch" (the generic title)
	if (result.title !== GENERIC_TITLE) {
		return false;
	}

	// Check if description matches the generic description
	// Use includes() to handle HTML entity variations (e.g., &#39; vs ')
	if (result.description && result.description.includes('world\'s leading video platform')) {
		return true;
	}

	// Also check for the exact generic description
	if (result.description === GENERIC_DESCRIPTION) {
		return true;
	}

	// If title is "Twitch" and no meaningful description, it's likely generic
	if (!result.description || result.description === GENERIC_TITLE) {
		return true;
	}

	return false;
}

/**
 * Delay execution for a specified number of milliseconds
 *
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after the delay
 */
function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Summarize Twitch page with retry logic for cached responses
 *
 * Strategy:
 * 1. Fetch page content using general scraper
 * 2. Check if response is generic/cached
 * 3. If generic and attempts remain, wait 3 seconds and retry
 * 4. Return first successful non-generic response
 * 5. If all retries fail, return the last generic response
 *
 * @param url - The Twitch URL to summarize
 * @param opts - Optional scraping configuration
 * @returns Summary object or null if fetching fails
 */
export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	let lastResult: Summary | null = null;

	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
			console.debug({
				event: 'twitch_fetch_attempt',
				plugin: 'twitch',
				url: url.href,
				attempt,
				maxRetries: MAX_RETRIES,
			});

			const result = await general(url, opts);

			if (!result) {
				console.warn({
					event: 'twitch_fetch_null_result',
					plugin: 'twitch',
					url: url.href,
					attempt,
					action: attempt < MAX_RETRIES ? 'retrying' : 'returning_null',
				});
				lastResult = null;
				// If we get null, wait and retry
				if (attempt < MAX_RETRIES) {
					await delay(RETRY_DELAY_MS);
					continue;
				}
				return null;
			}

			lastResult = result;

			// Check if we got meaningful content (not a generic cached response)
			if (!isGenericResponse(result)) {
				console.debug({
					event: 'twitch_fetch_success',
					plugin: 'twitch',
					url: url.href,
					attempt,
					title: result.title,
				});
				return result;
			}

			// Log detection of generic response
			console.debug({
				event: 'twitch_generic_response_detected',
				plugin: 'twitch',
				url: url.href,
				attempt,
				title: result.title,
				description: result.description?.substring(0, 50),
				action: attempt < MAX_RETRIES ? 'retrying_after_delay' : 'returning_generic',
			});

			// If this was the last attempt, return the generic result
			if (attempt >= MAX_RETRIES) {
				console.warn({
					event: 'twitch_max_retries_reached',
					plugin: 'twitch',
					url: url.href,
					attempts: attempt,
					message: 'Returning generic response after max retries',
				});
				return result;
			}

			// Wait before next retry
			await delay(RETRY_DELAY_MS);
		} catch (error) {
			console.error({
				event: 'twitch_fetch_error',
				plugin: 'twitch',
				url: url.href,
				attempt,
				error: error instanceof Error ? error.message : String(error),
				action: attempt < MAX_RETRIES ? 'retrying_after_delay' : 'throwing_error',
			});

			// On error, if we have a previous result, return it
			if (lastResult) {
				console.warn({
					event: 'twitch_returning_cached_result',
					plugin: 'twitch',
					url: url.href,
					message: 'Returning previously cached result due to error',
				});
				return lastResult;
			}

			// If this was the last attempt, throw the error
			if (attempt >= MAX_RETRIES) {
				throw error;
			}

			// Wait before next retry
			await delay(RETRY_DELAY_MS);
		}
	}

	return lastResult;
}
