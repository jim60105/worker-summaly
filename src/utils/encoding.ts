// Reusable TextDecoder for ASCII parsing (module-level constant)
const asciiDecoder = new TextDecoder('ascii', { fatal: false, ignoreBOM: true });

// Cache for TextDecoder instances to improve performance
const decoderCache = new Map<string, TextDecoder>();

// Encoding alias mappings (extracted as constants for maintainability)
const JAPANESE_ENCODING_ALIASES = ['shift-jis', 'windows-31j', 'x-sjis', 'cp932'];
const CHINESE_ENCODING_ALIASES = ['gb2312', 'gbk'];

/**
 * Get or create a cached TextDecoder for the specified encoding
 * @param encoding Encoding name
 * @returns TextDecoder instance
 */
function getDecoder(encoding: string): TextDecoder {
	let decoder = decoderCache.get(encoding);
	if (!decoder) {
		decoder = new TextDecoder(encoding, { fatal: false, ignoreBOM: true });
		decoderCache.set(encoding, decoder);
	}
	return decoder;
}

const regCharset = /charset\s*=\s*["']?([\w-]+)/i;

/**
 * Detect HTML encoding from meta tags
 * @param body Body in Uint8Array
 * @returns encoding name compatible with TextDecoder
 */
export function detectEncoding(body: Uint8Array): string {
	// Check first 4KB for meta charset tag (performance optimization)
	const sampleSize = Math.min(body.length, 4096);
	const sample = body.slice(0, sampleSize);
	
	// Use ASCII decoding to find charset in HTML meta tags
	// This is reliable since charset declarations are always ASCII-compatible
	const asciiText = asciiDecoder.decode(sample);
	
	const matchMeta = asciiText.match(regCharset);
	if (matchMeta) {
		const candidate = matchMeta[1];
		const encoding = toEncoding(candidate);
		if (encoding != null) return encoding;
	}
	
	// Default to UTF-8
	return 'utf-8';
}

/**
 * Convert body to UTF-8 string using the specified encoding
 * @param body Body in Uint8Array
 * @param encoding Source encoding name
 * @returns Decoded UTF-8 string
 */
export function toUtf8(body: Uint8Array, encoding: string): string {
	const normalizedEncoding = normalizeEncoding(encoding);
	
	try {
		const decoder = getDecoder(normalizedEncoding);
		return decoder.decode(body);
	} catch {
		// Fallback to UTF-8 if encoding is not supported
		const decoder = getDecoder('utf-8');
		return decoder.decode(body);
	}
}

/**
 * Normalize encoding name to TextDecoder-compatible format
 * @param encoding Original encoding name
 * @returns Normalized encoding name
 */
function normalizeEncoding(encoding: string): string {
	const lower = encoding.toLowerCase();
	
	// Handle Japanese encoding aliases
	// TextDecoder supports 'shift-jis' but not 'cp932', 'windows-31j', etc.
	if (JAPANESE_ENCODING_ALIASES.includes(lower)) {
		return 'shift-jis';
	}
	
	// Handle Chinese encoding aliases
	// 'gb2312' is an alias for 'gbk' in TextDecoder
	if (CHINESE_ENCODING_ALIASES.includes(lower)) {
		return 'gbk';
	}
	
	// Return as-is for other encodings
	return encoding;
}

/**
 * Validate and normalize encoding candidate from HTML
 * @param candidate Encoding name from HTML meta tag
 * @returns Normalized encoding name or null if unsupported
 */
function toEncoding(candidate: string): string | null {
	const normalized = normalizeEncoding(candidate);
	
	try {
		// Validate by attempting to get decoder (uses cache if available)
		getDecoder(normalized);
		return normalized;
	} catch {
		return null;
	}
}
