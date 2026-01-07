/**
 * oEmbed JSON test fixtures for Workers environment
 * These fixtures replace file system reads with embedded content
 */

export const oembedFixtures = {
	'oembed.json': {
		version: '1.0',
		type: 'rich',
		html: "<iframe src='https://example.com/'></iframe>",
		width: 500,
		height: 300,
	},
	'oembed-video.json': {
		version: '1.0',
		type: 'video',
		html: "<iframe src='https://example.com/'></iframe>",
		width: 500,
		height: 300,
	},
	'oembed-too-tall.json': {
		version: '1.0',
		type: 'rich',
		html: "<iframe src='https://example.com/'></iframe>",
		height: 3000,
	},
	'oembed-iframe-child.json': {
		version: '1.0',
		type: 'rich',
		html: "<iframe src='https://example.com/'><script>alert('Hahaha I take this world')</script></iframe>",
		width: 500,
		height: 300,
	},
	'oembed-allow-fullscreen.json': {
		version: '1.0',
		type: 'rich',
		html: "<iframe src='https://example.com/' allow='fullscreen'></iframe>",
		width: 500,
		height: 300,
	},
	'oembed-allow-fullscreen-legacy.json': {
		version: '1.0',
		type: 'rich',
		html: "<iframe src='https://example.com/' allowfullscreen></iframe>",
		width: 500,
		height: 300,
	},
	'oembed-allow-safelisted-permissions.json': {
		version: '1.0',
		type: 'rich',
		html: "<iframe src='https://example.com/' allow='autoplay;clipboard-write;fullscreen;encrypted-media;picture-in-picture;web-share'></iframe>",
		width: 500,
		height: 300,
	},
	'oembed-ignore-rare-permissions.json': {
		version: '1.0',
		type: 'rich',
		html: "<iframe src='https://example.com/' allow='autoplay;gyroscope;accelerometer'></iframe>",
		width: 500,
		height: 300,
	},
	'oembed-percentage-width.json': {
		version: '1.0',
		type: 'rich',
		html: "<iframe src='https://example.com/'></iframe>",
		width: '100%',
		height: 300,
	},
	'invalid/oembed-child-iframe.json': {
		version: '1.0',
		type: 'rich',
		html: "<div><iframe src='https://example.com/'></iframe>",
		width: 500,
		height: 300,
	},
	'invalid/oembed-double-iframes.json': {
		version: '1.0',
		type: 'rich',
		html: "<iframe src='https://example.com/'></iframe><iframe src='https://example.com/'></iframe>",
		width: 500,
		height: 300,
	},
	'invalid/oembed-future.json': {
		version: '11.0',
		type: 'rich',
		html: "<iframe src='https://example.com/'></iframe>",
		width: 500,
		height: 300,
	},
	'invalid/oembed-insecure.json': {
		version: '1.0',
		type: 'rich',
		html: "<iframe src='http://example.com/'></iframe>",
		width: 500,
		height: 300,
	},
	'invalid/oembed-invalid-height.json': {
		version: '1.0',
		type: 'rich',
		html: "<iframe src='https://example.com/'></iframe>",
		width: 500,
		height: 'blobcat',
	},
	'invalid/oembed-no-height.json': {
		version: '1.0',
		type: 'rich',
		html: "<iframe src='https://example.com/'></iframe>",
		width: 500,
	},
	'invalid/oembed-no-version.json': {
		type: 'rich',
		html: "<iframe src='https://example.com/'></iframe>",
		width: 500,
		height: 300,
	},
	'invalid/oembed-old.json': {
		version: '0.1',
		type: 'rich',
		html: "<iframe src='https://example.com/'></iframe>",
		width: 500,
		height: 300,
	},
	'invalid/oembed-photo.json': {
		version: '1.0',
		type: 'photo',
		url: 'https://example.com/example.avif',
		width: 300,
		height: 300,
	},
	'invalid/oembed-too-powerful.json': {
		version: '1.0',
		type: 'rich',
		html: "<iframe src='https://example.com/' allow='camera'></iframe>",
		width: 500,
		height: 300,
	},
	'invalid/oembed-too-powerful2.json': {
		version: '1.0',
		type: 'rich',
		html: "<iframe src='https://example.com/' allow='fullscreen;camera'></iframe>",
		width: 500,
		height: 300,
	},
};

/**
 * Get oEmbed fixture content by filename
 */
export function getOembedFixture(filename: string): unknown {
	const content = oembedFixtures[filename as keyof typeof oembedFixtures];
	if (!content) {
		throw new Error(`oEmbed fixture not found: ${filename}`);
	}
	return content;
}
