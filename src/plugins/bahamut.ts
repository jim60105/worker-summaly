import * as cheerio from 'cheerio';
import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { clip } from '@/utils/clip.js';

export function test(url: URL): boolean {
	const hostname = url.hostname;
	console.log('Bahamut test() called with URL:', url.href);
	console.log('Hostname:', hostname);
	console.log('Pathname:', url.pathname);
	console.log('Has bsn param:', url.searchParams.has('bsn'));
	if (hostname !== 'forum.gamer.com.tw' && hostname !== 'm.gamer.com.tw') {
		console.log('Bahamut test() failed: hostname mismatch');
		return false;
	}
	// For mobile URLs, check /forum/C.php or /forum/Co.php
	// For desktop URLs, check /C.php or /Co.php
	const pathPattern = hostname === 'm.gamer.com.tw'
		? /^\/forum\/(C|Co)\.php$/
		: /^\/(C|Co)\.php$/;
	const result = pathPattern.test(url.pathname) && url.searchParams.has('bsn');
	console.log('Bahamut test() result:', result);
	return result;
}

export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	console.log('Bahamut summarize() called with URL:', url.href);
	try {
		// Normalize to desktop version URL
		const normalizedUrl = new URL(url.href);
		normalizedUrl.hostname = 'forum.gamer.com.tw';
		// For mobile URLs, also normalize the path
		if (url.hostname === 'm.gamer.com.tw') {
			normalizedUrl.pathname = url.pathname.replace('/forum/', '/');
		}

		console.log('Normalized URL:', normalizedUrl.href);

		const response = await fetch(normalizedUrl.href, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/137.0',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
				'Accept-Encoding': 'gzip, deflate, br',
				'Connection': 'keep-alive',
				'Upgrade-Insecure-Requests': '1',
			},
			redirect: 'follow',
			signal: AbortSignal.timeout(opts?.responseTimeout || 5000),
		});

		if (!response.ok) {
			console.log('Bahamut fetch failed with status:', response.status);
			return null;
		}

		const html = await response.text();
		console.log('Bahamut HTML length:', html.length);
		console.log('Bahamut HTML preview:', html.substring(0, 500));
		const $ = cheerio.load(html);
		console.log('Found og:title:', $('meta[property="og:title"]').attr('content'));
		console.log('Found og:description:', $('meta[property="og:description"]').attr('content'));

		return buildSummary($);
	} catch (error) {
		console.error('Bahamut plugin error:', error);
		return null;
	}
}

function buildSummary($: cheerio.CheerioAPI): Summary {
	const ogTitle = $('meta[property="og:title"]').attr('content');
	const ogDescription = $('meta[property="og:description"]').attr('content');
	const ogImage = $('meta[property="og:image"]').attr('content');
	const ogSitename = $('meta[property="og:site_name"]').attr('content');

	// Check if content is R-18
	const isAdult = $('meta[name="rating"]').attr('content') === 'adult';

	return {
		title: ogTitle || '巴哈姆特論壇',
		icon: 'https://i2.bahamut.com.tw/favicon.ico',
		description: ogDescription ? clip(ogDescription, 300) : null,
		thumbnail: ogImage || null,
		sitename: ogSitename || '巴哈姆特',
		player: { url: null, width: null, height: null, allow: [] },
		sensitive: isAdult,
		activityPub: null,
		fediverseCreator: null,
	};
}
