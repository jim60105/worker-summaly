/**
 * Plurk Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('Plurk Plugin', () => {
	test('should match standard Plurk URL pattern', async () => {
		const { test } = await import('@/plugins/plurk.js');
		const url1 = new URL('https://www.plurk.com/p/abc123');
		expect(test(url1)).toBe(true);
	});

	test('should match mobile Plurk URL pattern', async () => {
		const { test } = await import('@/plugins/plurk.js');
		const url2 = new URL('https://www.plurk.com/m/p/xyz789');
		expect(test(url2)).toBe(true);
	});

	test('should not match non-Plurk URLs', async () => {
		const { test } = await import('@/plugins/plurk.js');
		const url3 = new URL('https://www.example.com/p/abc123');
		expect(test(url3)).toBe(false);
	});

	test('should not match invalid Plurk paths', async () => {
		const { test } = await import('@/plugins/plurk.js');
		const url4 = new URL('https://www.plurk.com/user/abc123');
		expect(test(url4)).toBe(false);
	});
});
