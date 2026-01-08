import * as cheerio from 'cheerio';
import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { clip } from '@/utils/clip.js';

export function test(url: URL): boolean {
	if (url.hostname !== 'www.ptt.cc') return false;
	// Match /bbs/{board}/{article_id}.html
	return /^\/bbs\/[a-zA-Z0-9_-]+\/M\.\d+\.A\.[A-Z0-9]+\.html$/.test(url.pathname);
}

export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	try {
		const response = await fetch(url.href, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/137.0',
				'Accept': 'text/html',
				'Accept-Language': 'zh-TW,zh;q=0.8,en-US;q=0.5,en;q=0.3',
				'Cookie': 'over18=1',
			},
			signal: AbortSignal.timeout(opts?.responseTimeout || 3000),
		});
		
		if (!response.ok) return null;
		
		const html = await response.text();
		const $ = cheerio.load(html);
		
		return buildSummary($);
	} catch {
		return null;
	}
}

function buildSummary($: cheerio.CheerioAPI): Summary {
	// Extract basic information from Open Graph
	const ogTitle = $('meta[property="og:title"]').attr('content');
	const ogDescription = $('meta[property="og:description"]').attr('content');
	
	// Extract images from main content area
	const mainContent = $('#main-content').text().substring(0, 1000);
	const thumbnail = extractFirstImage(mainContent);
	
	// Handle special format for news articles
	let description = ogDescription;
	if (description && description.includes('1.媒體來源:')) {
		// Try to extract news content section
		const newsContent = extractNewsContent(mainContent);
		if (newsContent) {
			description = newsContent;
		}
	}
	
	return {
		title: ogTitle || 'PTT 文章',
		icon: 'https://www.ptt.cc/favicon.ico',
		description: description ? clip(description, 300) : null,
		thumbnail,
		sitename: 'PTT',
		player: { url: null, width: null, height: null, allow: [] },
		activityPub: null,
		fediverseCreator: null,
	};
}

function extractFirstImage(text: string): string | null {
	// Extract the first image URL from article text
	const pattern = /https:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i;
	const match = text.match(pattern);
	return match ? match[0] : null;
}

function extractNewsContent(text: string): string | null {
	// Try to extract content from news article format
	// Format: 4.完整新聞內文: ... 5.完整新聞連結
	const matches = text.match(/4\.完整新聞內文:[\s\S]+?5\.完整新聞連結/);
	if (!matches) return null;
	
	const content = matches[0]
		.replace('4.完整新聞內文:', '')
		.replace(/5\.完整新聞連結.*$/s, '')
		.split('\n')
		.filter(line => !line.trim().startsWith('※'))
		.join('\n')
		.replace(/^\s*\n/gm, '')
		.trim();
	
	return content.substring(0, 300);
}
