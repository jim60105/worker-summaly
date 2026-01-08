/**
 * Bilibili Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockJsonResponse,
	setupMockStatusResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('Bilibili Plugin', () => {
	test('URL matching - opus page should match', async () => {
		const { test } = await import('@/plugins/bilibili.js');
		expect(test(new URL('https://www.bilibili.com/opus/123456789'))).toBe(true);
		expect(test(new URL('https://bilibili.com/opus/987654321'))).toBe(true);
	});

	test('URL matching - video page should match (BV format)', async () => {
		const { test } = await import('@/plugins/bilibili.js');
		expect(test(new URL('https://www.bilibili.com/video/BV1234567890'))).toBe(true);
		expect(test(new URL('https://bilibili.com/video/BV1abc123456'))).toBe(true);
	});

	test('URL matching - video page should match (av format)', async () => {
		const { test } = await import('@/plugins/bilibili.js');
		expect(test(new URL('https://www.bilibili.com/video/av12345678'))).toBe(true);
		expect(test(new URL('https://bilibili.com/video/AV98765432'))).toBe(true);
	});

	test('URL matching - other domain should not match', async () => {
		const { test } = await import('@/plugins/bilibili.js');
		expect(test(new URL('https://example.com/opus/123'))).toBe(false);
		expect(test(new URL('https://example.com/video/BV1234567890'))).toBe(false);
	});

	test('Video API response (BV format)', async () => {
		const { summarize } = await import('@/plugins/bilibili.js');
		const apiResponse = {
			code: 0,
			message: '0',
			data: {
				bvid: 'BV1NurGYDELE',
				aid: 123456789,
				pic: 'https://example.com/thumbnail.jpg',
				title: 'Test Video Title',
				pubdate: 1704067200,
				desc: 'This is a test video description',
				duration: 300,
				owner: {
					mid: 12345,
					name: 'Test Uploader',
					face: 'https://example.com/uploader-avatar.jpg',
				},
				dimension: {
					width: 1920,
					height: 1080,
				},
			},
		};

		setupMockJsonResponse('https://api.bilibili.com/x/web-interface/wbi/view?bvid=BV1NurGYDELE', apiResponse);

		const result = await summarize(new URL('https://www.bilibili.com/video/BV1NurGYDELE'));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('Test Video Title');
		expect(result?.icon).toBe('https://example.com/uploader-avatar.jpg');
		expect(result?.description).toBe('This is a test video description');
		expect(result?.thumbnail).toBe('https://example.com/thumbnail.jpg');
		expect(result?.sitename).toBe('Bilibili');
		expect(result?.player.url).toBe('https://player.bilibili.com/player.html?bvid=BV1NurGYDELE&autoplay=0');
		expect(result?.player.width).toBe(1920);
		expect(result?.player.height).toBe(1080);
		expect(result?.activityPub).toBeNull();
		expect(result?.fediverseCreator).toBeNull();
	});

	test('Video API response (av format)', async () => {
		const { summarize } = await import('@/plugins/bilibili.js');
		const apiResponse = {
			code: 0,
			message: '0',
			data: {
				bvid: 'BV1abc123456',
				aid: 12345678,
				pic: 'https://example.com/av-thumbnail.jpg',
				title: 'AV Format Video',
				pubdate: 1704067200,
				desc: 'Description for AV format video',
				duration: 600,
				owner: {
					mid: 67890,
					name: 'AV Uploader',
					face: 'https://example.com/av-avatar.jpg',
				},
			},
		};

		setupMockJsonResponse('https://api.bilibili.com/x/web-interface/wbi/view?aid=12345678', apiResponse);

		const result = await summarize(new URL('https://www.bilibili.com/video/av12345678'));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('AV Format Video');
		expect(result?.thumbnail).toBe('https://example.com/av-thumbnail.jpg');
	});

	test('Video API failure returns null', async () => {
		const { summarize } = await import('@/plugins/bilibili.js');
		const apiResponse = {
			code: -404,
			message: 'Video not found',
		};

		setupMockJsonResponse('https://api.bilibili.com/x/web-interface/wbi/view?bvid=BVnotfound123', apiResponse);

		const result = await summarize(new URL('https://www.bilibili.com/video/BVnotfound123'));
		expect(result).toBeNull();
	});

	test('DYNAMIC_TYPE_DRAW response', async () => {
		const { summarize } = await import('@/plugins/bilibili.js');
		const apiResponse = {
			code: 0,
			data: {
				item: {
					type: 'DYNAMIC_TYPE_DRAW',
					modules: {
						module_author: {
							mid: 123456,
							name: 'Test User',
							face: 'https://example.com/avatar.jpg',
						},
						module_dynamic: {
							desc: {
								text: 'This is a test dynamic with an image',
							},
							major: {
								draw: {
									items: [
										{ src: 'https://example.com/image1.jpg' },
										{ src: 'https://example.com/image2.jpg' },
									],
								},
							},
						},
					},
				},
			},
		};

		setupMockJsonResponse('https://api.bilibili.com/x/polymer/web-dynamic/v1/detail?id=123456789', apiResponse);

		const result = await summarize(new URL('https://www.bilibili.com/opus/123456789'));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('Test User');
		expect(result?.icon).toBe('https://example.com/avatar.jpg');
		expect(result?.description).toBe('This is a test dynamic with an image');
		expect(result?.thumbnail).toBe('https://example.com/image1.jpg');
		expect(result?.sitename).toBe('Bilibili');
		expect(result?.activityPub).toBeNull();
		expect(result?.fediverseCreator).toBeNull();
	});

	test('DYNAMIC_TYPE_ARTICLE response', async () => {
		const { summarize } = await import('@/plugins/bilibili.js');
		const apiResponse = {
			code: 0,
			data: {
				item: {
					type: 'DYNAMIC_TYPE_ARTICLE',
					modules: {
						module_author: {
							mid: 123456,
							name: 'Article Author',
							face: 'https://example.com/avatar2.jpg',
						},
						module_dynamic: {
							major: {
								article: {
									title: 'Test Article Title',
									covers: ['https://example.com/cover1.jpg', 'https://example.com/cover2.jpg'],
								},
							},
						},
					},
				},
			},
		};

		setupMockJsonResponse('https://api.bilibili.com/x/polymer/web-dynamic/v1/detail?id=987654321', apiResponse);

		const result = await summarize(new URL('https://www.bilibili.com/opus/987654321'));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('Article Author');
		expect(result?.description).toBe('Test Article Title');
		expect(result?.thumbnail).toBe('https://example.com/cover1.jpg');
	});

	test('DYNAMIC_TYPE_WORD response', async () => {
		const { summarize } = await import('@/plugins/bilibili.js');
		const apiResponse = {
			code: 0,
			data: {
				item: {
					type: 'DYNAMIC_TYPE_WORD',
					modules: {
						module_author: {
							mid: 123456,
							name: 'Text User',
							face: 'https://example.com/avatar3.jpg',
						},
						module_dynamic: {
							desc: {
								text: 'Just a simple text post',
							},
						},
					},
				},
			},
		};

		setupMockJsonResponse('https://api.bilibili.com/x/polymer/web-dynamic/v1/detail?id=111111111', apiResponse);

		const result = await summarize(new URL('https://www.bilibili.com/opus/111111111'));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('Text User');
		expect(result?.description).toBe('Just a simple text post');
		expect(result?.thumbnail).toBeNull();
	});

	test('Failed API response', async () => {
		const { summarize } = await import('@/plugins/bilibili.js');
		setupMockStatusResponse('https://api.bilibili.com/x/polymer/web-dynamic/v1/detail?id=999999999', 404);

		const result = await summarize(new URL('https://www.bilibili.com/opus/999999999'));

		expect(result).toBeNull();
	});

	test('API response with error code', async () => {
		const { summarize } = await import('@/plugins/bilibili.js');
		const apiResponse = {
			code: -1,
			data: null,
		};

		setupMockJsonResponse('https://api.bilibili.com/x/polymer/web-dynamic/v1/detail?id=888888888', apiResponse);

		const result = await summarize(new URL('https://www.bilibili.com/opus/888888888'));

		expect(result).toBeNull();
	});
});
