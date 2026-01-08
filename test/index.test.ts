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

describe('PChome 24h Plugin', () => {
	const productId = 'DYAJC9-A900DPLRD';
	const productUrl = `https://24h.pchome.com.tw/prod/${productId}`;
	const basicApiUrl = `https://ecapi-cdn.pchome.com.tw/ecshop/prodapi/v2/prod/${productId}&fields=Name,Nick,Price,Pic&_callback=jsonp_prod`;
	const descApiUrl = `https://ecapi-cdn.pchome.com.tw/cdn/ecshop/prodapi/v2/prod/${productId}/desc&fields=Meta,SloganInfo&_callback=jsonp_desc`;

	test('URL matching - valid product URL', async () => {
		const basicResponse = `jsonp_prod({
			"Id": "${productId}",
			"Name": "\\u5546\\u54c1\\u540d\\u7a31",
			"Nick": "<span>\\u7c21\\u77ed\\u540d\\u7a31</span>",
			"Price": { "P": 1990 },
			"Pic": { "B": "/items/DYAJC9A900DPLRD/000001.jpg" }
		})`;
		
		const descResponse = `jsonp_desc({
			"BrandNames": ["\\u54c1\\u724c\\u540d"],
			"SloganInfo": ["\\u6a19\\u8a9e1", "\\u6a19\\u8a9e2"]
		})`;

		mockResponses.set(basicApiUrl, new Response(basicResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(basicResponse)),
			},
		}));

		mockResponses.set(descApiUrl, new Response(descResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(descResponse)),
			},
		}));

		const summary = await summaly(productUrl);
		
		expect(summary.title).toBe('簡短名稱');
		expect(summary.sitename).toBe('PChome 24h');
		expect(summary.icon).toBe('https://24h.pchome.com.tw/favicon.ico');
		expect(summary.thumbnail).toBe('https://img.pchome.com.tw/cs/items/DYAJC9A900DPLRD/000001.jpg');
		expect(summary.description).toContain('標語1');
		expect(summary.description).toContain('標語2');
		expect(summary.description).toContain('品牌: 品牌名');
		expect(summary.description).toContain('價格: NT$ 1,990');
	});

	test('JSONP parsing', async () => {
		const basicResponse = `jsonp_prod({
			"Id": "${productId}",
			"Name": "Test Product",
			"Nick": "Short Name",
			"Price": { "P": 999 },
			"Pic": { "B": "/test.jpg" }
		})`;
		
		const descResponse = `jsonp_desc({
			"BrandNames": ["TestBrand"],
			"SloganInfo": ["Test Slogan"]
		})`;

		mockResponses.set(basicApiUrl, new Response(basicResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(basicResponse)),
			},
		}));

		mockResponses.set(descApiUrl, new Response(descResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(descResponse)),
			},
		}));

		const summary = await summaly(productUrl);
		
		expect(summary.title).toBe('Short Name');
		expect(summary.description).toContain('Test Slogan');
		expect(summary.description).toContain('品牌: TestBrand');
		expect(summary.description).toContain('價格: NT$ 999');
	});

	test('Unicode decoding', async () => {
		const basicResponse = `jsonp_prod({
			"Id": "${productId}",
			"Name": "\\u53f0\\u7063\\u5546\\u54c1",
			"Nick": "\\u53f0\\u7063",
			"Price": { "P": 1000 },
			"Pic": { "B": "/test.jpg" }
		})`;
		
		const descResponse = `jsonp_desc({
			"BrandNames": ["\\u53f0\\u7063\\u54c1\\u724c"],
			"SloganInfo": ["\\u9ad8\\u54c1\\u8cea"]
		})`;

		mockResponses.set(basicApiUrl, new Response(basicResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(basicResponse)),
			},
		}));

		mockResponses.set(descApiUrl, new Response(descResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(descResponse)),
			},
		}));

		const summary = await summaly(productUrl);
		
		expect(summary.title).toBe('台灣');
		expect(summary.description).toContain('高品質');
		expect(summary.description).toContain('品牌: 台灣品牌');
	});

	test('HTML content cleanup in Nick field', async () => {
		const basicResponse = `jsonp_prod({
			"Id": "${productId}",
			"Name": "Full Name",
			"Nick": "<div><span>Clean <strong>Name</strong></span></div>",
			"Price": { "P": 500 },
			"Pic": { "B": "/test.jpg" }
		})`;
		
		const descResponse = `jsonp_desc({
			"BrandNames": [],
			"SloganInfo": []
		})`;

		mockResponses.set(basicApiUrl, new Response(basicResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(basicResponse)),
			},
		}));

		mockResponses.set(descApiUrl, new Response(descResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(descResponse)),
			},
		}));

		const summary = await summaly(productUrl);
		
		expect(summary.title).toBe('Clean Name');
		expect(summary.title).not.toContain('<');
		expect(summary.title).not.toContain('>');
	});

	test('Price formatting', async () => {
		const basicResponse = `jsonp_prod({
			"Id": "${productId}",
			"Name": "Product",
			"Nick": "Product",
			"Price": { "P": 1234567 },
			"Pic": { "B": "/test.jpg" }
		})`;
		
		const descResponse = `jsonp_desc({
			"BrandNames": [],
			"SloganInfo": []
		})`;

		mockResponses.set(basicApiUrl, new Response(basicResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(basicResponse)),
			},
		}));

		mockResponses.set(descApiUrl, new Response(descResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(descResponse)),
			},
		}));

		const summary = await summaly(productUrl);
		
		expect(summary.description).toContain('價格: NT$ 1,234,567');
	});

	test('Fallback to Name when Nick is empty', async () => {
		const basicResponse = `jsonp_prod({
			"Id": "${productId}",
			"Name": "Full Product Name",
			"Nick": "",
			"Price": { "P": 100 },
			"Pic": { "B": "/test.jpg" }
		})`;
		
		const descResponse = `jsonp_desc({
			"BrandNames": [],
			"SloganInfo": []
		})`;

		mockResponses.set(basicApiUrl, new Response(basicResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(basicResponse)),
			},
		}));

		mockResponses.set(descApiUrl, new Response(descResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(descResponse)),
			},
		}));

		const summary = await summaly(productUrl);
		
		expect(summary.title).toBe('Full Product Name');
	});

	test('Image URL construction', async () => {
		const basicResponse = `jsonp_prod({
			"Id": "${productId}",
			"Name": "Product",
			"Nick": "Product",
			"Price": { "P": 100 },
			"Pic": { "B": "/items/TEST123456/image.jpg" }
		})`;
		
		const descResponse = `jsonp_desc({
			"BrandNames": [],
			"SloganInfo": []
		})`;

		mockResponses.set(basicApiUrl, new Response(basicResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(basicResponse)),
			},
		}));

		mockResponses.set(descApiUrl, new Response(descResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(descResponse)),
			},
		}));

		const summary = await summaly(productUrl);
		
		expect(summary.thumbnail).toBe('https://img.pchome.com.tw/cs/items/TEST123456/image.jpg');
	});

	test('Image URL with backslashes', async () => {
		const basicResponse = `jsonp_prod({
			"Id": "${productId}",
			"Name": "Product",
			"Nick": "Product",
			"Price": { "P": 100 },
			"Pic": { "B": "\\\\items\\\\TEST\\\\image.jpg" }
		})`;
		
		const descResponse = `jsonp_desc({
			"BrandNames": [],
			"SloganInfo": []
		})`;

		mockResponses.set(basicApiUrl, new Response(basicResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(basicResponse)),
			},
		}));

		mockResponses.set(descApiUrl, new Response(descResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(descResponse)),
			},
		}));

		const summary = await summaly(productUrl);
		
		expect(summary.thumbnail).toBe('https://img.pchome.com.tw/csitemsTESTimage.jpg');
		expect(summary.thumbnail).not.toContain('\\');
	});

	test('No image when Pic.B is empty', async () => {
		const basicResponse = `jsonp_prod({
			"Id": "${productId}",
			"Name": "Product",
			"Nick": "Product",
			"Price": { "P": 100 },
			"Pic": { "B": "" }
		})`;
		
		const descResponse = `jsonp_desc({
			"BrandNames": [],
			"SloganInfo": []
		})`;

		mockResponses.set(basicApiUrl, new Response(basicResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(basicResponse)),
			},
		}));

		mockResponses.set(descApiUrl, new Response(descResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(descResponse)),
			},
		}));

		const summary = await summaly(productUrl);
		
		expect(summary.thumbnail).toBe(null);
	});

	test('Description API failure handled gracefully', async () => {
		const basicResponse = `jsonp_prod({
			"Id": "${productId}",
			"Name": "Product",
			"Nick": "Product",
			"Price": { "P": 999 },
			"Pic": { "B": "/test.jpg" }
		})`;

		mockResponses.set(basicApiUrl, new Response(basicResponse, {
			status: 200,
			headers: {
				'content-type': 'application/json',
				'content-length': String(Buffer.byteLength(basicResponse)),
			},
		}));

		// Simulate 404 for description API
		mockResponses.set(descApiUrl, new Response(null, { status: 404 }));

		const summary = await summaly(productUrl);
		
		expect(summary.title).toBe('Product');
		expect(summary.description).toContain('價格: NT$ 999');
	});
});

describe('Instagram Plugin', () => {
	describe('URL matching', () => {
		test('should match standard post URL', async () => {
			const url = 'https://www.instagram.com/p/ABC123/';
			const html = getHtmlFixture('basic.html');
			setupMockResponse(url, html);
			
			const result = await summaly(url);
			expect(result).toBeDefined();
			expect(result.sitename).toBe('Instagram');
		});

		test('should match reel URL', async () => {
			const url = 'https://www.instagram.com/reel/XYZ789/';
			const html = getHtmlFixture('basic.html');
			setupMockResponse(url, html);
			
			const result = await summaly(url);
			expect(result).toBeDefined();
			expect(result.sitename).toBe('Instagram');
		});

		test('should match post URL with username', async () => {
			const url = 'https://www.instagram.com/user.name_123/p/ABC123/';
			const html = getHtmlFixture('basic.html');
			setupMockResponse(url, html);
			
			const result = await summaly(url);
			expect(result).toBeDefined();
			expect(result.sitename).toBe('Instagram');
		});

		test('should match reel URL with username', async () => {
			const url = 'https://www.instagram.com/user.name/reel/XYZ789/';
			const html = getHtmlFixture('basic.html');
			setupMockResponse(url, html);
			
			const result = await summaly(url);
			expect(result).toBeDefined();
			expect(result.sitename).toBe('Instagram');
		});

		test('should not match user profile URL', async () => {
			const url = 'https://www.instagram.com/username/';
			const html = getHtmlFixture('basic.html');
			setupMockResponse(url, html);
			
			const result = await summaly(url);
			// Should use general scraping, not Instagram plugin
			expect(result.sitename).not.toBe('Instagram');
		});
	});

	describe('Error handling', () => {
		test('should handle scraping errors gracefully', async () => {
			const url = 'https://www.instagram.com/p/ERROR123/';
			
			// Mock to fail
			setupMockStatusResponse(url, 500);
			
			await expect(summaly(url)).rejects.toThrow();
		});

		test('should force sitename to Instagram even with minimal metadata', async () => {
			const url = 'https://www.instagram.com/p/MIN123/';
			const html = getHtmlFixture('no-metas.html');
			setupMockResponse(url, html);
			
			const result = await summaly(url);
			expect(result.sitename).toBe('Instagram');
		});
	});
});

describe('TikTok Plugin', () => {
	describe('URL matching', () => {
		test('should match standard video URL', async () => {
			const url = 'https://www.tiktok.com/@username/video/1234567890';
			const html = getHtmlFixture('basic.html');
			setupMockResponse('https://www.tnktok.com/@username/video/1234567890', html);
			
			const result = await summaly(url);
			expect(result).toBeDefined();
			expect(result.sitename).toBe('TikTok');
		});

		test('should match video URL without www', async () => {
			const url = 'https://tiktok.com/@user.name-123/video/9876543210';
			const html = getHtmlFixture('basic.html');
			setupMockResponse('https://tnktok.com/@user.name-123/video/9876543210', html);
			
			const result = await summaly(url);
			expect(result).toBeDefined();
			expect(result.sitename).toBe('TikTok');
		});

		test('should match short link from vm.tiktok.com', async () => {
			const url = 'https://vm.tiktok.com/ABC123/';
			const html = getHtmlFixture('basic.html');
			setupMockResponse('https://vm.tnktok.com/ABC123/', html);
			
			const result = await summaly(url);
			expect(result).toBeDefined();
			expect(result.sitename).toBe('TikTok');
		});

		test('should match short link from vt.tiktok.com', async () => {
			const url = 'https://vt.tiktok.com/XYZ789/';
			const html = getHtmlFixture('basic.html');
			setupMockResponse('https://vt.tnktok.com/XYZ789/', html);
			
			const result = await summaly(url);
			expect(result).toBeDefined();
			expect(result.sitename).toBe('TikTok');
		});

		test('should not match non-video TikTok URL', async () => {
			const url = 'https://www.tiktok.com/@username';
			const html = getHtmlFixture('basic.html');
			setupMockResponse(url, html);
			
			const result = await summaly(url);
			// Should use general scraping, not TikTok plugin
			expect(result.sitename).not.toBe('TikTok');
		});
	});

	describe('Proxy service and error handling', () => {
		test('should return null when tnktok fails', async () => {
			const url = 'https://www.tiktok.com/@user/video/999999';
			
			// Mock tnktok to fail
			setupMockStatusResponse('https://www.tnktok.com/@user/video/999999', 500);
			
			// Import the plugin directly to test its behavior
			const { summarize: tiktokSum } = await import('@/plugins/tiktok.js');
			const result = await tiktokSum(new URL(url));
			
			// Plugin should return null when service fails
			expect(result).toBe(null);
		});

		test('should use default userAgent when opts is undefined', async () => {
			const url = 'https://www.tiktok.com/@user/video/123456';
			const html = getHtmlFixture('basic.html');
			let capturedUserAgent: string | undefined = undefined;

			// Custom mock that captures the user agent
			const customFetch = (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
				const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
				if (urlString === 'https://www.tnktok.com/@user/video/123456') {
					capturedUserAgent = init?.headers ? (init.headers as any)['user-agent'] : undefined;
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
			const { summarize: tiktokSum } = await import('@/plugins/tiktok.js');
			await tiktokSum(new URL(url));

			// Should use default userAgent 'bot'
			expect(capturedUserAgent).toBe('bot');
		});
	});
});

describe('Twitter/X Plugin', () => {
	test('x.com URL should be handled by plugin', async () => {
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

		const summary = await summaly('https://x.com/testuser/status/123456789');
		expect(summary.title).toBe('Test User');
		expect(summary.description).toBe('This is a test tweet with some content.');
		expect(summary.thumbnail).toBe('https://pbs.twimg.com/media/example.jpg?name=large');
		expect(summary.sitename).toBe('X (Twitter)');
		expect(summary.icon).toBe('https://pbs.twimg.com/profile_images/123/avatar.jpg');
	});

	test('twitter.com URL should be handled by plugin', async () => {
		const mockResponse = {
			tweet: {
				author: {
					screen_name: 'testuser',
					name: 'Test User',
					avatar_url: 'https://pbs.twimg.com/profile_images/123/avatar.jpg',
				},
				url: 'https://twitter.com/testuser/status/123456789',
				text: 'This is a test tweet.',
				created_timestamp: 1704067200,
			},
		};

		setupMockJsonResponse('https://api.fxtwitter.com/i/status/123456789', mockResponse);

		const summary = await summaly('https://twitter.com/testuser/status/123456789');
		expect(summary.title).toBe('Test User');
		expect(summary.description).toBe('This is a test tweet.');
		expect(summary.sitename).toBe('X (Twitter)');
	});

	test('tweet with mosaic should use mosaic thumbnail', async () => {
		const mockResponse = {
			tweet: {
				author: {
					screen_name: 'testuser',
					name: 'Test User',
				},
				url: 'https://x.com/testuser/status/123456789',
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

		setupMockJsonResponse('https://api.fxtwitter.com/i/status/123456789', mockResponse);

		const summary = await summaly('https://x.com/testuser/status/123456789');
		expect(summary.thumbnail).toBe('https://pbs.twimg.com/media/mosaic.jpg');
	});

	test('fallback to vxtwitter API when fxtwitter fails', async () => {
		const vxResponse = {
			user_screen_name: 'testuser',
			user_name: 'Test User',
			user_profile_image_url: 'https://pbs.twimg.com/profile_images/123/avatar.jpg',
			tweetURL: 'https://twitter.com/testuser/status/987654321',
			text: 'Fallback test tweet',
			date_epoch: 1704067200,
			mediaURLs: ['https://pbs.twimg.com/media/fallback.jpg'],
		};

		// Mock fxtwitter to fail
		setupMockStatusResponse('https://api.fxtwitter.com/i/status/987654321', 500);
		// Mock vxtwitter to succeed
		setupMockJsonResponse('https://api.vxtwitter.com/i/status/987654321', vxResponse);

		const summary = await summaly('https://x.com/testuser/status/987654321');
		expect(summary.title).toBe('Test User');
		expect(summary.description).toBe('Fallback test tweet');
		expect(summary.thumbnail).toBe('https://pbs.twimg.com/media/fallback.jpg');
		expect(summary.sitename).toBe('X (Twitter)');
	});

	test('vxtwitter with combinedMediaUrl should use it as thumbnail', async () => {
		const vxResponse = {
			user_screen_name: 'testuser',
			user_name: 'Test User',
			tweetURL: 'https://twitter.com/testuser/status/111222333',
			text: 'Tweet with combined media',
			date_epoch: 1704067200,
			combinedMediaUrl: 'https://pbs.twimg.com/media/combined.jpg',
			mediaURLs: ['https://pbs.twimg.com/media/photo1.jpg'],
		};

		setupMockStatusResponse('https://api.fxtwitter.com/i/status/111222333', 500);
		setupMockJsonResponse('https://api.vxtwitter.com/i/status/111222333', vxResponse);

		const summary = await summaly('https://x.com/testuser/status/111222333');
		expect(summary.thumbnail).toBe('https://pbs.twimg.com/media/combined.jpg');
	});

	test('tweet without media should have null thumbnail', async () => {
		const mockResponse = {
			tweet: {
				author: {
					screen_name: 'testuser',
					name: 'Test User',
				},
				url: 'https://x.com/testuser/status/444555666',
				text: 'Tweet without media',
				created_timestamp: 1704067200,
			},
		};

		setupMockJsonResponse('https://api.fxtwitter.com/i/status/444555666', mockResponse);

		const summary = await summaly('https://x.com/testuser/status/444555666');
		expect(summary.thumbnail).toBe(null);
	});

	test('tweet without author avatar should use default icon', async () => {
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

		const summary = await summaly('https://x.com/testuser/status/777888999');
		expect(summary.icon).toBe('https://abs.twimg.com/favicons/twitter.2.ico');
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
