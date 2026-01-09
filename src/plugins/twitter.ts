import summary from '@/summary.js';
import { get } from '@/utils/fetch.js';
import { clip } from '@/utils/clip.js';

/**
 * Twitter/X plugin - Extracts tweet metadata using fxtwitter and vxtwitter APIs
 * Merged with master on 2026-01-08
 */

interface FxTwitterResponse {
	tweet: {
		author: {
			screen_name: string;
			name: string;
			avatar_url?: string;
		};
		url: string;
		text: string;
		created_timestamp: number;
		replies?: number;
		retweets?: number;
		likes?: number;
		possibly_sensitive?: boolean;
		quote?: {
			author: { screen_name: string };
			url: string;
			text?: string;
		};
		media?: {
			mosaic?: {
				type: string;
				formats: { jpeg: string };
			};
			photos?: Array<{ type: string; url: string }>;
			all?: Array<{ type: string; url: string }>;
		};
	};
}

interface VxTwitterResponse {
	user_screen_name: string;
	user_name: string;
	user_profile_image_url?: string;
	tweetURL: string;
	text: string;
	date_epoch: number;
	replies?: number;
	retweets?: number;
	likes?: number;
	possibly_sensitive?: boolean;
	mediaURLs?: string[];
	combinedMediaUrl?: string;
	media_extended?: Array<{
		type: 'image' | 'video' | 'gif';
		url: string;
	}>;
	qrt?: {
		user_screen_name: string;
		tweetURL: string;
		text?: string;
	};
}

export function test(url: URL): boolean {
	return (url.hostname === 'x.com' || url.hostname === 'twitter.com') &&
		/^\/[A-Za-z0-9_]{1,15}\/status\/\d+/.test(url.pathname);
}

function buildSummary(tweet: FxTwitterResponse['tweet']): summary {
	// Handle thumbnail: prioritize mosaic (multi-photo composition) or first photo
	let thumbnail: string | null = null;
	if (tweet.media?.mosaic?.type === 'mosaic_photo') {
		thumbnail = tweet.media.mosaic.formats.jpeg;
	} else if (tweet.media?.photos?.[0]) {
		thumbnail = tweet.media.photos[0].url + '?name=large';
	}

	return {
		title: tweet.author.name || tweet.author.screen_name,
		icon: tweet.author.avatar_url || 'https://abs.twimg.com/favicons/twitter.2.ico',
		description: clip(tweet.text, 300),
		thumbnail,
		sitename: 'X (Twitter)',
		player: { url: null, width: null, height: null, allow: [] },
		sensitive: tweet.possibly_sensitive ?? false,
		activityPub: null,
		fediverseCreator: null,
	};
}

function buildSummaryFromVx(data: VxTwitterResponse): summary {
	// Handle thumbnail: use combinedMediaUrl or first mediaURL
	let thumbnail: string | null = null;
	if (data.combinedMediaUrl) {
		thumbnail = data.combinedMediaUrl;
	} else if (data.mediaURLs?.[0]) {
		thumbnail = data.mediaURLs[0];
	}

	return {
		title: data.user_name || data.user_screen_name,
		icon: data.user_profile_image_url || 'https://abs.twimg.com/favicons/twitter.2.ico',
		description: clip(data.text, 300),
		thumbnail,
		sitename: 'X (Twitter)',
		player: { url: null, width: null, height: null, allow: [] },
		sensitive: data.possibly_sensitive ?? false,
		activityPub: null,
		fediverseCreator: null,
	};
}

export async function summarize(url: URL): Promise<summary | null> {
	// 1. Parse tweet ID from URL
	const pathMatch = url.pathname.match(/\/[A-Za-z0-9_]+\/status\/(\d+)/);
	if (!pathMatch) return null;
	const tweetId = pathMatch[1];

	// 2. Try fxtwitter API
	try {
		const response = await get(`https://api.fxtwitter.com/i/status/${tweetId}`);
		const data = JSON.parse(response) as FxTwitterResponse;

		if ('tweet' in data) {
			return buildSummary(data.tweet);
		}
	} catch {
		// fxtwitter failed, try fallback
	}

	// 3. Fallback: try vxtwitter API
	try {
		const response = await get(`https://api.vxtwitter.com/i/status/${tweetId}`);
		const data = JSON.parse(response) as VxTwitterResponse;
		return buildSummaryFromVx(data);
	} catch {
		// Both APIs failed, return null to let general parser handle it
		return null;
	}
}
