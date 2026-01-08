/**
 * Pixiv Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockJsonResponse,
	setupMockStatusResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('Pixiv Plugin', () => {
	test('URL matching - standard artworks URL should match', async () => {
		const { test } = await import('@/plugins/pixiv.js');
		expect(test(new URL('https://www.pixiv.net/artworks/123456789'))).toBe(true);
		expect(test(new URL('https://www.pixiv.net/artworks/987654321'))).toBe(true);
	});

	test('URL matching - English version artworks URL should match', async () => {
		const { test } = await import('@/plugins/pixiv.js');
		expect(test(new URL('https://www.pixiv.net/en/artworks/12345'))).toBe(true);
		expect(test(new URL('https://www.pixiv.net/en/artworks/67890'))).toBe(true);
	});

	test('URL matching - other domain should not match', async () => {
		const { test } = await import('@/plugins/pixiv.js');
		expect(test(new URL('https://example.com/artworks/123'))).toBe(false);
		expect(test(new URL('https://pixiv.com/artworks/123'))).toBe(false);
	});

	test('URL matching - other paths should not match', async () => {
		const { test } = await import('@/plugins/pixiv.js');
		expect(test(new URL('https://www.pixiv.net/users/123'))).toBe(false);
		expect(test(new URL('https://www.pixiv.net/tags/landscape'))).toBe(false);
		expect(test(new URL('https://www.pixiv.net/'))).toBe(false);
	});

	test('Ajax API response - successful artwork fetch', async () => {
		const { summarize } = await import('@/plugins/pixiv.js');
		const apiResponse = {
			error: false,
			message: '',
			body: {
				title: '美麗的風景插畫',
				description: '這是一幅風景畫作品<br />希望大家喜歡',
				userName: 'test_artist',
				userId: '12345',
				bookmarkCount: 1500,
				pageCount: 3,
				tags: {
					tags: [
						{ tag: '風景' },
						{ tag: 'オリジナル' },
						{ tag: 'イラスト' },
						{ tag: '美麗' },
						{ tag: '自然' },
						{ tag: '空' },
					],
				},
				urls: {
					regular: 'https://i.pximg.net/img-master/img/2024/01/01/12/00/00/12345_p0_master1200.jpg',
				},
				userIllusts: {},
				extraData: {
					meta: {
						twitter: {
							description: '美麗的風景插畫 - 這是一幅風景畫作品',
						},
					},
				},
			},
		};

		setupMockJsonResponse('https://www.pixiv.net/ajax/illust/12345', apiResponse);

		const result = await summarize(new URL('https://www.pixiv.net/artworks/12345'));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('美麗的風景插畫');
		expect(result?.icon).toBe('https://www.pixiv.net/favicon.ico');
		expect(result?.description).toContain('美麗的風景插畫');
		expect(result?.description).toContain('作者: test_artist');
		expect(result?.description).toContain('收藏: 1500');
		expect(result?.description).toContain('標籤: 風景, オリジナル, イラスト, 美麗, 自然');
		expect(result?.thumbnail).toBe('https://pximg.cocomi.eu.org/img-master/img/2024/01/01/12/00/00/12345_p0_master1200.jpg');
		expect(result?.sitename).toBe('Pixiv');
		expect(result?.player.url).toBeNull();
		expect(result?.activityPub).toBeNull();
		expect(result?.fediverseCreator).toBeNull();
	});

	test('Ajax API response - English version URL', async () => {
		const { summarize } = await import('@/plugins/pixiv.js');
		const apiResponse = {
			error: false,
			message: '',
			body: {
				title: 'Sunset Landscape',
				description: 'Beautiful sunset painting',
				userName: 'en_artist',
				userId: '67890',
				bookmarkCount: 2500,
				pageCount: 1,
				tags: {
					tags: [
						{ tag: 'landscape' },
						{ tag: 'sunset' },
					],
				},
				urls: {
					regular: 'https://i.pximg.net/img-master/img/2024/02/01/18/30/00/67890_p0_master1200.jpg',
				},
			},
		};

		setupMockJsonResponse('https://www.pixiv.net/ajax/illust/67890', apiResponse);

		const result = await summarize(new URL('https://www.pixiv.net/en/artworks/67890'));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('Sunset Landscape');
		expect(result?.thumbnail).toBe('https://pximg.cocomi.eu.org/img-master/img/2024/02/01/18/30/00/67890_p0_master1200.jpg');
	});

	test('Ajax API response - HTML tags removed from description', async () => {
		const { summarize } = await import('@/plugins/pixiv.js');
		const apiResponse = {
			error: false,
			message: '',
			body: {
				title: 'Test Title',
				description: '<p>This is a <strong>test</strong> with <a href="#">HTML</a> tags</p>',
				userName: 'artist',
				userId: '11111',
				bookmarkCount: 100,
				pageCount: 1,
				tags: {
					tags: [{ tag: 'test' }],
				},
				urls: {
					regular: 'https://i.pximg.net/img-master/img/2024/03/01/10/00/00/11111_p0_master1200.jpg',
				},
			},
		};

		setupMockJsonResponse('https://www.pixiv.net/ajax/illust/11111', apiResponse);

		const result = await summarize(new URL('https://www.pixiv.net/artworks/11111'));

		expect(result).not.toBeNull();
		expect(result?.description).toContain('This is a test with HTML tags');
		expect(result?.description).not.toContain('<p>');
		expect(result?.description).not.toContain('<strong>');
		expect(result?.description).not.toContain('<a href="#">');
	});

	test('Ajax API response - prefers Twitter description over regular description', async () => {
		const { summarize } = await import('@/plugins/pixiv.js');
		const apiResponse = {
			error: false,
			message: '',
			body: {
				title: 'Twitter Desc Test',
				description: 'Regular description',
				userName: 'artist',
				userId: '22222',
				bookmarkCount: 200,
				pageCount: 1,
				tags: {
					tags: [],
				},
				urls: {
					regular: 'https://i.pximg.net/img-master/img/2024/04/01/10/00/00/22222_p0_master1200.jpg',
				},
				extraData: {
					meta: {
						twitter: {
							description: 'Twitter specific description',
						},
					},
				},
			},
		};

		setupMockJsonResponse('https://www.pixiv.net/ajax/illust/22222', apiResponse);

		const result = await summarize(new URL('https://www.pixiv.net/artworks/22222'));

		expect(result).not.toBeNull();
		expect(result?.description).toContain('Twitter specific description');
		expect(result?.description).not.toContain('Regular description');
	});

	test('Ajax API response - fallback thumbnail from userIllusts', async () => {
		const { summarize } = await import('@/plugins/pixiv.js');
		const apiResponse = {
			error: false,
			message: '',
			body: {
				title: 'Fallback Thumbnail Test',
				description: 'Test',
				userName: 'artist',
				userId: '33333',
				bookmarkCount: 300,
				pageCount: 1,
				tags: {
					tags: [],
				},
				urls: {},
				userIllusts: {
					'33333': {
						url: '/img/2024/05/01/10/00/00/33333_p0_square1200.jpg',
					},
				},
			},
		};

		setupMockJsonResponse('https://www.pixiv.net/ajax/illust/33333', apiResponse);

		const result = await summarize(new URL('https://www.pixiv.net/artworks/33333'));

		expect(result).not.toBeNull();
		expect(result?.thumbnail).toBe('https://pximg.cocomi.eu.org/img-master/img/2024/05/01/10/00/00/33333_p0_master1200.jpg');
	});

	test('Ajax API response - no thumbnail available', async () => {
		const { summarize } = await import('@/plugins/pixiv.js');
		const apiResponse = {
			error: false,
			message: '',
			body: {
				title: 'No Thumbnail',
				description: 'Test',
				userName: 'artist',
				userId: '44444',
				bookmarkCount: 400,
				pageCount: 1,
				tags: {
					tags: [],
				},
				urls: {},
				userIllusts: {},
			},
		};

		setupMockJsonResponse('https://www.pixiv.net/ajax/illust/44444', apiResponse);

		const result = await summarize(new URL('https://www.pixiv.net/artworks/44444'));

		expect(result).not.toBeNull();
		expect(result?.thumbnail).toBeNull();
	});

	test('Ajax API response - error response returns null', async () => {
		const { summarize } = await import('@/plugins/pixiv.js');
		const apiResponse = {
			error: true,
			message: 'Artwork not found',
		};

		setupMockJsonResponse('https://www.pixiv.net/ajax/illust/99999', apiResponse);

		const result = await summarize(new URL('https://www.pixiv.net/artworks/99999'));

		expect(result).toBeNull();
	});

	test('Ajax API response - network error returns null', async () => {
		const { summarize } = await import('@/plugins/pixiv.js');

		setupMockStatusResponse('https://www.pixiv.net/ajax/illust/88888', 500);

		const result = await summarize(new URL('https://www.pixiv.net/artworks/88888'));

		expect(result).toBeNull();
	});

	test('Ajax API response - description clipping for long content', async () => {
		const { summarize } = await import('@/plugins/pixiv.js');
		const longDescription = 'a'.repeat(500);
		const apiResponse = {
			error: false,
			message: '',
			body: {
				title: 'Long Description Test',
				description: longDescription,
				userName: 'artist',
				userId: '55555',
				bookmarkCount: 500,
				pageCount: 1,
				tags: {
					tags: [],
				},
				urls: {
					regular: 'https://i.pximg.net/img-master/img/2024/06/01/10/00/00/55555_p0_master1200.jpg',
				},
			},
		};

		setupMockJsonResponse('https://www.pixiv.net/ajax/illust/55555', apiResponse);

		const result = await summarize(new URL('https://www.pixiv.net/artworks/55555'));

		expect(result).not.toBeNull();
		expect(result?.description).not.toBeNull();
		expect(result?.description!.length).toBeLessThanOrEqual(303); // 300 + '...'
	});

	test('Ajax API response - many tags are limited to 5', async () => {
		const { summarize } = await import('@/plugins/pixiv.js');
		const apiResponse = {
			error: false,
			message: '',
			body: {
				title: 'Many Tags Test',
				description: 'Test',
				userName: 'artist',
				userId: '66666',
				bookmarkCount: 600,
				pageCount: 1,
				tags: {
					tags: [
						{ tag: 'tag1' },
						{ tag: 'tag2' },
						{ tag: 'tag3' },
						{ tag: 'tag4' },
						{ tag: 'tag5' },
						{ tag: 'tag6' },
						{ tag: 'tag7' },
						{ tag: 'tag8' },
					],
				},
				urls: {
					regular: 'https://i.pximg.net/img-master/img/2024/07/01/10/00/00/66666_p0_master1200.jpg',
				},
			},
		};

		setupMockJsonResponse('https://www.pixiv.net/ajax/illust/66666', apiResponse);

		const result = await summarize(new URL('https://www.pixiv.net/artworks/66666'));

		expect(result).not.toBeNull();
		expect(result?.description).toContain('標籤: tag1, tag2, tag3, tag4, tag5');
		expect(result?.description).not.toContain('tag6');
		expect(result?.description).not.toContain('tag7');
	});
});
