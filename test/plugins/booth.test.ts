/**
 * Booth Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockJsonResponse,
	setupMockStatusResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

// Sample API response for testing
const sampleBoothResponse = {
	id: 7731771,
	name: '◆アクリルキーホルダー（GuildCQ　覚醒・久遠たま　制服Ver）',
	description: '◆商品仕様◆\nサイズ 50 x 50 (mm)\n素材 　　 アクリル\n印刷　　 片面\n\n・サンプル画像は完成イメージのため、実物と異なる場合があります。',
	is_adult: false,
	is_sold_out: false,
	price: '1,000 JPY',
	url: 'https://quontama.booth.pm/items/7731771',
	images: [
		{
			caption: null,
			original: 'https://booth.pximg.net/bea09ef6-9235-4e4d-91cb-695e65b567e3/i/7731771/b9eae2f5-c264-44b9-a917-2279a3c4fa61_base_resized.jpg',
			resized: 'https://booth.pximg.net/c/72x72_a2_g5/bea09ef6-9235-4e4d-91cb-695e65b567e3/i/7731771/b9eae2f5-c264-44b9-a917-2279a3c4fa61_base_resized.jpg',
		},
	],
	shop: {
		name: '久遠たま公式ショップ',
		subdomain: 'quontama',
		url: 'https://quontama.booth.pm/',
		thumbnail_url: 'https://booth.pximg.net/c/48x48/users/15894826/icon_image/5343a25a-f696-472b-985f-289ef4032920_base_resized.jpg',
	},
	category: {
		id: 177,
		name: 'Acrylic Key Chain',
		parent: {
			name: 'Goods',
			url: 'https://booth.pm/zh-tw/browse/Goods',
		},
		url: 'https://booth.pm/zh-tw/browse/Acrylic%20Key%20Chain',
	},
	tags: [],
};

describe('Booth Plugin', () => {
	describe('URL matching', () => {
		test('booth.pm/items/{id} should match', async () => {
			const { test } = await import('@/plugins/booth.js');
			expect(test(new URL('https://booth.pm/items/7731771'))).toBe(true);
			expect(test(new URL('https://booth.pm/items/123456'))).toBe(true);
		});

		test('booth.pm/{lang}/items/{id} should match', async () => {
			const { test } = await import('@/plugins/booth.js');
			expect(test(new URL('https://booth.pm/ja/items/7731771'))).toBe(true);
			expect(test(new URL('https://booth.pm/zh-tw/items/7731771'))).toBe(true);
			expect(test(new URL('https://booth.pm/en/items/123456'))).toBe(true);
			expect(test(new URL('https://booth.pm/ko/items/999999'))).toBe(true);
		});

		test('subdomain.booth.pm/items/{id} should match', async () => {
			const { test } = await import('@/plugins/booth.js');
			expect(test(new URL('https://quontama.booth.pm/items/7731771'))).toBe(true);
			expect(test(new URL('https://myshop.booth.pm/items/123456'))).toBe(true);
		});

		test('subdomain.booth.pm/{lang}/items/{id} should match', async () => {
			const { test } = await import('@/plugins/booth.js');
			expect(test(new URL('https://quontama.booth.pm/ja/items/7731771'))).toBe(true);
			expect(test(new URL('https://myshop.booth.pm/en/items/123456'))).toBe(true);
		});

		test('other booth.pm paths should not match', async () => {
			const { test } = await import('@/plugins/booth.js');
			expect(test(new URL('https://booth.pm/'))).toBe(false);
			expect(test(new URL('https://booth.pm/browse/Goods'))).toBe(false);
			expect(test(new URL('https://booth.pm/users/123'))).toBe(false);
			expect(test(new URL('https://quontama.booth.pm/'))).toBe(false);
		});

		test('other domains should not match', async () => {
			const { test } = await import('@/plugins/booth.js');
			expect(test(new URL('https://example.com/items/123'))).toBe(false);
			expect(test(new URL('https://booth.example.com/items/123'))).toBe(false);
			expect(test(new URL('https://fakebooth.pm/items/123'))).toBe(false);
		});
	});

	describe('API response handling', () => {
		test('successful fetch should return summary', async () => {
			const { summarize } = await import('@/plugins/booth.js');

			setupMockJsonResponse('https://booth.pm/ja/items/7731771.json', sampleBoothResponse);

			const result = await summarize(new URL('https://booth.pm/zh-tw/items/7731771'));

			expect(result).not.toBeNull();
			expect(result?.title).toBe('◆アクリルキーホルダー（GuildCQ　覚醒・久遠たま　制服Ver）');
			expect(result?.icon).toBe('https://booth.pm/static-images/pwa/icon-192.png');
			expect(result?.description).toContain('久遠たま公式ショップ');
			expect(result?.description).toContain('商品仕様');
			expect(result?.thumbnail).toBe('https://booth.pximg.net/bea09ef6-9235-4e4d-91cb-695e65b567e3/i/7731771/b9eae2f5-c264-44b9-a917-2279a3c4fa61_base_resized.jpg');
			expect(result?.sitename).toBe('BOOTH');
			expect(result?.sensitive).toBe(false);
			expect(result?.player.url).toBeNull();
			expect(result?.activityPub).toBeNull();
			expect(result?.fediverseCreator).toBeNull();
		});

		test('fetch from subdomain URL should use correct API endpoint', async () => {
			const { summarize } = await import('@/plugins/booth.js');

			setupMockJsonResponse('https://booth.pm/ja/items/7731771.json', sampleBoothResponse);

			const result = await summarize(new URL('https://quontama.booth.pm/items/7731771'));

			expect(result).not.toBeNull();
			expect(result?.title).toBe('◆アクリルキーホルダー（GuildCQ　覚醒・久遠たま　制服Ver）');
		});

		test('adult content should be marked as sensitive', async () => {
			const { summarize } = await import('@/plugins/booth.js');
			const adultResponse = {
				...sampleBoothResponse,
				id: 888888,
				is_adult: true,
			};

			setupMockJsonResponse('https://booth.pm/ja/items/888888.json', adultResponse);

			const result = await summarize(new URL('https://booth.pm/items/888888'));

			expect(result).not.toBeNull();
			expect(result?.sensitive).toBe(true);
		});

		test('HTML tags in description should be removed', async () => {
			const { summarize } = await import('@/plugins/booth.js');
			const htmlResponse = {
				...sampleBoothResponse,
				id: 111111,
				description: '<p>This is a <strong>test</strong> with <a href="#">HTML</a> tags</p>',
			};

			setupMockJsonResponse('https://booth.pm/ja/items/111111.json', htmlResponse);

			const result = await summarize(new URL('https://booth.pm/items/111111'));

			expect(result).not.toBeNull();
			expect(result?.description).toContain('This is a test with HTML tags');
			expect(result?.description).not.toContain('<p>');
			expect(result?.description).not.toContain('<strong>');
			expect(result?.description).not.toContain('<a href="#">');
		});

		test('HTML entities in description should be decoded', async () => {
			const { summarize } = await import('@/plugins/booth.js');
			const entitiesResponse = {
				...sampleBoothResponse,
				id: 222222,
				description: 'Test &amp; example &lt;with&gt; entities',
			};

			setupMockJsonResponse('https://booth.pm/ja/items/222222.json', entitiesResponse);

			const result = await summarize(new URL('https://booth.pm/items/222222'));

			expect(result).not.toBeNull();
			expect(result?.description).toContain('Test & example <with> entities');
		});

		test('empty description should still work', async () => {
			const { summarize } = await import('@/plugins/booth.js');
			const emptyDescResponse = {
				...sampleBoothResponse,
				id: 333333,
				description: '',
			};

			setupMockJsonResponse('https://booth.pm/ja/items/333333.json', emptyDescResponse);

			const result = await summarize(new URL('https://booth.pm/items/333333'));

			expect(result).not.toBeNull();
			expect(result?.description).toBe('久遠たま公式ショップ');
		});

		test('no images should return null thumbnail', async () => {
			const { summarize } = await import('@/plugins/booth.js');
			const noImagesResponse = {
				...sampleBoothResponse,
				id: 444444,
				images: [],
			};

			setupMockJsonResponse('https://booth.pm/ja/items/444444.json', noImagesResponse);

			const result = await summarize(new URL('https://booth.pm/items/444444'));

			expect(result).not.toBeNull();
			expect(result?.thumbnail).toBeNull();
		});

		test('long description should be clipped', async () => {
			const { summarize } = await import('@/plugins/booth.js');
			const longDescResponse = {
				...sampleBoothResponse,
				id: 555555,
				description: 'A'.repeat(500),
			};

			setupMockJsonResponse('https://booth.pm/ja/items/555555.json', longDescResponse);

			const result = await summarize(new URL('https://booth.pm/items/555555'));

			expect(result).not.toBeNull();
			expect(result?.description).not.toBeNull();
			expect(result?.description!.length).toBeLessThanOrEqual(303); // 300 + '...'
		});

		test('API error should return null', async () => {
			const { summarize } = await import('@/plugins/booth.js');

			setupMockStatusResponse('https://booth.pm/ja/items/999999.json', 404);

			const result = await summarize(new URL('https://booth.pm/items/999999'));

			expect(result).toBeNull();
		});

		test('network error should return null', async () => {
			const { summarize } = await import('@/plugins/booth.js');

			setupMockStatusResponse('https://booth.pm/ja/items/777777.json', 500);

			const result = await summarize(new URL('https://booth.pm/items/777777'));

			expect(result).toBeNull();
		});

		test('invalid URL without item ID should return null', async () => {
			const { summarize } = await import('@/plugins/booth.js');

			// This URL technically shouldn't pass the test() function, but testing summarize directly
			const result = await summarize(new URL('https://booth.pm/browse/Goods'));

			expect(result).toBeNull();
		});
	});
});
