/**
 * Steam Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockJsonResponse,
	setupMockStatusResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

// Sample API response for testing (based on real API response for The Room)
const sampleSteamResponse = {
	'288160': {
		success: true,
		data: {
			type: 'game',
			name: 'The Room',
			steam_appid: 288160,
			required_age: 0,
			is_free: false,
			detailed_description: 'Fall into a world of bizarre contraptions and alchemical machinery with The Room, a BAFTA award-winning 3D puzzler from Fireproof Games.',
			about_the_game: 'Fall into a world of bizarre contraptions and alchemical machinery with The Room, a BAFTA award-winning 3D puzzler from Fireproof Games.',
			short_description: 'A mysterious invitation leads to the attic of an abandoned house. In the room is a cast-iron safe laced with strange carvings and on top, a note from your distant companion. It promises something ancient and astonishing concealed in the iron chamber - you need only find a way in.',
			supported_languages: '英文, 法文, 義大利文, 德文, 西班牙文 - 西班牙, 葡萄牙文 - 巴西',
			header_image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/288160/header.jpg?t=1646758287',
			capsule_image: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/288160/capsule_231x87.jpg?t=1646758287',
			capsule_imagev5: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/288160/capsule_184x69.jpg?t=1646758287',
			website: 'http://www.fireproofgames.com/',
			developers: ['Fireproof Games'],
			publishers: ['Fireproof Games'],
			price_overview: {
				currency: 'TWD',
				initial: 14800,
				final: 14800,
				discount_percent: 0,
				initial_formatted: '',
				final_formatted: 'NT$ 148',
			},
			platforms: {
				windows: true,
				mac: false,
				linux: false,
			},
			metacritic: {
				score: 73,
				url: 'https://www.metacritic.com/game/pc/the-room?ftag=MCD-06-10aaa1f',
			},
			categories: [
				{ id: 2, description: '單人' },
				{ id: 22, description: 'Steam 成就' },
			],
			genres: [
				{ id: '25', description: '冒險' },
				{ id: '23', description: '獨立製作' },
			],
			screenshots: [
				{
					id: 0,
					path_thumbnail: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/288160/ss_a3436301ee13b4e309201d8101e314b453eff2e3.600x338.jpg',
					path_full: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/288160/ss_a3436301ee13b4e309201d8101e314b453eff2e3.1920x1080.jpg',
				},
			],
			movies: [
				{
					id: 2032805,
					name: 'The Room PC Trailer',
					thumbnail: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/2032805/movie.293x165.jpg',
					highlight: true,
				},
			],
			recommendations: {
				total: 29131,
			},
			release_date: {
				coming_soon: false,
				date: '2014 年 7 月 28 日',
			},
			content_descriptors: {
				ids: [],
				notes: null,
			},
		},
	},
};

describe('Steam Plugin', () => {
	describe('URL matching', () => {
		test('store.steampowered.com/app/{id} should match', async () => {
			const { test } = await import('@/plugins/steam.js');
			expect(test(new URL('https://store.steampowered.com/app/288160'))).toBe(true);
			expect(test(new URL('https://store.steampowered.com/app/123456'))).toBe(true);
		});

		test('store.steampowered.com/app/{id}/title should match', async () => {
			const { test } = await import('@/plugins/steam.js');
			expect(test(new URL('https://store.steampowered.com/app/288160/The_Room/'))).toBe(true);
			expect(test(new URL('https://store.steampowered.com/app/570/Dota_2/'))).toBe(true);
		});

		test('store.steampowered.com/app/{id} with query params should match', async () => {
			const { test } = await import('@/plugins/steam.js');
			expect(test(new URL('https://store.steampowered.com/app/288160?snr=1_7_7_151_150_1'))).toBe(true);
		});

		test('other steampowered.com paths should not match', async () => {
			const { test } = await import('@/plugins/steam.js');
			expect(test(new URL('https://store.steampowered.com/'))).toBe(false);
			expect(test(new URL('https://store.steampowered.com/search/'))).toBe(false);
			expect(test(new URL('https://store.steampowered.com/bundle/123'))).toBe(false);
			expect(test(new URL('https://store.steampowered.com/dlc/123'))).toBe(false);
		});

		test('other domains should not match', async () => {
			const { test } = await import('@/plugins/steam.js');
			expect(test(new URL('https://steampowered.com/app/288160'))).toBe(false);
			expect(test(new URL('https://steamcommunity.com/app/288160'))).toBe(false);
			expect(test(new URL('https://example.com/app/288160'))).toBe(false);
		});
	});

	describe('API response handling', () => {
		test('successful fetch should return summary', async () => {
			const { summarize } = await import('@/plugins/steam.js');

			setupMockJsonResponse(
				'https://store.steampowered.com/api/appdetails/?l=tchinese&appids=288160',
				sampleSteamResponse,
			);

			const result = await summarize(new URL('https://store.steampowered.com/app/288160/The_Room/'));

			expect(result).not.toBeNull();
			expect(result?.title).toBe('The Room');
			expect(result?.icon).toBe('https://store.steampowered.com/favicon.ico');
			expect(result?.description).toContain('mysterious invitation');
			expect(result?.thumbnail).toBe('https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/288160/header.jpg?t=1646758287');
			expect(result?.sitename).toBe('Steam');
			expect(result?.sensitive).toBe(false);
			expect(result?.player.url).toBeNull();
			expect(result?.activityPub).toBeNull();
			expect(result?.fediverseCreator).toBeNull();
		});

		test('URL with trailing slash should work', async () => {
			const { summarize } = await import('@/plugins/steam.js');

			setupMockJsonResponse(
				'https://store.steampowered.com/api/appdetails/?l=tchinese&appids=288160',
				sampleSteamResponse,
			);

			const result = await summarize(new URL('https://store.steampowered.com/app/288160/'));

			expect(result).not.toBeNull();
			expect(result?.title).toBe('The Room');
		});

		test('URL without trailing path should work', async () => {
			const { summarize } = await import('@/plugins/steam.js');

			setupMockJsonResponse(
				'https://store.steampowered.com/api/appdetails/?l=tchinese&appids=288160',
				sampleSteamResponse,
			);

			const result = await summarize(new URL('https://store.steampowered.com/app/288160'));

			expect(result).not.toBeNull();
			expect(result?.title).toBe('The Room');
		});

		test('adult content (required_age >= 18) should be marked as sensitive', async () => {
			const { summarize } = await import('@/plugins/steam.js');
			const adultResponse = {
				'999999': {
					success: true,
					data: {
						...sampleSteamResponse['288160'].data,
						steam_appid: 999999,
						required_age: 18,
					},
				},
			};

			setupMockJsonResponse(
				'https://store.steampowered.com/api/appdetails/?l=tchinese&appids=999999',
				adultResponse,
			);

			const result = await summarize(new URL('https://store.steampowered.com/app/999999'));

			expect(result).not.toBeNull();
			expect(result?.sensitive).toBe(true);
		});

		test('adult content with string required_age should be marked as sensitive', async () => {
			const { summarize } = await import('@/plugins/steam.js');
			const adultResponse = {
				'888888': {
					success: true,
					data: {
						...sampleSteamResponse['288160'].data,
						steam_appid: 888888,
						required_age: '18',
					},
				},
			};

			setupMockJsonResponse(
				'https://store.steampowered.com/api/appdetails/?l=tchinese&appids=888888',
				adultResponse,
			);

			const result = await summarize(new URL('https://store.steampowered.com/app/888888'));

			expect(result).not.toBeNull();
			expect(result?.sensitive).toBe(true);
		});

		test('HTML tags in description should be removed', async () => {
			const { summarize } = await import('@/plugins/steam.js');
			const htmlResponse = {
				'111111': {
					success: true,
					data: {
						...sampleSteamResponse['288160'].data,
						steam_appid: 111111,
						short_description: '<p>This is a <strong>test</strong> with <br /> newlines</p>',
					},
				},
			};

			setupMockJsonResponse(
				'https://store.steampowered.com/api/appdetails/?l=tchinese&appids=111111',
				htmlResponse,
			);

			const result = await summarize(new URL('https://store.steampowered.com/app/111111'));

			expect(result).not.toBeNull();
			expect(result?.description).toContain('This is a test with');
			expect(result?.description).not.toContain('<p>');
			expect(result?.description).not.toContain('<strong>');
		});

		test('HTML entities in description should be decoded', async () => {
			const { summarize } = await import('@/plugins/steam.js');
			const entitiesResponse = {
				'222222': {
					success: true,
					data: {
						...sampleSteamResponse['288160'].data,
						steam_appid: 222222,
						short_description: 'Test &amp; example &lt;with&gt; entities',
					},
				},
			};

			setupMockJsonResponse(
				'https://store.steampowered.com/api/appdetails/?l=tchinese&appids=222222',
				entitiesResponse,
			);

			const result = await summarize(new URL('https://store.steampowered.com/app/222222'));

			expect(result).not.toBeNull();
			expect(result?.description).toContain('Test & example <with> entities');
		});

		test('empty description should still work', async () => {
			const { summarize } = await import('@/plugins/steam.js');
			const emptyDescResponse = {
				'333333': {
					success: true,
					data: {
						...sampleSteamResponse['288160'].data,
						steam_appid: 333333,
						short_description: '',
					},
				},
			};

			setupMockJsonResponse(
				'https://store.steampowered.com/api/appdetails/?l=tchinese&appids=333333',
				emptyDescResponse,
			);

			const result = await summarize(new URL('https://store.steampowered.com/app/333333'));

			expect(result).not.toBeNull();
			expect(result?.description).toBe('');
		});

		test('missing header_image should return null thumbnail', async () => {
			const { summarize } = await import('@/plugins/steam.js');
			const noImageResponse = {
				'444444': {
					success: true,
					data: {
						...sampleSteamResponse['288160'].data,
						steam_appid: 444444,
						header_image: '',
					},
				},
			};

			setupMockJsonResponse(
				'https://store.steampowered.com/api/appdetails/?l=tchinese&appids=444444',
				noImageResponse,
			);

			const result = await summarize(new URL('https://store.steampowered.com/app/444444'));

			expect(result).not.toBeNull();
			expect(result?.thumbnail).toBeNull();
		});

		test('long description should be clipped', async () => {
			const { summarize } = await import('@/plugins/steam.js');
			const longDescResponse = {
				'555555': {
					success: true,
					data: {
						...sampleSteamResponse['288160'].data,
						steam_appid: 555555,
						short_description: 'A'.repeat(500),
					},
				},
			};

			setupMockJsonResponse(
				'https://store.steampowered.com/api/appdetails/?l=tchinese&appids=555555',
				longDescResponse,
			);

			const result = await summarize(new URL('https://store.steampowered.com/app/555555'));

			expect(result).not.toBeNull();
			expect(result?.description).not.toBeNull();
			expect(result?.description!.length).toBeLessThanOrEqual(303); // 300 + '...'
		});

		test('API returning success=false should return null', async () => {
			const { summarize } = await import('@/plugins/steam.js');
			const failedResponse = {
				'666666': {
					success: false,
				},
			};

			setupMockJsonResponse(
				'https://store.steampowered.com/api/appdetails/?l=tchinese&appids=666666',
				failedResponse,
			);

			const result = await summarize(new URL('https://store.steampowered.com/app/666666'));

			expect(result).toBeNull();
		});

		test('API error should return null', async () => {
			const { summarize } = await import('@/plugins/steam.js');

			setupMockStatusResponse(
				'https://store.steampowered.com/api/appdetails/?l=tchinese&appids=777777',
				404,
			);

			const result = await summarize(new URL('https://store.steampowered.com/app/777777'));

			expect(result).toBeNull();
		});

		test('network error should return null', async () => {
			const { summarize } = await import('@/plugins/steam.js');

			setupMockStatusResponse(
				'https://store.steampowered.com/api/appdetails/?l=tchinese&appids=888888',
				500,
			);

			const result = await summarize(new URL('https://store.steampowered.com/app/888888'));

			expect(result).toBeNull();
		});

		test('invalid URL without app ID should return null', async () => {
			const { summarize } = await import('@/plugins/steam.js');

			// This URL technically shouldn't pass the test() function, but testing summarize directly
			const result = await summarize(new URL('https://store.steampowered.com/search/'));

			expect(result).toBeNull();
		});
	});
});
