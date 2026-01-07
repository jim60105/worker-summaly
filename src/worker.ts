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
 * Cloudflare Workers fetch handler
 */
// eslint-disable-next-line import/no-default-export
export default {
	async fetch(
		request: Request,
		_env: Env,
		_ctx: ExecutionContext,
	): Promise<Response> {
		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return handleOptions();
		}

		// Only accept GET requests
		if (request.method !== 'GET') {
			return jsonResponse(
				{ error: 'Method not allowed' },
				405,
			);
		}

		const url = new URL(request.url);

		// Health check endpoint
		if (url.pathname === '/health') {
			return jsonResponse({ status: 'ok' });
		}

		// Main summarization endpoint
		if (url.pathname === '/' || url.pathname === '/api/summarize') {
			const targetUrl = url.searchParams.get('url');
			const lang = url.searchParams.get('lang') || undefined;

			// Validate required parameter
			if (!targetUrl) {
				return jsonResponse(
					{ error: 'Missing required parameter: url' },
					400,
				);
			}

			// Validate URL format
			try {
				new URL(targetUrl);
			} catch {
				return jsonResponse(
					{ error: 'Invalid URL format' },
					400,
				);
			}

			try {
				const result: SummalyResult = await summaly(targetUrl, {
					lang,
					// Additional options can be configured here
				});

				return jsonResponse(result);
			} catch (error) {
				console.error('Summarization error:', error);

				const message = error instanceof Error
					? error.message
					: 'Unknown error occurred';

				return jsonResponse(
					{ error: message },
					500,
				);
			}
		}

		// Return 404 for unknown paths
		return jsonResponse(
			{ error: 'Not found' },
			404,
		);
	},
} satisfies ExportedHandler<Env>;
