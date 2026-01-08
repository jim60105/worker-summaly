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

describe('Bilibili Plugin', () => {
	test('URL matching - opus page should match', async () => {
		const { test } = await import('@/plugins/bilibili.js');
		expect(test(new URL('https://www.bilibili.com/opus/123456789'))).toBe(true);
		expect(test(new URL('https://bilibili.com/opus/987654321'))).toBe(true);
	});

	test('URL matching - video page should not match', async () => {
		const { test } = await import('@/plugins/bilibili.js');
		expect(test(new URL('https://www.bilibili.com/video/BV1234567890'))).toBe(false);
	});

	test('URL matching - other domain should not match', async () => {
		const { test } = await import('@/plugins/bilibili.js');
		expect(test(new URL('https://example.com/opus/123'))).toBe(false);
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

describe('Misskey Plugin', () => {
	test('URL matching - note page should match', async () => {
		const { test } = await import('@/plugins/misskey.js');
		expect(test(new URL('https://misskey.io/notes/abcdef123'))).toBe(true);
		expect(test(new URL('https://misskey.io/notes/xyz789ABC'))).toBe(true);
	});

	test('URL matching - other path should not match', async () => {
		const { test } = await import('@/plugins/misskey.js');
		expect(test(new URL('https://misskey.io/users/testuser'))).toBe(false);
	});

	test('URL matching - other domain should not match', async () => {
		const { test } = await import('@/plugins/misskey.js');
		expect(test(new URL('https://example.com/notes/abc123'))).toBe(false);
	});

	test('Note with image', async () => {
		const { summarize } = await import('@/plugins/misskey.js');
		const apiResponse = {
			id: 'abcdef123',
			user: {
				username: 'testuser',
				name: 'Test Display Name',
				avatarUrl: 'https://misskey.io/avatar.png',
			},
			text: 'This is a test note with an image',
			repliesCount: 5,
			renoteCount: 10,
			reactions: {
				'👍': 3,
				'❤️': 7,
			},
			files: [
				{
					type: 'image/jpeg',
					url: 'https://misskey.io/files/image1.jpg',
					thumbnailUrl: 'https://misskey.io/files/thumb1.jpg',
				},
				{
					type: 'image/png',
					url: 'https://misskey.io/files/image2.png',
				},
			],
		};

		setupMockJsonResponse('https://misskey.io/api/notes/show', apiResponse);

		const result = await summarize(new URL('https://misskey.io/notes/abcdef123'));
		
		expect(result).not.toBeNull();
		expect(result?.title).toBe('Test Display Name');
		expect(result?.icon).toBe('https://misskey.io/avatar.png');
		expect(result?.description).toBe('This is a test note with an image');
		expect(result?.thumbnail).toBe('https://misskey.io/files/image1.jpg');
		expect(result?.sitename).toBe('Misskey.io');
		expect(result?.activityPub).toBe('https://misskey.io/notes/abcdef123');
		expect(result?.fediverseCreator).toBe('@testuser@misskey.io');
	});

	test('Note without image', async () => {
		const { summarize } = await import('@/plugins/misskey.js');
		const apiResponse = {
			id: 'xyz789',
			user: {
				username: 'anotheruser',
				name: null,
				avatarUrl: null,
			},
			text: 'Plain text note without images',
			repliesCount: 0,
			renoteCount: 0,
			reactions: {},
			files: [],
		};

		setupMockJsonResponse('https://misskey.io/api/notes/show', apiResponse);

		const result = await summarize(new URL('https://misskey.io/notes/xyz789'));
		
		expect(result).not.toBeNull();
		expect(result?.title).toBe('anotheruser');
		expect(result?.icon).toBe('https://misskey.io/favicon.ico');
		expect(result?.description).toBe('Plain text note without images');
		expect(result?.thumbnail).toBeNull();
		expect(result?.fediverseCreator).toBe('@anotheruser@misskey.io');
	});

	test('Note with non-image files', async () => {
		const { summarize } = await import('@/plugins/misskey.js');
		const apiResponse = {
			id: 'video123',
			user: {
				username: 'videouser',
				name: 'Video User',
				avatarUrl: 'https://misskey.io/avatar2.png',
			},
			text: 'Note with video file',
			repliesCount: 0,
			renoteCount: 0,
			reactions: {},
			files: [
				{
					type: 'video/mp4',
					url: 'https://misskey.io/files/video.mp4',
				},
				{
					type: 'application/pdf',
					url: 'https://misskey.io/files/document.pdf',
				},
			],
		};

		setupMockJsonResponse('https://misskey.io/api/notes/show', apiResponse);

		const result = await summarize(new URL('https://misskey.io/notes/video123'));
		
		expect(result).not.toBeNull();
		expect(result?.thumbnail).toBeNull(); // No image files
	});

	test('Failed API response', async () => {
		const { summarize } = await import('@/plugins/misskey.js');
		setupMockStatusResponse('https://misskey.io/api/notes/show', 404);

		const result = await summarize(new URL('https://misskey.io/notes/notfound'));
		
		expect(result).toBeNull();
	});
});
