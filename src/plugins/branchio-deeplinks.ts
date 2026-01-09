import { general, type GeneralScrapingOptions } from '@/general.js';
import Summary from '@/summary.js';

export const name = 'branchio-deeplinks';

export function test(url: URL): boolean {
	// Match deep links using Branch.io
	return /^[a-zA-Z0-9]+\.app\.link$/.test(url.hostname) ||
	url.hostname === 'spotify.link';
}

export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	// https://help.branch.io/using-branch/docs/creating-a-deep-link#redirections
	// Force redirect to web version to prevent branch.io's custom page from opening
	url.searchParams.append('$web_only', 'true');

	try {
		return await general(url, opts);
	} catch (error) {
		console.error({
			event: 'plugin_error',
			plugin: 'branchio-deeplinks',
			url: url.href,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}
