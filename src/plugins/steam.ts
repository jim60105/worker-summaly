import { decode } from 'html-entities';

import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { getResponse, DEFAULT_BOT_UA } from '@/utils/fetch.js';
import { clip } from '@/utils/clip.js';

export const name = 'steam';

/**
 * Steam plugin - Extracts game/app metadata using Steam API
 * Steam is a digital distribution platform for video games.
 *
 * API: https://store.steampowered.com/api/appdetails/?l={lang}&appids={appId}
 *
 * Inspired by shikorism/tissue SteamResolver
 */

// API response type definitions
interface SteamApiResponse {
	[appId: string]: {
		success: boolean;
		data?: SteamAppData;
	} | undefined;
}

interface SteamAppData {
	type: string;
	name: string;
	steam_appid: number;
	required_age: number | string;
	is_free: boolean;
	detailed_description: string;
	about_the_game: string;
	short_description: string;
	supported_languages: string;
	header_image: string;
	capsule_image: string;
	capsule_imagev5: string;
	website: string | null;
	developers?: string[];
	publishers?: string[];
	price_overview?: {
		currency: string;
		initial: number;
		final: number;
		discount_percent: number;
		initial_formatted: string;
		final_formatted: string;
	};
	platforms: {
		windows: boolean;
		mac: boolean;
		linux: boolean;
	};
	metacritic?: {
		score: number;
		url: string;
	};
	categories?: Array<{
		id: number;
		description: string;
	}>;
	genres?: Array<{
		id: string;
		description: string;
	}>;
	screenshots?: Array<{
		id: number;
		path_thumbnail: string;
		path_full: string;
	}>;
	movies?: Array<{
		id: number;
		name: string;
		thumbnail: string;
		highlight: boolean;
	}>;
	recommendations?: {
		total: number;
	};
	release_date?: {
		coming_soon: boolean;
		date: string;
	};
	content_descriptors?: {
		ids: number[];
		notes: string | null;
	};
}

/**
 * Test if URL is a Steam store app page
 * Matches: store.steampowered.com/app/{appId}
 */
export function test(url: URL): boolean {
	if (url.hostname !== 'store.steampowered.com') return false;

	// Match /app/{appId} with optional trailing path
	return /^\/app\/\d+/.test(url.pathname);
}

/**
 * Summarize Steam app using Steam API
 */
export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	// Parse app ID from URL
	const match = url.pathname.match(/\/app\/(\d+)/);
	if (!match) return null;

	const appId = match[1];

	try {
		// Use Traditional Chinese (tchinese) locale for API request
		const apiUrl = `https://store.steampowered.com/api/appdetails/?l=tchinese&appids=${appId}`;
		const response = await getResponse({
			url: apiUrl,
			method: 'GET',
			headers: {
				'accept': 'application/json',
				'user-agent': opts?.userAgent ?? DEFAULT_BOT_UA,
			},
			responseTimeout: opts?.responseTimeout,
			operationTimeout: opts?.operationTimeout,
		});
		const data = await response.json() as SteamApiResponse;

		// Check if API returned success
		const appData = data[appId];
		if (!appData || !appData.success || !appData.data) {
			console.error({
				event: 'plugin_error',
				plugin: 'steam',
				appId,
				error: 'API response success is false or data is missing',
			});
			return null;
		}

		return buildSummary(appData.data);
	} catch (error) {
		console.error({
			event: 'plugin_error',
			plugin: 'steam',
			appId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Build Summary object from API response
 */
function buildSummary(data: SteamAppData): Summary {
	// Get short description and decode HTML entities
	let description = data.short_description || '';
	// Remove HTML tags (in case there are any)
	description = description.replace(/<br\s*\/?>/gi, '\n');
	description = description.replace(/<[^>]*>/g, '');
	// Decode HTML entities
	description = decode(description);
	// Normalize whitespace
	description = description.replace(/\s+/g, ' ').trim();

	// Check if content is sensitive (adult-only)
	// required_age can be a number or string like "18"
	const requiredAge = typeof data.required_age === 'string'
		? parseInt(data.required_age, 10)
		: data.required_age;
	const sensitive = requiredAge >= 18;

	return {
		title: data.name,
		icon: 'https://store.steampowered.com/favicon.ico',
		description: clip(description, 300),
		thumbnail: data.header_image || null,
		sitename: 'Steam',
		sensitive,
		player: { url: null, width: null, height: null, allow: [] },
		activityPub: null,
		fediverseCreator: null,
	};
}
