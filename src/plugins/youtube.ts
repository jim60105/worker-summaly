import * as cheerio from 'cheerio';
import type Summary from '@/summary.js';
import { get } from '@/utils/fetch.js';

/**
 * Fast YouTube plugin - Uses oEmbed endpoint for quick metadata retrieval
 * Inspired by mei23/summaly - much faster than HTML scraping
 *
 * Note: oEmbed doesn't return description, but provides fast title/thumbnail/player
 */

// oEmbed response type definition
interface YouTubeOEmbed {
	type: 'video';
	version: '1.0';
	title?: string;
	author_name?: string;
	author_url?: string;
	provider_name?: string;
	provider_url?: string;
	cache_age?: number;
	thumbnail_url?: string;
	thumbnail_height?: number;
	thumbnail_width?: number;
	html: string;
	height: number;
	width: number;
}

/**
 * Test if URL is a YouTube video/playlist/shorts
 */
export function test(url: URL): boolean {
	// Match youtube.com and subdomains (e.g., www.youtube.com, music.youtube.com)
	if (/^(?:.+\.)?youtube\.com$/.test(url.hostname)) {
		// Match /watch, /v, /playlist, /shorts paths
		if (/^\/(?:watch|v|playlist|shorts)/.test(url.pathname)) {
			return true;
		}
	}

	// Match youtu.be short links
	if (url.hostname === 'youtu.be') {
		return true;
	}

	return false;
}

/**
 * Summarize YouTube video using oEmbed endpoint
 */
export async function summarize(url: URL): Promise<Summary | null> {
	try {
		// Build oEmbed URL
		const oEmbedUrl = new URL('https://www.youtube.com/oembed');
		oEmbedUrl.searchParams.append('url', url.href);
		oEmbedUrl.searchParams.append('format', 'json');

		// Get oEmbed data
		const response = await get(oEmbedUrl.href);
		const data = JSON.parse(response) as YouTubeOEmbed;

		// Validate response type
		if (data.type !== 'video') return null;

		// Parse iframe src from HTML
		const $ = cheerio.load(data.html);
		const iframeSrc = $('iframe').attr('src');
		if (!iframeSrc || !iframeSrc.match(/^https?:\/\//)) return null;

		return {
			title: data.title || null,
			icon: 'https://www.youtube.com/s/desktop/014dbbed/img/favicon_32x32.png',
			description: null, // oEmbed doesn't provide description
			thumbnail: data.thumbnail_url || null,
			sitename: data.provider_name || 'YouTube',
			player: {
				url: iframeSrc,
				width: data.width || null,
				height: data.height || null,
				allow: ['autoplay', 'clipboard-write', 'encrypted-media', 'fullscreen', 'picture-in-picture'],
			},
			sensitive: false,
			activityPub: null,
			fediverseCreator: null,
		};
	} catch {
		return null;
	}
}
