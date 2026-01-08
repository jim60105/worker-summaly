/**
 * Tests for Cloudflare Workers environment
 */

'use strict';

/* dependencies below */

import { expect, test, describe, beforeEach, afterEach } from 'vitest';
import { summaly } from '@/index.js';
import { StatusError } from '@/utils/status-error.js';
import { getHtmlFixture } from './fixtures/html.js';
import { getOembedFixture } from './fixtures/oembed.js';

/* settings below */

Error.stackTraceLimit = Infinity;

const port = 3060;
const host = `http://localhost:${port}`;

// Mock fetch responses
const mockResponses = new Map<string, Response>();

// Mock global fetch for testing
const originalFetch = global.fetch;

function mockFetch(url: string | URL | Request, init?: RequestInit): Promise<Response> {
	const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
	
	// Try exact match first
	const exactMatch = mockResponses.get(urlString);
	if (exactMatch) {
		return Promise.resolve(exactMatch.clone());
	}
	
	// Try wildcard match (simple pattern matching)
	for (const [pattern, response] of mockResponses.entries()) {
		if (pattern.includes('/*')) {
			const prefix = pattern.replace('/*', '');
			// Match if URL starts with prefix, including trailing slash variations
			if (urlString === prefix || urlString.startsWith(prefix + '/')) {
				return Promise.resolve(response.clone());
			}
		}
	}
	
	// Fall back to original fetch for unmocked requests
	return originalFetch(url, init);
}

function setupMockResponse(url: string, body: string, headers: Record<string, string> = {}) {
	const defaultHeaders = {
		'content-length': String(Buffer.byteLength(body)),
		'content-type': 'text/html',
		...headers,
	};
	mockResponses.set(url, new Response(body, {
		status: 200,
		headers: defaultHeaders,
	}));
}

function setupMockJsonResponse(url: string, data: unknown) {
	const body = JSON.stringify(data);
	const headers = {
		'content-length': String(Buffer.byteLength(body)),
		'content-type': 'application/json',
	};
	mockResponses.set(url, new Response(body, {
		status: 200,
		headers,
	}));
}

function setupMockStatusResponse(url: string, status: number) {
	mockResponses.set(url, new Response(null, { status }));
}

beforeEach(() => {
	// Clear mock responses
	mockResponses.clear();
	// Install mock fetch
	global.fetch = mockFetch as typeof fetch;
});

afterEach(() => {
	// Restore original fetch
	global.fetch = originalFetch;
	// Clear mock responses
	mockResponses.clear();
});

/* tests below */

test('basic', async () => {
	const html = getHtmlFixture('basic.html');
	setupMockResponse(host + '/', html);
	
	expect(await summaly(host)).toEqual({
		title: 'KISS principle',
		icon: null,
		description: null,
		thumbnail: null,
		player: {
			url: null,
			width: null,
			height: null,
			'allow': [
				'autoplay',
				'encrypted-media',
				'fullscreen',
			],
		},
		sitename: 'localhost:3060',
		sensitive: false,
		url: host,  // Note: summaly may normalize URL without trailing slash
		activityPub: null,
		fediverseCreator: null,
	});
});

test('faviconがHTML上で指定されていないが、ルートに存在する場合、正しく設定される', async () => {
	const html = getHtmlFixture('no-favicon.html');
	setupMockResponse(host + '/', html);
	setupMockStatusResponse(host + '/favicon.ico', 200);

	const summary = await summaly(host);
	expect(summary.icon).toBe(`${host}/favicon.ico`);
});

test('faviconがHTML上で指定されていなくて、ルートにも存在しなかった場合 null になる', async () => {
	const html = getHtmlFixture('no-favicon.html');
	setupMockResponse(host + '/', html);
	setupMockStatusResponse(host + '/favicon.ico', 404);

	const summary = await summaly(host);
	expect(summary.icon).toBe(null);
});

test('titleがcleanupされる', async () => {
	const html = getHtmlFixture('og-title.html');
	setupMockResponse(host + '/', html);

	const summary = await summaly(host);
	expect(summary.title).toBe('Strawberry Pasta');
});

describe('OGP', () => {
	test('title', async () => {
		const html = getHtmlFixture('og-title.html');
		setupMockResponse(host, html);
		setupMockResponse(host + '/', html);
		
		const summary = await summaly(host, { followRedirects: false });
		expect(summary.title).toBe('Strawberry Pasta');
	});

	test('description', async () => {
		const html = getHtmlFixture('og-description.html');
		setupMockResponse(host + '/', html);

		const summary = await summaly(host);
		expect(summary.description).toBe('Strawberry Pasta');
	});

	test('site_name', async () => {
		const html = getHtmlFixture('og-site_name.html');
		setupMockResponse(host + '/', html);

		const summary = await summaly(host);
		expect(summary.sitename).toBe('Strawberry Pasta');
	});

	test('thumbnail', async () => {
		const html = getHtmlFixture('og-image.html');
		setupMockResponse(host + '/', html);

		const summary = await summaly(host);
		expect(summary.thumbnail).toBe('https://himasaku.net/himasaku.png');
	});
});

describe('TwitterCard', () => {
	test('title', async () => {
		const html = getHtmlFixture('twitter-title.html');
		setupMockResponse(host + '/', html);

		const summary = await summaly(host);
		expect(summary.title).toBe('Strawberry Pasta');
	});

	test('description', async () => {
		const html = getHtmlFixture('twitter-description.html');
		setupMockResponse(host + '/', html);

		const summary = await summaly(host);
		expect(summary.description).toBe('Strawberry Pasta');
	});

	test('thumbnail', async () => {
		const html = getHtmlFixture('twitter-image.html');
		setupMockResponse(host + '/', html);

		const summary = await summaly(host);
		expect(summary.thumbnail).toBe('https://himasaku.net/himasaku.png');
	});

	test('Player detection - PeerTube:video => video', async () => {
		const html = getHtmlFixture('player-peertube-video.html');
		setupMockResponse(host + '/', html);

		const summary = await summaly(host);
		expect(summary.player.url).toBe('https://example.com/embedurl');
		expect(summary.player.allow).toStrictEqual(['autoplay', 'encrypted-media', 'fullscreen']);
	});

	test('Player detection - Pleroma:video => video', async () => {
		const html = getHtmlFixture('player-pleroma-video.html');
		setupMockResponse(host + '/', html);

		const summary = await summaly(host);
		expect(summary.player.url).toBe('https://example.com/embedurl');
		expect(summary.player.allow).toStrictEqual(['autoplay', 'encrypted-media', 'fullscreen']);
	});

	test('Player detection - Pleroma:image => image', async () => {
		const html = getHtmlFixture('player-pleroma-image.html');
		setupMockResponse(host + '/', html);

		const summary = await summaly(host);
		expect(summary.thumbnail).toBe('https://example.com/imageurl');
	});
});

describe('oEmbed', () => {
	const setupOembed = (oEmbedPath: string, htmlFixture = 'oembed.html') => {
		const html = getHtmlFixture(htmlFixture);
		const oembedData = getOembedFixture(oEmbedPath);
		
		setupMockResponse(host + '/', html);
		setupMockJsonResponse(host + '/oembed.json', oembedData);
	};

	const invalidOembedFiles = [
		'invalid/oembed-child-iframe.json',
		'invalid/oembed-double-iframes.json',
		'invalid/oembed-future.json',
		'invalid/oembed-insecure.json',
		'invalid/oembed-invalid-height.json',
		'invalid/oembed-no-height.json',
		'invalid/oembed-no-version.json',
		'invalid/oembed-old.json',
		'invalid/oembed-photo.json',
		'invalid/oembed-too-powerful.json',
		'invalid/oembed-too-powerful2.json',
	];

	for (const filename of invalidOembedFiles) {
		test(`Invalidity test: ${filename.replace('invalid/', '')}`, async () => {
			setupOembed(filename);
			const summary = await summaly(host);
			expect(summary.player.url).toBe(null);
		});
	}

	test('basic properties', async () => {
		setupOembed('oembed.json');
		const summary = await summaly(host);
		expect(summary.player.url).toBe('https://example.com/');
		expect(summary.player.width).toBe(500);
		expect(summary.player.height).toBe(300);
	});

	test('type: video', async () => {
		setupOembed('oembed-video.json');
		const summary = await summaly(host);
		expect(summary.player.url).toBe('https://example.com/');
		expect(summary.player.width).toBe(500);
		expect(summary.player.height).toBe(300);
	});

	test('max height', async () => {
		setupOembed('oembed-too-tall.json');
		const summary = await summaly(host);
		expect(summary.player.height).toBe(1024);
	});

	test('children are ignored', async () => {
		setupOembed('oembed-iframe-child.json');
		const summary = await summaly(host);
		expect(summary.player.url).toBe('https://example.com/');
	});

	test('allows fullscreen', async () => {
		setupOembed('oembed-allow-fullscreen.json');
		const summary = await summaly(host);
		expect(summary.player.url).toBe('https://example.com/');
		expect(summary.player.allow).toStrictEqual(['fullscreen']);
	});

	test('allows legacy allowfullscreen', async () => {
		setupOembed('oembed-allow-fullscreen-legacy.json');
		const summary = await summaly(host);
		expect(summary.player.url).toBe('https://example.com/');
		expect(summary.player.allow).toStrictEqual(['fullscreen']);
	});

	test('allows safelisted permissions', async () => {
		setupOembed('oembed-allow-safelisted-permissions.json');
		const summary = await summaly(host);
		expect(summary.player.url).toBe('https://example.com/');
		expect(summary.player.allow).toStrictEqual([
			'autoplay', 'clipboard-write', 'fullscreen',
			'encrypted-media', 'picture-in-picture', 'web-share',
		]);
	});

	test('ignores rare permissions', async () => {
		setupOembed('oembed-ignore-rare-permissions.json');
		const summary = await summaly(host);
		expect(summary.player.url).toBe('https://example.com/');
		expect(summary.player.allow).toStrictEqual(['autoplay']);
	});

	test('oEmbed with relative path', async () => {
		setupOembed('oembed.json', 'oembed-relative.html');
		const summary = await summaly(host);
		expect(summary.player.url).toBe('https://example.com/');
	});

	test('oEmbed with nonexistent path', async () => {
		setupOembed('oembed.json', 'oembed-nonexistent-path.html');
		const summary = await summaly(host);
		expect(summary.player.url).toBe(null);
		expect(summary.description).toBe('nonexistent');
	});

	test('oEmbed with wrong path', async () => {
		setupOembed('oembed.json', 'oembed-wrong-path.html');
		const summary = await summaly(host);
		expect(summary.player.url).toBe(null);
		expect(summary.description).toBe('wrong url');
	});

	test('oEmbed with OpenGraph', async () => {
		setupOembed('oembed.json', 'oembed-and-og.html');
		const summary = await summaly(host);
		expect(summary.player.url).toBe('https://example.com/');
		expect(summary.description).toBe('blobcats rule the world');
	});

	test('Invalid oEmbed with valid OpenGraph', async () => {
		setupOembed('invalid/oembed-insecure.json', 'oembed-and-og.html');
		const summary = await summaly(host);
		expect(summary.player.url).toBe(null);
		expect(summary.description).toBe('blobcats rule the world');
	});

	test('oEmbed with og:video', async () => {
		setupOembed('oembed.json', 'oembed-and-og-video.html');
		const summary = await summaly(host);
		expect(summary.player.url).toBe('https://example.com/');
		expect(summary.player.allow).toStrictEqual([]);
	});

	test('width: 100%', async () => {
		setupOembed('oembed-percentage-width.json');
		const summary = await summaly(host);
		expect(summary.player.width).toBe(null);
		expect(summary.player.height).toBe(300);
	});
});

describe('ActivityPub', () => {
	test('Basic', async () => {
		const html = getHtmlFixture('activitypub.html');
		setupMockResponse(host, html);
		setupMockResponse(host + '/', html);

		const summary = await summaly(host, { followRedirects: false });
		expect(summary.activityPub).toBe('https://misskey.test/notes/abcdefg');
	});

	test('Null', async () => {
		const html = getHtmlFixture('basic.html');
		setupMockResponse(host, html);
		setupMockResponse(host + '/', html);

		const summary = await summaly(host, { followRedirects: false });
		expect(summary.activityPub).toBe(null);
	});
});

describe('Fediverse Creator', () => {
	test('Basic', async () => {
		const html = getHtmlFixture('fediverse-creator.html');
		setupMockResponse(host, html);
		setupMockResponse(host + '/', html);

		const summary = await summaly(host, { followRedirects: false });
		expect(summary.fediverseCreator).toBe('@test@example.com');
	});

	test('Null', async () => {
		const html = getHtmlFixture('basic.html');
		setupMockResponse(host, html);
		setupMockResponse(host + '/', html);

		const summary = await summaly(host, { followRedirects: false });
		expect(summary.fediverseCreator).toBeNull();
	});
});

describe('sensitive', () => {
	test('default', async () => {
		const html = getHtmlFixture('basic.html');
		setupMockResponse(host + '/', html);
		expect((await summaly(host)).sensitive).toBe(false);
	});

	test('mixi:content-rating 1', async () => {
		const html = getHtmlFixture('mixi-sensitive.html');
		setupMockResponse(host + '/', html);
		expect((await summaly(host)).sensitive).toBe(true);
	});

	test('meta rating adult', async () => {
		const html = getHtmlFixture('meta-adult-sensitive.html');
		setupMockResponse(host + '/', html);
		expect((await summaly(host)).sensitive).toBe(true);
	});

	test('meta rating rta', async () => {
		const html = getHtmlFixture('meta-rta-sensitive.html');
		setupMockResponse(host + '/', html);
		expect((await summaly(host)).sensitive).toBe(true);
	});

	test('HTTP Header rating adult', async () => {
		const html = getHtmlFixture('basic.html');
		setupMockResponse(host + '/', html, { 'rating': 'adult' });
		expect((await summaly(host)).sensitive).toBe(true);
	});

	test('HTTP Header rating rta', async () => {
		const html = getHtmlFixture('basic.html');
		setupMockResponse(host + '/', html, { 'rating': 'RTA-5042-1996-1400-1577-RTA' });
		expect((await summaly(host)).sensitive).toBe(true);
	});
});

describe('UserAgent', () => {
	test('UA設定が反映されていること', async () => {
		const html = getHtmlFixture('basic.html');
		let ua: string | undefined = undefined;

		// Custom mock that captures the user agent
		const customFetch = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
			const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
			if (urlString === host + '/') {
				ua = init?.headers ? (init.headers as any)['user-agent'] : undefined;
				return Promise.resolve(new Response(html, {
					status: 200,
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				}));
			}
			return originalFetch(url, init);
		};
		
		global.fetch = customFetch as typeof fetch;
		await summaly(host, { userAgent: 'test-ua' });

		expect(ua).toBe('test-ua');
	});
});

describe('content-length limit', () => {
	test('content-lengthの上限以内であればエラーが起こらないこと', async () => {
		const html = getHtmlFixture('basic.html');
		const contentLength = Buffer.byteLength(html);

		setupMockResponse(host + '/', html);

		expect(await summaly(host, { contentLengthLimit: contentLength })).toBeDefined();
	});

	test('content-lengthの上限を超えているとエラーになる事', async () => {
		const html = getHtmlFixture('basic.html');
		const contentLength = Buffer.byteLength(html);

		setupMockResponse(host + '/', html);

		await expect(summaly(host, { contentLengthLimit: contentLength - 1 })).rejects.toThrow();
	});
});

describe('content-length required', () => {
	test('[オプション有効化時] content-lengthが返された場合はエラーとならないこと', async () => {
		const html = getHtmlFixture('basic.html');
		const contentLength = Buffer.byteLength(html);

		setupMockResponse(host + '/', html);

		expect(await summaly(host, { contentLengthRequired: true, contentLengthLimit: contentLength })).toBeDefined();
	});

	test('[オプション有効化時] content-lengthが返されない場合はエラーとなること', async () => {
		const html = getHtmlFixture('basic.html');

		// Mock without content-length header
		mockResponses.set(host + '/', new Response(html, {
			status: 200,
			headers: {
				'content-type': 'text/html',
			},
		}));

		await expect(summaly(host, { contentLengthRequired: true })).rejects.toThrow();
	});

	test('[オプション無効化時] content-lengthが返された場合はエラーとならないこと', async () => {
		const html = getHtmlFixture('basic.html');
		const contentLength = Buffer.byteLength(html);

		setupMockResponse(host + '/', html);

		expect(await summaly(host, { contentLengthRequired: false, contentLengthLimit: contentLength })).toBeDefined();
	});

	test('[オプション無効化時] content-lengthが返されなくてもエラーとならないこと', async () => {
		const html = getHtmlFixture('basic.html');

		// Mock without content-length header
		mockResponses.set(host + '/', new Response(html, {
			status: 200,
			headers: {
				'content-type': 'text/html',
			},
		}));

		expect(await summaly(host, { contentLengthRequired: false })).toBeDefined();
	});
});

describe('Bluesky plugin', () => {
	test('URL matching - standard post URL', async () => {
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

		const summary = await summaly('https://bsky.app/profile/testuser.bsky.social/post/abc123');
		expect(summary.title).toBe('Test User');
		expect(summary.description).toBe('Hello Bluesky! This is a test post.');
		expect(summary.sitename).toBe('Bluesky');
		expect(summary.fediverseCreator).toBe('@testuser.bsky.social');
	});

	test('URL matching - custom domain handle', async () => {
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

		const summary = await summaly('https://bsky.app/profile/user.example.com/post/xyz789');
		expect(summary.title).toBe('Custom User');
		expect(summary.fediverseCreator).toBe('@user.example.com');
	});

	test('bskx.app API - single image post', async () => {
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

		const summary = await summaly('https://bsky.app/profile/testuser.bsky.social/post/img123');
		expect(summary.thumbnail).toBe('https://cdn.bsky.app/img/example-full.jpg');
	});

	test('bskx.app API - multiple images (take first)', async () => {
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

		const summary = await summaly('https://bsky.app/profile/testuser.bsky.social/post/multi123');
		expect(summary.thumbnail).toBe('https://cdn.bsky.app/img/first.jpg');
	});

	test('bskx.app API - video post', async () => {
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

		const summary = await summaly('https://bsky.app/profile/testuser.bsky.social/post/vid123');
		expect(summary.thumbnail).toBe('https://cdn.bsky.app/video/thumbnail.jpg');
	});

	test('bskx.app API - text-only post', async () => {
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

		const summary = await summaly('https://bsky.app/profile/testuser.bsky.social/post/text123');
		expect(summary.thumbnail).toBe(null);
		expect(summary.description).toBe('Just a simple text post without any media.');
	});

	test('bskx.app API - fallback to handle when displayName missing', async () => {
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

		const summary = await summaly('https://bsky.app/profile/testuser.bsky.social/post/noname123');
		expect(summary.title).toBe('testuser.bsky.social');
	});

	test('bskx.app API - default icon when avatar missing', async () => {
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

		const summary = await summaly('https://bsky.app/profile/testuser.bsky.social/post/noavatar123');
		expect(summary.icon).toBe('https://bsky.app/static/favicon-32x32.png');
	});

	test('Fallback to official API when bskx fails', async () => {
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

		const summary = await summaly('https://bsky.app/profile/testuser.bsky.social/post/fallback123');
		expect(summary.title).toBe('Fallback User');
		expect(summary.description).toBe('This came from the official API.');
		expect(summary.sitename).toBe('Bluesky');
	});

	test('Official API - with image embed', async () => {
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

		const summary = await summaly('https://bsky.app/profile/testuser.bsky.social/post/official123');
		expect(summary.thumbnail).toBe('https://cdn.bsky.app/img/official-image.jpg');
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

		const summary = await summaly('https://bsky.app/profile/testuser.bsky.social/post/long123');
		expect(summary.description).not.toBeNull();
		expect(summary.description!.length).toBeLessThanOrEqual(303); // 300 + '...'
		expect(summary.description!.endsWith('...')).toBe(true);
	});
});
