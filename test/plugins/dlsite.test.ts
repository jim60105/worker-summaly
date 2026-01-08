/**
 * DLsite Plugin Tests
 */

import { describe, test, expect } from 'vitest';
import {
	useMockFetch,
	setupMockResponse,
	setupMockStatusResponse,
} from '../utils/test-utils.js';

// Enable mock fetch for all tests
useMockFetch();

describe('DLsite Plugin', () => {
	test('URL matching - www.dlsite.com', async () => {
		const { test: testUrl } = await import('@/plugins/dlsite.js');
		expect(testUrl(new URL('https://www.dlsite.com/maniax/work/=/product_id/RJ123456.html'))).toBe(true);
		expect(testUrl(new URL('https://www.dlsite.com/home/work/=/product_id/RJ123456.html'))).toBe(true);
	});

	test('URL matching - other domain should not match', async () => {
		const { test: testUrl } = await import('@/plugins/dlsite.js');
		expect(testUrl(new URL('https://dlsite.com/maniax/work/123'))).toBe(false);
		expect(testUrl(new URL('https://example.com/dlsite/123'))).toBe(false);
	});

	test('Adult content (maniax) is marked sensitive', async () => {
		const { summarize } = await import('@/plugins/dlsite.js');
		const html = `<!DOCTYPE html>
<html>
<head>
	<meta property="og:title" content="Test DLsite Product">
</head>
<body></body>
</html>`;
		setupMockResponse('https://www.dlsite.com/maniax/work/=/product_id/RJ123456.html', html);

		const summary = await summarize(new URL('https://www.dlsite.com/maniax/work/=/product_id/RJ123456.html'));

		expect(summary).not.toBeNull();
		expect(summary?.sensitive).toBe(true);
	});

	test('SFW content (home) is not marked sensitive', async () => {
		const { summarize } = await import('@/plugins/dlsite.js');
		const html = `<!DOCTYPE html>
<html>
<head>
	<meta property="og:title" content="Test DLsite Product">
</head>
<body></body>
</html>`;
		setupMockResponse('https://www.dlsite.com/home/work/=/product_id/RJ123456.html', html);

		const summary = await summarize(new URL('https://www.dlsite.com/home/work/=/product_id/RJ123456.html'));

		expect(summary).not.toBeNull();
		expect(summary?.sensitive).toBe(false);
	});

	test('SFW content (soft) is not marked sensitive', async () => {
		const { summarize } = await import('@/plugins/dlsite.js');
		const html = `<!DOCTYPE html>
<html>
<head>
	<meta property="og:title" content="Test DLsite Product">
</head>
<body></body>
</html>`;
		setupMockResponse('https://www.dlsite.com/soft/work/=/product_id/VJ123456.html', html);

		const summary = await summarize(new URL('https://www.dlsite.com/soft/work/=/product_id/VJ123456.html'));

		expect(summary).not.toBeNull();
		expect(summary?.sensitive).toBe(false);
	});

	test('URL correction - announce to work fallback', async () => {
		const { summarize } = await import('@/plugins/dlsite.js');
		// First URL returns 404
		setupMockStatusResponse('https://www.dlsite.com/maniax/announce/=/product_id/RJ999999.html', 404);

		// Corrected URL returns success
		const html = `<!DOCTYPE html>
<html>
<head>
	<meta property="og:title" content="Test DLsite Product">
</head>
<body></body>
</html>`;
		setupMockResponse('https://www.dlsite.com/maniax/work/=/product_id/RJ999999.html', html);

		const summary = await summarize(new URL('https://www.dlsite.com/maniax/announce/=/product_id/RJ999999.html'));

		expect(summary).not.toBeNull();
		expect(summary?.sensitive).toBe(true);
	});

	test('URL correction - work to announce fallback', async () => {
		const { summarize } = await import('@/plugins/dlsite.js');
		// First URL returns 404
		setupMockStatusResponse('https://www.dlsite.com/maniax/work/=/product_id/RJ888888.html', 404);

		// Corrected URL returns success
		const html = `<!DOCTYPE html>
<html>
<head>
	<meta property="og:title" content="Test DLsite Product">
</head>
<body></body>
</html>`;
		setupMockResponse('https://www.dlsite.com/maniax/announce/=/product_id/RJ888888.html', html);

		const summary = await summarize(new URL('https://www.dlsite.com/maniax/work/=/product_id/RJ888888.html'));

		expect(summary).not.toBeNull();
		expect(summary?.sensitive).toBe(true);
	});

	test('Both URLs fail returns null', async () => {
		const { summarize } = await import('@/plugins/dlsite.js');
		// Both URLs return 404
		setupMockStatusResponse('https://www.dlsite.com/maniax/work/=/product_id/RJ000000.html', 404);
		setupMockStatusResponse('https://www.dlsite.com/maniax/announce/=/product_id/RJ000000.html', 404);

		const result = await summarize(new URL('https://www.dlsite.com/maniax/work/=/product_id/RJ000000.html'));

		expect(result).toBeNull();
	});
});
