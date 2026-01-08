/**
 * Misskey Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockJsonResponse,
	setupMockStatusResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

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
		expect(result?.sitename).toBe('misskey.io');
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
