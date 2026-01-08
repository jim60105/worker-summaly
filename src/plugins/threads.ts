import type Summary from '@/summary.js';
import type { GeneralScrapingOptions } from '@/general.js';
import { general } from '@/general.js';

export function test(url: URL): boolean {
	const hostname = url.hostname;
	if (hostname !== 'www.threads.net' && hostname !== 'threads.net') {
		return false;
	}
	return /^\/@[\w.]+\/post\/[a-zA-Z0-9_-]+$/.test(url.pathname);
}

export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	try {
		// Construct fixthreads URL
		const fixUrl = new URL(url.href);
		fixUrl.hostname = 'fixthreads.net';
		
		const result = await general(fixUrl, opts);
		
		if (result && result.title) {
			// Fix sitename
			result.sitename = 'Threads';
			return result;
		}
	} catch {
		// fixthreads failed
	}
	
	return null;
}
