import * as cheerio from 'cheerio';
import type Summary from '@/summary.js';
import { clip } from '@/utils/clip.js';

// Configurable proxy service for Weibo images
const WEIBO_IMAGE_PROXY = 'weibo-pic.canaria.cc';

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
		// Support both /detail/{id} and /status/{id} patterns
		return /^\/(detail|status)\/\d+$/.test(url.pathname);
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
		// Support both /detail/{id} and /status/{id} patterns
		const match = url.pathname.match(/^\/(detail|status)\/(\d+)$/);
		statusId = match?.[2] || null;
	} else if (url.hostname === 'weibo.com') {
		// Desktop version URL - status ID is in the last part of path
		const match = url.pathname.match(/^\/\d+\/([a-zA-Z0-9]+)$/);
		statusId = match?.[1] || null;
	}

	if (!statusId) return null;

	try {
		const response = await fetch(
			`https://m.weibo.cn/statuses/show?id=${statusId}`,
			{
				signal: AbortSignal.timeout(2000),
				headers: {
					'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
					'Accept': '*/*',
					'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
					'Referer': 'https://m.weibo.cn/',
					'X-Requested-With': 'XMLHttpRequest',
					'MWeibo-Pwa': '1',
				},
			},
		);

		if (!response.ok) {
			console.warn({
				event: 'plugin_api_error',
				plugin: 'weibo',
				statusId,
				status: response.status,
			});
			return null;
		}

		const data = await response.json() as WeiboStatusResponse;

		if (data.ok !== 1) {
			console.warn({
				event: 'plugin_api_error',
				plugin: 'weibo',
				statusId,
				apiOk: data.ok,
			});
			return null;
		}

		return buildSummary(data.data);
	} catch (error) {
		console.error({
			event: 'plugin_error',
			plugin: 'weibo',
			statusId,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}

function buildSummary(status: WeiboStatusResponse['data']): Summary {
	let title: string | null = null;
	let icon: string | null = null;
	let description: string | null = null;
	let thumbnail: string | null = null;

	// Extract user info
	try {
		if (status.user.screen_name) {
			title = status.user.screen_name;
		}
		if (status.user.profile_image_url) {
			icon = status.user.profile_image_url;
		}
	} catch {
		// Ignore errors
	}

	// Clean HTML content
	try {
		if (status.text) {
			const $ = cheerio.load(status.text);
			const cleanedText = $.text();
			description = clip(cleanedText, 300);
		}
	} catch {
		// Ignore errors
	}

	// Handle images (through proxy)
	try {
		if (status.pics && status.pics.length > 0) {
			const originalUrl = status.pics[0].large.url;
			thumbnail = proxyWeiboImage(originalUrl);
		}
	} catch {
		// Ignore errors
	}

	return {
		title,
		icon: icon || 'https://weibo.com/favicon.ico',
		description,
		thumbnail,
		sitename: 'Weibo',
		player: { url: null, width: null, height: null, allow: [] },
		sensitive: false,
		activityPub: null,
		fediverseCreator: null,
	};
}

function proxyWeiboImage(url: string): string | null {
	// Original format: https://wx1.sinaimg.cn/large/xxx.jpg
	// Target format: https://weibo-pic.canaria.cc/{subdomain}/{path}
	const match = url.match(/https:\/\/(\w+)\.sinaimg\.cn\/(.+)/);
	if (!match) return null;

	const [, subdomain, path] = match;
	return `https://${WEIBO_IMAGE_PROXY}/${subdomain}/${path}`;
}
