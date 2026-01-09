import { get } from '@/utils/fetch.js';
import summary from '@/summary.js';
import { clip } from '@/utils/clip.js';

export const name = 'wikipedia';

export function test(url: URL): boolean {
	if (!url.hostname) return false;
	return /\.wikipedia\.org$/.test(url.hostname);
}

export async function summarize(url: URL): Promise<summary | null> {
	const lang = url.host ? url.host.split('.')[0] : null;
	const title = url.pathname ? url.pathname.split('/')[2] : null;
	const endpoint = `https://${lang}.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&titles=${title}`;

	console.debug({
		event: 'plugin_api_request',
		plugin: 'wikipedia',
		lang,
		title,
		endpoint,
	});

	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let body = await get(endpoint) as any;
		body = JSON.parse(body);

		if (!('query' in body) || !('pages' in body.query)) {
			console.error({
				event: 'plugin_api_error',
				plugin: 'wikipedia',
				url: url.href,
				reason: 'invalid_api_response',
			});
			return null;
		}

		const info = body.query.pages[Object.keys(body.query.pages)[0]];

		return {
			title: info.title,
			icon: 'https://wikipedia.org/static/favicon/wikipedia.ico',
			description: clip(info.extract, 300),
			thumbnail: `https://wikipedia.org/static/images/project-logos/${lang}wiki.png`,
			player: {
				url: null,
				width: null,
				height: null,
				allow: [],
			},
			sitename: 'Wikipedia',
			sensitive: false,
			activityPub: null,
			fediverseCreator: null,
		};
	} catch (error) {
		console.error({
			event: 'plugin_error',
			plugin: 'wikipedia',
			url: url.href,
			error: error instanceof Error ? error.message : String(error),
		});
		return null;
	}
}
