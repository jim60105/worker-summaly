/**
 * YouTube Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockJsonResponse,
	setupMockStatusResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('YouTube Plugin (oEmbed)', () => {
	test('URL matching - youtube.com/watch', async () => {
		const { test } = await import('@/plugins/youtube.js');
		expect(test(new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))).toBe(true);
		expect(test(new URL('https://youtube.com/watch?v=dQw4w9WgXcQ'))).toBe(true);
	});

	test('URL matching - youtube.com/v', async () => {
		const { test } = await import('@/plugins/youtube.js');
		expect(test(new URL('https://www.youtube.com/v/dQw4w9WgXcQ'))).toBe(true);
	});

	test('URL matching - youtube.com/shorts', async () => {
		const { test } = await import('@/plugins/youtube.js');
		expect(test(new URL('https://www.youtube.com/shorts/dQw4w9WgXcQ'))).toBe(true);
	});

	test('URL matching - youtube.com/playlist', async () => {
		const { test } = await import('@/plugins/youtube.js');
		expect(test(new URL('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf'))).toBe(true);
	});

	test('URL matching - youtu.be short links', async () => {
		const { test } = await import('@/plugins/youtube.js');
		expect(test(new URL('https://youtu.be/dQw4w9WgXcQ'))).toBe(true);
	});

	test('URL matching - music.youtube.com subdomain', async () => {
		const { test } = await import('@/plugins/youtube.js');
		expect(test(new URL('https://music.youtube.com/watch?v=dQw4w9WgXcQ'))).toBe(true);
	});

	test('URL matching - other domain should not match', async () => {
		const { test } = await import('@/plugins/youtube.js');
		expect(test(new URL('https://example.com/watch?v=dQw4w9WgXcQ'))).toBe(false);
	});

	test('URL matching - non-video paths should not match', async () => {
		const { test } = await import('@/plugins/youtube.js');
		expect(test(new URL('https://www.youtube.com/channel/UCtest'))).toBe(false);
		expect(test(new URL('https://www.youtube.com/@username'))).toBe(false);
	});

	test('oEmbed response - video', async () => {
		const { summarize } = await import('@/plugins/youtube.js');
		const oEmbedResponse = {
			type: 'video',
			version: '1.0',
			title: 'Rick Astley - Never Gonna Give You Up',
			author_name: 'Rick Astley',
			author_url: 'https://www.youtube.com/@RickAstleyYT',
			provider_name: 'YouTube',
			provider_url: 'https://www.youtube.com/',
			thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
			thumbnail_width: 480,
			thumbnail_height: 360,
			html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="Rick Astley - Never Gonna Give You Up"></iframe>',
			width: 200,
			height: 113,
		};

		setupMockJsonResponse('https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ&format=json', oEmbedResponse);

		const result = await summarize(new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('Rick Astley - Never Gonna Give You Up');
		expect(result?.thumbnail).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
		expect(result?.sitename).toBe('YouTube');
		expect(result?.player.url).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed');
		expect(result?.player.width).toBe(200);
		expect(result?.player.height).toBe(113);
		expect(result?.description).toBeNull(); // oEmbed doesn't provide description
	});

	test('oEmbed response - invalid type returns null', async () => {
		const { summarize } = await import('@/plugins/youtube.js');
		const oEmbedResponse = {
			type: 'photo', // Invalid type for video
			version: '1.0',
			title: 'Test',
			html: '<img src="test.jpg" />',
			width: 200,
			height: 200,
		};

		setupMockJsonResponse('https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dinvalid&format=json', oEmbedResponse);

		const result = await summarize(new URL('https://www.youtube.com/watch?v=invalid'));

		expect(result).toBeNull();
	});

	test('oEmbed response - API error returns null', async () => {
		const { summarize } = await import('@/plugins/youtube.js');
		setupMockStatusResponse('https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dnotfound&format=json', 404);

		const result = await summarize(new URL('https://www.youtube.com/watch?v=notfound'));

		expect(result).toBeNull();
	});
});
