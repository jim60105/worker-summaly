import * as cheerio from 'cheerio';
import type Summary from '@/summary.js';
import { clip } from '@/utils/clip.js';

// Configurable proxy service for Weibo images
const WEIBO_IMAGE_PROXY = 'images.weserv.nl';

interface WeiboStatusResponse {
	ok: number;
	data: {
		text: string; // HTML format
		user: {
			screen_name: string;
			profile_image_url?: string;
		};
		pics?: Array<{
			large: {
				url: string; // Format: https://wx1.sinaimg.cn/large/...
			};
		}>;
		comments_count: number;
		reposts_count: number;
		attitudes_count: number;
	};
}

export function test(url: URL): boolean {
	// Mobile version URL
	if (url.hostname === 'm.weibo.cn') {
		return /^\/detail\/\d+$/.test(url.pathname);
	}
	// Desktop version URL - needs conversion
	if (url.hostname === 'weibo.com') {
		// /{user_id}/{post_id} format
		return /^\/\d+\/[a-zA-Z0-9]+$/.test(url.pathname);
	}
	return false;
}

export async function summarize(url: URL): Promise<Summary | null> {
	// Extract status ID
	let statusId: string | null = null;
	
	if (url.hostname === 'm.weibo.cn') {
		const match = url.pathname.match(/^\/detail\/(\d+)$/);
		statusId = match?.[1] || null;
	} else if (url.hostname === 'weibo.com') {
		// Desktop version URL - status ID is in the last part of path
		const match = url.pathname.match(/^\/\d+\/([a-zA-Z0-9]+)$/);
		statusId = match?.[1] || null;
	}
	
	if (!statusId) return null;
	
	try {
		const response = await fetch(
			`https://m.weibo.cn/statuses/show?id=${statusId}`,
			{ signal: AbortSignal.timeout(2000) },
		);
		
		if (!response.ok) return null;
		
		const data = await response.json() as WeiboStatusResponse;
		
		if (data.ok !== 1) return null;
		
		return buildSummary(data.data);
	} catch {
		return null;
	}
}

function buildSummary(status: WeiboStatusResponse['data']): Summary {
	// Clean HTML content
	const $ = cheerio.load(status.text);
	const description = $.text().trim();
	
	// Handle images (through proxy)
	let thumbnail: string | null = null;
	if (status.pics && status.pics.length > 0) {
		const originalUrl = status.pics[0].large.url;
		thumbnail = proxyWeiboImage(originalUrl);
	}
	
	return {
		title: status.user.screen_name,
		icon: status.user.profile_image_url || 'https://weibo.com/favicon.ico',
		description: description ? clip(description, 300) : null,
		thumbnail,
		sitename: 'Weibo',
		player: { url: null, width: null, height: null, allow: [] },
		activityPub: null,
		fediverseCreator: null,
	};
}

function proxyWeiboImage(url: string): string | null {
	// Original format: https://wx1.sinaimg.cn/large/xxx.jpg
	// Target format: https://{proxy}/?url={encoded_url}
	const match = url.match(/https:\/\/([a-zA-Z0-9-]+)\.sinaimg\.cn\/(.+)/);
	if (!match) return null;
	
	const [, subdomain, path] = match;
	// Using images.weserv.nl as a public image proxy
	return `https://${WEIBO_IMAGE_PROXY}/?url=${encodeURIComponent(`${subdomain}.sinaimg.cn/${path}`)}`;
}
