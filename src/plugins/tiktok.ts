import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { general } from '@/general.js';

export function test(url: URL): boolean {
	const hostname = url.hostname;

	// Standard format
	if (hostname === 'www.tiktok.com' || hostname === 'tiktok.com') {
		return /^\/@[\w.-]+\/video\/\d+/.test(url.pathname);
	}

	// Short link format
	if (hostname === 'vm.tiktok.com' || hostname === 'vt.tiktok.com') {
		return /^\/[\w]{2,}/.test(url.pathname);
	}

	return false;
}

export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	// Construct alternative service URL - only replace the hostname part
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

	// Try tnktok.com
	try {
		const result = await general(createProxyUrl('tnktok.com'), localOpts);
		if (result && result.title) {
			result.sitename = 'TikTok';
			return result;
		}
	} catch (error) {
		console.error({
			event: 'plugin_error',
			plugin: 'tiktok',
			url: url.href,
			proxy: 'tnktok.com',
			error: error instanceof Error ? error.message : String(error),
		});
	}

	return null;
}
