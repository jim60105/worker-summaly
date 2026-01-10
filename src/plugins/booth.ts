import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { getResponse, DEFAULT_BOT_UA } from '@/utils/fetch.js';
import { clip } from '@/utils/clip.js';
import { decode } from 'html-entities';

export const name = 'booth';

/**
 * Booth plugin - Extracts product metadata using Booth JSON API
 * Booth is a marketplace for creative works (doujin, illustrations, goods, etc.)
 *
 * API: https://booth.pm/{lang}/items/{id}.json
 *
 * Inspired by shikorism/tissue BoothResolver
 */

// API response type definitions
interface BoothApiResponse {
	id: number;
	name: string;
	description: string;
	is_adult: boolean;
	is_sold_out: boolean;
	price: string;
	url: string;
	images: Array<{
		caption: string | null;
		original: string;
		resized: string;
	}>;
	shop: {
		name: string;
		subdomain: string;
		url: string;
		thumbnail_url: string;
	};
	category: {
		id: number;
		name: string;
		parent: {
			name: string;
			url: string;
		};
		url: string;
	};
	tags: Array<{
		name: string;
		url: string;
	}>;
}

/**
 * Test if URL is a Booth item page
 * Matches: booth.pm/items/{id}, booth.pm/{lang}/items/{id}, {subdomain}.booth.pm/items/{id}
 */
export function test(url: URL): boolean {
	// Match booth.pm or *.booth.pm (subdomain must be preceded by a dot or be exactly booth.pm)
	if (url.hostname !== 'booth.pm' && !url.hostname.endsWith('.booth.pm')) return false;

	// Match /items/{id} or /{lang}/items/{id}
	return /^\/(?:[a-z-]+\/)?items\/\d+$/.test(url.pathname);
}

/**
 * Summarize Booth product using JSON API
 */
export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	// Parse item ID from URL
	const match = url.pathname.match(/items\/(\d+)/);
	if (!match) return null;

	const itemId = match[1];

	try {
		// Use Japanese locale for API request (consistent data)
		const apiUrl = `https://booth.pm/ja/items/${itemId}.json`;
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
		const data = await response.json() as BoothApiResponse;

		return buildSummary(data);
	} catch (error) {
		console.error({
			event: 'plugin_error',
			plugin: 'booth',
			itemId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

/**
 * Build Summary object from API response
 */
function buildSummary(data: BoothApiResponse): Summary {
	// Clean up description: remove HTML tags and decode entities
	let description = data.description || '';
	// Remove HTML tags
	description = description.replace(/<[^>]*>/g, '');
	// Decode HTML entities
	description = decode(description);
	// Normalize whitespace
	description = description.replace(/\s+/g, ' ').trim();

	// Build description parts
	const descriptionParts: string[] = [];

	// Add shop name
	descriptionParts.push(data.shop.name);

	// Add price if available
	if (data.price) {
		descriptionParts.push(`價格: ${data.price}`);
	}

	// Add product description
	if (description) {
		descriptionParts.push(`\n${description}`);
	}

	const fullDescription = descriptionParts.join('\n');

	// Get the first image as thumbnail
	const thumbnail = data.images?.[0]?.original || null;

	return {
		title: data.name,
		icon: 'https://booth.pm/static-images/pwa/icon-192.png',
		description: clip(fullDescription, 300),
		thumbnail,
		sitename: 'BOOTH',
		sensitive: data.is_adult,
		player: { url: null, width: null, height: null, allow: [] },
		activityPub: null,
		fediverseCreator: null,
	};
}
