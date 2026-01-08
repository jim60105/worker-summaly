/**
 * Instagram Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockResponse,
	setupMockStatusResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('Instagram Plugin', () => {
	describe('URL matching', () => {
		test('should match standard post URL', async () => {
			const { test: testUrl } = await import('@/plugins/instagram.js');
			expect(testUrl(new URL('https://www.instagram.com/p/ABC123/'))).toBe(true);
		});

		test('should match reel URL', async () => {
			const { test: testUrl } = await import('@/plugins/instagram.js');
			expect(testUrl(new URL('https://www.instagram.com/reel/XYZ789/'))).toBe(true);
		});

		test('should match post URL with username', async () => {
			const { test: testUrl } = await import('@/plugins/instagram.js');
			expect(testUrl(new URL('https://www.instagram.com/user.name_123/p/ABC123/'))).toBe(true);
		});

		test('should match reel URL with username', async () => {
			const { test: testUrl } = await import('@/plugins/instagram.js');
			expect(testUrl(new URL('https://www.instagram.com/user.name/reel/XYZ789/'))).toBe(true);
		});

		test('should not match user profile URL', async () => {
			const { test: testUrl } = await import('@/plugins/instagram.js');
			expect(testUrl(new URL('https://www.instagram.com/username/'))).toBe(false);
		});
	});

	describe('Summarize behavior', () => {
		test('should force sitename to Instagram', async () => {
			const { summarize } = await import('@/plugins/instagram.js');
			const html = `<!DOCTYPE html>
<html>
<head>
	<meta property="og:title" content="Instagram Post">
	<meta property="og:site_name" content="Not Instagram">
</head>
<body></body>
</html>`;
			setupMockResponse('https://www.instagram.com/p/ABC123/', html);

			const result = await summarize(new URL('https://www.instagram.com/p/ABC123/'));

			expect(result).not.toBeNull();
			expect(result?.sitename).toBe('Instagram');
		});

		test('should return result with minimal metadata', async () => {
			const { summarize } = await import('@/plugins/instagram.js');
			const html = `<!DOCTYPE html>
<html>
<head>
	<title>Instagram</title>
</head>
<body></body>
</html>`;
			setupMockResponse('https://www.instagram.com/p/MIN123/', html);

			const result = await summarize(new URL('https://www.instagram.com/p/MIN123/'));

			expect(result).not.toBeNull();
			expect(result?.sitename).toBe('Instagram');
		});

		test('should handle scraping errors gracefully', async () => {
			const { summarize } = await import('@/plugins/instagram.js');
			// Mock to fail
			setupMockStatusResponse('https://www.instagram.com/p/ERROR123/', 500);

			const result = await summarize(new URL('https://www.instagram.com/p/ERROR123/'));

			expect(result).toBeNull();
		});
	});
});
