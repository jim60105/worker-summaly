import * as cheerio from 'cheerio';
import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { scraping } from '@/utils/fetch.js';
import { clip } from '@/utils/clip.js';

export function test(url: URL): boolean {
	if (url.hostname !== 'www.plurk.com') return false;
	// Match /p/{plurk_id} and /m/p/{plurk_id}
	return /^\/(m\/)?p\/[a-zA-Z0-9]+$/.test(url.pathname);
}

export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	// Extract plurk ID from both /p/{id} and /m/p/{id} patterns
	const match = url.pathname.match(/\/(m\/)?p\/([a-zA-Z0-9]+)$/);
	if (!match) return null;

	const plurkId = match[2]; // ID is in the second capture group

	try {
		// Plurk returns different HTML based on User-Agent:
		// - Desktop browsers get server-rendered HTML with data in <script> tags
		// - Mobile browsers get SPA shell that loads data via JavaScript
		// We need desktop UA to get the full data
		const desktopOpts: GeneralScrapingOptions = {
			...opts,
			userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
		};

		const res = await scraping(`https://www.plurk.com/p/${plurkId}`, desktopOpts);
		const $ = res.$;

		return buildSummary($);
	} catch (error) {
		console.error({
			event: 'plugin_error',
			plugin: 'plurk',
			plurkId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

function buildSummary($: cheerio.CheerioAPI): Summary {
	// Find the script tag containing the GLOBAL and plurk variables
	let scriptContent = '';
	$('script').each((_i, elem) => {
		const text = $(elem).text();
		if (text.includes('var GLOBAL=') || text.includes('plurk = {')) {
			scriptContent += text;
		}
	});

	// Extract user information from GLOBAL.page_user
	const displayNameMatch = scriptContent.match(/"display_name":\s*"([^"]+)"/);
	const plurkName = displayNameMatch ? displayNameMatch[1].replace(/\\u[\dA-Fa-f]{4}/g, (match) => {
		return String.fromCharCode(parseInt(match.slice(2), 16));
	}) : '噗浪使用者';

	const plurkNickName = scriptContent.match(/"nick_name":\s*"([^"]+)"/)?.[1];

	// Extract avatar information from page_user
	const userId = scriptContent.match(/"page_user":\s*\{"id":\s*(\d+)/)?.[1];
	const avatarId = scriptContent.match(/"avatar":\s*(\d+)/)?.[1];
	let icon: string | null = null;
	if (userId && avatarId) {
		icon = `https://avatars.plurk.com/${userId}-medium${avatarId}.gif`;
	}

	// Extract content from plurk object
	let description: string | null = null;
	const contentRawMatch = scriptContent.match(/plurk\s*=\s*\{[^}]*"content_raw":\s*"([^"]+)"/);
	if (contentRawMatch) {
		// Decode Unicode escapes and clean the content
		let contentRaw = contentRawMatch[1];
		contentRaw = contentRaw.replace(/\\u[\dA-Fa-f]{4}/g, (match) => {
			return String.fromCharCode(parseInt(match.slice(2), 16));
		});
		// Remove emoticon codes like [emo193]
		contentRaw = contentRaw.replace(/\[emo\d+\]/g, '');
		description = contentRaw.trim();
	}

	// Extract thumbnail from content_raw
	let thumbnail: string | null = null;
	if (contentRawMatch) {
		const contentRaw = contentRawMatch[1];
		const imageMatch = contentRaw.match(/https:\/\/images\.plurk\.com\/[^\s\\]+/);
		if (imageMatch) {
			thumbnail = imageMatch[0];
		}
	}

	return {
		title: plurkName,
		icon: icon || 'https://www.plurk.com/static/favicon.png',
		description: description ? clip(description, 300) : null,
		thumbnail,
		sitename: 'Plurk',
		player: { url: null, width: null, height: null, allow: [] },
		sensitive: false,
		activityPub: null,
		fediverseCreator: plurkNickName ? `@${plurkNickName}` : null,
	};
}
