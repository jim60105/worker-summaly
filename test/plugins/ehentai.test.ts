/**
 * E-Hentai Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockJsonResponse,
	setupMockStatusResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('E-Hentai Plugin', () => {
	test('URL matching - E-Hentai gallery URL', async () => {
		const { test: testUrl } = await import('@/plugins/ehentai.js');
		expect(testUrl(new URL('https://e-hentai.org/g/123456/abc123def/'))).toBe(true);
		expect(testUrl(new URL('https://exhentai.org/g/654321/xyz789abc/'))).toBe(true);
	});

	test('URL matching - non-gallery URL should not match', async () => {
		const { test: testUrl } = await import('@/plugins/ehentai.js');
		expect(testUrl(new URL('https://e-hentai.org/'))).toBe(false);
		expect(testUrl(new URL('https://e-hentai.org/popular'))).toBe(false);
		expect(testUrl(new URL('https://example.com/g/123456/abc123/'))).toBe(false);
	});

	test('正確匹配 E-Hentai 圖庫 URL', async () => {
		const { summarize } = await import('@/plugins/ehentai.js');
		const galleryId = 123456;
		const galleryToken = 'abc123def';
		const url = `https://e-hentai.org/g/${galleryId}/${galleryToken}/`;

		// Mock E-Hentai API response
		setupMockJsonResponse('https://api.e-hentai.org/api.php', {
			gmetadata: [{
				gid: galleryId,
				token: galleryToken,
				title: 'Test Gallery',
				title_jpn: 'テストギャラリー',
				category: 'Manga',
				thumb: 'https://e-hentai.org/thumb.jpg',
				uploader: 'testuser',
				posted: '1234567890',
				filecount: '10',
				rating: '4.5',
				tags: [
					'artist:test_artist',
					'female:test_tag',
					'language:japanese',
					'parody:test_series',
				],
			}],
		});

		const result = await summarize(new URL(url));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('テストギャラリー');
		expect(result?.sitename).toBe('E-Hentai');
		expect(result?.icon).toBe('https://e-hentai.org/favicon.ico');
		expect(result?.thumbnail).toBe('https://e-hentai.org/thumb.jpg');
		expect(result?.sensitive).toBe(true);
		expect(result?.description).toContain('類別: Manga');
		expect(result?.description).toContain('評分: 4.5');
		expect(result?.description).toContain('上傳者: testuser');
		expect(result?.description).toContain('繪師: test_artist');
		expect(result?.description).toContain('女性: test_tag');
		expect(result?.description).toContain('語言: japanese');
		expect(result?.description).toContain('原作: test_series');
	});

	test('正確匹配 ExHentai URL', async () => {
		const { summarize } = await import('@/plugins/ehentai.js');
		const galleryId = 654321;
		const galleryToken = 'xyz789abc';
		const url = `https://exhentai.org/g/${galleryId}/${galleryToken}/`;

		setupMockJsonResponse('https://api.e-hentai.org/api.php', {
			gmetadata: [{
				gid: galleryId,
				token: galleryToken,
				title: 'ExH Gallery',
				title_jpn: '',
				category: 'Doujinshi',
				thumb: 'https://exhentai.org/thumb.jpg',
				uploader: 'exuser',
				posted: '9876543210',
				filecount: '20',
				rating: '4.8',
				tags: ['character:test_char', 'group:test_group'],
			}],
		});

		const result = await summarize(new URL(url));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('ExH Gallery');
		expect(result?.sitename).toBe('E-Hentai');
		expect(result?.sensitive).toBe(true);
		expect(result?.description).toContain('角色: test_char');
		expect(result?.description).toContain('社團: test_group');
	});

	test('API 失敗時應該回傳 null', async () => {
		const { summarize } = await import('@/plugins/ehentai.js');
		const url = 'https://e-hentai.org/g/999999/invalid/';

		// Mock API failure
		setupMockStatusResponse('https://api.e-hentai.org/api.php', 404);

		const result = await summarize(new URL(url));
		expect(result).toBe(null);
	});
});
