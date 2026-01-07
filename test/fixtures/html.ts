/**
 * HTML test fixtures for Workers environment
 * These fixtures replace file system reads with embedded content
 */

export const htmlFixtures = {
	'activitypub.html': `<!DOCTYPE html>
<meta charset="utf-8">
<link rel="alternate" type="application/activity+json" href="https://misskey.test/notes/abcdefg">`,

	'basic.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>KISS principle</title>
	</head>
	<body>
		<h1>KISS principle</h1>
		<p>KISS is an acronym for "Keep it simple, stupid" as a design principle noted by the U.S. Navy in 1960.</p>
	</body>
</html>`,

	'dirty-title.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta property="og:site_name" content="Alice's Site">
		<title>Strawberry Pasta | Alice's Site</title>
	</head>
	<body>
		<h1>Strawberry Pasta</h1>
		<p>Strawberry pasta is a kind of pasta with strawberry sauce.</p>
	</body>
</html>`,

	'fediverse-creator.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta name="fediverse:creator" content="@test@example.com">
		<title>Meow</title>
	</head>
	<body>
		<h1>Hellooo!</h1>
		<p>:3</p>
	</body>
</html>`,

	'meta-adult-sensitive.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta name="rating" content="adult">
		<title>SENSITIVE CONTENT!!</title>
	</head>
	<body>
		<h1>Yo</h1>
		<p>Hey hey hey syuilo.</p>
	</body>
</html>`,

	'meta-rta-sensitive.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta name="rating" content="RTA-5042-1996-1400-1577-RTA">
		<title>SENSITIVE CONTENT!!</title>
	</head>
	<body>
		<h1>Yo</h1>
		<p>Hey hey hey syuilo.</p>
	</body>
</html>`,

	'mixi-sensitive.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta property="mixi:content-rating" content="1">
		<title>SENSITIVE CONTENT!!</title>
	</head>
	<body>
		<h1>Yo</h1>
		<p>Hey hey hey syuilo.</p>
	</body>
</html>`,

	'no-favicon.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>Strawberry Pasta</title>
	</head>
	<body>
		<h1>Strawberry Pasta</h1>
		<p>Alice's Strawberry Pasta</p>
	</body>
</html>`,

	'no-metas.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>KISS principle</title>
	</head>
	<body>
		<h1>KISS principle</h1>
		<p>KISS is an acronym for "Keep it simple, stupid" as a design principle noted by the U.S. Navy in 1960.</p>
	</body>
</html>`,

	'oembed-and-og-video.html': `<!DOCTYPE html>
<meta property="og:video:url" content="https://example.com/embedurl" />
<link type="application/json+oembed" href="http://localhost:3060/oembed.json" />`,

	'oembed-and-og.html': `<!DOCTYPE html>
<meta property="og:description" content="blobcats rule the world">
<link type="application/json+oembed" href="http://localhost:3060/oembed.json" />`,

	'oembed-nonexistent-path.html': `<!DOCTYPE html>
<link type="application/json+oembed" href="http://localhost:3060/oembe.json" />
<meta property="og:description" content="nonexistent">`,

	'oembed-relative.html': `<!DOCTYPE html>
<link type="application/json+oembed" href="oembed.json" />`,

	'oembed-wrong-path.html': `<!DOCTYPE html>
<link type="application/json+oembed" href="http://localhost:+3060/oembed.json" />
<meta property="og:description" content="wrong url">`,

	'oembed.html': `<!DOCTYPE html>
<link type="application/json+oembed" href="http://localhost:3060/oembed.json" />`,

	'og-description.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta property="og:description" content="Strawberry Pasta">
		<title>YEE HAW</title>
	</head>
	<body>
		<h1>Yo</h1>
		<p>Hey hey hey syuilo.</p>
	</body>
</html>`,

	'og-image.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta property="og:image" content="https://himasaku.net/himasaku.png">
		<title>YEE HAW</title>
	</head>
	<body>
		<h1>Yo</h1>
		<p>Hey hey hey syuilo.</p>
	</body>
</html>`,

	'og-site_name.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta property="og:site_name" content="Strawberry Pasta">
		<title>YEE HAW</title>
	</head>
	<body>
		<h1>Yo</h1>
		<p>Hey hey hey syuilo.</p>
	</body>
</html>`,

	'og-title.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta property="og:title" content="Strawberry Pasta">
		<title>YEE HAW</title>
	</head>
	<body>
		<h1>Yo</h1>
		<p>Hey hey hey syuilo.</p>
	</body>
</html>`,

	'player-peertube-video.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>PeerTube:video</title>
		<!--
			twitter:card = summary_large_image
			twitter:player = <undefined>
			og:video:url = Points embed URL
		-->

		<meta property="og:platform" content="PeerTube">
		<meta property="og:type" content="video" />
		<meta property="og:site_name" content="Site" />
		<meta property="og:title" content="Title" />
		<meta property="og:image" content="https://example.com/imageurl" />
		<meta property="og:url" content="https://example.com/pageurl" />
		<meta property="og:description" content="Desc" />
		<meta property="og:video:url" content="https://example.com/embedurl" />
		<meta property="og:video:secure_url" content="https://example.com/embedurl" />
		<meta property="og:video:type" content="text/html" />
		<meta property="og:video:width" content="640" />
		<meta property="og:video:height" content="480" />
		<meta property="name" content="Desc" />
		<meta property="twitter:card" content="summary_large_image" />
		<meta property="twitter:site" content="@userid" />
		<meta property="twitter:title" content="Title" />
		<meta property="twitter:description" content="Desc" />
		<meta property="twitter:image" content="https://example.com/imageurl" />

	</head>
	<body>
		<h1>Yo</h1>
		<p>Hey hey hey syuilo.</p>
	</body>
</html>`,

	'player-pleroma-image.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>Pleroma:image</title>
		<!--
			twitter:card = summary_large_image
			twitter:player = <defined>, and URL points thumbnail image.
			og:video:* = <undefined>
		-->

	<meta content="Title" property="og:title">
	<meta content="https://example.com/pageurl" property="og:url">
	<meta content="Desc" property="og:description">
	<meta content="article" property="og:type">
	<meta content="https://example.com/imageurl" property="og:image">
	<meta content="150" property="og:image:width">
	<meta content="150" property="og:image:height">
	<meta content="Title" property="twitter:title">
	<meta content="Desc" property="twitter:description">
	<meta content="summary_large_image" property="twitter:card">
	<meta content="https://example.com/imageurl" property="twitter:player"><!-- This URL is an image. -->

	</head>
	<body>
		<h1>Yo</h1>
		<p>Hey hey hey syuilo.</p>
	</body>
</html>`,

	'player-pleroma-video.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>Pleroma:video</title>
		<!--
			twitter:card = player
			twitter:player = Points embed URL
			og:video:url = <undefined>
		-->

		<meta content="Title" property="og:title">
		<meta content="https://example.com/pageurl" property="og:url">
		<meta content="Desc" property="og:description">
		<meta content="article" property="og:type">
		<meta content="https://example.com/videourl" property="og:video">
		<meta content="https://example.com/imageurl" property="og:image">
		<meta content="Title" property="twitter:title">
		<meta content="Desc" property="twitter:description">
		<meta content="player" property="twitter:card">
		<meta content="https://example.com/embedurl" property="twitter:player">
		<meta content="480" property="twitter:player:width">
		<meta content="480" property="twitter:player:height">
		<meta content="https://example.com/videourl" property="twitter:player:stream">
		<meta content="video/mp4" property="twitter:player:stream:content_type">
		<meta content="summary_large_image" property="twitter:card">
		<meta content="https://example.com/imageurl" property="twitter:player">

	</head>
	<body>
		<h1>Yo</h1>
		<p>Hey hey hey syuilo.</p>
	</body>
</html>`,

	'twitter-description.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta property="twitter:description" content="Strawberry Pasta">
		<title>YEE HAW</title>
	</head>
	<body>
		<h1>Yo</h1>
		<p>Hey hey hey syuilo.</p>
	</body>
</html>`,

	'twitter-image.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta property="twitter:image" content="https://himasaku.net/himasaku.png">
		<title>YEE HAW</title>
	</head>
	<body>
		<h1>Yo</h1>
		<p>Hey hey hey syuilo.</p>
	</body>
</html>`,

	'twitter-title.html': `<!doctype html>

<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta property="twitter:title" content="Strawberry Pasta">
		<title>YEE HAW</title>
	</head>
	<body>
		<h1>Yo</h1>
		<p>Hey hey hey syuilo.</p>
	</body>
</html>`,
};

/**
 * Get HTML fixture content by filename
 */
export function getHtmlFixture(filename: string): string {
	const content = htmlFixtures[filename as keyof typeof htmlFixtures];
	if (!content) {
		throw new Error(`HTML fixture not found: ${filename}`);
	}
	return content;
}
