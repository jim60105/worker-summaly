# Summaly - Cloudflare Workers Migration

## Project Overview

Summaly is a web page summarization library that extracts metadata (title, description, thumbnail, icon, oEmbed player, etc.) from URLs. Originally forked from [misskey-dev/summaly](https://github.com/misskey-dev/summaly), this project is being migrated to run on **Cloudflare Workers**.

### Core Functionality

- Fetches and parses web pages to extract Open Graph, Twitter Card, and standard HTML metadata
- Supports oEmbed player detection for embedded media
- Includes built-in plugins for Amazon, Bluesky, Wikipedia, and Branch.io deep links
- Detects sensitive content via HTTP headers and meta tags
- Supports ActivityPub and Fediverse creator metadata

## Project Structure

```text
src/
├── index.ts              # Main entry point, exports `summaly()` function and Fastify plugin
├── general.ts            # Core HTML parsing logic, oEmbed player detection
├── summary.ts            # TypeScript type definitions for Summary/SummalyResult
├── iplugin.ts            # Plugin interface definition
├── plugins/              # Built-in plugins
│   ├── index.ts          # Plugin registry
│   ├── amazon.ts         # Amazon product page handler
│   ├── bluesky.ts        # Bluesky social posts handler
│   ├── wikipedia.ts      # Wikipedia API integration
│   └── branchio-deeplinks.ts  # Branch.io deep link resolver
└── utils/
    ├── got.ts            # HTTP client wrapper (MUST BE REPLACED for Workers)
    ├── encoding.ts       # Character encoding detection/conversion
    ├── clip.ts           # Text truncation utility
    ├── cleanup-title.ts  # Title normalization
    ├── null-or-empty.ts  # String validation
    └── status-error.ts   # Custom error class

test/
├── index.test.ts         # Main test suite using Vitest
├── htmls/                # HTML fixtures for testing
└── oembed/               # oEmbed JSON fixtures
```

## Coding Standards

### Language & Style

- **Language**: TypeScript (strict mode)
- **Module System**: ES Modules only (no CommonJS)
- **Comments**: Write all code comments in English
- **Path Aliases**: Use `@/` prefix for imports from `src/` directory

### Code Conventions

- Use tabs for indentation
- Use single quotes for strings
- Trailing commas in multi-line arrays/objects
- Prefer `null` over `undefined` for explicit "no value" cases
- Use nullish coalescing (`??`) is disabled; use logical OR (`||`) for fallbacks

### ESLint Configuration

The project uses `@misskey-dev/eslint-plugin` with custom rules:

- `@typescript-eslint/prefer-nullish-coalescing`: OFF (fallback on empty strings needed)

## Build & Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm run test

# Run linting
npm run lint

# Start development server (original Fastify)
npm run serve
```

## Testing

- **Framework**: Vitest
- **Test Location**: `test/index.test.ts`
- **HTML Fixtures**: `test/htmls/`
- **Environment Variable**: Set `SUMMALY_ALLOW_PRIVATE_IP=true` for local testing
- **Network Tests**: Skip with `SKIP_NETWORK_TEST=true`

## Cloudflare Workers Migration Guide

### Critical Changes Required

#### 1. Replace HTTP Client

The `got` library is NOT compatible with Cloudflare Workers. Replace with the native `fetch` API:

```typescript
// ❌ BEFORE (Node.js with got)
import got from 'got';
const response = await got(url, { headers, timeout });

// ✅ AFTER (Cloudflare Workers)
const response = await fetch(url, {
  headers,
  signal: AbortSignal.timeout(timeoutMs),
});
```

#### 2. Remove Node.js Built-in Modules

These imports in `src/utils/got.ts` must be removed or replaced:

```typescript
// ❌ Remove these
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { Agent } from 'node:http';
```

#### 3. Private IP Blocking

Replace `private-ip` library with a custom implementation using `URL` parsing, as Workers don't have access to DNS resolution in the same way.

#### 4. Character Encoding

The `iconv-lite` library may need replacement. Consider using the `TextDecoder` API available in Workers:

```typescript
const decoder = new TextDecoder(encoding);
const text = decoder.decode(buffer);
```

#### 5. Cheerio Compatibility

`cheerio` should work in Workers, but verify the version. Use the latest version that supports ES modules.

### Recommended Worker Structure

```typescript
// src/worker.ts
export interface Env {
  // Add any KV namespaces, D1 databases, or secrets here
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/' && request.method === 'GET') {
      const targetUrl = url.searchParams.get('url');
      const lang = url.searchParams.get('lang');
      
      if (!targetUrl) {
        return Response.json({ error: 'url is required' }, { status: 400 });
      }
      
      try {
        const summary = await summaly(targetUrl, { lang });
        return Response.json(summary);
      } catch (error) {
        return Response.json({ error: String(error) }, { status: 500 });
      }
    }
    
    return new Response('Not Found', { status: 404 });
  },
};
```

### Wrangler Configuration

```jsonc
// wrangler.jsonc
{
  "name": "worker-summaly",
  "main": "src/worker.ts",
  "compatibility_date": "2025-03-07",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
}
```

### Key API Differences

| Feature | Node.js (Original) | Cloudflare Workers |
| ------- | ------------------ | ------------------ |
| HTTP Client | `got` | Native `fetch` |
| Timeout | `got` timeout options | `AbortSignal.timeout()` |
| File Reading | `fs.readFileSync` | Not available (embed at build time) |
| HTTP Agent | Custom agents supported | Not applicable |
| Private IP Check | `private-ip` package | Custom implementation or use CF security features |

### Environment Variables

For Workers, use `wrangler.jsonc` vars or secrets:

```jsonc
{
  "vars": {
    "BOT_USER_AGENT": "SummalyBot/6.0.0"
  }
}
```

### Response Headers

Add appropriate CORS headers for API responses:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

## Dependencies to Review for Workers Compatibility

| Package | Status | Notes |
| ------- | ------ | ----- |
| `cheerio` | ✅ Compatible | Use latest ES module version |
| `got` | ❌ Replace | Use native `fetch` |
| `private-ip` | ❌ Replace | Custom implementation needed |
| `iconv-lite` | ⚠️ Check | May need `TextDecoder` fallback |
| `html-entities` | ✅ Compatible | Pure JavaScript |
| `debug` | ⚠️ Check | Replace with `console.log` or remove |

## Type Definitions

### SummalyResult

```typescript
interface SummalyResult {
  title: string | null;
  icon: string | null;
  description: string | null;
  thumbnail: string | null;
  sitename: string | null;
  player: Player;
  sensitive: boolean;
  activityPub: string | null;
  fediverseCreator: string | null;
  url: string;
}

interface Player {
  url: string | null;
  width: number | null;
  height: number | null;
  allow: string[];
}
```

## Plugin System

Plugins follow this interface and are matched by URL pattern:

```typescript
interface SummalyPlugin {
  test: (url: URL) => boolean;
  summarize: (url: URL, opts?: GeneralScrapingOptions) => Promise<Summary | null>;
}
```

Built-in plugins are registered in `src/plugins/index.ts`.

## Security Considerations

1. **Private IP Blocking**: The original library blocks requests to private IPs. Implement equivalent protection in Workers.
2. **Content-Length Limits**: Enforce `contentLengthLimit` (default 10MB) to prevent memory exhaustion.
3. **Timeout Handling**: Use `AbortSignal.timeout()` for request timeouts.
4. **Input Validation**: Always validate and sanitize the `url` query parameter.

## License

MIT License - See [LICENSE](LICENSE) for details.
