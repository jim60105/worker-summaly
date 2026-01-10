# Worker Summaly

A web page summarization API running on **Cloudflare Workers**. Forked from [misskey-dev/summaly](https://github.com/misskey-dev/summaly) and migrated to run on Cloudflare's edge network.

## Project Overview

Worker Summaly extracts metadata from web pages including:

- Open Graph and Twitter Card metadata
- Standard HTML metadata (title, description, favicon)
- oEmbed player detection for embedded media
- ActivityPub and Fediverse creator metadata
- Sensitive content detection via HTTP headers and meta tags

### Key Features

- **Edge-Native Architecture**: Runs on Cloudflare's global edge network for minimal latency
- **Specialized Plugins**: Domain-specific handlers for major platforms
- **TypeScript**: Fully typed with strict mode enabled
- **Zero Dependencies Runtime**: Only 3 runtime dependencies (cheerio, escape-regexp, html-entities)
- **Comprehensive Testing**: 200+ tests across unit, plugin, and integration test suites
- **CORS Enabled**: Ready for browser-based applications
- **Modern ES Modules**: No CommonJS, pure ESM throughout

### Built-in Plugins

#### Social Media & Communication

- **Twitter/X** - Enhanced metadata extraction for tweets
- **Threads** - Meta's Threads platform support
- **Bluesky** - Decentralized social network support
- **Misskey** - Japanese microblogging platform
- **Plurk** - Timeline-based social network
- **Weibo** - Chinese microblogging platform
- **ActivityPub** - Federated ActivityPub/Fediverse metadata for Mastodon, Pleroma, Lemmy, PeerTube, PixelFed, GoToSocial, Friendica, Hubzilla, and other federated networks

#### Video & Streaming

- **YouTube** - Video metadata and player embedding
- **Twitch** - Live streaming platform with retry logic for cached responses
- **TikTok** - Short-form video content
- **Bilibili** - Chinese video sharing platform
- **Iwara** - Video sharing platform
- **Spotify** - Music and podcast streaming

#### Content Platforms

- **Wikipedia** - Encyclopedia articles with API integration
- **Amazon** - Product page metadata extraction
- **Bahamut** - Taiwanese gaming and anime community
- **PTT** - Taiwan's largest online forum
- **Komiflo** - Comic platform
- **E-Hentai** - Adult content platform

#### Art & Creative

- **Pixiv** - Japanese illustration community
- **Nijie** - Japanese art community

#### E-commerce & Marketplaces

- **PChome** - Taiwanese e-commerce platform
- **DLsite** - Digital content marketplace
- **Booth** - Creator marketplace metadata via the Booth JSON API
- **Steam** - Valve's digital game distribution platform

#### Other Services

- **Branch.io** - Deep link resolution

## Project Structure

```text
src/
├── worker.ts             # Cloudflare Workers entry point (fetch handler)
├── index.ts              # Core summaly() function and options
├── general.ts            # HTML parsing logic, oEmbed player detection
├── summary.ts            # TypeScript type definitions (Summary/SummalyResult)
├── iplugin.ts            # Plugin interface definition
├── plugins/              # Built-in plugins
│   ├── index.ts          # Plugin registry
│   ├── amazon.ts         # Amazon product pages
│   ├── bahamut.ts        # Bahamut forum posts
|   ├── booth.ts         # Booth digital marketplace
│   ├── ptt.ts            # PTT forum posts
│   ├── bilibili.ts       # Bilibili videos and opus
│   ├── bluesky.ts        # Bluesky social posts
│   ├── dlsite.ts         # DLsite products
│   ├── ehentai.ts        # E-Hentai galleries
│   ├── iwara.ts          # Iwara videos
│   ├── komiflo.ts        # Komiflo comics
│   ├── nijie.ts          # Nijie illustrations
│   ├── threads.ts        # Threads posts
│   ├── misskey.ts        # Misskey notes
│   ├── plurk.ts          # Plurk posts
│   ├── spotify.ts        # Spotify oEmbed
│   ├── steam.ts          # Steam game pages
│   ├── weibo.ts          # Weibo posts
│   ├── instagram.ts      # Instagram posts/reels
│   ├── pchome.ts         # PChome products
│   ├── tiktok.ts         # TikTok videos
│   ├── twitter.ts        # Twitter/X tweets
│   ├── twitch.ts         # Twitch streams/clips with retry
│   ├── pixiv.ts          # Pixiv artworks
│   ├── wikipedia.ts      # Wikipedia articles
│   ├── youtube.ts        # YouTube oEmbed
│   └── branchio-deeplinks.ts  # Branch.io deep links
└── utils/
    ├── fetch.ts          # HTTP client using native fetch API
    ├── encoding.ts       # Character encoding detection/conversion
    ├── clip.ts           # Text truncation utility
    ├── cleanup-title.ts  # Title normalization
    ├── null-or-empty.ts  # String validation helpers
    └── status-error.ts   # Custom HTTP error class

test/
├── index.test.ts         # Core unit tests (runs in Workers runtime)
├── worker.test.ts        # Worker integration tests
├── plugins/              # Plugin-specific tests (one file per plugin)
│   ├── bahamut.test.ts   # Bahamut forum tests
│   ├── bilibili.test.ts  # Bilibili video tests
│   ├── bluesky.test.ts   # Bluesky social tests
│   ├── dlsite.test.ts    # DLsite product tests
│   ├── ehentai.test.ts   # E-Hentai gallery tests
│   ├── instagram.test.ts # Instagram post tests
│   ├── iwara.test.ts     # Iwara video tests
│   ├── komiflo.test.ts   # Komiflo manga tests
│   ├── misskey.test.ts   # Misskey/Fediverse tests
│   ├── nijie.test.ts     # Nijie illustration tests
│   ├── pchome.test.ts    # PChome 24h product tests
│   ├── pixiv.test.ts     # Pixiv artwork tests
│   ├── plurk.test.ts     # Plurk social tests
│   ├── ptt.test.ts       # PTT forum tests
│   ├── spotify.test.ts   # Spotify oEmbed tests
│   ├── steam.test.ts     # Steam game plugin tests
│   ├── threads.test.ts   # Threads social tests
│   ├── tiktok.test.ts    # TikTok video tests
│   ├── twitter.test.ts   # Twitter/X status tests
│   ├── twitch.test.ts    # Twitch streaming tests
│   ├── weibo.test.ts     # Weibo post tests
│   └── youtube.test.ts   # YouTube oEmbed tests
├── utils/
│   └── test-utils.ts     # Shared test utilities and mock helpers
├── fixtures/
│   ├── html.ts           # Embedded HTML test fixtures
│   └── oembed.ts         # Embedded oEmbed JSON fixtures
├── htmls/                # External HTML fixture files
├── mocks/                # Mock handlers
│   └── handlers.ts       # Mock request handlers
└── oembed/               # External oEmbed fixture files
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
- Nullish coalescing (`??`) is disabled; use logical OR (`||`) for fallbacks
- Always use `.js` extension in import statements (even for `.ts` files)

### ESLint Configuration

The project uses `@misskey-dev/eslint-plugin` with custom overrides:

- `@typescript-eslint/prefer-nullish-coalescing`: OFF (need fallback on empty strings)
- `import/no-default-export`: OFF for Worker entry point only

## Development Commands

```bash
# Install dependencies
pnpm install

# Build TypeScript
pnpm build

# Start development server (with hot reload)
pnpm dev

# Run unit tests
pnpm test

# Run Worker integration tests
pnpm test:worker

# Run all tests
pnpm test:all

# Run linting
pnpm eslint

# Deploy to Cloudflare Workers
pnpm deploy
```

## API Endpoints

### GET /

Main summarization endpoint.

**Query Parameters:**

- `url` (required) - The URL to summarize
- `lang` (optional) - Accept-Language header value

**Response:** `SummalyResult` JSON object

```bash
curl "https://your-worker.workers.dev/?url=https://example.com"
```

### GET /health

Health check endpoint.

```bash
curl "https://your-worker.workers.dev/health"
# Response: {"status":"ok"}
```

### OPTIONS /

CORS preflight handler. Returns appropriate CORS headers.

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

### SummalyOptions

```typescript
interface SummalyOptions {
  lang?: string | null;           // Accept-Language header
  followRedirects?: boolean;      // Follow HTTP redirects (default: true)
  plugins?: SummalyPlugin[];      // Custom plugins
  userAgent?: string;             // Custom User-Agent
  responseTimeout?: number;       // Response timeout in ms
  operationTimeout?: number;      // Total operation timeout in ms
  contentLengthLimit?: number;    // Max content length in bytes
  contentLengthRequired?: boolean; // Require Content-Length header
}
```

## Plugin System

Plugins extend summarization for specific domains:

```typescript
interface SummalyPlugin {
  test: (url: URL) => boolean;
  summarize: (url: URL, opts?: GeneralScrapingOptions) => Promise<Summary | null>;
}
```

Built-in plugins are registered in [src/plugins/index.ts](src/plugins/index.ts).

## Testing

### Test Infrastructure

- **Framework**: Vitest with `@cloudflare/vitest-pool-workers`
- **Unit Tests**: Run in Workers runtime using Miniflare
- **Integration Tests**: Use Wrangler's `unstable_dev` for real Worker testing
- **Fixtures**: Embedded in TypeScript (no file system access in Workers)

### Test Structure

- `test/index.test.ts` - Core summaly functionality tests (57 tests)
- `test/plugins/*.test.ts` - Plugin-specific tests (21 test files, 165 tests total)
- `test/worker.test.ts` - Worker HTTP endpoint integration tests (7 tests)
- `test/utils/test-utils.ts` - Shared mock utilities and helper functions
- `test/fixtures/` - Embedded HTML and oEmbed test fixtures

**Total Test Count:** 229 tests (57 core + 165 plugin + 7 integration)

**Test Coverage:** 222/222 unit and plugin tests passing (100%), 6/7 integration tests passing

### Writing Plugin Tests

Plugin tests should call the plugin's `summarize()` function directly rather than `summaly()` to avoid triggering HEAD requests for redirect checking:

```typescript
// ✅ Correct: Call plugin directly
import { test as testUrl, summarize } from '@/plugins/example.js';
import { useMockFetch, setupMockResponse } from '../utils/test-utils.js';

useMockFetch();

test('should extract metadata', async () => {
  setupMockResponse('https://example.com/page', '<html>...</html>');
  const result = await summarize(new URL('https://example.com/page'));
  expect(result?.title).toBe('Expected Title');
});

// ❌ Avoid: summaly() triggers HEAD requests that may timeout
import { summaly } from '@/index.js';
const result = await summaly('https://example.com/page'); // May timeout
```

### Running Tests

```bash
# Unit tests only
pnpm test

# Worker integration tests
pnpm test:worker

# All tests
pnpm test:all

# Watch mode
pnpm test:watch
```

### Environment Variables for Tests

- `SUMMALY_ALLOW_PRIVATE_IP=true` - Allow private IP addresses
- `SKIP_NETWORK_TEST=true` - Skip tests requiring network access

## Wrangler Configuration

Configuration is in [wrangler.jsonc](wrangler.jsonc):

```jsonc
{
  "name": "worker-summaly",
  "main": "src/worker.ts",
  "compatibility_date": "2026-01-07",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  },
  "placement": {
    "mode": "smart"
  }
}
```

## Dependencies

### Runtime Dependencies

| Package | Purpose |
| ------- | ------- |
| `cheerio` | HTML parsing and DOM manipulation |
| `escape-regexp` | Regular expression escaping |
| `html-entities` | HTML entity encoding/decoding |

### Development Dependencies

| Package | Purpose |
| ------- | ------- |
| `@cloudflare/vitest-pool-workers` | Workers runtime for Vitest |
| `@cloudflare/workers-types` | TypeScript types for Workers |
| `@misskey-dev/eslint-plugin` | ESLint configuration |
| `wrangler` | Cloudflare Workers CLI |
| `vitest` | Test framework |

## Security Considerations

1. **Input Validation**: URL parameter is validated before processing
2. **Content-Length Limits**: Configurable limit to prevent memory exhaustion
3. **Timeout Handling**: Uses `AbortSignal.timeout()` for request timeouts
4. **CORS**: Properly configured CORS headers for API responses
5. **Error Handling**: Errors are caught and returned as JSON with appropriate status codes
