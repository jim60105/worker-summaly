# Testing Guide for Worker-Summaly

This document describes the test infrastructure for the Cloudflare Workers-based Summaly project.

## Overview

The test suite has been migrated to support Cloudflare Workers runtime using `@cloudflare/vitest-pool-workers`. Tests are split into two categories:

1. **Unit Tests** - Core functionality tests running in Workers runtime
2. **Worker Integration Tests** - End-to-end tests for the Worker entry point running in Node.js

## Test Structure

```
test/
├── index.test.ts           # Unit tests for summaly core (runs in Workers runtime)
├── worker.test.ts          # Integration tests for Worker entry point (runs in Node.js)
├── fixtures/
│   ├── html.ts             # Embedded HTML test fixtures
│   └── oembed.ts           # Embedded oEmbed JSON fixtures
└── mocks/
    └── handlers.ts         # Mock handlers (legacy, not currently used)
```

## Running Tests

### All Tests
```bash
pnpm test:all
```

### Unit Tests Only
```bash
pnpm test
# or explicitly:
pnpm test:unit
```

### Worker Integration Tests Only
```bash
pnpm test:worker
```

### Watch Mode (for development)
```bash
pnpm test:watch
```

## Test Configuration

### vitest.config.ts
Main configuration for unit tests. Uses `@cloudflare/vitest-pool-workers` to run tests in Workers runtime.

Key features:
- Workers runtime environment
- Miniflare for local Workers simulation
- Node.js compatibility flags enabled
- Path aliases (`@/` → `src/`)

### vitest.worker.config.ts
Separate configuration for Worker integration tests using Wrangler's `unstable_dev`.

Runs in Node.js environment to allow usage of Wrangler APIs.

## Mocking Strategy

### For Unit Tests (index.test.ts)

Tests use a custom fetch mocking system that works in Workers runtime:

```typescript
// Mock HTTP responses
setupMockResponse(url, htmlContent);
setupMockJsonResponse(url, jsonData);
setupMockStatusResponse(url, statusCode);
```

The mock system supports:
- Exact URL matching
- Wildcard patterns (`host + '/*'`)
- Custom headers
- JSON and HTML responses

Example:
```typescript
test('basic metadata extraction', async () => {
	const html = getHtmlFixture('basic.html');
	setupMockResponse('http://localhost:3060/', html);
	
	const summary = await summaly('http://localhost:3060');
	expect(summary.title).toBe('KISS principle');
});
```

### For Worker Integration Tests (worker.test.ts)

Tests use Wrangler's `unstable_dev` to start a real Worker instance:

```typescript
let worker: UnstableDevWorker;

beforeAll(async () => {
	worker = await unstable_dev('src/worker.ts', {
		experimental: { disableExperimentalWarning: true },
	});
});

test('health check', async () => {
	const response = await worker.fetch('/health');
	expect(response.status).toBe(200);
});
```

## Test Fixtures

Instead of reading files from disk (which doesn't work in Workers), all test fixtures are embedded in TypeScript modules:

### HTML Fixtures
Located in `test/fixtures/html.ts`:

```typescript
import { getHtmlFixture } from './fixtures/html.js';

const html = getHtmlFixture('basic.html');
```

### oEmbed Fixtures
Located in `test/fixtures/oembed.ts`:

```typescript
import { getOembedFixture } from './fixtures/oembed.js';

const oembedData = getOembedFixture('oembed.json');
```

## Key Differences from Node.js Testing

### What Changed
- ❌ Removed `fs.readFileSync()` - replaced with embedded fixtures
- ❌ Removed Fastify test server - replaced with fetch mocking
- ❌ Removed MSW (Mock Service Worker) - incompatible with Workers
- ❌ Removed Node.js `http`/`https` Agent usage - not applicable in Workers
- ✅ Added custom fetch mocking compatible with Workers runtime
- ✅ Added separate Worker integration test suite

### What Stayed the Same
- Test framework: Still using Vitest
- Test structure: Same describe/test/expect patterns
- Test cases: All original test cases preserved

## Environment Variables

### SUMMALY_ALLOW_PRIVATE_IP
Controls whether private IP addresses are allowed:
```bash
SUMMALY_ALLOW_PRIVATE_IP=true pnpm test
```

### SKIP_NETWORK_TEST
Skips tests that require real network access:
```bash
SKIP_NETWORK_TEST=true pnpm test
```

## Continuous Integration

The GitHub Actions workflow (`.github/workflows/test.yml`) runs both test suites:

```yaml
- name: Test (Unit Tests)
  run: SKIP_NETWORK_TEST=true pnpm test:unit

- name: Test (Worker Integration Tests)
  run: SKIP_NETWORK_TEST=true pnpm test:worker
```

## Known Issues

### Pre-existing Test Failures
Some tests were failing before the Workers migration:

1. **Private IP blocking tests** (2 tests) - Related to localhost connection handling
2. **YouTube network test** (1 test) - Requires real network access, intentionally skipped

### Network Connection Errors
A few tests show "Network connection lost" errors. These are being investigated and may require additional mock setup.

## Adding New Tests

### Unit Tests
1. Add test to `test/index.test.ts`
2. Use `setupMockResponse()` for HTTP mocking
3. Use fixtures from `test/fixtures/` modules
4. Ensure no Node.js-specific APIs are used

### Worker Tests
1. Add test to `test/worker.test.ts`
2. Use `worker.fetch()` to test endpoints
3. Tests run in Node.js environment with real Worker instance

## Best Practices

1. **Use Fixtures**: Always use `getHtmlFixture()` or `getOembedFixture()` instead of reading files
2. **Mock URLs**: Setup mocks for all URLs your test will access
3. **Wildcard Patterns**: Use `'/*'` suffix for flexible URL matching
4. **Clean Tests**: Each test should be independent with its own mocks
5. **Skip Network Tests**: Use `SKIP_NETWORK_TEST` environment variable for tests requiring internet access

## Troubleshooting

### "Network connection lost" Error
- Ensure all URLs accessed in the test have corresponding mocks
- Check that wildcard patterns are correctly set up
- Verify the mock is registered before calling `summaly()`

### "No such module" Error
- This usually means a Node.js module is being imported in Workers code
- Check imports in the test file and source files
- Ensure compatibility flags are properly set in `wrangler.jsonc`

### Test Timeout
- Increase timeout for long-running tests
- Check for infinite loops or hanging async operations
- Ensure mock responses are properly configured

## Migration Notes

The test suite migration from Node.js to Cloudflare Workers involved:

1. Replacing file system operations with embedded fixtures
2. Creating a custom fetch mocking system compatible with Workers
3. Removing Node.js-specific test infrastructure (Fastify, MSW)
4. Adding separate test configuration for Worker integration tests
5. Updating CI/CD workflows to run both test suites

Total test count: **61 unit tests + 7 integration tests = 68 tests**

Current pass rate:
- Unit tests: 52/61 passing (85%)
- Integration tests: 6/7 passing (86%)
- Combined: 58/68 passing (85%)
