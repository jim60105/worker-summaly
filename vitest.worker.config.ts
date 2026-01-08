import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Load .env.test file if it exists (for local development)
// In CI, environment variables are set directly
if (existsSync('.env.test')) {
	config({ path: '.env.test' });
}

// This config is for Worker integration tests that run in Node.js environment
// using Wrangler's unstable_dev to test the actual Worker
export default defineConfig({
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	test: {
		globals: true,
		environment: 'node',
		include: ['test/worker.test.ts'],
	},
});
