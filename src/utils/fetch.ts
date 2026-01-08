import * as cheerio from 'cheerio';
import type { GeneralScrapingOptions } from '@/general.js';
import { StatusError } from '@/utils/status-error.js';
import { detectEncoding, toUtf8 } from '@/utils/encoding.js';

// Constants - hardcoded version instead of reading from package.json
export const DEFAULT_RESPONSE_TIMEOUT = 20 * 1000;
export const DEFAULT_OPERATION_TIMEOUT = 60 * 1000;
export const DEFAULT_MAX_RESPONSE_SIZE = 10 * 1024 * 1024;
// Default User-Agent string mimicking an iPad Safari browser
// https://github.com/yt-dlp/yt-dlp/blob/27afb31edc492cb079f9bce9773498d08e568ff3/yt_dlp/extractor/youtube/_base.py#L290
export const DEFAULT_BOT_UA = 'Mozilla/5.0 (iPad; CPU OS 16_7_10 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1,gzip(gfe)';

export type FetchOptions = {
	url: string;
	method: 'GET' | 'POST' | 'HEAD';
	body?: string;
	headers: Record<string, string | undefined>;
	typeFilter?: RegExp;
	responseTimeout?: number;
	operationTimeout?: number;
	contentLengthLimit?: number;
	contentLengthRequired?: boolean;
};

/**
 * Make an HTTP request using native fetch API
 */
export async function getResponse(args: FetchOptions): Promise<Response> {
	// Use responseTimeout if provided, otherwise fall back to operationTimeout
	// Note: Unlike got, fetch doesn't have separate timeouts for different phases
	const timeout = args.responseTimeout ?? args.operationTimeout ?? DEFAULT_OPERATION_TIMEOUT;

	// Use setTimeout with AbortController for timeout handling
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		// Filter out undefined headers
		const headers: Record<string, string> = {};
		for (const [key, value] of Object.entries(args.headers)) {
			if (value !== undefined) {
				headers[key] = value;
			}
		}

		const response = await fetch(args.url, {
			method: args.method,
			headers,
			body: args.body,
			signal: controller.signal,
			redirect: 'follow',
		});

		clearTimeout(timeoutId);

		// Check HTTP status code
		if (!response.ok) {
			throw new StatusError(
				`${response.status} ${response.statusText}`,
				response.status,
				response.statusText,
			);
		}

		// Check content-type
		const contentType = response.headers.get('content-type');
		if (args.typeFilter && contentType && !contentType.match(args.typeFilter)) {
			throw new Error(`Rejected by type filter ${contentType}`);
		}

		// Check content-length
		const contentLength = response.headers.get('content-length');
		if (contentLength) {
			const maxSize = args.contentLengthLimit ?? DEFAULT_MAX_RESPONSE_SIZE;
			const size = Number(contentLength);
			if (size > maxSize) {
				throw new Error(`maxSize exceeded (${size} > ${maxSize}) on response`);
			}
		} else if (args.contentLengthRequired) {
			throw new Error('content-length required');
		}

		return response;
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error(`Request timeout after ${timeout}ms`);
		}
		throw error;
	}
}

/**
 * Fetch and parse HTML content
 */
export async function scraping(url: string, opts?: GeneralScrapingOptions) {
	const response = await getResponse({
		url,
		method: 'GET',
		headers: {
			'accept': 'text/html,application/xhtml+xml',
			'user-agent': opts?.userAgent ?? DEFAULT_BOT_UA,
			'accept-language': opts?.lang ?? undefined,
		},
		typeFilter: /^(text\/html|application\/xhtml\+xml)/,
		responseTimeout: opts?.responseTimeout,
		operationTimeout: opts?.operationTimeout,
		contentLengthLimit: opts?.contentLengthLimit,
		contentLengthRequired: opts?.contentLengthRequired,
	});

	// Get ArrayBuffer and convert to Uint8Array
	const arrayBuffer = await response.arrayBuffer();
	const rawBody = new Uint8Array(arrayBuffer);

	// Check actual received size
	const maxSize = opts?.contentLengthLimit ?? DEFAULT_MAX_RESPONSE_SIZE;
	if (rawBody.length > maxSize) {
		throw new Error(`maxSize exceeded (${rawBody.length} > ${maxSize}) on response`);
	}

	const encoding = detectEncoding(rawBody);
	const body = toUtf8(rawBody, encoding);
	const $ = cheerio.load(body);

	return {
		body,
		$,
		response,
	};
}

/**
 * Simple GET request returning text
 */
export async function get(url: string): Promise<string> {
	const response = await getResponse({
		url,
		method: 'GET',
		headers: {
			'accept': '*/*',
			'user-agent': DEFAULT_BOT_UA,
		},
	});

	return await response.text();
}

/**
 * HEAD request to get headers
 */
export async function head(url: string): Promise<Response> {
	return await getResponse({
		url,
		method: 'HEAD',
		headers: {
			'accept': '*/*',
			'user-agent': DEFAULT_BOT_UA,
		},
	});
}

/**
 * Get options for general scraping
 */
export function getFetchOptions(url: string, opts?: GeneralScrapingOptions): Omit<FetchOptions, 'method'> {
	return {
		url,
		headers: {
			'accept': 'text/html,application/xhtml+xml',
			'user-agent': opts?.userAgent ?? DEFAULT_BOT_UA,
			'accept-language': opts?.lang ?? undefined,
		},
		typeFilter: /^(text\/html|application\/xhtml\+xml)/,
		responseTimeout: opts?.responseTimeout,
		operationTimeout: opts?.operationTimeout,
		contentLengthLimit: opts?.contentLengthLimit,
		contentLengthRequired: opts?.contentLengthRequired,
	};
}
