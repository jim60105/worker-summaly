import type Summary from '@/summary.js';
import { clip } from '@/utils/clip.js';

interface EHentaiApiResponse {
	gmetadata: Array<{
		gid: number;
		token: string;
		title: string;
		title_jpn: string;
		category: string;
		thumb: string;
		uploader: string;
		posted: string;
		filecount: string;
		rating: string;
		tags: string[];
	}>;
}

// Tag namespace translation map
const TAG_NAMESPACE_MAP: Record<string, string> = {
	'artist': '繪師',
	'character': '角色',
	'cosplayer': 'coser',
	'female': '女性',
	'group': '社團',
	'language': '語言',
	'male': '男性',
	'mixed': '混合',
	'other': '其他',
	'parody': '原作',
	'reclass': '重新分類',
	'temp': '臨時',
};

export function test(url: URL): boolean {
	if (url.hostname !== 'e-hentai.org' && url.hostname !== 'exhentai.org') {
		return false;
	}
	return /^\/g\/\d+\/[a-z0-9]+\/?$/.test(url.pathname);
}

function buildSummary(metadata: EHentaiApiResponse['gmetadata'][0]): Summary {
	// Process tags and group by namespace
	const tagMap = new Map<string, string[]>();
	
	for (const tag of metadata.tags) {
		const [namespace, tagName] = tag.includes(':') 
			? tag.split(':') 
			: ['misc', tag];
		
		if (!tagMap.has(namespace)) {
			tagMap.set(namespace, []);
		}
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		tagMap.get(namespace)!.push(tagName);
	}
	
	// Format tag descriptions
	const tagDescriptions: string[] = [];
	for (const [namespace, tags] of tagMap) {
		const translatedNamespace = TAG_NAMESPACE_MAP[namespace] || namespace;
		tagDescriptions.push(`${translatedNamespace}: ${tags.join(', ')}`);
	}
	
	// Combine description
	const description = [
		`類別: ${metadata.category}`,
		`評分: ${metadata.rating}`,
		`上傳者: ${metadata.uploader}`,
		'',
		...tagDescriptions,
	].join('\n');
	
	return {
		title: metadata.title_jpn || metadata.title,
		icon: 'https://e-hentai.org/favicon.ico',
		description: clip(description, 300),
		thumbnail: metadata.thumb,
		sitename: 'E-Hentai',
		player: { url: null, width: null, height: null, allow: [] },
		sensitive: true, // E-Hentai content is always sensitive
		activityPub: null,
		fediverseCreator: null,
	};
}

export async function summarize(url: URL): Promise<Summary | null> {
	const match = url.pathname.match(/^\/g\/(\d+)\/([a-z0-9]+)/);
	if (!match) return null;
	
	const [, galleryIdStr, galleryToken] = match;
	const galleryId = parseInt(galleryIdStr, 10);
	
	try {
		const response = await fetch('https://api.e-hentai.org/api.php', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				method: 'gdata',
				gidlist: [[galleryId, galleryToken]],
				namespace: 1,
			}),
			signal: AbortSignal.timeout(3000),
		});
		
		if (!response.ok) return null;
		
		const data = await response.json() as EHentaiApiResponse;
		
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!data.gmetadata || data.gmetadata.length === 0) return null;
		
		return buildSummary(data.gmetadata[0]);
	} catch {
		return null;
	}
}
