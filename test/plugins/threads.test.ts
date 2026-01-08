/**
 * Threads Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockResponse,
	setupMockStatusResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('Threads Plugin', () => {
	test('URL matching - Threads post URLs', async () => {
		const { test: testUrl } = await import('@/plugins/threads.js');
		expect(testUrl(new URL('https://www.threads.com/@username/post/ABC123xyz'))).toBe(true);
		expect(testUrl(new URL('https://threads.com/@user123/post/DEF456'))).toBe(true);
	});

	test('URL matching - non-post URL should not match', async () => {
		const { test: testUrl } = await import('@/plugins/threads.js');
		expect(testUrl(new URL('https://www.threads.com/@username'))).toBe(false);
		expect(testUrl(new URL('https://www.threads.com/'))).toBe(false);
		expect(testUrl(new URL('https://example.com/@user/post/ABC123'))).toBe(false);
	});

	test('正確匹配 Threads 貼文 URL', async () => {
		const { summarize } = await import('@/plugins/threads.js');
		const url = 'https://www.threads.com/@username/post/ABC123xyz';

		// Mock fixthreads response with complete HTML
		const htmlContent = `<!DOCTYPE html>
<html>
<head>
	<title>Test Thread</title>
	<meta property="og:title" content="Test Thread Post">
	<meta property="og:description" content="This is a test thread">
	<link rel="icon" href="https://fixthreads.net/favicon.ico">
</head>
<body></body>
</html>`;
		setupMockResponse('https://fixthreads.net/@username/post/ABC123xyz', htmlContent);

		// Mock favicon check
		setupMockStatusResponse('https://fixthreads.net/favicon.ico', 200);

		const result = await summarize(new URL(url));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('Test Thread Post');
		expect(result?.sitename).toBe('Threads');
		expect(result?.description).toBe('This is a test thread');
	});

	test('支援不帶 www 的 URL', async () => {
		const { summarize } = await import('@/plugins/threads.js');
		const url = 'https://threads.com/@user123/post/DEF456';

		setupMockResponse('https://fixthreads.net/@user123/post/DEF456', `<!DOCTYPE html>
<html>
<head>
	<title>Another Thread</title>
	<meta property="og:title" content="Thread without WWW">
	<link rel="icon" href="https://fixthreads.net/favicon.ico">
</head>
<body></body>
</html>`);

		// Mock favicon check
		setupMockStatusResponse('https://fixthreads.net/favicon.ico', 200);

		const result = await summarize(new URL(url));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('Thread without WWW');
		expect(result?.sitename).toBe('Threads');
	});

	test('fixthreads 失敗時應該回傳 null', async () => {
		const { summarize } = await import('@/plugins/threads.js');
		const url = 'https://www.threads.com/@invalid/post/INVALID';

		// Mock fixthreads failure
		setupMockStatusResponse('https://fixthreads.net/@invalid/post/INVALID', 404);

		const result = await summarize(new URL(url));
		expect(result).toBe(null);
	});
});
