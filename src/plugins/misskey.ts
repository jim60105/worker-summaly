import type Summary from '@/summary.js';
import { clip } from '@/utils/clip.js';

interface MisskeyNoteResponse {
	id: string;
	user: {
		username: string;
		name: string | null;
		avatarUrl: string | null;
	};
	text: string | null;
	repliesCount: number;
	renoteCount: number;
	reactions: Record<string, number>;
	files?: Array<{
		type: string;
		url: string;
		thumbnailUrl?: string;
	}>;
}

export function test(url: URL): boolean {
	if (url.hostname !== 'misskey.io') return false;
	// 匹配 /notes/{note_id}
	return /^\/notes\/[a-zA-Z0-9]+$/.test(url.pathname);
}

export async function summarize(url: URL): Promise<Summary | null> {
	const match = url.pathname.match(/^\/notes\/([a-zA-Z0-9]+)$/);
	if (!match) return null;
	
	const noteId = match[1];
	
	try {
		const response = await fetch('https://misskey.io/api/notes/show', {
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
	// 取得第一張圖片作為縮圖
	const imageFile = note.files?.find(f => 
		f.type.startsWith('image/') && 
		['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type),
	);
	
	return {
		title: note.user.name || note.user.username,
		icon: note.user.avatarUrl || 'https://misskey.io/favicon.ico',
		description: note.text ? clip(note.text, 300) : null,
		thumbnail: imageFile?.url || null,
		sitename: 'Misskey.io',
		player: { url: null, width: null, height: null, allow: [] },
		activityPub: url.href,
		fediverseCreator: `@${note.user.username}@misskey.io`,
	};
}
