import * as cheerio from 'cheerio';
import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { scraping } from '@/utils/fetch.js';
import { clip } from '@/utils/clip.js';

export function test(url: URL): boolean {
	const hostname = url.hostname;
	if (hostname !== 'forum.gamer.com.tw' && hostname !== 'm.gamer.com.tw') {
		return false;
	}
	// For mobile URLs, check /forum/C.php or /forum/Co.php
	// For desktop URLs, check /C.php or /Co.php
	const pathPattern = hostname === 'm.gamer.com.tw'
		? /^\/forum\/(C|Co)\.php$/
		: /^\/(C|Co)\.php$/;
	return pathPattern.test(url.pathname) && url.searchParams.has('bsn');
}

export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	try {
		// Normalize to desktop version URL
		const normalizedUrl = new URL(url.href);
		normalizedUrl.hostname = 'forum.gamer.com.tw';
		// For mobile URLs, also normalize the path
		if (url.hostname === 'm.gamer.com.tw') {
			normalizedUrl.pathname = url.pathname.replace('/forum/', '/');
		}
		
		const res = await scraping(normalizedUrl.href, opts);
		const $ = res.$;
		
		return buildSummary($);
	} catch {
		return null;
	}
}

function buildSummary($: cheerio.CheerioAPI): Summary {
	const ogTitle = $('meta[property="og:title"]').attr('content');
	const ogDescription = $('meta[property="og:description"]').attr('content');
	const ogImage = $('meta[property="og:image"]').attr('content');
	
	// Check if content is R-18
	const isAdult = $('meta[name="rating"]').attr('content') === 'adult';
	
	return {
		title: ogTitle || '巴哈姆特論壇',
		icon: 'https://i2.bahamut.com.tw/favicon.ico',
		description: ogDescription ? clip(ogDescription, 300) : null,
		thumbnail: ogImage || null,
		sitename: '巴哈姆特',
		player: { url: null, width: null, height: null, allow: [] },
		sensitive: isAdult,
		activityPub: null,
		fediverseCreator: null,
	};
}
