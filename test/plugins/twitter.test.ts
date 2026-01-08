/**
 * Twitter/X Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockJsonResponse,
	setupMockStatusResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('Twitter/X Plugin', () => {
	test('URL matching - x.com and twitter.com status URLs', async () => {
		const { test: testUrl } = await import('@/plugins/twitter.js');
		expect(testUrl(new URL('https://x.com/testuser/status/123456789'))).toBe(true);
		expect(testUrl(new URL('https://twitter.com/testuser/status/123456789'))).toBe(true);
	});

	test('URL matching - non-status URL should not match', async () => {
		const { test: testUrl } = await import('@/plugins/twitter.js');
		expect(testUrl(new URL('https://x.com/testuser'))).toBe(false);
		expect(testUrl(new URL('https://twitter.com/'))).toBe(false);
		expect(testUrl(new URL('https://example.com/status/123456789'))).toBe(false);
	});

	test('x.com URL should be handled by plugin', async () => {
		const { summarize } = await import('@/plugins/twitter.js');
		const mockResponse = {
			tweet: {
				author: {
					screen_name: 'testuser',
					name: 'Test User',
					avatar_url: 'https://pbs.twimg.com/profile_images/123/avatar.jpg',
				},
				url: 'https://x.com/testuser/status/123456789',
				text: 'This is a test tweet with some content.',
				created_timestamp: 1704067200,
				replies: 10,
				retweets: 20,
				likes: 100,
				media: {
					photos: [{ type: 'photo', url: 'https://pbs.twimg.com/media/example.jpg' }],
				},
			},
		};

		setupMockJsonResponse('https://api.fxtwitter.com/i/status/123456789', mockResponse);

		const result = await summarize(new URL('https://x.com/testuser/status/123456789'));
		expect(result).not.toBeNull();
		expect(result?.title).toBe('Test User');
		expect(result?.description).toBe('This is a test tweet with some content.');
		expect(result?.thumbnail).toBe('https://pbs.twimg.com/media/example.jpg?name=large');
		expect(result?.sitename).toBe('X (Twitter)');
		expect(result?.icon).toBe('https://pbs.twimg.com/profile_images/123/avatar.jpg');
	});

	test('twitter.com URL should be handled by plugin', async () => {
		const { summarize } = await import('@/plugins/twitter.js');
		const mockResponse = {
			tweet: {
				author: {
					screen_name: 'testuser',
					name: 'Test User',
					avatar_url: 'https://pbs.twimg.com/profile_images/123/avatar.jpg',
				},
				url: 'https://twitter.com/testuser/status/987654321',
				text: 'This is a test tweet.',
				created_timestamp: 1704067200,
			},
		};

		setupMockJsonResponse('https://api.fxtwitter.com/i/status/987654321', mockResponse);

		const result = await summarize(new URL('https://twitter.com/testuser/status/987654321'));
		expect(result).not.toBeNull();
		expect(result?.title).toBe('Test User');
		expect(result?.description).toBe('This is a test tweet.');
		expect(result?.sitename).toBe('X (Twitter)');
	});

	test('tweet with mosaic should use mosaic thumbnail', async () => {
		const { summarize } = await import('@/plugins/twitter.js');
		const mockResponse = {
			tweet: {
				author: {
					screen_name: 'testuser',
					name: 'Test User',
				},
				url: 'https://x.com/testuser/status/111222333',
				text: 'Tweet with multiple photos',
				created_timestamp: 1704067200,
				media: {
					mosaic: {
						type: 'mosaic_photo',
						formats: { jpeg: 'https://pbs.twimg.com/media/mosaic.jpg' },
					},
					photos: [
						{ type: 'photo', url: 'https://pbs.twimg.com/media/photo1.jpg' },
						{ type: 'photo', url: 'https://pbs.twimg.com/media/photo2.jpg' },
					],
				},
			},
		};

		setupMockJsonResponse('https://api.fxtwitter.com/i/status/111222333', mockResponse);

		const result = await summarize(new URL('https://x.com/testuser/status/111222333'));
		expect(result).not.toBeNull();
		expect(result?.thumbnail).toBe('https://pbs.twimg.com/media/mosaic.jpg');
	});

	test('fallback to vxtwitter API when fxtwitter fails', async () => {
		const { summarize } = await import('@/plugins/twitter.js');
		const vxResponse = {
			user_screen_name: 'testuser',
			user_name: 'Test User',
			user_profile_image_url: 'https://pbs.twimg.com/profile_images/123/avatar.jpg',
			tweetURL: 'https://twitter.com/testuser/status/444555666',
			text: 'Fallback test tweet',
			date_epoch: 1704067200,
			mediaURLs: ['https://pbs.twimg.com/media/fallback.jpg'],
		};

		// Mock fxtwitter to fail
		setupMockStatusResponse('https://api.fxtwitter.com/i/status/444555666', 500);
		// Mock vxtwitter to succeed
		setupMockJsonResponse('https://api.vxtwitter.com/i/status/444555666', vxResponse);

		const result = await summarize(new URL('https://x.com/testuser/status/444555666'));
		expect(result).not.toBeNull();
		expect(result?.title).toBe('Test User');
		expect(result?.description).toBe('Fallback test tweet');
		expect(result?.thumbnail).toBe('https://pbs.twimg.com/media/fallback.jpg');
		expect(result?.sitename).toBe('X (Twitter)');
	});

	test('vxtwitter with combinedMediaUrl should use it as thumbnail', async () => {
		const { summarize } = await import('@/plugins/twitter.js');
		const vxResponse = {
			user_screen_name: 'testuser',
			user_name: 'Test User',
			tweetURL: 'https://twitter.com/testuser/status/555666777',
			text: 'Tweet with combined media',
			date_epoch: 1704067200,
			combinedMediaUrl: 'https://pbs.twimg.com/media/combined.jpg',
			mediaURLs: ['https://pbs.twimg.com/media/photo1.jpg'],
		};

		setupMockStatusResponse('https://api.fxtwitter.com/i/status/555666777', 500);
		setupMockJsonResponse('https://api.vxtwitter.com/i/status/555666777', vxResponse);

		const result = await summarize(new URL('https://x.com/testuser/status/555666777'));
		expect(result).not.toBeNull();
		expect(result?.thumbnail).toBe('https://pbs.twimg.com/media/combined.jpg');
	});

	test('tweet without media should have null thumbnail', async () => {
		const { summarize } = await import('@/plugins/twitter.js');
		const mockResponse = {
			tweet: {
				author: {
					screen_name: 'testuser',
					name: 'Test User',
				},
				url: 'https://x.com/testuser/status/666777888',
				text: 'Tweet without media',
				created_timestamp: 1704067200,
			},
		};

		setupMockJsonResponse('https://api.fxtwitter.com/i/status/666777888', mockResponse);

		const result = await summarize(new URL('https://x.com/testuser/status/666777888'));
		expect(result).not.toBeNull();
		expect(result?.thumbnail).toBe(null);
	});

	test('tweet without author avatar should use default icon', async () => {
		const { summarize } = await import('@/plugins/twitter.js');
		const mockResponse = {
			tweet: {
				author: {
					screen_name: 'testuser',
					name: 'Test User',
				},
				url: 'https://x.com/testuser/status/777888999',
				text: 'Tweet without avatar',
				created_timestamp: 1704067200,
			},
		};

		setupMockJsonResponse('https://api.fxtwitter.com/i/status/777888999', mockResponse);

		const result = await summarize(new URL('https://x.com/testuser/status/777888999'));
		expect(result).not.toBeNull();
		expect(result?.icon).toBe('https://abs.twimg.com/favicons/twitter.2.ico');
	});
});
