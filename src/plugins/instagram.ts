import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { general } from '@/general.js';

export function test(url: URL): boolean {
	const hostname = url.hostname;
	if (hostname !== 'www.instagram.com' && hostname !== 'instagram.com') {
		return false;
	}
	// 匹配貼文和 Reels
	// /p/{shortcode}/ - 一般貼文
	// /reel/{shortcode}/ - Reels
	// /{username}/p/{shortcode}/ - 用戶貼文
	// /{username}/reel/{shortcode}/ - 用戶 Reels
	return /^\/([\w.]+\/)?(p|reel)\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname);
}

export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	// 提取貼文 shortcode
	const match = url.pathname.match(/\/(p|reel)\/([a-zA-Z0-9_-]+)/);
	if (!match) return null;
	
	const [, type, shortcode] = match;
	
	// 嘗試使用 ddinstagram
	try {
		const ddUrl = new URL(`https://www.ddinstagram.com/${type}/${shortcode}/`);
		const result = await general(ddUrl, opts);
		if (result && result.title) {
			// 修正 sitename
			result.sitename = 'Instagram';
			return result;
		}
	} catch {
		// ddinstagram 失敗，嘗試備用服務
	}
	
	// 備用：嘗試 instagramez
	try {
		const ezUrl = new URL(`https://www.instagramez.com/${type}/${shortcode}/`);
		const result = await general(ezUrl, opts);
		if (result && result.title) {
			result.sitename = 'Instagram';
			return result;
		}
	} catch {
		// 所有服務都失敗
	}
	
	return null;
}
