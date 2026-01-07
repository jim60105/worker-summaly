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
	const response = mockResponses.get(urlString);
	if (response) {
		return Promise.resolve(response.clone());
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

function skippableTest(name: string, fn: () => void) {
	if (process.env.SKIP_NETWORK_TEST === 'true') {
		console.log(`[SKIP] ${name}`);
		test.skip(name, fn);
	} else {
		test(name, fn);
	}
}

beforeEach(() => {
	// Allow private IPs by default, since a lot of the tests rely on old behavior
	process.env.SUMMALY_ALLOW_PRIVATE_IP = 'true';
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
		url: host + '/',
		activityPub: null,
		fediverseCreator: null,
	});
});

skippableTest('Stage Bye Stage', async () => {
	// If this test fails, you must rewrite the result data and the example in README.md.

	const summary = await summaly('https://www.youtube.com/watch?v=NMIEAhH_fTU');
	expect(summary).toEqual(
		{
			'title': '【アイドルマスター】「Stage Bye Stage」(歌：島村卯月、渋谷凛、本田未央)',
			'icon': 'https://www.youtube.com/s/desktop/78bc1359/img/logos/favicon.ico',
			'description': 'Website▶https://columbia.jp/idolmaster/Playlist▶https://www.youtube.com/playlist?list=PL83A2998CF3BBC86D2018年7月18日発売予定THE IDOLM@STER CINDERELLA GIRLS CG STAR...',
			'thumbnail': 'https://i.ytimg.com/vi/NMIEAhH_fTU/maxresdefault.jpg',
			'player': {
				'url': 'https://www.youtube.com/embed/NMIEAhH_fTU?feature=oembed',
				'width': 200,
				'height': 113,
				'allow': [
					'autoplay',
					'clipboard-write',
					'encrypted-media',
					'picture-in-picture',
					'web-share',
					'fullscreen',
				],
			},
			'sitename': 'YouTube',
			'sensitive': false,
			'activityPub': null,
			'fediverseCreator': null,
			'url': 'https://www.youtube.com/watch?v=NMIEAhH_fTU',
		},
	);
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

describe('Private IP blocking', () => {
	beforeEach(() => {
		process.env.SUMMALY_ALLOW_PRIVATE_IP = 'false';
		const html = getHtmlFixture('og-title.html');
		server.use(
			http.get(host + '/*', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);
	});

	test('private ipなサーバーの情報を取得できない', async () => {
		const summary = await summaly(host).catch((e: StatusError) => e);
		if (summary instanceof StatusError) {
			expect(summary.name).toBe('StatusError');
		} else {
			expect(summary).toBeInstanceOf(StatusError);
		}
	});

	test.skip('agentが指定されている場合はprivate ipを許可', async () => {
		// Note: Agent-based private IP override not applicable in Workers environment
		// This test is skipped as the agent option is Node.js specific
	});

	test('agentが空のオブジェクトの場合はprivate ipを許可しない', async () => {
		const summary = await summaly(host, { agent: {} }).catch((e: StatusError) => e);
		if (summary instanceof StatusError) {
			expect(summary.name).toBe('StatusError');
		} else {
			expect(summary).toBeInstanceOf(StatusError);
		}
	});

	afterEach(() => {
		process.env.SUMMALY_ALLOW_PRIVATE_IP = 'true';
	});
});

describe('OGP', () => {
	test('title', async () => {
		const html = getHtmlFixture('og-title.html');
		server.use(
			http.get(host + '/*', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);

		const summary = await summaly(host);
		expect(summary.title).toBe('Strawberry Pasta');
	});

	test('description', async () => {
		const html = getHtmlFixture('og-description.html');
		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);

		const summary = await summaly(host);
		expect(summary.description).toBe('Strawberry Pasta');
	});

	test('site_name', async () => {
		const html = getHtmlFixture('og-site_name.html');
		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);

		const summary = await summaly(host);
		expect(summary.sitename).toBe('Strawberry Pasta');
	});

	test('thumbnail', async () => {
		const html = getHtmlFixture('og-image.html');
		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);

		const summary = await summaly(host);
		expect(summary.thumbnail).toBe('https://himasaku.net/himasaku.png');
	});
});

describe('TwitterCard', () => {
	test('title', async () => {
		const html = getHtmlFixture('twitter-title.html');
		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);

		const summary = await summaly(host);
		expect(summary.title).toBe('Strawberry Pasta');
	});

	test('description', async () => {
		const html = getHtmlFixture('twitter-description.html');
		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);

		const summary = await summaly(host);
		expect(summary.description).toBe('Strawberry Pasta');
	});

	test('thumbnail', async () => {
		const html = getHtmlFixture('twitter-image.html');
		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);

		const summary = await summaly(host);
		expect(summary.thumbnail).toBe('https://himasaku.net/himasaku.png');
	});

	test('Player detection - PeerTube:video => video', async () => {
		const html = getHtmlFixture('player-peertube-video.html');
		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);

		const summary = await summaly(host);
		expect(summary.player.url).toBe('https://example.com/embedurl');
		expect(summary.player.allow).toStrictEqual(['autoplay', 'encrypted-media', 'fullscreen']);
	});

	test('Player detection - Pleroma:video => video', async () => {
		const html = getHtmlFixture('player-pleroma-video.html');
		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);

		const summary = await summaly(host);
		expect(summary.player.url).toBe('https://example.com/embedurl');
		expect(summary.player.allow).toStrictEqual(['autoplay', 'encrypted-media', 'fullscreen']);
	});

	test('Player detection - Pleroma:image => image', async () => {
		const html = getHtmlFixture('player-pleroma-image.html');
		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);

		const summary = await summaly(host);
		expect(summary.thumbnail).toBe('https://example.com/imageurl');
	});
});

describe('oEmbed', () => {
	const setupOembed = (oEmbedPath: string, htmlFixture = 'oembed.html') => {
		const html = getHtmlFixture(htmlFixture);
		const oembedData = getOembedFixture(oEmbedPath);
		
		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
			http.get(host + '/oembed.json', () => {
				const jsonStr = JSON.stringify(oembedData);
				return HttpResponse.json(oembedData, {
					headers: {
						'content-length': String(Buffer.byteLength(jsonStr)),
						'content-type': 'application/json',
					},
				});
			}),
		);
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
		server.use(
			http.get(host + '/*', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);

		const summary = await summaly(host);
		expect(summary.activityPub).toBe('https://misskey.test/notes/abcdefg');
	});

	test('Null', async () => {
		const html = getHtmlFixture('basic.html');
		server.use(
			http.get(host + '/*', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);

		const summary = await summaly(host);
		expect(summary.activityPub).toBe(null);
	});
});

describe('Fediverse Creator', () => {
	test('Basic', async () => {
		const html = getHtmlFixture('fediverse-creator.html');
		server.use(
			http.get(host + '/*', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);

		const summary = await summaly(host);
		expect(summary.fediverseCreator).toBe('@test@example.com');
	});

	test('Null', async () => {
		const html = getHtmlFixture('basic.html');
		server.use(
			http.get(host + '/*', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);

		const summary = await summaly(host);
		expect(summary.fediverseCreator).toBeNull();
	});
});

describe('sensitive', () => {
	test('default', async () => {
		const html = getHtmlFixture('basic.html');
		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);
		expect((await summaly(host)).sensitive).toBe(false);
	});

	test('mixi:content-rating 1', async () => {
		const html = getHtmlFixture('mixi-sensitive.html');
		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);
		expect((await summaly(host)).sensitive).toBe(true);
	});

	test('meta rating adult', async () => {
		const html = getHtmlFixture('meta-adult-sensitive.html');
		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);
		expect((await summaly(host)).sensitive).toBe(true);
	});

	test('meta rating rta', async () => {
		const html = getHtmlFixture('meta-rta-sensitive.html');
		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);
		expect((await summaly(host)).sensitive).toBe(true);
	});

	test('HTTP Header rating adult', async () => {
		const html = getHtmlFixture('basic.html');
		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
						'rating': 'adult',
					},
				});
			}),
		);
		expect((await summaly(host)).sensitive).toBe(true);
	});

	test('HTTP Header rating rta', async () => {
		const html = getHtmlFixture('basic.html');
		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
						'rating': 'RTA-5042-1996-1400-1577-RTA',
					},
				});
			}),
		);
		expect((await summaly(host)).sensitive).toBe(true);
	});
});

describe('UserAgent', () => {
	test('UA設定が反映されていること', async () => {
		const html = getHtmlFixture('basic.html');
		let ua: string | undefined = undefined;

		server.use(
			http.get(host + '/', ({ request }) => {
				ua = request.headers.get('user-agent') || undefined;
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(Buffer.byteLength(html)),
						'content-type': 'text/html',
					},
				});
			}),
		);
		await summaly(host, { userAgent: 'test-ua' });

		expect(ua).toBe('test-ua');
	});
});

describe('content-length limit', () => {
	test('content-lengthの上限以内であればエラーが起こらないこと', async () => {
		const html = getHtmlFixture('basic.html');
		const contentLength = Buffer.byteLength(html);

		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(contentLength),
						'content-type': 'text/html',
					},
				});
			}),
		);

		expect(await summaly(host, { contentLengthLimit: contentLength })).toBeDefined();
	});

	test('content-lengthの上限を超えているとエラーになる事', async () => {
		const html = getHtmlFixture('basic.html');
		const contentLength = Buffer.byteLength(html);

		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(contentLength),
						'content-type': 'text/html',
					},
				});
			}),
		);

		await expect(summaly(host, { contentLengthLimit: contentLength - 1 })).rejects.toThrow();
	});
});

describe('content-length required', () => {
	test('[オプション有効化時] content-lengthが返された場合はエラーとならないこと', async () => {
		const html = getHtmlFixture('basic.html');
		const contentLength = Buffer.byteLength(html);

		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(contentLength),
						'content-type': 'text/html',
					},
				});
			}),
		);

		expect(await summaly(host, { contentLengthRequired: true, contentLengthLimit: contentLength })).toBeDefined();
	});

	test('[オプション有効化時] content-lengthが返されない場合はエラーとなること', async () => {
		const html = getHtmlFixture('basic.html');

		server.use(
			http.get(host + '/', () => {
				// Don't include content-length header to simulate streaming response
				return HttpResponse.html(html, {
					headers: {
						'content-type': 'text/html',
					},
				});
			}),
		);

		await expect(summaly(host, { contentLengthRequired: true })).rejects.toThrow();
	});

	test('[オプション無効化時] content-lengthが返された場合はエラーとならないこと', async () => {
		const html = getHtmlFixture('basic.html');
		const contentLength = Buffer.byteLength(html);

		server.use(
			http.get(host + '/', () => {
				return HttpResponse.html(html, {
					headers: {
						'content-length': String(contentLength),
						'content-type': 'text/html',
					},
				});
			}),
		);

		expect(await summaly(host, { contentLengthRequired: false, contentLengthLimit: contentLength })).toBeDefined();
	});

	test('[オプション無効化時] content-lengthが返されなくてもエラーとならないこと', async () => {
		const html = getHtmlFixture('basic.html');

		server.use(
			http.get(host + '/', () => {
				// Don't include content-length header
				return HttpResponse.html(html, {
					headers: {
						'content-type': 'text/html',
					},
				});
			}),
		);

		expect(await summaly(host, { contentLengthRequired: false })).toBeDefined();
	});
});
