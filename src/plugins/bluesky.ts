import * as cheerio from 'cheerio';
import type Summary from '@/summary.js';
import { getResponse, getFetchOptions } from '@/utils/fetch.js';
import { parseGeneral, type GeneralScrapingOptions } from '@/general.js';
import { detectEncoding, toUtf8 } from '@/utils/encoding.js';

export function test(url: URL): boolean {
	return url.hostname === 'bsky.app';
}

export async function summarize(url: URL, opts?: GeneralScrapingOptions): Promise<Summary | null> {
	const args = getFetchOptions(url.href, opts);

	// HEADで取ると404が返るためGETのみで取得
	const response = await getResponse({
		...args,
		method: 'GET',
	});
	
	// Convert response to text
	const arrayBuffer = await response.arrayBuffer();
	const rawBody = new Uint8Array(arrayBuffer);
	const encoding = detectEncoding(rawBody);
	const body = toUtf8(rawBody, encoding);
	const $ = cheerio.load(body);

	return await parseGeneral(url, {
		body,
		$,
		response,
	});
}
