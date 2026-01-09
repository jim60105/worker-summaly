import * as cheerio from 'cheerio';
import type Summary from '@/summary.js';
import { get } from '@/utils/fetch.js';

export const name = 'spotify';

/**
 * Fast Spotify plugin - Uses oEmbed endpoint for quick metadata retrieval
 * Inspired by mei23/summaly
 *
 * Note: oEmbed doesn't provide description
 */

// oEmbed response type definition
interface SpotifyOEmbed {
	type: 'rich';
	version: '1.0';
	title?: string;
	provider_name?: string;
	provider_url?: string;
	thumbnail_url?: string;
	thumbnail_height?: number;
	thumbnail_width?: number;
	html: string;
	height: number;
	width: number;
}

/**
 * Test if URL is a Spotify page
 */
export function test(url: URL): boolean {
	return url.hostname === 'open.spotify.com';
}

/**
 * Summarize Spotify content using oEmbed endpoint
 */
export async function summarize(url: URL): Promise<Summary | null> {
	try {
		// Build oEmbed URL
		const oEmbedUrl = new URL('https://open.spotify.com/oembed');
		oEmbedUrl.searchParams.append('url', url.href);

		// Get oEmbed data
		const response = await get(oEmbedUrl.href);
		const data = JSON.parse(response) as SpotifyOEmbed;

		// Parse iframe src from HTML
		const $ = cheerio.load(data.html);
		const iframeSrc = $('iframe').attr('src');
		if (!iframeSrc || !iframeSrc.match(/^https?:\/\//)) return null;

		return {
			title: data.title || null,
			icon: 'https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png',
			description: null, // oEmbed doesn't provide description
			thumbnail: data.thumbnail_url || null,
			sitename: data.provider_name || 'Spotify',
			player: {
				url: iframeSrc,
				width: data.width || null,
				height: data.height || null,
				allow: ['autoplay', 'clipboard-write', 'encrypted-media', 'fullscreen'],
			},
			sensitive: false,
			activityPub: null,
			fediverseCreator: null,
		};
	} catch (error) {
		console.error({
			event: 'plugin_error',
			plugin: 'spotify',
			url: url.href,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}
