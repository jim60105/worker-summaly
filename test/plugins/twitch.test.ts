/**
 * Twitch Plugin Tests
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	useMockFetch,
	setupMockResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

// Mock timers for testing delays
beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

// HTML templates for testing
const genericTwitchHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Twitch</title>
    <meta property="og:site_name" content="Twitch">
    <meta property="og:title" content="Twitch">
    <meta property="og:description" content="Twitch is the world's leading video platform and community for gamers.">
    <link rel="icon" href="/favicon.ico">
</head>
<body></body>
</html>
`;

const validStreamHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>StreamerName - Twitch</title>
    <meta property="og:site_name" content="Twitch">
    <meta property="og:title" content="StreamerName">
    <meta property="og:description" content="Playing an awesome game! Come watch!">
    <meta property="og:image" content="https://static-cdn.jtvnw.net/previews-ttv/live_user_streamername-1920x1080.jpg">
    <link rel="icon" href="/favicon.ico">
</head>
<body></body>
</html>
`;

const validClipHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Amazing Play - StreamerName - Twitch</title>
    <meta property="og:site_name" content="Twitch">
    <meta property="og:title" content="Amazing Play">
    <meta property="og:description" content="Check out this amazing clip from StreamerName!">
    <meta property="og:image" content="https://clips-media-assets2.twitch.tv/abc123-preview.jpg">
    <link rel="icon" href="/favicon.ico">
</head>
<body></body>
</html>
`;

describe('Twitch Plugin', () => {
	describe('URL matching', () => {
		test('should match www.twitch.tv', async () => {
			const { test: testUrl } = await import('@/plugins/twitch.js');
			expect(testUrl(new URL('https://www.twitch.tv/streamername'))).toBe(true);
			expect(testUrl(new URL('https://www.twitch.tv/videos/123456789'))).toBe(true);
			expect(testUrl(new URL('https://www.twitch.tv/streamername/clip/ClipName'))).toBe(true);
		});

		test('should match twitch.tv without www', async () => {
			const { test: testUrl } = await import('@/plugins/twitch.js');
			expect(testUrl(new URL('https://twitch.tv/streamername'))).toBe(true);
			expect(testUrl(new URL('https://twitch.tv/videos/123456789'))).toBe(true);
		});

	test('should match clips subdomain', async () => {
		const { test: testUrl } = await import('@/plugins/twitch.js');
		expect(testUrl(new URL('https://clips.twitch.tv/ClipName'))).toBe(true);
		expect(testUrl(new URL('https://clips.twitch.tv/streamer/ClipID-123abc'))).toBe(true);
	});

	test('should match mobile subdomain', async () => {
		const { test: testUrl } = await import('@/plugins/twitch.js');
		expect(testUrl(new URL('https://m.twitch.tv/streamername'))).toBe(true);
	});

	test('should not match other domains', async () => {
		const { test: testUrl } = await import('@/plugins/twitch.js');
		expect(testUrl(new URL('https://example.com/twitch'))).toBe(false);
		expect(testUrl(new URL('https://twitchtv.com/stream'))).toBe(false);
		expect(testUrl(new URL('https://twitch.com/stream'))).toBe(false);
		});
	});

	describe('Retry logic', () => {
		test('should return valid content on first attempt without retry', async () => {
			const { summarize } = await import('@/plugins/twitch.js');
			const url = 'https://www.twitch.tv/streamername';

			setupMockResponse(url, validStreamHtml);
			// Setup favicon check
			setupMockResponse('https://www.twitch.tv/favicon.ico', '', { 'content-type': 'image/x-icon' });

			const resultPromise = summarize(new URL(url));

			// Advance timers to ensure no delays are needed
			await vi.runAllTimersAsync();

			const result = await resultPromise;

			expect(result).not.toBeNull();
			expect(result?.title).toBe('StreamerName');
			expect(result?.description).toBe('Playing an awesome game! Come watch!');
			expect(result?.sitename).toBe('Twitch');
		});

		test('should retry when receiving generic response and succeed on second attempt', async () => {
			const { summarize } = await import('@/plugins/twitch.js');
			const url = 'https://www.twitch.tv/streamername';

			// First call returns generic response
			let callCount = 0;
			const originalMockFetch = global.fetch;
			global.fetch = async (input: string | URL | Request, init?: RequestInit) => {
				const inputUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

				if (inputUrl === url) {
					callCount++;
					const html = callCount === 1 ? genericTwitchHtml : validStreamHtml;
					return new Response(html, {
						status: 200,
						headers: {
							'content-type': 'text/html; charset=utf-8',
							'content-length': String(html.length),
						},
					});
				}

				// Handle favicon
				if (inputUrl.includes('favicon.ico')) {
					return new Response('', {
						status: 200,
						headers: { 'content-type': 'image/x-icon' },
					});
				}

				return originalMockFetch(input, init);
			};

			const resultPromise = summarize(new URL(url));

			// Advance all timers to handle the 3 second delay
			await vi.runAllTimersAsync();

			const result = await resultPromise;

			expect(callCount).toBe(2);
			expect(result).not.toBeNull();
			expect(result?.title).toBe('StreamerName');
			expect(result?.description).toBe('Playing an awesome game! Come watch!');
		});

		test('should retry up to 3 times and return generic response if all fail', async () => {
			const { summarize } = await import('@/plugins/twitch.js');
			const url = 'https://www.twitch.tv/streamername';

			// All calls return generic response
			let callCount = 0;
			const originalMockFetch = global.fetch;
			global.fetch = async (input: string | URL | Request, init?: RequestInit) => {
				const inputUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

				if (inputUrl === url) {
					callCount++;
					return new Response(genericTwitchHtml, {
						status: 200,
						headers: {
							'content-type': 'text/html; charset=utf-8',
							'content-length': String(genericTwitchHtml.length),
						},
					});
				}

				// Handle favicon
				if (inputUrl.includes('favicon.ico')) {
					return new Response('', {
						status: 200,
						headers: { 'content-type': 'image/x-icon' },
					});
				}

				return originalMockFetch(input, init);
			};

			const resultPromise = summarize(new URL(url));

			// Advance all timers to handle all delays
			await vi.runAllTimersAsync();

			const result = await resultPromise;

			expect(callCount).toBe(3);
			expect(result).not.toBeNull();
			expect(result?.title).toBe('Twitch');
			expect(result?.description).toContain("world's leading video platform");
		});

		test('should succeed on third attempt', async () => {
			const { summarize } = await import('@/plugins/twitch.js');
			const url = 'https://www.twitch.tv/streamername';

			// First two calls return generic, third returns valid
			let callCount = 0;
			const originalMockFetch = global.fetch;
			global.fetch = async (input: string | URL | Request, init?: RequestInit) => {
				const inputUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

				if (inputUrl === url) {
					callCount++;
					const html = callCount < 3 ? genericTwitchHtml : validStreamHtml;
					return new Response(html, {
						status: 200,
						headers: {
							'content-type': 'text/html; charset=utf-8',
							'content-length': String(html.length),
						},
					});
				}

				// Handle favicon
				if (inputUrl.includes('favicon.ico')) {
					return new Response('', {
						status: 200,
						headers: { 'content-type': 'image/x-icon' },
					});
				}

				return originalMockFetch(input, init);
			};

			const resultPromise = summarize(new URL(url));

			// Advance all timers
			await vi.runAllTimersAsync();

			const result = await resultPromise;

			expect(callCount).toBe(3);
			expect(result).not.toBeNull();
			expect(result?.title).toBe('StreamerName');
		});
	});

	describe('Content extraction', () => {
		test('should extract clip metadata correctly', async () => {
			const { summarize } = await import('@/plugins/twitch.js');
			const url = 'https://www.twitch.tv/streamername/clip/AmazingClip';

			setupMockResponse(url, validClipHtml);
			setupMockResponse('https://www.twitch.tv/favicon.ico', '', { 'content-type': 'image/x-icon' });

			const resultPromise = summarize(new URL(url));
			await vi.runAllTimersAsync();
			const result = await resultPromise;

			expect(result).not.toBeNull();
			expect(result?.title).toBe('Amazing Play');
			expect(result?.description).toBe('Check out this amazing clip from StreamerName!');
			expect(result?.thumbnail).toBe('https://clips-media-assets2.twitch.tv/abc123-preview.jpg');
		});

		test('should handle stream page metadata', async () => {
			const { summarize } = await import('@/plugins/twitch.js');
			const url = 'https://www.twitch.tv/streamername';

			setupMockResponse(url, validStreamHtml);
			setupMockResponse('https://www.twitch.tv/favicon.ico', '', { 'content-type': 'image/x-icon' });

			const resultPromise = summarize(new URL(url));
			await vi.runAllTimersAsync();
			const result = await resultPromise;

			expect(result).not.toBeNull();
			expect(result?.title).toBe('StreamerName');
			expect(result?.thumbnail).toBe('https://static-cdn.jtvnw.net/previews-ttv/live_user_streamername-1920x1080.jpg');
		});
	});
});
