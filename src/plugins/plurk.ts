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
		const res = await scraping(`https://www.plurk.com/p/${plurkId}`, opts);
		const $ = res.$;
		
		return buildSummary($);
	} catch {
		return null;
	}
}

function buildSummary($: cheerio.CheerioAPI): Summary {
	const scriptContent = $('script').text();
	
	// Extract user information
	const plurkName = $('.name').text() || '噗浪使用者';
	const plurkNickName = scriptContent.match(/"nick_name":\s*"([^"]+)"/)?.[1];
	
	// Extract avatar information
	const userId = scriptContent.match(/"page_user":\s*\{"id":\s*(\d+)/)?.[1];
	const avatarId = scriptContent.match(/"avatar":\s*(\d+)/)?.[1];
	let icon: string | null = null;
	if (userId && avatarId) {
		icon = `https://avatars.plurk.com/${userId}-medium${avatarId}.gif`;
	}
	
	// Extract post content (clean HTML)
	const contentHtml = $('.text_holder').html() || '';
	const description = sanitizeHtml(contentHtml);
	
	// Extract images
	const contentRawIndex = scriptContent.indexOf('content_raw');
	let thumbnail: string | null = null;
	if (contentRawIndex !== -1) {
		const images = scriptContent.slice(contentRawIndex)
			.match(/https:\/\/images\.plurk\.com\/[^\\"\s]+/g);
		if (images && images.length > 0) {
			thumbnail = images[0];
		}
	}
	
	return {
		title: plurkName,
		icon: icon || 'https://www.plurk.com/static/favicon.png',
		description: description ? clip(description, 300) : null,
		thumbnail,
		sitename: 'Plurk',
		player: { url: null, width: null, height: null, allow: [] },
		activityPub: null,
		fediverseCreator: plurkNickName ? `@${plurkNickName}` : null,
	};
}

function sanitizeHtml(input: string): string {
	// Remove HTML tags, keep line breaks
	let result = input;
	let previous: string;
	do {
		previous = result;
		result = result
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<[^>]+>/g, '');
	} while (result !== previous);
	return result.trim();
}
