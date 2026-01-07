import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

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
