/**
 * Iwara Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('Iwara Plugin', () => {
	test('URL matching - www.iwara.tv', async () => {
		const { test: testUrl } = await import('@/plugins/iwara.js');
		expect(testUrl(new URL('https://www.iwara.tv/video/abc123'))).toBe(true);
	});

	test('URL matching - ecchi.iwara.tv', async () => {
		const { test: testUrl } = await import('@/plugins/iwara.js');
		expect(testUrl(new URL('https://ecchi.iwara.tv/video/xyz789'))).toBe(true);
	});

	test('URL matching - other domain should not match', async () => {
		const { test: testUrl } = await import('@/plugins/iwara.js');
		expect(testUrl(new URL('https://example.com/video/123'))).toBe(false);
		expect(testUrl(new URL('https://iwara.tv/video/123'))).toBe(false);
	});

	test('www.iwara.tv is not marked sensitive by default', async () => {
		const { summarize } = await import('@/plugins/iwara.js');
		const html = `<!DOCTYPE html>
<html>
<head>
	<title>Test Video</title>
	<meta property="og:title" content="Test Video">
	<meta property="og:description" content="Test description">
</head>
<body>
	<div id="video-player" poster="https://www.iwara.tv/poster.jpg"></div>
</body>
</html>`;
		setupMockResponse('https://www.iwara.tv/video/abc123', html);

		const summary = await summarize(new URL('https://www.iwara.tv/video/abc123'));

		expect(summary).not.toBeNull();
		expect(summary?.sensitive).toBe(false);
	});

	test('ecchi.iwara.tv is marked sensitive', async () => {
		const { summarize } = await import('@/plugins/iwara.js');
		const html = `<!DOCTYPE html>
<html>
<head>
	<title>Test Video</title>
	<meta property="og:title" content="Test Video">
</head>
<body></body>
</html>`;
		setupMockResponse('https://ecchi.iwara.tv/video/xyz789', html);

		const summary = await summarize(new URL('https://ecchi.iwara.tv/video/xyz789'));

		expect(summary).not.toBeNull();
		expect(summary?.sensitive).toBe(true);
	});

	test('Thumbnail extracted from video player poster', async () => {
		const { summarize } = await import('@/plugins/iwara.js');
		const html = `<!DOCTYPE html>
<html>
<head>
	<title>Test Video</title>
	<meta property="og:title" content="Test Video">
</head>
<body>
	<div id="video-player" poster="/files/poster/video123.jpg"></div>
</body>
</html>`;
		setupMockResponse('https://www.iwara.tv/video/abc123', html);

		const summary = await summarize(new URL('https://www.iwara.tv/video/abc123'));

		expect(summary).not.toBeNull();
		expect(summary?.thumbnail).toBe('https://www.iwara.tv/files/poster/video123.jpg');
	});

	test('Thumbnail extracted from field images fallback', async () => {
		const { summarize } = await import('@/plugins/iwara.js');
		const html = `<!DOCTYPE html>
<html>
<head>
	<title>Test Image Post</title>
	<meta property="og:title" content="Test Image Post">
</head>
<body>
	<div class="field-name-field-images">
		<a href="/files/images/image123.jpg">Image</a>
	</div>
</body>
</html>`;
		setupMockResponse('https://www.iwara.tv/images/def456', html);

		const summary = await summarize(new URL('https://www.iwara.tv/images/def456'));

		expect(summary).not.toBeNull();
		expect(summary?.thumbnail).toBe('https://www.iwara.tv/files/images/image123.jpg');
	});

	test('Description extracted from field-type-text-with-summary', async () => {
		const { summarize } = await import('@/plugins/iwara.js');
		const html = `<!DOCTYPE html>
<html>
<head>
	<title>Test Video</title>
	<meta property="og:title" content="Test Video">
</head>
<body>
	<div class="field-type-text-with-summary">This is the video description text.</div>
</body>
</html>`;
		setupMockResponse('https://www.iwara.tv/video/ghi789', html);

		const summary = await summarize(new URL('https://www.iwara.tv/video/ghi789'));

		expect(summary).not.toBeNull();
		expect(summary?.description).toBe('This is the video description text.');
	});
});
