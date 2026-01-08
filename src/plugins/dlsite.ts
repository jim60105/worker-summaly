import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { general } from '@/general.js';
import { StatusError } from '@/utils/status-error.js';

/**
 * DLsite plugin
 * - Corrects announce/work URL mismatches
 * - Automatically marks adult content as sensitive
 *
 * Inspired by mei23/summaly
 */

/**
 * Test if URL is a DLsite page
 */
export function test(url: URL): boolean {
	return url.hostname === 'www.dlsite.com';
}

/**
 * Summarize DLsite page with URL correction
 */
export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	try {
		const result = await general(url, opts);
		return addSensitiveFlag(url, result);
	} catch (e) {
		// Handle 404 by trying URL correction
		if (e instanceof StatusError && e.statusCode === 404) {
			const correctedUrl = correctUrl(url);
			if (correctedUrl) {
				try {
					const result = await general(correctedUrl, opts);
					return addSensitiveFlag(correctedUrl, result);
				} catch {
					// Corrected URL also failed
				}
			}
		}
		return null;
	}
}

/**
 * Correct DLsite URL (swap announce/work)
 */
function correctUrl(url: URL): URL | null {
	if (url.pathname.match(/^\/\w+\/announce\//)) {
		const corrected = new URL(url.href);
		corrected.pathname = url.pathname.replace('/announce/', '/work/');
		return corrected;
	}

	if (url.pathname.match(/^\/\w+\/work\//)) {
		const corrected = new URL(url.href);
		corrected.pathname = url.pathname.replace('/work/', '/announce/');
		return corrected;
	}

	return null;
}

/**
 * Add sensitive flag for adult content
 * Home, comic, soft, app, ai are SFW categories
 */
function addSensitiveFlag(url: URL, summary: Summary | null): Summary | null {
	if (!summary) return null;

	// Check if it's in a SFW category
	const sfwCategories = /\/(?:home|comic|soft|app|ai)\//;
	if (!url.pathname.match(sfwCategories)) {
		summary.sensitive = true;
	}

	return summary;
}
