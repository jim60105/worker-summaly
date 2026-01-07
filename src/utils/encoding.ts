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
	const asciiDecoder = new TextDecoder('ascii', { fatal: false, ignoreBOM: true });
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
		const decoder = new TextDecoder(normalizedEncoding, { fatal: false, ignoreBOM: true });
		return decoder.decode(body);
	} catch {
		// Fallback to UTF-8 if encoding is not supported
		const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
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
	if (['shift_jis', 'shift-jis', 'windows-31j', 'x-sjis', 'cp932'].includes(lower)) {
		return 'shift-jis';
	}
	
	// Handle Chinese encoding aliases
	// 'gb2312' is an alias for 'gbk' in TextDecoder
	if (['gb2312', 'gbk'].includes(lower)) {
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
		// Validate by attempting to create a TextDecoder
		// This checks if the encoding is supported in the current environment
		new TextDecoder(normalized);
		return normalized;
	} catch {
		return null;
	}
}
