/**
 * PTT Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockResponse,
	setupMockStatusResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('PTT Plugin', () => {
	test('URL matching - valid article URL', async () => {
		const { test: testUrl } = await import('@/plugins/ptt.js');
		expect(testUrl(new URL('https://www.ptt.cc/bbs/Gossiping/M.1234567890.A.ABC.html'))).toBe(true);
		expect(testUrl(new URL('https://www.ptt.cc/bbs/Test/M.1234567890.A.XYZ.html'))).toBe(true);
	});

	test('URL matching - invalid URLs', async () => {
		const { test: testUrl } = await import('@/plugins/ptt.js');
		expect(testUrl(new URL('https://www.ptt.cc/'))).toBe(false);
		expect(testUrl(new URL('https://www.ptt.cc/bbs/'))).toBe(false);
		expect(testUrl(new URL('https://example.com/bbs/Test/M.1234567890.A.XYZ.html'))).toBe(false);
	});

	test('Summarize - extracts metadata from PTT article', async () => {
		const { summarize } = await import('@/plugins/ptt.js');
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta property="og:title" content="[新聞] 測試標題">
				<meta property="og:description" content="測試文章描述內容">
			</head>
			<body>
				<div id="main-content">
					這是文章內容
					https://example.com/image.jpg
				</div>
			</body>
			</html>
		`;
		setupMockResponse('https://www.ptt.cc/bbs/Gossiping/M.1234567890.A.ABC.html', html);

		const result = await summarize(new URL('https://www.ptt.cc/bbs/Gossiping/M.1234567890.A.ABC.html'));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('[新聞] 測試標題');
		expect(result?.description).toBe('測試文章描述內容');
		expect(result?.sitename).toBe('PTT');
		expect(result?.icon).toBe('https://www.ptt.cc/favicon.ico');
		expect(result?.thumbnail).toBe('https://example.com/image.jpg');
	});

	test('Summarize - handles news article format', async () => {
		const { summarize } = await import('@/plugins/ptt.js');
		const html = `
			<!DOCTYPE html>
			<html>
			<head>
				<meta property="og:title" content="[新聞] 新聞標題測試">
				<meta property="og:description" content="1.媒體來源: 某新聞網">
			</head>
			<body>
				<div id="main-content">
					1.媒體來源: 某新聞網
					2.記者署名: 記者
					3.完整新聞標題: 新聞標題
					4.完整新聞內文:
					這是新聞內容
					5.完整新聞連結:
					https://news.example.com
				</div>
			</body>
			</html>
		`;
		setupMockResponse('https://www.ptt.cc/bbs/Gossiping/M.1234567890.A.DEF.html', html);

		const result = await summarize(new URL('https://www.ptt.cc/bbs/Gossiping/M.1234567890.A.DEF.html'));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('[新聞] 新聞標題測試');
		expect(result?.description).toContain('這是新聞內容');
	});

	test('Summarize - returns null on fetch error', async () => {
		const { summarize } = await import('@/plugins/ptt.js');
		// Mock a 404 response
		setupMockStatusResponse('https://www.ptt.cc/bbs/Test/M.9999999999.A.ZZZ.html', 404);

		const result = await summarize(new URL('https://www.ptt.cc/bbs/Test/M.9999999999.A.ZZZ.html'));

		expect(result).toBeNull();
	});
});
