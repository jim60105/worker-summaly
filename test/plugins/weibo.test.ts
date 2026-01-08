/**
 * Weibo Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('Weibo Plugin', () => {
	test('should match mobile Weibo URL pattern', async () => {
		const { test } = await import('@/plugins/weibo.js');
		const url = new URL('https://m.weibo.cn/detail/1234567890');
		expect(test(url)).toBe(true);
	});

	test('should match desktop Weibo URL pattern', async () => {
		const { test } = await import('@/plugins/weibo.js');
		const url = new URL('https://weibo.com/1234567/abcdefg');
		expect(test(url)).toBe(true);
	});

	test('should not match non-Weibo URLs', async () => {
		const { test } = await import('@/plugins/weibo.js');
		const url = new URL('https://www.example.com/detail/123');
		expect(test(url)).toBe(false);
	});

	test('should not match invalid Weibo paths', async () => {
		const { test } = await import('@/plugins/weibo.js');
		const url1 = new URL('https://weibo.com/user/profile');
		expect(test(url1)).toBe(false);

		const url2 = new URL('https://m.weibo.cn/user/123');
		expect(test(url2)).toBe(false);
	});
});
