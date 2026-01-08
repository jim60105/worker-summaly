/**
 * Bahamut Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('Bahamut Plugin', () => {
	test('URL matching - forum.gamer.com.tw', async () => {
		const { test: testUrl } = await import('@/plugins/bahamut.js');
		expect(testUrl(new URL('https://forum.gamer.com.tw/C.php?bsn=5786&snA=160982'))).toBe(true);
		expect(testUrl(new URL('https://forum.gamer.com.tw/Co.php?bsn=5786&sn=12345'))).toBe(true);
		expect(testUrl(new URL('https://m.gamer.com.tw/forum/C.php?bsn=5786&snA=160982'))).toBe(true);
	});

	test('URL matching - other domain should not match', async () => {
		const { test: testUrl } = await import('@/plugins/bahamut.js');
		expect(testUrl(new URL('https://example.com/C.php?bsn=5786'))).toBe(false);
	});

	test('Bahamut forum extracts metadata', async () => {
		const { summarize } = await import('@/plugins/bahamut.js');
		const html = `<!DOCTYPE html>
<html>
<head>
	<title>【心得】分享MHR狩獵笛旋律持續時間表 @魔物獵人 系列 哈啦板 - 巴哈姆特</title>
	<meta property="og:title" content="【心得】分享MHR狩獵笛旋律持續時間表 @魔物獵人 系列 哈啦板 - 巴哈姆特">
	<meta property="og:description" content="安安，我是PUMA很忙">
	<meta property="og:image" content="https://truth.bahamut.com.tw/s01/202207/9dc99bd8489e538f05b65554d31a9679.JPG">
	<meta property="og:site_name" content="巴哈姆特電玩資訊站">
	<link rel="icon" href="https://i2.bahamut.com.tw/favicon.ico">
</head>
<body></body>
</html>`;
		setupMockResponse('https://forum.gamer.com.tw/C.php?bsn=5786&snA=160982', html);

		const result = await summarize(new URL('https://forum.gamer.com.tw/C.php?bsn=5786&snA=160982'));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('【心得】分享MHR狩獵笛旋律持續時間表 @魔物獵人 系列 哈啦板 - 巴哈姆特');
		expect(result?.description).toContain('安安，我是PUMA很忙');
		expect(result?.sitename).toBe('巴哈姆特電玩資訊站');
		expect(result?.thumbnail).toBe('https://truth.bahamut.com.tw/s01/202207/9dc99bd8489e538f05b65554d31a9679.JPG');
		expect(result?.sensitive).toBe(false);
	});

	test('Bahamut mobile URL gets normalized to desktop', async () => {
		const { summarize } = await import('@/plugins/bahamut.js');
		const html = `<!DOCTYPE html>
<html>
<head>
	<title>測試標題</title>
	<meta property="og:title" content="測試標題">
</head>
<body></body>
</html>`;
		// Mock the desktop version URL since plugin normalizes mobile to desktop
		setupMockResponse('https://forum.gamer.com.tw/C.php?bsn=5786&snA=160982', html);

		const result = await summarize(new URL('https://m.gamer.com.tw/forum/C.php?bsn=5786&snA=160982'));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('測試標題');
	});

	test('Bahamut marks adult content as sensitive', async () => {
		const { summarize } = await import('@/plugins/bahamut.js');
		const html = `<!DOCTYPE html>
<html>
<head>
	<title>【討論】R-18 討論串 @某板 哈啦板 - 巴哈姆特</title>
	<meta property="og:title" content="【討論】R-18 討論串 @某板 哈啦板 - 巴哈姆特">
	<meta name="rating" content="adult">
</head>
<body></body>
</html>`;
		setupMockResponse('https://forum.gamer.com.tw/C.php?bsn=12345&snA=99999', html);

		const result = await summarize(new URL('https://forum.gamer.com.tw/C.php?bsn=12345&snA=99999'));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('【討論】R-18 討論串 @某板 哈啦板 - 巴哈姆特');
		expect(result?.sensitive).toBe(true);
	});
});
