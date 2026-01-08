/**
 * Komiflo Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockResponse,
	setupMockJsonResponse,
	setupMockStatusResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('Komiflo Plugin', () => {
	test('URL matching - komiflo.com', async () => {
		const { test: testUrl } = await import('@/plugins/komiflo.js');
		expect(testUrl(new URL('https://komiflo.com/comics/12345'))).toBe(true);
		expect(testUrl(new URL('https://komiflo.com/#!/comics/67890'))).toBe(true);
	});

	test('URL matching - other domain should not match', async () => {
		const { test: testUrl } = await import('@/plugins/komiflo.js');
		expect(testUrl(new URL('https://example.com/comics/123'))).toBe(false);
	});

	test('All Komiflo content is marked sensitive', async () => {
		const { summarize } = await import('@/plugins/komiflo.js');
		const html = `<!DOCTYPE html>
<html>
<head>
	<title>Test Page</title>
	<meta property="og:title" content="Test Page">
</head>
<body></body>
</html>`;
		setupMockResponse('https://komiflo.com/page/123', html);

		const summary = await summarize(new URL('https://komiflo.com/page/123'));

		expect(summary).not.toBeNull();
		expect(summary?.sensitive).toBe(true);
	});

	test('Comics page with valid thumbnail keeps original', async () => {
		const { summarize } = await import('@/plugins/komiflo.js');
		const htmlWithThumbnail = `<!DOCTYPE html>
<html>
<head>
	<title>Test Comic</title>
	<meta property="og:title" content="Test Comic">
	<meta property="og:image" content="https://komiflo.com/valid/thumbnail.jpg">
</head>
<body></body>
</html>`;
		setupMockResponse('https://komiflo.com/comics/12345', htmlWithThumbnail);

		const summary = await summarize(new URL('https://komiflo.com/comics/12345'));

		expect(summary).not.toBeNull();
		expect(summary?.thumbnail).toBe('https://komiflo.com/valid/thumbnail.jpg');
		expect(summary?.sensitive).toBe(true);
	});

	test('Comics page with placeholder thumbnail fetches from API', async () => {
		const { summarize } = await import('@/plugins/komiflo.js');
		const htmlWithPlaceholder = `<!DOCTYPE html>
<html>
<head>
	<title>Test Comic</title>
	<meta property="og:title" content="Test Comic">
	<meta property="og:image" content="https://komiflo.com/ogp_logo.png">
</head>
<body></body>
</html>`;
		setupMockResponse('https://komiflo.com/comics/54321', htmlWithPlaceholder);

		const apiResponse = {
			content: {
				named_imgs: {
					cover: {
						filename: 'cover_54321.jpg',
						variants: ['346_mobile', '692_tablet'],
					},
				},
			},
		};
		setupMockJsonResponse('https://api.komiflo.com/content/id/54321', apiResponse);

		const summary = await summarize(new URL('https://komiflo.com/comics/54321'));

		expect(summary).not.toBeNull();
		expect(summary?.thumbnail).toBe('https://t.komiflo.com/346_mobile/cover_54321.jpg');
		expect(summary?.sensitive).toBe(true);
	});

	test('Comics page API returns thumbnail from children', async () => {
		const { summarize } = await import('@/plugins/komiflo.js');
		const htmlWithFavicon = `<!DOCTYPE html>
<html>
<head>
	<title>Test Comic</title>
	<meta property="og:title" content="Test Comic">
	<meta property="og:image" content="https://komiflo.com/favicon.ico">
</head>
<body></body>
</html>`;
		setupMockResponse('https://komiflo.com/comics/99999', htmlWithFavicon);

		const apiResponse = {
			content: {
				children: [{
					named_imgs: {
						cover: {
							filename: 'child_cover.jpg',
							variants: ['346_mobile'],
						},
					},
				}],
			},
		};
		setupMockJsonResponse('https://api.komiflo.com/content/id/99999', apiResponse);

		const summary = await summarize(new URL('https://komiflo.com/comics/99999'));

		expect(summary).not.toBeNull();
		expect(summary?.thumbnail).toBe('https://t.komiflo.com/346_mobile/child_cover.jpg');
	});

	test('Comics page API failure keeps original thumbnail', async () => {
		const { summarize } = await import('@/plugins/komiflo.js');
		const htmlWithFavicon = `<!DOCTYPE html>
<html>
<head>
	<title>Test Comic</title>
	<meta property="og:title" content="Test Comic">
	<meta property="og:image" content="https://komiflo.com/favicon.ico">
</head>
<body></body>
</html>`;
		setupMockResponse('https://komiflo.com/comics/88888', htmlWithFavicon);
		setupMockStatusResponse('https://api.komiflo.com/content/id/88888', 500);

		const summary = await summarize(new URL('https://komiflo.com/comics/88888'));

		expect(summary).not.toBeNull();
		expect(summary?.thumbnail).toBe('https://komiflo.com/favicon.ico');
		expect(summary?.sensitive).toBe(true);
	});
});
