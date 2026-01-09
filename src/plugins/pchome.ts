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

		if (!basicData) {
			console.warn({
				event: 'plugin_api_error',
				plugin: 'pchome',
				productId,
				reason: 'basic_info_fetch_failed',
			});
			return null;
		}

		return buildSummary(basicData, descData);
	} catch (error) {
		console.error({
			event: 'plugin_error',
			plugin: 'pchome',
			productId,
			error: error instanceof Error ? error.message : String(error),
		});
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
	// Format: try{jsonp_prod({...});}catch(e){...}
	const jsonMatch = response.match(/jsonp_prod\((\{.+?\})\)/s);
	if (!jsonMatch) return null;

	const data = JSON.parse(jsonMatch[1]);

	// The response has the product ID as a key with "-000" suffix
	// Example: "DBAECZ-A900GNYD0-000": {...}
	const productKey = Object.keys(data).find(key => key.startsWith(productId));
	if (!productKey) return null;

	const productData = data[productKey];

	// Parse Nick field (may contain HTML)
	const nickHtml = productData.Nick || '';
	const $ = cheerio.load(decodeUnicode(nickHtml));
	const nick = $.text().trim();

	// Parse price
	const price = productData.Price?.P;

	// Parse image URL
	// Note: PChome API returns paths with backslashes that need to be removed
	const picPath = productData.Pic?.B || '';
	const imageUrl = picPath ? `https://img.pchome.com.tw/cs${picPath.replace(/\\/g, '')}` : '';

	return {
		name: decodeUnicode(productData.Name || ''),
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
		// Format: try{jsonp_desc({...});}catch(e){...}
		const jsonMatch = response.match(/jsonp_desc\((\{.+?\})\)/s);
		if (!jsonMatch) return { brand: null, slogan: null };

		const data = JSON.parse(jsonMatch[1]);

		// The response has the product ID as a key
		const productData = data[productId];
		if (!productData) return { brand: null, slogan: null };

		// Parse brand names
		const brandNames = productData.Meta?.BrandNames || [];
		let brand: string | null = null;
		if (brandNames.length > 0) {
			brand = decodeUnicode(brandNames.join(', '));
		}

		// Parse slogan information
		const sloganInfo = productData.SloganInfo || [];
		let slogan: string | null = null;
		if (sloganInfo.length > 0) {
			slogan = decodeUnicode(sloganInfo.join('\n'));
		}

		return { brand, slogan };
	} catch (error) {
		console.debug({
			event: 'plugin_api_warning',
			plugin: 'pchome',
			productId,
			api: 'description',
			error: error instanceof Error ? error.message : String(error),
		});
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
		sensitive: false,
		activityPub: null,
		fediverseCreator: null,
	};
}
