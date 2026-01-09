import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { general } from '@/general.js';

export function test(url: URL): boolean {
	const hostname = url.hostname;
	if (hostname !== 'www.instagram.com' && hostname !== 'instagram.com') {
		return false;
	}
	// Match posts and Reels
	// /p/{shortcode}/ - regular post
	// /reel/{shortcode}/ - reel
	// /{username}/p/{shortcode}/ - user post
	// /{username}/reel/{shortcode}/ - user reel
	return /^\/([\w.]+\/)?(p|reel)\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname);
}

export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	// Instagram cannot currently be scraped directly because it requires login or complex authentication
	// Third-party services (ddinstagram, instagramez) are no longer available
	// The GraphQL API requires a valid authentication token
	// Fallback to using `general()` to attempt extracting available meta tags

	try {
		const result = await general(url, opts);
		if (result) {
			// Force sitename to 'Instagram'
			result.sitename = 'Instagram';
		}
		return result;
	} catch (error) {
		console.error('Instagram plugin error:', error);
		return null;
	}
}
