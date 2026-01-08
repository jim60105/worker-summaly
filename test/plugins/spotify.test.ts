/**
 * Spotify Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockJsonResponse,
	setupMockStatusResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('Spotify Plugin (oEmbed)', () => {
	test('URL matching - open.spotify.com', async () => {
		const { test } = await import('@/plugins/spotify.js');
		expect(test(new URL('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'))).toBe(true);
		expect(test(new URL('https://open.spotify.com/album/4uLU6hMCjMI75M1A2tKUQC'))).toBe(true);
		expect(test(new URL('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M'))).toBe(true);
	});

	test('URL matching - other domain should not match', async () => {
		const { test } = await import('@/plugins/spotify.js');
		expect(test(new URL('https://spotify.com/track/123'))).toBe(false);
		expect(test(new URL('https://example.com/track/123'))).toBe(false);
	});

	test('oEmbed response - track', async () => {
		const { summarize } = await import('@/plugins/spotify.js');
		const oEmbedResponse = {
			type: 'rich',
			version: '1.0',
			title: 'Test Track - Test Artist',
			provider_name: 'Spotify',
			provider_url: 'https://spotify.com',
			thumbnail_url: 'https://i.scdn.co/image/ab67616d0000b273test',
			thumbnail_width: 300,
			thumbnail_height: 300,
			html: '<iframe style="border-radius: 12px" width="100%" height="152" src="https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>',
			width: 456,
			height: 152,
		};

		setupMockJsonResponse('https://open.spotify.com/oembed?url=https%3A%2F%2Fopen.spotify.com%2Ftrack%2F4uLU6hMCjMI75M1A2tKUQC', oEmbedResponse);

		const result = await summarize(new URL('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'));

		expect(result).not.toBeNull();
		expect(result?.title).toBe('Test Track - Test Artist');
		expect(result?.thumbnail).toBe('https://i.scdn.co/image/ab67616d0000b273test');
		expect(result?.sitename).toBe('Spotify');
		expect(result?.player.url).toBe('https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC');
		expect(result?.player.width).toBe(456);
		expect(result?.player.height).toBe(152);
		expect(result?.description).toBeNull();
	});

	test('oEmbed response - API error returns null', async () => {
		const { summarize } = await import('@/plugins/spotify.js');
		setupMockStatusResponse('https://open.spotify.com/oembed?url=https%3A%2F%2Fopen.spotify.com%2Ftrack%2Fnotfound', 404);

		const result = await summarize(new URL('https://open.spotify.com/track/notfound'));

		expect(result).toBeNull();
	});
});
