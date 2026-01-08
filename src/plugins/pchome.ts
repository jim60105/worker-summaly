import * as cheerio from 'cheerio';
import type Summary from '@/summary.js';
import { get } from '@/utils/fetch.js';
import { clip } from '@/utils/clip.js';

export function test(url: URL): boolean {
	if (url.hostname !== '24h.pchome.com.tw') return false;
	// Match /prod/{product_id}
	// Product ID format: XXXXXX-XXXXXXXXX (e.g., DYAJC9-A900DPLRD)
	return /^\/prod\/[A-Z0-9]{6}-[A-Z0-9]{9}/.test(url.pathname);
}

export async function summarize(url: URL): Promise<Summary | null> {
	const match = url.pathname.match(/^\/prod\/([A-Z0-9]{6}-[A-Z0-9]{9})/);
	if (!match) return null;
	
	const productId = match[1];
	
	try {
		// Fetch both APIs in parallel
		const [basicData, descData] = await Promise.all([
			fetchBasicInfo(productId),
			fetchDescription(productId),
		]);
		
		if (!basicData) return null;
		
		return buildSummary(basicData, descData);
	} catch {
		return null;
	}
}

interface PchomeBasicInfo {
	name: string;
	nick: string;
	price: number;
	imageUrl: string;
}

interface PchomeDescription {
	brand: string | null;
	slogan: string | null;
}

async function fetchBasicInfo(productId: string): Promise<PchomeBasicInfo | null> {
	const apiUrl = `https://ecapi-cdn.pchome.com.tw/ecshop/prodapi/v2/prod/${productId}&fields=Name,Nick,Price,Pic&_callback=jsonp_prod`;
	
	const response = await get(apiUrl);
	
	// Parse JSONP response
	// Format: jsonp_prod({...})
	const jsonMatch = response.match(/jsonp_prod\((.+)\)$/s);
	if (!jsonMatch) return null;
	
	const data = JSON.parse(jsonMatch[1]);
	
	// Parse Nick field (may contain HTML)
	const nickHtml = data.Nick || '';
	const $ = cheerio.load(decodeUnicode(nickHtml));
	const nick = $.text().trim();
	
	// Parse price
	const price = data.Price?.P;
	
	// Parse image URL
	const picPath = data.Pic?.B || '';
	const imageUrl = picPath ? `https://img.pchome.com.tw/cs${picPath.replace(/\\/g, '')}` : '';
	
	return {
		name: decodeUnicode(data.Name || ''),
		nick,
		price: typeof price === 'number' ? price : 0,
		imageUrl,
	};
}

async function fetchDescription(productId: string): Promise<PchomeDescription> {
	try {
		const apiUrl = `https://ecapi-cdn.pchome.com.tw/cdn/ecshop/prodapi/v2/prod/${productId}/desc&fields=Meta,SloganInfo&_callback=jsonp_desc`;
		
		const response = await get(apiUrl);
		
		// Parse JSONP response
		const jsonMatch = response.match(/jsonp_desc\((.+)\)$/s);
		if (!jsonMatch) return { brand: null, slogan: null };
		
		const data = JSON.parse(jsonMatch[1]);
		
		// Parse brand
		const brandNames = data.BrandNames || [];
		const brand = brandNames.length > 0 
			? decodeUnicode(brandNames.join('_').replace(/","/g, '_').replace(/^"|"$/g, ''))
			: null;
		
		// Parse slogan
		const sloganInfo = data.SloganInfo || [];
		const slogan = sloganInfo.length > 0 
			? decodeUnicode(sloganInfo.join('\n').replace(/^"|"$/g, ''))
			: null;
		
		return { brand, slogan };
	} catch {
		return { brand: null, slogan: null };
	}
}

// Decode Unicode escape sequences
function decodeUnicode(str: string): string {
	return str.replace(/\\u[\dA-Fa-f]{4}/g, (match) => {
		return String.fromCharCode(parseInt(match.slice(2), 16));
	});
}

function buildSummary(
	basic: PchomeBasicInfo, 
	desc: PchomeDescription,
): Summary {
	// Compose description
	const descriptionParts: string[] = [];
	
	if (desc.slogan) {
		descriptionParts.push(desc.slogan);
	}
	
	if (desc.brand) {
		descriptionParts.push(`品牌: ${desc.brand}`);
	}
	
	if (basic.price > 0) {
		descriptionParts.push(`價格: NT$ ${basic.price.toLocaleString()}`);
	}
	
	const description = descriptionParts.join('\n');
	
	return {
		title: basic.nick || basic.name,
		icon: 'https://24h.pchome.com.tw/favicon.ico',
		description: description ? clip(description, 300) : null,
		thumbnail: basic.imageUrl || null,
		sitename: 'PChome 24h',
		player: { url: null, width: null, height: null, allow: [] },
		activityPub: null,
		fediverseCreator: null,
	};
}
