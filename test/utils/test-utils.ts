/**
 * Shared test utilities for Cloudflare Workers environment
 */

import { beforeEach, afterEach } from 'vitest';

// Test configuration
export const port = 3060;
export const host = `http://localhost:${port}`;

// Mock fetch responses storage
export const mockResponses = new Map<string, Response>();

// Store original fetch for restoration
export const originalFetch = global.fetch;

/**
 * Mock fetch implementation that intercepts requests and returns mocked responses
 */
export function mockFetch(url: string | URL | Request, init?: RequestInit): Promise<Response> {
	const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;

	// Try exact match first
	const exactMatch = mockResponses.get(urlString);
	if (exactMatch) {
		return Promise.resolve(exactMatch.clone());
	}

	// Try wildcard match (simple pattern matching)
	for (const [pattern, response] of mockResponses.entries()) {
		if (pattern.includes('/*')) {
			const prefix = pattern.replace('/*', '');
			// Match if URL starts with prefix, including trailing slash variations
			if (urlString === prefix || urlString.startsWith(prefix + '/')) {
				return Promise.resolve(response.clone());
			}
		}
	}

	// Fall back to original fetch for unmocked requests
	return originalFetch(url, init);
}

/**
 * Setup a mock HTML response for a URL
 */
export function setupMockResponse(url: string, body: string, headers: Record<string, string> = {}) {
	const encoder = new TextEncoder();
	const bodyBytes = encoder.encode(body);
	const defaultHeaders = {
		'content-length': String(bodyBytes.length),
		'content-type': 'text/html; charset=utf-8',
		...headers,
	};
	mockResponses.set(url, new Response(body, {
		status: 200,
		headers: defaultHeaders,
	}));
}

/**
 * Setup a mock JSON response for a URL
 */
export function setupMockJsonResponse(url: string, data: unknown) {
	const body = JSON.stringify(data);
	const headers = {
		'content-length': String(Buffer.byteLength(body)),
		'content-type': 'application/json',
	};
	mockResponses.set(url, new Response(body, {
		status: 200,
		headers,
	}));
}

/**
 * Setup a mock status-only response for a URL
 */
export function setupMockStatusResponse(url: string, status: number) {
	mockResponses.set(url, new Response(null, { status }));
}

/**
 * Install mock fetch and setup cleanup hooks
 * Call this in your test file to enable mocking
 */
export function useMockFetch() {
	beforeEach(() => {
		// Clear mock responses
		mockResponses.clear();
		// Install mock fetch
		global.fetch = mockFetch as typeof fetch;
	});

	afterEach(() => {
		// Restore original fetch
		global.fetch = originalFetch;
		// Clear mock responses
		mockResponses.clear();
	});
}
