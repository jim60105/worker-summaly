/**
 * Nijie Plugin Tests
 *
 * Tests the Nijie illustration plugin which extracts metadata
 * from Nijie illustration pages and always marks content as sensitive.
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('Nijie Plugin', () => {
	describe('URL matching', () => {
		test('should match nijie.info view.php URL', async () => {
			const { test: testUrl } = await import('@/plugins/nijie.js');
			expect(testUrl(new URL('https://nijie.info/view.php?id=123456'))).toBe(true);
		});

		test('should match nijie.info members.php URL', async () => {
			const { test: testUrl } = await import('@/plugins/nijie.js');
			expect(testUrl(new URL('https://nijie.info/members.php?id=12345'))).toBe(true);
		});

		test('should not match other domains', async () => {
			const { test: testUrl } = await import('@/plugins/nijie.js');
			expect(testUrl(new URL('https://example.com/view.php?id=123'))).toBe(false);
		});
	});

	describe('Summarize functionality', () => {
		test('should extract thumbnail from LD+JSON ImageObject on view.php', async () => {
			const { summarize } = await import('@/plugins/nijie.js');
			const htmlWithLdJson = `<!DOCTYPE html>
<html>
<head>
	<title>Test Nijie Image</title>
	<meta property="og:title" content="Test Image">
	<script type="application/ld+json">
	{
		"@context": "https://schema.org",
		"@type": "ImageObject",
		"name": "Test Image",
		"thumbnailUrl": "https://nijie.info/pic/thumb/test123.jpg"
	}
	</script>
</head>
<body></body>
</html>`;

			setupMockResponse('https://nijie.info/view.php?id=123456', htmlWithLdJson);

			const summary = await summarize(new URL('https://nijie.info/view.php?id=123456'));

			expect(summary).not.toBeNull();
			expect(summary?.thumbnail).toBe('https://nijie.info/pic/thumb/test123.jpg');
			expect(summary?.sensitive).toBe(true);
		});

		test('should keep original thumbnail when no LD+JSON on view.php', async () => {
			const { summarize } = await import('@/plugins/nijie.js');
			const htmlWithOgImage = `<!DOCTYPE html>
<html>
<head>
	<title>Test Nijie Image</title>
	<meta property="og:title" content="Test Image">
	<meta property="og:image" content="https://nijie.info/pic/og/original.jpg">
</head>
<body></body>
</html>`;

			setupMockResponse('https://nijie.info/view.php?id=789012', htmlWithOgImage);

			const summary = await summarize(new URL('https://nijie.info/view.php?id=789012'));

			expect(summary).not.toBeNull();
			expect(summary?.thumbnail).toBe('https://nijie.info/pic/og/original.jpg');
			expect(summary?.sensitive).toBe(true);
		});

		test('should mark all Nijie content as sensitive', async () => {
			const { summarize } = await import('@/plugins/nijie.js');
			const html = `<!DOCTYPE html>
<html>
<head>
	<title>Test Nijie Page</title>
	<meta property="og:title" content="Test Title">
</head>
<body></body>
</html>`;
			setupMockResponse('https://nijie.info/members.php?id=12345', html);

			const summary = await summarize(new URL('https://nijie.info/members.php?id=12345'));

			expect(summary).not.toBeNull();
			expect(summary?.sensitive).toBe(true);
		});
	});
});
