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

	it.skip('should summarize a valid URL', async () => {
		// Skip this test for now as it requires real network access
		// This would need proper mocking setup for integration tests
		const response = await worker.fetch('/?url=https://example.com');
		expect(response.status).toBe(200);
		
		const json = await response.json<{ title: string; url: string }>();
		expect(json).toHaveProperty('title');
		expect(json).toHaveProperty('url');
	});

	it('should summarize Twitter/X URL successfully', async () => {
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
});
