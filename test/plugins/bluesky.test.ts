/**
 * Bluesky Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockJsonResponse,
	setupMockStatusResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('Bluesky Plugin', () => {
	test('URL matching - standard post URL', async () => {
		const { test: testUrl } = await import('@/plugins/bluesky.js');
		expect(testUrl(new URL('https://bsky.app/profile/testuser.bsky.social/post/abc123'))).toBe(true);
		expect(testUrl(new URL('https://bsky.app/profile/user.example.com/post/xyz789'))).toBe(true);
	});

	test('URL matching - non-post URL should not match', async () => {
		const { test: testUrl } = await import('@/plugins/bluesky.js');
		expect(testUrl(new URL('https://bsky.app/profile/testuser.bsky.social'))).toBe(false);
		expect(testUrl(new URL('https://example.com/profile/testuser/post/abc123'))).toBe(false);
	});

	test('bskx.app API - standard post', async () => {
		const { summarize } = await import('@/plugins/bluesky.js');
		const bskxData = {
			posts: [{
				author: {
					avatar: 'https://cdn.bsky.app/avatar/example.jpg',
					displayName: 'Test User',
				},
				record: {
					text: 'Hello Bluesky! This is a test post.',
				},
				replyCount: 5,
				repostCount: 10,
				likeCount: 50,
			}],
		};

		setupMockJsonResponse('https://bskx.app/profile/testuser.bsky.social/post/abc123/json', bskxData);

		const result = await summarize(new URL('https://bsky.app/profile/testuser.bsky.social/post/abc123'));
		expect(result).not.toBeNull();
		expect(result?.title).toBe('Test User');
		expect(result?.description).toBe('Hello Bluesky! This is a test post.');
		expect(result?.sitename).toBe('Bluesky');
		expect(result?.fediverseCreator).toBe('@testuser.bsky.social');
	});

	test('bskx.app API - custom domain handle', async () => {
		const { summarize } = await import('@/plugins/bluesky.js');
		const bskxData = {
			posts: [{
				author: {
					avatar: 'https://cdn.bsky.app/avatar/example.jpg',
					displayName: 'Custom User',
				},
				record: {
					text: 'Post from custom domain.',
				},
				replyCount: 1,
				repostCount: 2,
				likeCount: 3,
			}],
		};

		setupMockJsonResponse('https://bskx.app/profile/user.example.com/post/xyz789/json', bskxData);

		const result = await summarize(new URL('https://bsky.app/profile/user.example.com/post/xyz789'));
		expect(result).not.toBeNull();
		expect(result?.title).toBe('Custom User');
		expect(result?.fediverseCreator).toBe('@user.example.com');
	});

	test('bskx.app API - single image post', async () => {
		const { summarize } = await import('@/plugins/bluesky.js');
		const bskxData = {
			posts: [{
				author: {
					avatar: 'https://cdn.bsky.app/avatar/example.jpg',
					displayName: 'Image Poster',
				},
				record: {
					text: 'Check out this image!',
				},
				replyCount: 5,
				repostCount: 10,
				likeCount: 50,
				embed: {
					$type: 'app.bsky.embed.images#view',
					images: [
						{ fullsize: 'https://cdn.bsky.app/img/example-full.jpg', thumb: 'https://cdn.bsky.app/img/example-thumb.jpg' },
					],
				},
			}],
		};

		setupMockJsonResponse('https://bskx.app/profile/testuser.bsky.social/post/img123/json', bskxData);

		const result = await summarize(new URL('https://bsky.app/profile/testuser.bsky.social/post/img123'));
		expect(result).not.toBeNull();
		expect(result?.thumbnail).toBe('https://cdn.bsky.app/img/example-full.jpg');
	});

	test('bskx.app API - multiple images (take first)', async () => {
		const { summarize } = await import('@/plugins/bluesky.js');
		const bskxData = {
			posts: [{
				author: {
					avatar: 'https://cdn.bsky.app/avatar/example.jpg',
					displayName: 'Multi Image Poster',
				},
				record: {
					text: 'Multiple images!',
				},
				replyCount: 0,
				repostCount: 0,
				likeCount: 0,
				embed: {
					$type: 'app.bsky.embed.images#view',
					images: [
						{ fullsize: 'https://cdn.bsky.app/img/first.jpg' },
						{ fullsize: 'https://cdn.bsky.app/img/second.jpg' },
						{ fullsize: 'https://cdn.bsky.app/img/third.jpg' },
					],
				},
			}],
		};

		setupMockJsonResponse('https://bskx.app/profile/testuser.bsky.social/post/multi123/json', bskxData);

		const result = await summarize(new URL('https://bsky.app/profile/testuser.bsky.social/post/multi123'));
		expect(result).not.toBeNull();
		expect(result?.thumbnail).toBe('https://cdn.bsky.app/img/first.jpg');
	});

	test('bskx.app API - video post', async () => {
		const { summarize } = await import('@/plugins/bluesky.js');
		const bskxData = {
			posts: [{
				author: {
					avatar: 'https://cdn.bsky.app/avatar/example.jpg',
					displayName: 'Video Poster',
				},
				record: {
					text: 'Check out this video!',
				},
				replyCount: 3,
				repostCount: 7,
				likeCount: 25,
				embed: {
					$type: 'app.bsky.embed.video#view',
					thumbnail: 'https://cdn.bsky.app/video/thumbnail.jpg',
				},
			}],
		};

		setupMockJsonResponse('https://bskx.app/profile/testuser.bsky.social/post/vid123/json', bskxData);

		const result = await summarize(new URL('https://bsky.app/profile/testuser.bsky.social/post/vid123'));
		expect(result).not.toBeNull();
		expect(result?.thumbnail).toBe('https://cdn.bsky.app/video/thumbnail.jpg');
	});

	test('bskx.app API - text-only post', async () => {
		const { summarize } = await import('@/plugins/bluesky.js');
		const bskxData = {
			posts: [{
				author: {
					avatar: 'https://cdn.bsky.app/avatar/example.jpg',
					displayName: 'Text Poster',
				},
				record: {
					text: 'Just a simple text post without any media.',
				},
				replyCount: 2,
				repostCount: 1,
				likeCount: 10,
			}],
		};

		setupMockJsonResponse('https://bskx.app/profile/testuser.bsky.social/post/text123/json', bskxData);

		const result = await summarize(new URL('https://bsky.app/profile/testuser.bsky.social/post/text123'));
		expect(result).not.toBeNull();
		expect(result?.thumbnail).toBe(null);
		expect(result?.description).toBe('Just a simple text post without any media.');
	});

	test('bskx.app API - fallback to handle when displayName missing', async () => {
		const { summarize } = await import('@/plugins/bluesky.js');
		const bskxData = {
			posts: [{
				author: {},
				record: {
					text: 'Post without display name.',
				},
				replyCount: 0,
				repostCount: 0,
				likeCount: 0,
			}],
		};

		setupMockJsonResponse('https://bskx.app/profile/testuser.bsky.social/post/noname123/json', bskxData);

		const result = await summarize(new URL('https://bsky.app/profile/testuser.bsky.social/post/noname123'));
		expect(result).not.toBeNull();
		expect(result?.title).toBe('testuser.bsky.social');
	});

	test('bskx.app API - default icon when avatar missing', async () => {
		const { summarize } = await import('@/plugins/bluesky.js');
		const bskxData = {
			posts: [{
				author: {
					displayName: 'No Avatar User',
				},
				record: {
					text: 'Post without avatar.',
				},
				replyCount: 0,
				repostCount: 0,
				likeCount: 0,
			}],
		};

		setupMockJsonResponse('https://bskx.app/profile/testuser.bsky.social/post/noavatar123/json', bskxData);

		const result = await summarize(new URL('https://bsky.app/profile/testuser.bsky.social/post/noavatar123'));
		expect(result).not.toBeNull();
		expect(result?.icon).toBe('https://bsky.app/static/favicon-32x32.png');
	});

	test('Fallback to official API when bskx fails', async () => {
		const { summarize } = await import('@/plugins/bluesky.js');
		// bskx returns 404
		setupMockStatusResponse('https://bskx.app/profile/testuser.bsky.social/post/fallback123/json', 404);

		// Official API responses
		setupMockJsonResponse(
			'https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=testuser.bsky.social',
			{ did: 'did:plc:testuser123' },
		);

		setupMockJsonResponse(
			'https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://did:plc:testuser123/app.bsky.feed.post/fallback123',
			{
				thread: {
					post: {
						author: {
							avatar: 'https://cdn.bsky.app/avatar/fallback.jpg',
							displayName: 'Fallback User',
						},
						record: {
							text: 'This came from the official API.',
						},
						replyCount: 1,
						repostCount: 2,
						likeCount: 3,
					},
				},
			},
		);

		const result = await summarize(new URL('https://bsky.app/profile/testuser.bsky.social/post/fallback123'));
		expect(result).not.toBeNull();
		expect(result?.title).toBe('Fallback User');
		expect(result?.description).toBe('This came from the official API.');
		expect(result?.sitename).toBe('Bluesky');
	});

	test('Official API - with image embed', async () => {
		const { summarize } = await import('@/plugins/bluesky.js');
		setupMockStatusResponse('https://bskx.app/profile/testuser.bsky.social/post/official123/json', 500);

		setupMockJsonResponse(
			'https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=testuser.bsky.social',
			{ did: 'did:plc:testuser456' },
		);

		setupMockJsonResponse(
			'https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://did:plc:testuser456/app.bsky.feed.post/official123',
			{
				thread: {
					post: {
						author: {
							avatar: 'https://cdn.bsky.app/avatar/official.jpg',
							displayName: 'Official User',
						},
						record: {
							text: 'Post with image from official API.',
						},
						replyCount: 5,
						repostCount: 10,
						likeCount: 20,
						embed: {
							$type: 'app.bsky.embed.images#view',
							images: [
								{ fullsize: 'https://cdn.bsky.app/img/official-image.jpg' },
							],
						},
					},
				},
			},
		);

		const result = await summarize(new URL('https://bsky.app/profile/testuser.bsky.social/post/official123'));
		expect(result).not.toBeNull();
		expect(result?.thumbnail).toBe('https://cdn.bsky.app/img/official-image.jpg');
	});

	test('Both APIs fail - plugin returns null', async () => {
		// Mock both APIs to fail
		setupMockStatusResponse('https://bskx.app/profile/testuser.bsky.social/post/fail123/json', 500);
		setupMockStatusResponse('https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=testuser.bsky.social', 500);

		// Import the plugin directly to test its behavior
		const { summarize: blueskySum } = await import('@/plugins/bluesky.js');
		const result = await blueskySum(new URL('https://bsky.app/profile/testuser.bsky.social/post/fail123'));

		// The plugin should return null when both APIs fail
		expect(result).toBe(null);
	});

	test('Long description is clipped', async () => {
		const { summarize } = await import('@/plugins/bluesky.js');
		const longText = 'A'.repeat(400);
		const bskxData = {
			posts: [{
				author: {
					displayName: 'Long Poster',
				},
				record: {
					text: longText,
				},
				replyCount: 0,
				repostCount: 0,
				likeCount: 0,
			}],
		};

		setupMockJsonResponse('https://bskx.app/profile/testuser.bsky.social/post/long123/json', bskxData);

		const result = await summarize(new URL('https://bsky.app/profile/testuser.bsky.social/post/long123'));
		expect(result).not.toBeNull();
		expect(result?.description).not.toBeNull();
		expect(result?.description!.length).toBeLessThanOrEqual(303); // 300 + '...'
		expect(result?.description!.endsWith('...')).toBe(true);
	});
});
