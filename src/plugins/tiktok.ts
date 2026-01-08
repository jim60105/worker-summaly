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
		return /^\/[\w]{2,}/.test(url.pathname);
	}

	return false;
}

export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	// 建構替代服務 URL - 只替換 hostname 部分
	const createProxyUrl = (proxyDomain: string): URL => {
		const proxyUrl = new URL(url.href);
		proxyUrl.hostname = proxyUrl.hostname.replace(/tiktok\.com$/, proxyDomain);
		return proxyUrl;
	};

	// Ensure a default user-agent is set so remote services accept our requests
	const localOpts: GeneralScrapingOptions = {
		...(opts || {}),
		userAgent: opts?.userAgent || 'bot',
	};

	// 嘗試 tnktok.com
	try {
		const result = await general(createProxyUrl('tnktok.com'), localOpts);
		if (result && result.title) {
			result.sitename = 'TikTok';
			return result;
		}
	} catch {
		// tnktok 失敗，嘗試備用服務
	}

	return null;
}
