import iconv from 'iconv-lite';
import jschardet from 'jschardet';

const regCharset = new RegExp(/charset\s*=\s*["']?([\w-]+)/, 'i');

/**
 * Detect HTML encoding
 * @param body Body in Buffer or Uint8Array
 * @returns encoding
 */
export function detectEncoding(body: Buffer | Uint8Array): string {
	// Convert Uint8Array to Buffer for jschardet
	const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
	
	// By detection
	const detected = jschardet.detect(buffer, { minimumThreshold: 0.99 });
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (detected) {
		const candicate = detected.encoding;
		const encoding = toEncoding(candicate);
		if (encoding != null) return encoding;
	}

	// From meta - convert to string for regex matching
	const textDecoder = new TextDecoder('ascii');
	const asciiText = textDecoder.decode(buffer);
	const matchMeta = asciiText.match(regCharset);
	if (matchMeta) {
		const candicate = matchMeta[1];
		const encoding = toEncoding(candicate);
		if (encoding != null) return encoding;
	}

	return 'utf-8';
}

export function toUtf8(body: Buffer | Uint8Array, encoding: string): string {
	return iconv.decode(Buffer.from(body), encoding);
}

function toEncoding(candicate: string): string | null {
	if (iconv.encodingExists(candicate)) {
		if (['shift_jis', 'shift-jis', 'windows-31j', 'x-sjis'].includes(candicate.toLowerCase())) return 'cp932';
		return candicate;
	} else {
		return null;
	}
}
