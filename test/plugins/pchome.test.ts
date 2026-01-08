/**
 * PChome 24h Plugin Tests
 *
 * Tests the PChome 24h shopping plugin which extracts product information
 * from PChome 24h e-commerce product pages via their API.
 */

import { describe, test, expect } from 'vitest';
import { test as testUrl, summarize } from '@/plugins/pchome.js';
import {
	useMockFetch,
	setupMockResponse,
	setupMockStatusResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('PChome 24h Plugin', () => {
	const productId = 'DYAJC9-A900DPLRD';
	const productUrl = `https://24h.pchome.com.tw/prod/${productId}`;
	const basicApiUrl = `https://ecapi-cdn.pchome.com.tw/ecshop/prodapi/v2/prod/${productId}&fields=Name,Nick,Price,Pic&_callback=jsonp_prod`;
	const descApiUrl = `https://ecapi-cdn.pchome.com.tw/cdn/ecshop/prodapi/v2/prod/${productId}/desc&fields=Meta,SloganInfo&_callback=jsonp_desc`;

	describe('URL matching', () => {
		test('should match valid product URL', () => {
			expect(testUrl(new URL(productUrl))).toBe(true);
		});

		test('should match various product IDs', () => {
			expect(testUrl(new URL('https://24h.pchome.com.tw/prod/ABCDEF-123456789'))).toBe(true);
			expect(testUrl(new URL('https://24h.pchome.com.tw/prod/XXXXXX-YYYYYYYYY'))).toBe(true);
		});

		test('should not match other PChome pages', () => {
			expect(testUrl(new URL('https://24h.pchome.com.tw/'))).toBe(false);
			expect(testUrl(new URL('https://24h.pchome.com.tw/store/123'))).toBe(false);
		});

		test('should not match other domains', () => {
			expect(testUrl(new URL('https://shopping.pchome.com.tw/prod/DYAJC9-A900DPLRD'))).toBe(false);
			expect(testUrl(new URL('https://example.com/prod/DYAJC9-A900DPLRD'))).toBe(false);
		});
	});

	describe('Summarize functionality', () => {
		test('should extract full product metadata', async () => {
			const basicResponse = `try{jsonp_prod({
				"${productId}-000": {
					"Id": "${productId}",
					"Name": "\\u5546\\u54c1\\u540d\\u7a31",
					"Nick": "<span>\\u7c21\\u77ed\\u540d\\u7a31</span>",
					"Price": { "P": 1990 },
					"Pic": { "B": "/items/DYAJC9A900DPLRD/000001.jpg" }
				}
			});}catch(e){}`;

			const descResponse = `try{jsonp_desc({
				"${productId}": {
					"Meta": {
						"BrandNames": ["\\u54c1\\u724c\\u540d"]
					},
					"SloganInfo": ["\\u6a19\\u8a9e1", "\\u6a19\\u8a9e2"]
				}
			});}catch(e){}`;

			setupMockResponse(basicApiUrl, basicResponse, { 'content-type': 'application/json' });
			setupMockResponse(descApiUrl, descResponse, { 'content-type': 'application/json' });

			const summary = await summarize(new URL(productUrl));

			expect(summary).not.toBeNull();
			expect(summary!.title).toBe('簡短名稱');
			expect(summary!.sitename).toBe('PChome 24h');
			expect(summary!.icon).toBe('https://24h.pchome.com.tw/favicon.ico');
			expect(summary!.thumbnail).toBe('https://img.pchome.com.tw/cs/items/DYAJC9A900DPLRD/000001.jpg');
			expect(summary!.description).toContain('標語1');
			expect(summary!.description).toContain('標語2');
			expect(summary!.description).toContain('品牌: 品牌名');
			expect(summary!.description).toContain('價格: NT$ 1,990');
		});

		test('JSONP parsing', async () => {
			const basicResponse = `try{jsonp_prod({
				"${productId}-000": {
					"Id": "${productId}",
					"Name": "Test Product",
					"Nick": "Short Name",
					"Price": { "P": 999 },
					"Pic": { "B": "/test.jpg" }
				}
			});}catch(e){}`;

			const descResponse = `try{jsonp_desc({
				"${productId}": {
					"Meta": {
						"BrandNames": ["TestBrand"]
					},
					"SloganInfo": ["Test Slogan"]
				}
			});}catch(e){}`;

			setupMockResponse(basicApiUrl, basicResponse, { 'content-type': 'application/json' });
			setupMockResponse(descApiUrl, descResponse, { 'content-type': 'application/json' });

			const summary = await summarize(new URL(productUrl));

			expect(summary).not.toBeNull();
			expect(summary!.title).toBe('Short Name');
			expect(summary!.description).toContain('Test Slogan');
			expect(summary!.description).toContain('品牌: TestBrand');
			expect(summary!.description).toContain('價格: NT$ 999');
		});

		test('Unicode decoding', async () => {
			const basicResponse = `try{jsonp_prod({
				"${productId}-000": {
					"Id": "${productId}",
					"Name": "\\u53f0\\u7063\\u5546\\u54c1",
					"Nick": "\\u53f0\\u7063",
					"Price": { "P": 1000 },
					"Pic": { "B": "/test.jpg" }
				}
			});}catch(e){}`;

			const descResponse = `try{jsonp_desc({
				"${productId}": {
					"Meta": {
						"BrandNames": ["\\u53f0\\u7063\\u54c1\\u724c"]
					},
					"SloganInfo": ["\\u9ad8\\u54c1\\u8cea"]
				}
			});}catch(e){}`;

			setupMockResponse(basicApiUrl, basicResponse, { 'content-type': 'application/json' });
			setupMockResponse(descApiUrl, descResponse, { 'content-type': 'application/json' });

			const summary = await summarize(new URL(productUrl));

			expect(summary).not.toBeNull();
			expect(summary!.title).toBe('台灣');
			expect(summary!.description).toContain('高品質');
			expect(summary!.description).toContain('品牌: 台灣品牌');
		});

		test('HTML content cleanup in Nick field', async () => {
			const basicResponse = `try{jsonp_prod({
				"${productId}-000": {
					"Id": "${productId}",
					"Name": "Full Name",
					"Nick": "<div><span>Clean <strong>Name</strong></span></div>",
					"Price": { "P": 500 },
					"Pic": { "B": "/test.jpg" }
				}
			});}catch(e){}`;

			const descResponse = `try{jsonp_desc({
				"${productId}": {
					"Meta": {
						"BrandNames": []
					},
					"SloganInfo": []
				}
			});}catch(e){}`;

			setupMockResponse(basicApiUrl, basicResponse, { 'content-type': 'application/json' });
			setupMockResponse(descApiUrl, descResponse, { 'content-type': 'application/json' });

			const summary = await summarize(new URL(productUrl));

			expect(summary).not.toBeNull();
			expect(summary!.title).toBe('Clean Name');
			expect(summary!.title).not.toContain('<');
			expect(summary!.title).not.toContain('>');
		});

		test('Price formatting', async () => {
			const basicResponse = `try{jsonp_prod({
				"${productId}-000": {
					"Id": "${productId}",
					"Name": "Product",
					"Nick": "Product",
					"Price": { "P": 1234567 },
					"Pic": { "B": "/test.jpg" }
				}
			});}catch(e){}`;

			const descResponse = `try{jsonp_desc({
				"${productId}": {
					"Meta": {
						"BrandNames": []
					},
					"SloganInfo": []
				}
			});}catch(e){}`;

			setupMockResponse(basicApiUrl, basicResponse, { 'content-type': 'application/json' });
			setupMockResponse(descApiUrl, descResponse, { 'content-type': 'application/json' });

			const summary = await summarize(new URL(productUrl));

			expect(summary).not.toBeNull();
			expect(summary!.description).toContain('價格: NT$ 1,234,567');
		});

		test('Fallback to Name when Nick is empty', async () => {
			const basicResponse = `try{jsonp_prod({
				"${productId}-000": {
					"Id": "${productId}",
					"Name": "Full Product Name",
					"Nick": "",
					"Price": { "P": 100 },
					"Pic": { "B": "/test.jpg" }
				}
			});}catch(e){}`;

			const descResponse = `try{jsonp_desc({
				"${productId}": {
					"Meta": {
						"BrandNames": []
					},
					"SloganInfo": []
				}
			});}catch(e){}`;

			setupMockResponse(basicApiUrl, basicResponse, { 'content-type': 'application/json' });
			setupMockResponse(descApiUrl, descResponse, { 'content-type': 'application/json' });

			const summary = await summarize(new URL(productUrl));

			expect(summary).not.toBeNull();
			expect(summary!.title).toBe('Full Product Name');
		});

		test('Image URL construction', async () => {
			const basicResponse = `try{jsonp_prod({
				"${productId}-000": {
					"Id": "${productId}",
					"Name": "Product",
					"Nick": "Product",
					"Price": { "P": 100 },
					"Pic": { "B": "/items/TEST123456/image.jpg" }
				}
			});}catch(e){}`;

			const descResponse = `try{jsonp_desc({
				"${productId}": {
					"Meta": {
						"BrandNames": []
					},
					"SloganInfo": []
				}
			});}catch(e){}`;

			setupMockResponse(basicApiUrl, basicResponse, { 'content-type': 'application/json' });
			setupMockResponse(descApiUrl, descResponse, { 'content-type': 'application/json' });

			const summary = await summarize(new URL(productUrl));

			expect(summary).not.toBeNull();
			expect(summary!.thumbnail).toBe('https://img.pchome.com.tw/cs/items/TEST123456/image.jpg');
		});

		test('Image URL with backslashes', async () => {
			const basicResponse = `try{jsonp_prod({
				"${productId}-000": {
					"Id": "${productId}",
					"Name": "Product",
					"Nick": "Product",
					"Price": { "P": 100 },
					"Pic": { "B": "\\\\items\\\\TEST\\\\image.jpg" }
				}
			});}catch(e){}`;

			const descResponse = `try{jsonp_desc({
				"${productId}": {
					"Meta": {
						"BrandNames": []
					},
					"SloganInfo": []
				}
			});}catch(e){}`;

			setupMockResponse(basicApiUrl, basicResponse, { 'content-type': 'application/json' });
			setupMockResponse(descApiUrl, descResponse, { 'content-type': 'application/json' });

			const summary = await summarize(new URL(productUrl));

			expect(summary).not.toBeNull();
			expect(summary!.thumbnail).toBe('https://img.pchome.com.tw/csitemsTESTimage.jpg');
			expect(summary!.thumbnail).not.toContain('\\');
		});

		test('No image when Pic.B is empty', async () => {
			const basicResponse = `try{jsonp_prod({
				"${productId}-000": {
					"Id": "${productId}",
					"Name": "Product",
					"Nick": "Product",
					"Price": { "P": 100 },
					"Pic": { "B": "" }
				}
			});}catch(e){}`;

			const descResponse = `try{jsonp_desc({
				"${productId}": {
					"Meta": {
						"BrandNames": []
					},
					"SloganInfo": []
				}
			});}catch(e){}`;

			setupMockResponse(basicApiUrl, basicResponse, { 'content-type': 'application/json' });
			setupMockResponse(descApiUrl, descResponse, { 'content-type': 'application/json' });

			const summary = await summarize(new URL(productUrl));

			expect(summary).not.toBeNull();
			expect(summary!.thumbnail).toBe(null);
		});

		test('Description API failure handled gracefully', async () => {
			const basicResponse = `try{jsonp_prod({
				"${productId}-000": {
					"Id": "${productId}",
					"Name": "Product",
					"Nick": "Product",
					"Price": { "P": 999 },
					"Pic": { "B": "/test.jpg" }
				}
			});}catch(e){}`;

			setupMockResponse(basicApiUrl, basicResponse, { 'content-type': 'application/json' });
			// Simulate 404 for description API
			setupMockStatusResponse(descApiUrl, 404);

			const summary = await summarize(new URL(productUrl));

			expect(summary).not.toBeNull();
			expect(summary!.title).toBe('Product');
			expect(summary!.description).toContain('價格: NT$ 999');
		});
	});
});
