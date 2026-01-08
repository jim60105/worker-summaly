import type Summary from '@/summary.js';
import { clip } from '@/utils/clip.js';

const BILIBILI_API_HEADERS = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'zh-TW,zh;q=0.8,en-US;q=0.5,en;q=0.3',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0',
};

interface BilibiliDynamicResponse {
	code: number;
	data: {
		item: {
			type: 'DYNAMIC_TYPE_DRAW' | 'DYNAMIC_TYPE_ARTICLE' | 'DYNAMIC_TYPE_WORD';
			modules: {
				module_author: {
					mid: number;
					name: string;
					face: string;
				};
				module_dynamic: {
					desc?: {
						text: string;
					};
					major?: {
						draw?: {
							items: Array<{ src: string }>;
						};
						article?: {
							title: string;
							covers?: string[];
						};
					};
				};
			};
		};
	};
}

export function test(url: URL): boolean {
	if (url.hostname !== 'www.bilibili.com' && url.hostname !== 'bilibili.com') {
		return false;
	}
	// 匹配動態頁面 /opus/{dynamic_id}
	return /^\/opus\/\d+$/.test(url.pathname);
}

export async function summarize(url: URL): Promise<Summary | null> {
	const match = url.pathname.match(/^\/opus\/(\d+)$/);
	if (!match) return null;
	
	const dynamicId = match[1];
	
	try {
		const response = await fetch(
			`https://api.bilibili.com/x/polymer/web-dynamic/v1/detail?id=${dynamicId}`,
			{
				headers: BILIBILI_API_HEADERS,
				signal: AbortSignal.timeout(2500),
			},
		);
		
		if (!response.ok) return null;
		
		const data = await response.json() as BilibiliDynamicResponse;
		
		if (data.code !== 0) return null;
		
		return buildSummary(data.data.item);
	} catch {
		return null;
	}
}

function buildSummary(item: BilibiliDynamicResponse['data']['item']): Summary {
	const author = item.modules.module_author;
	const dynamic = item.modules.module_dynamic;
	
	let description: string | null = null;
	let thumbnail: string | null = null;
	
	switch (item.type) {
		case 'DYNAMIC_TYPE_DRAW':
			description = dynamic.desc?.text || null;
			thumbnail = dynamic.major?.draw?.items ? dynamic.major.draw.items[0]?.src : null;
			break;
		case 'DYNAMIC_TYPE_ARTICLE':
			description = dynamic.major?.article?.title || null;
			thumbnail = dynamic.major?.article?.covers ? dynamic.major.article.covers[0] : null;
			break;
			
		case 'DYNAMIC_TYPE_WORD':
			description = dynamic.desc?.text || null;
			break;
	}
	
	return {
		title: author.name,
		icon: author.face || 'https://www.bilibili.com/favicon.ico',
		description: description ? clip(description, 300) : null,
		thumbnail,
		sitename: 'Bilibili',
		player: { url: null, width: null, height: null, allow: [] },
		activityPub: null,
		fediverseCreator: null,
	};
}
