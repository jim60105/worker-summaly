/**
 * TikTok Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockResponse,
	setupMockStatusResponse,
	originalFetch,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('TikTok Plugin', () => {
	describe('URL matching', () => {
		test('should match standard video URL', async () => {
			const { test: testUrl } = await import('@/plugins/tiktok.js');
			expect(testUrl(new URL('https://www.tiktok.com/@username/video/1234567890'))).toBe(true);
			expect(testUrl(new URL('https://tiktok.com/@user.name-123/video/9876543210'))).toBe(true);
		});

		test('should match short link from vm.tiktok.com', async () => {
			const { test: testUrl } = await import('@/plugins/tiktok.js');
			expect(testUrl(new URL('https://vm.tiktok.com/ABC123/'))).toBe(true);
			expect(testUrl(new URL('https://vt.tiktok.com/XYZ789/'))).toBe(true);
		});

		test('should not match non-video TikTok URL', async () => {
			const { test: testUrl } = await import('@/plugins/tiktok.js');
			expect(testUrl(new URL('https://www.tiktok.com/@username'))).toBe(false);
			expect(testUrl(new URL('https://www.tiktok.com/'))).toBe(false);
		});
	});

	describe('Summarize functionality', () => {
		test('should extract metadata from tnktok proxy', async () => {
			const { summarize } = await import('@/plugins/tiktok.js');
			const html = `<!DOCTYPE html>
<html>
<head>
	<title>Test TikTok Video</title>
	<meta property="og:title" content="TikTok Video by @username">
	<meta property="og:description" content="This is a test video description #test">
	<meta property="og:image" content="https://p16.tiktokcdn.com/thumb.jpg">
	<meta property="og:site_name" content="TikTok">
</head>
<body></body>
</html>`;
			setupMockResponse('https://www.tnktok.com/@username/video/1234567890', html);

			const result = await summarize(new URL('https://www.tiktok.com/@username/video/1234567890'));

			expect(result).not.toBeNull();
			expect(result?.sitename).toBe('TikTok');
			expect(result?.title).toBe('TikTok Video by @username');
			expect(result?.description).toBe('This is a test video description #test');
		});

		test('should handle short link URL', async () => {
			const { summarize } = await import('@/plugins/tiktok.js');
			const html = `<!DOCTYPE html>
<html>
<head>
	<title>Short Link Video</title>
	<meta property="og:title" content="Short Link TikTok">
	<meta property="og:site_name" content="TikTok">
</head>
<body></body>
</html>`;
			setupMockResponse('https://vm.tnktok.com/ABC123/', html);

			const result = await summarize(new URL('https://vm.tiktok.com/ABC123/'));

			expect(result).not.toBeNull();
			expect(result?.sitename).toBe('TikTok');
		});

		test('should return null when tnktok fails', async () => {
			const { summarize } = await import('@/plugins/tiktok.js');
			setupMockStatusResponse('https://www.tnktok.com/@user/video/999999', 500);

			const result = await summarize(new URL('https://www.tiktok.com/@user/video/999999'));

			expect(result).toBe(null);
		});
	});

	describe('User agent handling', () => {
		test('should use default userAgent when opts is undefined', async () => {
			const html = `<!DOCTYPE html>
<html>
<head>
	<title>Test Video</title>
	<meta property="og:title" content="Test">
</head>
<body></body>
</html>`;
			let capturedUserAgent: string | undefined = undefined;

			// Custom mock that captures the user agent
			const customFetch = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
				const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
				if (urlString === 'https://www.tnktok.com/@user/video/123456') {
					capturedUserAgent = init?.headers ? (init.headers as Record<string, string>)['user-agent'] : undefined;
					return Promise.resolve(new Response(html, {
						status: 200,
						headers: {
							'content-length': String(Buffer.byteLength(html)),
							'content-type': 'text/html',
						},
					}));
				}
				return originalFetch(url, init);
			};

			global.fetch = customFetch as typeof fetch;
			const { summarize } = await import('@/plugins/tiktok.js');
			await summarize(new URL('https://www.tiktok.com/@user/video/123456'));

			// Should use default userAgent 'bot'
			expect(capturedUserAgent).toBe('bot');
		});
	});
});
