import { summaly } from './index.js';
import type { SummalyResult } from './summary.js';

/**
 * Environment bindings for the Worker
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Env {
	// Optional: Can add KV, D1 bindings for caching in the future
	// CACHE: KVNamespace;
}

/**
 * CORS headers for API responses
 */
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Handle CORS preflight requests
 */
function handleOptions(): Response {
	return new Response(null, {
		status: 204,
		headers: corsHeaders,
	});
}

/**
 * Create a JSON response with CORS headers
 */
function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json',
			...corsHeaders,
		},
	});
}

/**
 * Parse numeric query parameter
 * @returns parsed number or undefined if invalid/missing
 */
function parseNumberParam(value: string | null): number | undefined {
	if (value === null) return undefined;
	const num = Number(value);
	if (Number.isNaN(num) || num < 0) return undefined;
	return num;
}

/**
 * Parse boolean query parameter
 * @returns parsed boolean or undefined if missing
 */
function parseBooleanParam(value: string | null): boolean | undefined {
	if (value === null) return undefined;
	// Accept 'true', '1', 'yes' as true; 'false', '0', 'no' as false
	const lower = value.toLowerCase();
	if (lower === 'true' || lower === '1' || lower === 'yes') return true;
	if (lower === 'false' || lower === '0' || lower === 'no') return false;
	return undefined;
}

/**
 * Cloudflare Workers fetch handler
 */
// eslint-disable-next-line import/no-default-export
export default {
	async fetch(
		request: Request,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_env: Env,
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		_ctx: ExecutionContext,
	): Promise<Response> {
		const requestUrl = new URL(request.url);

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return handleOptions();
		}

		// Only accept GET requests
		if (request.method !== 'GET') {
			console.warn({
				event: 'request_rejected',
				reason: 'method_not_allowed',
				method: request.method,
				path: requestUrl.pathname,
			});
			return jsonResponse(
				{ error: 'Method not allowed' },
				405,
			);
		}

		// Health check endpoint
		if (requestUrl.pathname === '/health') {
			return jsonResponse({ status: 'ok' });
		}

		// Main summarization endpoint
		if (requestUrl.pathname === '/' || requestUrl.pathname === '/api/summarize') {
			const targetUrl = requestUrl.searchParams.get('url');
			const lang = requestUrl.searchParams.get('lang') || undefined;
			
			// Parse new optional parameters
			const timeout = parseNumberParam(requestUrl.searchParams.get('timeout'));
			const contentLengthLimit = parseNumberParam(requestUrl.searchParams.get('contentLengthLimit'));
			const contentLengthRequired = parseBooleanParam(requestUrl.searchParams.get('contentLengthRequired'));
			const userAgent = requestUrl.searchParams.get('userAgent') || undefined;

			// Validate required parameter
			if (!targetUrl) {
				console.warn({
					event: 'request_rejected',
					reason: 'missing_url_parameter',
					path: requestUrl.pathname,
				});
				return jsonResponse(
					{ error: 'Missing required parameter: url' },
					400,
				);
			}

			// Validate URL format
			try {
				new URL(targetUrl);
			} catch {
				console.warn({
					event: 'request_rejected',
					reason: 'invalid_url_format',
					targetUrl,
				});
				return jsonResponse(
					{ error: 'Invalid URL format' },
					400,
				);
			}

			console.info({
				event: 'summarization_request',
				targetUrl,
				lang: lang || 'default',
				timeout: timeout || 'default',
				contentLengthLimit: contentLengthLimit || 'default',
				contentLengthRequired: contentLengthRequired ?? 'default',
				userAgent: userAgent || 'default',
			});

			try {
				const result: SummalyResult = await summaly(targetUrl, {
					lang,
					operationTimeout: timeout,
					contentLengthLimit,
					contentLengthRequired,
					userAgent,
				});

				console.info({
					event: 'summarization_success',
					targetUrl,
					hasTitle: !!result.title,
					hasDescription: !!result.description,
					hasThumbnail: !!result.thumbnail,
					hasPlayer: !!result.player.url,
					sensitive: result.sensitive,
				});

				return jsonResponse(result);
			} catch (error) {
				const message = error instanceof Error
					? error.message
					: 'Unknown error occurred';

				console.error({
					event: 'summarization_error',
					targetUrl,
					error: message,
					stack: error instanceof Error ? error.stack : undefined,
				});

				return jsonResponse(
					{ error: message },
					500,
				);
			}
		}

		// Return 404 for unknown paths
		console.warn({
			event: 'request_rejected',
			reason: 'not_found',
			path: requestUrl.pathname,
		});
		return jsonResponse(
			{ error: 'Not found' },
			404,
		);
	},
} satisfies ExportedHandler<Env>;
