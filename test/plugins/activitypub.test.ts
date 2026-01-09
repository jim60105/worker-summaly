/**
 * ActivityPub Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockJsonResponse,
	setupMockStatusResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('ActivityPub Plugin', () => {
	describe('URL matching', () => {
		test('Mastodon /@user/status URL should match', async () => {
			const { test } = await import('@/plugins/activitypub.js');
			expect(test(new URL('https://liker.social/@jim60105/115815247926433817'))).toBe(true);
			expect(test(new URL('https://mastodon.social/@user/123456789'))).toBe(true);
		});

		test('Mastodon /users/user/statuses URL should match', async () => {
			const { test } = await import('@/plugins/activitypub.js');
			expect(test(new URL('https://mastodon.social/users/testuser/statuses/123456789'))).toBe(true);
		});

		test('Pleroma /notice URL should match', async () => {
			const { test } = await import('@/plugins/activitypub.js');
			expect(test(new URL('https://pleroma.example.com/notice/abc123XYZ'))).toBe(true);
		});

		test('Pleroma /objects URL should match', async () => {
			const { test } = await import('@/plugins/activitypub.js');
			expect(test(new URL('https://pleroma.example.com/objects/a1b2c3d4-e5f6-7890-abcd-ef1234567890'))).toBe(true);
		});

		test('GoToSocial URL should match', async () => {
			const { test } = await import('@/plugins/activitypub.js');
			expect(test(new URL('https://gts.example.com/@user/statuses/abc123'))).toBe(true);
		});

		test('Lemmy /post URL should match', async () => {
			const { test } = await import('@/plugins/activitypub.js');
			expect(test(new URL('https://lemmy.example.com/post/123456'))).toBe(true);
		});

		test('Lemmy /comment URL should match', async () => {
			const { test } = await import('@/plugins/activitypub.js');
			expect(test(new URL('https://lemmy.example.com/comment/789'))).toBe(true);
		});

		test('PeerTube /videos/watch URL should match', async () => {
			const { test } = await import('@/plugins/activitypub.js');
			expect(test(new URL('https://peertube.example.com/videos/watch/a1b2c3d4-e5f6-7890-abcd-ef1234567890'))).toBe(true);
		});

		test('PixelFed URL should match', async () => {
			const { test } = await import('@/plugins/activitypub.js');
			expect(test(new URL('https://pixelfed.example.com/p/username/123456789'))).toBe(true);
		});

		test('Friendica URL should match', async () => {
			const { test } = await import('@/plugins/activitypub.js');
			expect(test(new URL('https://friendica.example.com/display/abc123-xyz'))).toBe(true);
		});

		test('Hubzilla URL should match', async () => {
			const { test } = await import('@/plugins/activitypub.js');
			expect(test(new URL('https://hubzilla.example.com/item/abc123-xyz'))).toBe(true);
		});

		test('Non-matching URL should not match', async () => {
			const { test } = await import('@/plugins/activitypub.js');
			expect(test(new URL('https://example.com/'))).toBe(false);
			expect(test(new URL('https://example.com/about'))).toBe(false);
			expect(test(new URL('https://mastodon.social/@user'))).toBe(false); // User profile, not a post
		});
	});

	describe('Summarization', () => {
		test('Mastodon Note with image', async () => {
			const { summarize } = await import('@/plugins/activitypub.js');

			const noteResponse = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				id: 'https://liker.social/users/jim60105/statuses/115815247926433817',
				type: 'Note',
				attributedTo: 'https://liker.social/users/jim60105',
				content: '<p>Misskey 有這個www我有個理由要在今天把正式站開起來了</p>',
				published: '2025-12-31T03:00:00Z',
				sensitive: false,
				attachment: [
					{
						type: 'Document',
						mediaType: 'image/png',
						url: 'https://dplsgtvuyo356.cloudfront.net/media_attachments/files/115/815/246/342/795/046/original/67cd38986d942287.png',
						name: '',
					},
				],
			};

			const actorResponse = {
				id: 'https://liker.social/users/jim60105',
				type: 'Person',
				preferredUsername: 'jim60105',
				name: '琳',
				icon: {
					type: 'Image',
					url: 'https://liker.social/avatars/jim60105.png',
				},
			};

			setupMockJsonResponse('https://liker.social/@jim60105/115815247926433817', noteResponse);
			setupMockJsonResponse('https://liker.social/users/jim60105', actorResponse);

			const result = await summarize(new URL('https://liker.social/@jim60105/115815247926433817'));

			expect(result).not.toBeNull();
			expect(result?.title).toBe('琳');
			expect(result?.icon).toBe('https://liker.social/avatars/jim60105.png');
			expect(result?.description).toBe('Misskey 有這個www我有個理由要在今天把正式站開起來了');
			expect(result?.thumbnail).toBe('https://dplsgtvuyo356.cloudfront.net/media_attachments/files/115/815/246/342/795/046/original/67cd38986d942287.png');
			expect(result?.sitename).toBe('liker.social');
			expect(result?.activityPub).toBe('https://liker.social/users/jim60105/statuses/115815247926433817');
			expect(result?.fediverseCreator).toBe('@jim60105@liker.social');
			expect(result?.sensitive).toBe(false);
		});

		test('Note with Content Warning (sensitive)', async () => {
			const { summarize } = await import('@/plugins/activitypub.js');

			const noteResponse = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				id: 'https://mastodon.social/users/test/statuses/123',
				type: 'Note',
				attributedTo: 'https://mastodon.social/users/test',
				summary: 'CW: Spoiler Alert',
				content: '<p>Hidden content behind CW</p>',
				sensitive: true,
			};

			const actorResponse = {
				id: 'https://mastodon.social/users/test',
				type: 'Person',
				preferredUsername: 'test',
				name: 'Test User',
			};

			setupMockJsonResponse('https://mastodon.social/@test/123', noteResponse);
			setupMockJsonResponse('https://mastodon.social/users/test', actorResponse);

			const result = await summarize(new URL('https://mastodon.social/@test/123'));

			expect(result).not.toBeNull();
			expect(result?.sensitive).toBe(true);
			expect(result?.description).toContain('CW: Spoiler Alert');
			expect(result?.description).toContain('Hidden content behind CW');
		});

		test('Note without actor name uses preferredUsername', async () => {
			const { summarize } = await import('@/plugins/activitypub.js');

			const noteResponse = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				id: 'https://instance.example/users/anon/statuses/456',
				type: 'Note',
				attributedTo: 'https://instance.example/users/anon',
				content: '<p>Test note</p>',
			};

			const actorResponse = {
				id: 'https://instance.example/users/anon',
				type: 'Person',
				preferredUsername: 'anon',
				// No name field
			};

			setupMockJsonResponse('https://instance.example/@anon/456', noteResponse);
			setupMockJsonResponse('https://instance.example/users/anon', actorResponse);

			const result = await summarize(new URL('https://instance.example/@anon/456'));

			expect(result).not.toBeNull();
			expect(result?.title).toBe('anon');
			expect(result?.fediverseCreator).toBe('@anon@instance.example');
		});

		test('Note with embedded actor object', async () => {
			const { summarize } = await import('@/plugins/activitypub.js');

			const noteResponse = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				id: 'https://pleroma.example/notice/abc123',
				type: 'Note',
				attributedTo: {
					id: 'https://pleroma.example/users/embedded',
					type: 'Person',
					preferredUsername: 'embedded',
					name: 'Embedded Actor',
					icon: {
						type: 'Image',
						url: 'https://pleroma.example/avatar.png',
					},
				},
				content: '<p>Note with embedded actor</p>',
			};

			setupMockJsonResponse('https://pleroma.example/notice/abc123', noteResponse);

			const result = await summarize(new URL('https://pleroma.example/notice/abc123'));

			expect(result).not.toBeNull();
			expect(result?.title).toBe('Embedded Actor');
			expect(result?.icon).toBe('https://pleroma.example/avatar.png');
			expect(result?.fediverseCreator).toBe('@embedded@pleroma.example');
		});

		test('Article type with name field', async () => {
			const { summarize } = await import('@/plugins/activitypub.js');

			const articleResponse = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				id: 'https://lemmy.example/post/789',
				type: 'Article',
				attributedTo: 'https://lemmy.example/u/author',
				name: 'Article Title Here',
				content: '<p>Article body content</p>',
				image: {
					type: 'Image',
					url: 'https://lemmy.example/images/article-cover.jpg',
				},
			};

			const actorResponse = {
				id: 'https://lemmy.example/u/author',
				type: 'Person',
				preferredUsername: 'author',
				name: 'Article Author',
			};

			setupMockJsonResponse('https://lemmy.example/post/789', articleResponse);
			setupMockJsonResponse('https://lemmy.example/u/author', actorResponse);

			const result = await summarize(new URL('https://lemmy.example/post/789'));

			expect(result).not.toBeNull();
			expect(result?.title).toBe('Article Author');
			expect(result?.thumbnail).toBe('https://lemmy.example/images/article-cover.jpg');
		});

		test('Activity wrapper with Note object', async () => {
			const { summarize } = await import('@/plugins/activitypub.js');

			const activityResponse = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				type: 'Create',
				actor: 'https://instance.example/users/creator',
				object: {
					id: 'https://instance.example/objects/uuid-here',
					type: 'Note',
					attributedTo: 'https://instance.example/users/creator',
					content: '<p>Note inside Activity wrapper</p>',
				},
			};

			const actorResponse = {
				id: 'https://instance.example/users/creator',
				type: 'Person',
				preferredUsername: 'creator',
				name: 'Content Creator',
			};

			setupMockJsonResponse('https://instance.example/objects/a1b2c3d4-e5f6-7890-abcd-ef1234567890', activityResponse);
			setupMockJsonResponse('https://instance.example/users/creator', actorResponse);

			const result = await summarize(new URL('https://instance.example/objects/a1b2c3d4-e5f6-7890-abcd-ef1234567890'));

			expect(result).not.toBeNull();
			expect(result?.title).toBe('Content Creator');
			expect(result?.description).toBe('Note inside Activity wrapper');
		});

		test('Note without attachments has no thumbnail', async () => {
			const { summarize } = await import('@/plugins/activitypub.js');

			const noteResponse = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				id: 'https://mastodon.social/users/textonly/statuses/999',
				type: 'Note',
				attributedTo: 'https://mastodon.social/users/textonly',
				content: '<p>Just text, no images</p>',
			};

			const actorResponse = {
				id: 'https://mastodon.social/users/textonly',
				type: 'Person',
				preferredUsername: 'textonly',
				name: 'Text Only',
			};

			setupMockJsonResponse('https://mastodon.social/@textonly/999', noteResponse);
			setupMockJsonResponse('https://mastodon.social/users/textonly', actorResponse);

			const result = await summarize(new URL('https://mastodon.social/@textonly/999'));

			expect(result).not.toBeNull();
			expect(result?.thumbnail).toBeNull();
		});

		test('Failed API response returns null', async () => {
			const { summarize } = await import('@/plugins/activitypub.js');

			setupMockStatusResponse('https://mastodon.social/@notfound/404', 404);

			const result = await summarize(new URL('https://mastodon.social/@notfound/404'));

			expect(result).toBeNull();
		});

		test('Unsupported object type returns null', async () => {
			const { summarize } = await import('@/plugins/activitypub.js');

			const personResponse = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				id: 'https://mastodon.social/users/someone',
				type: 'Person',
				preferredUsername: 'someone',
			};

			setupMockJsonResponse('https://mastodon.social/@someone/123', personResponse);

			const result = await summarize(new URL('https://mastodon.social/@someone/123'));

			expect(result).toBeNull();
		});

		test('HTML entities in content are decoded', async () => {
			const { summarize } = await import('@/plugins/activitypub.js');

			const noteResponse = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				id: 'https://mastodon.social/users/test/statuses/html',
				type: 'Note',
				attributedTo: 'https://mastodon.social/users/test',
				// HTML entities like &amp; &quot; are decoded, HTML tags are stripped
				content: '<p>Test &amp; entities with &quot;quotes&quot; and special chars!</p>',
			};

			const actorResponse = {
				id: 'https://mastodon.social/users/test',
				type: 'Person',
				preferredUsername: 'test',
				name: 'Test',
			};

			setupMockJsonResponse('https://mastodon.social/@test/html', noteResponse);
			setupMockJsonResponse('https://mastodon.social/users/test', actorResponse);

			const result = await summarize(new URL('https://mastodon.social/@test/html'));

			expect(result).not.toBeNull();
			expect(result?.description).toBe('Test & entities with "quotes" and special chars!');
		});

		test('Icon as string URL', async () => {
			const { summarize } = await import('@/plugins/activitypub.js');

			const noteResponse = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				id: 'https://instance.example/notice/iconstr',
				type: 'Note',
				attributedTo: 'https://instance.example/users/iconstr',
				content: '<p>Test</p>',
			};

			const actorResponse = {
				id: 'https://instance.example/users/iconstr',
				type: 'Person',
				preferredUsername: 'iconstr',
				icon: 'https://instance.example/avatars/direct-url.png',
			};

			setupMockJsonResponse('https://instance.example/notice/iconstr', noteResponse);
			setupMockJsonResponse('https://instance.example/users/iconstr', actorResponse);

			const result = await summarize(new URL('https://instance.example/notice/iconstr'));

			expect(result).not.toBeNull();
			expect(result?.icon).toBe('https://instance.example/avatars/direct-url.png');
		});

		test('Fallback to favicon when actor has no icon', async () => {
			const { summarize } = await import('@/plugins/activitypub.js');

			const noteResponse = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				id: 'https://instance.example/notice/noicon',
				type: 'Note',
				attributedTo: 'https://instance.example/users/noicon',
				content: '<p>Test</p>',
			};

			const actorResponse = {
				id: 'https://instance.example/users/noicon',
				type: 'Person',
				preferredUsername: 'noicon',
				// No icon field
			};

			setupMockJsonResponse('https://instance.example/notice/noicon', noteResponse);
			setupMockJsonResponse('https://instance.example/users/noicon', actorResponse);

			const result = await summarize(new URL('https://instance.example/notice/noicon'));

			expect(result).not.toBeNull();
			expect(result?.icon).toBe('https://instance.example/favicon.ico');
		});

		test('Image attachment detected by file extension', async () => {
			const { summarize } = await import('@/plugins/activitypub.js');

			const noteResponse = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				id: 'https://instance.example/notice/imgext',
				type: 'Note',
				attributedTo: 'https://instance.example/users/imgext',
				content: '<p>Image by extension</p>',
				attachment: [
					{
						type: 'Document',
						url: 'https://instance.example/media/photo.jpg',
						// No mediaType field, rely on extension
					},
				],
			};

			const actorResponse = {
				id: 'https://instance.example/users/imgext',
				type: 'Person',
				preferredUsername: 'imgext',
			};

			setupMockJsonResponse('https://instance.example/notice/imgext', noteResponse);
			setupMockJsonResponse('https://instance.example/users/imgext', actorResponse);

			const result = await summarize(new URL('https://instance.example/notice/imgext'));

			expect(result).not.toBeNull();
			expect(result?.thumbnail).toBe('https://instance.example/media/photo.jpg');
		});

		test('Image attachment detected by type=Image', async () => {
			const { summarize } = await import('@/plugins/activitypub.js');

			const noteResponse = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				id: 'https://instance.example/notice/imgtype',
				type: 'Note',
				attributedTo: 'https://instance.example/users/imgtype',
				content: '<p>Image by type</p>',
				attachment: [
					{
						type: 'Image',
						url: 'https://instance.example/media/image-by-type',
					},
				],
			};

			const actorResponse = {
				id: 'https://instance.example/users/imgtype',
				type: 'Person',
				preferredUsername: 'imgtype',
			};

			setupMockJsonResponse('https://instance.example/notice/imgtype', noteResponse);
			setupMockJsonResponse('https://instance.example/users/imgtype', actorResponse);

			const result = await summarize(new URL('https://instance.example/notice/imgtype'));

			expect(result).not.toBeNull();
			expect(result?.thumbnail).toBe('https://instance.example/media/image-by-type');
		});

		test('Image as string URL in object', async () => {
			const { summarize } = await import('@/plugins/activitypub.js');

			const noteResponse = {
				'@context': 'https://www.w3.org/ns/activitystreams',
				id: 'https://instance.example/notice/imgstr',
				type: 'Note',
				attributedTo: 'https://instance.example/users/imgstr',
				content: '<p>Image as string</p>',
				image: 'https://instance.example/media/string-image.png',
			};

			const actorResponse = {
				id: 'https://instance.example/users/imgstr',
				type: 'Person',
				preferredUsername: 'imgstr',
			};

			setupMockJsonResponse('https://instance.example/notice/imgstr', noteResponse);
			setupMockJsonResponse('https://instance.example/users/imgstr', actorResponse);

			const result = await summarize(new URL('https://instance.example/notice/imgstr'));

			expect(result).not.toBeNull();
			expect(result?.thumbnail).toBe('https://instance.example/media/string-image.png');
		});
	});
});
