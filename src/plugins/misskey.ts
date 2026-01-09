import type Summary from '@/summary.js';
import { clip } from '@/utils/clip.js';

/**
 * List of supported Misskey instance domains
 * Add new Misskey instance domains here to enable support
 */
const MISSKEY_DOMAINS = [
	'misskey.io',
];

interface MisskeyNoteResponse {
	id: string;
	user: {
		username: string;
		name: string | null;
		avatarUrl: string | null;
	};
	text: string | null;
	cw: string | null; // Content Warning text
	repliesCount: number;
	renoteCount: number;
	reactions: Record<string, number>;
	files?: Array<{
		type: string;
		url: string;
		thumbnailUrl?: string;
	}>;
	renote: MisskeyNoteResponse | null;
}

export function test(url: URL): boolean {
	if (!MISSKEY_DOMAINS.includes(url.hostname)) return false;
	// 匹配 /notes/{note_id}
	return /^\/notes\/[a-zA-Z0-9]+$/.test(url.pathname);
}

export async function summarize(url: URL): Promise<Summary | null> {
	const match = url.pathname.match(/^\/notes\/([a-zA-Z0-9]+)$/);
	if (!match) return null;

	const noteId = match[1];
	const domain = url.hostname;

	try {
		const response = await fetch(`https://${domain}/api/notes/show`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ noteId }),
			signal: AbortSignal.timeout(2000),
		});

		if (!response.ok) return null;

		const data = await response.json() as MisskeyNoteResponse;

		return buildSummary(data, url);
	} catch {
		return null;
	}
}

function buildSummary(note: MisskeyNoteResponse, url: URL): Summary {
	const domain = url.hostname;

	// 取得第一張圖片作為縮圖
	let imageFile = note.files?.find(f =>
		f.type.startsWith('image/') &&
		['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type),
	);

	if (!imageFile && note.renote && note.renote.files) {
		// 如果主貼文沒有圖片，嘗試從轉貼的貼文中找圖片
		imageFile = note.renote.files.find(f =>
			f.type.startsWith('image/') &&
			['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type),
		);
	}

	return {
		title: note.user.name || note.user.username,
		icon: note.user.avatarUrl || `https://${domain}/favicon.ico`,
		description: note.text ? clip(note.text, 300) : null,
		thumbnail: imageFile?.url || null,
		sitename: domain,
		sensitive: !!note.cw,
		player: { url: null, width: null, height: null, allow: [] },
		activityPub: url.href,
		fediverseCreator: `@${note.user.username}@${domain}`,
	};
}
