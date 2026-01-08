import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { general } from '@/general.js';

export function test(url: URL): boolean {
	const hostname = url.hostname;
	
	// 標準格式
	if (hostname === 'www.tiktok.com' || hostname === 'tiktok.com') {
		return /^\/@[\w.-]+\/video\/\d+/.test(url.pathname);
	}
	
	// 短連結格式
	if (hostname === 'vm.tiktok.com' || hostname === 'vt.tiktok.com') {
		return /^\/[\w]+/.test(url.pathname);
	}
	
	return false;
}

export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	// 建構替代服務 URL
	const originalUrl = url.href;
	
	// 嘗試 tnktok.com
	try {
		const tnktokUrl = originalUrl.replace(/tiktok\.com/, 'tnktok.com');
		const result = await general(new URL(tnktokUrl), opts);
		if (result && result.title) {
			result.sitename = 'TikTok';
			return result;
		}
	} catch {
		// tnktok 失敗，嘗試備用服務
	}
	
	// 備用：嘗試 tiktokez.com
	try {
		const tiktokEzUrl = originalUrl.replace(/tiktok\.com/, 'tiktokez.com');
		const result = await general(new URL(tiktokEzUrl), opts);
		if (result && result.title) {
			result.sitename = 'TikTok';
			return result;
		}
	} catch {
		// 所有服務都失敗
	}
	
	return null;
}
