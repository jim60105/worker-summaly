/**
 * Worker Entry Point Integration Tests
 * Tests the Cloudflare Worker fetch handler
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev, type UnstableDevWorker } from 'wrangler';

describe('Worker Entry Point', () => {
	let worker: UnstableDevWorker;

	beforeAll(async () => {
		worker = await unstable_dev('src/worker.ts', {
			experimental: { disableExperimentalWarning: true },
		});
	});

	afterAll(async () => {
		await worker.stop();
	});

	it('should return 400 for missing url parameter', async () => {
		const response = await worker.fetch('/');
		expect(response.status).toBe(400);

		const json = await response.json<{ error: string }>();
		expect(json.error).toContain('url');
	});

	it('should return 400 for invalid url format', async () => {
		const response = await worker.fetch('/?url=not-a-valid-url');
		expect(response.status).toBe(400);

		const json = await response.json<{ error: string }>();
		expect(json.error).toContain('Invalid');
	});

	it('should return health check response', async () => {
		const response = await worker.fetch('/health');
		expect(response.status).toBe(200);

		const json = await response.json<{ status: string }>();
		expect(json.status).toBe('ok');
	});

	it('should handle CORS preflight', async () => {
		const response = await worker.fetch('/', { method: 'OPTIONS' });
		expect(response.status).toBe(204);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});

	it('should return 405 for POST requests', async () => {
		const response = await worker.fetch('/', { method: 'POST' });
		expect(response.status).toBe(405);

		const json = await response.json<{ error: string }>();
		expect(json.error).toContain('Method not allowed');
	});

	it('should return 404 for unknown paths', async () => {
		const response = await worker.fetch('/unknown');
		expect(response.status).toBe(404);

		const json = await response.json<{ error: string }>();
		expect(json.error).toContain('Not found');
	});

	// Skip this test when SKIP_NETWORK_TEST=true as it requires real network access
	it.skipIf(process.env.SKIP_NETWORK_TEST === 'true')('should summarize a valid URL', async () => {
		const response = await worker.fetch('/?url=https://example.com');
		expect(response.status).toBe(200);

		const json = await response.json<{ title: string; url: string }>();
		expect(json).toHaveProperty('title');
		expect(json).toHaveProperty('url');
	});

	// Skip this test when SKIP_NETWORK_TEST=true as it requires real network access
	it.skipIf(process.env.SKIP_NETWORK_TEST === 'true')('should summarize Twitter/X URL successfully', async () => {
		const twitterUrl = 'https://x.com/a_nai_nai/status/2002748391109935561';
		const response = await worker.fetch(`/?url=${encodeURIComponent(twitterUrl)}`);

		expect(response.status).toBe(200);

		const json = await response.json<{
			title: string | null;
			icon: string | null;
			description: string | null;
			thumbnail: string | null;
			sitename: string | null;
			player: { url: string | null; width: number | null; height: number | null; allow: string[] };
			sensitive: boolean;
			activityPub: string | null;
			fediverseCreator: string | null;
			url: string;
		}>();

		// Verify the response structure
		expect(json).toHaveProperty('title');
		expect(json).toHaveProperty('url');
		expect(json).toHaveProperty('sensitive');
		expect(json).toHaveProperty('player');
		expect(json).toHaveProperty('sitename');
		expect(json.url).toBe(twitterUrl);
		expect(json.sitename).toBe('X (Twitter)');

		// Verify the response has valid content (not null/empty)
		expect(json.title).toBeTruthy();
		expect(json.description).toBeTruthy();

		console.log('Twitter/X Summary Result:', JSON.stringify(json, null, 2));
	});

	describe('Query Parameter Parsing', () => {
		it('should accept valid timeout parameter', async () => {
			const response = await worker.fetch('/?url=https://example.com&timeout=5000');
			// Verify no error due to parameter parsing
			expect(response.status).not.toBe(400);
		});

		it('should ignore invalid timeout parameter', async () => {
			const response = await worker.fetch('/?url=https://example.com&timeout=invalid');
			// Should proceed with default timeout
			expect(response.status).not.toBe(400);
		});

		it('should ignore negative timeout parameter', async () => {
			const response = await worker.fetch('/?url=https://example.com&timeout=-1000');
			// Should proceed with default timeout
			expect(response.status).not.toBe(400);
		});

		it('should accept valid contentLengthLimit parameter', async () => {
			const response = await worker.fetch('/?url=https://example.com&contentLengthLimit=1048576');
			expect(response.status).not.toBe(400);
		});

		it('should ignore invalid contentLengthLimit parameter', async () => {
			const response = await worker.fetch('/?url=https://example.com&contentLengthLimit=abc');
			expect(response.status).not.toBe(400);
		});

		it('should accept contentLengthRequired=true', async () => {
			const response = await worker.fetch('/?url=https://example.com&contentLengthRequired=true');
			expect(response.status).not.toBe(400);
		});

		it('should accept contentLengthRequired=false', async () => {
			const response = await worker.fetch('/?url=https://example.com&contentLengthRequired=false');
			expect(response.status).not.toBe(400);
		});

		it('should accept contentLengthRequired=1 as true', async () => {
			const response = await worker.fetch('/?url=https://example.com&contentLengthRequired=1');
			expect(response.status).not.toBe(400);
		});

		it('should accept contentLengthRequired=0 as false', async () => {
			const response = await worker.fetch('/?url=https://example.com&contentLengthRequired=0');
			expect(response.status).not.toBe(400);
		});

		it('should accept contentLengthRequired=yes as true', async () => {
			const response = await worker.fetch('/?url=https://example.com&contentLengthRequired=yes');
			expect(response.status).not.toBe(400);
		});

		it('should accept contentLengthRequired=no as false', async () => {
			const response = await worker.fetch('/?url=https://example.com&contentLengthRequired=no');
			expect(response.status).not.toBe(400);
		});

		it('should ignore invalid contentLengthRequired parameter', async () => {
			const response = await worker.fetch('/?url=https://example.com&contentLengthRequired=maybe');
			expect(response.status).not.toBe(400);
		});

		it('should accept custom userAgent parameter', async () => {
			const response = await worker.fetch('/?url=https://example.com&userAgent=CustomBot/1.0');
			expect(response.status).not.toBe(400);
		});

		it('should accept URL-encoded userAgent parameter', async () => {
			const userAgent = encodeURIComponent('Custom Bot/1.0 (with spaces)');
			const response = await worker.fetch(`/?url=https://example.com&userAgent=${userAgent}`);
			expect(response.status).not.toBe(400);
		});

		it('should accept multiple optional parameters', async () => {
			const response = await worker.fetch(
				'/?url=https://example.com&timeout=5000&contentLengthLimit=1048576&contentLengthRequired=true&userAgent=CustomBot/1.0',
			);
			expect(response.status).not.toBe(400);
		});

		it('should work with /api/summarize endpoint', async () => {
			const response = await worker.fetch(
				'/api/summarize?url=https://example.com&timeout=5000&userAgent=CustomBot/1.0',
			);
			expect(response.status).not.toBe(400);
		});
	});
});
