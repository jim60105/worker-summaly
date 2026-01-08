# Worker Summaly

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)

A fast, edge-based web page summarization API powered by **Cloudflare Workers**. Extract metadata, Open Graph tags, Twitter Cards, oEmbed players, and more from any URL at lightning speed.

Forked from [misskey-dev/summaly](https://github.com/misskey-dev/summaly) and completely rewritten for the Cloudflare Workers platform.

## ✨ Features

- 🚀 **Edge-Native**: Runs on Cloudflare's global edge network for minimal latency
- 🔍 **Rich Metadata Extraction**: Open Graph, Twitter Cards, standard HTML metadata
- 🎬 **oEmbed Support**: Automatic player detection for YouTube, Vimeo, and more
- 🔌 **Built-in Plugins**: Specialized handlers for Amazon, Bluesky, Wikipedia, Branch.io
- 🎭 **ActivityPub Ready**: Detects ActivityPub endpoints and Fediverse creator handles
- ⚠️ **Content Safety**: Automatic sensitive content detection
- 🌐 **CORS Enabled**: Ready for browser-based applications

## 🚀 Quick Start

### Deploy to Cloudflare Workers

1. **Clone the repository**

```bash
git clone https://github.com/jim60105/worker-summaly.git
cd worker-summaly
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Build the project**

```bash
pnpm run build
```

4. **Deploy to Cloudflare Workers**

```bash
pnpm run deploy
```

### Local Development

Run the development server with hot reload:

```bash
pnpm run dev
```

The API will be available at `http://localhost:8787`

## 📖 API Documentation

### Endpoint

```
GET /?url={target_url}&lang={language}
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | ✅ | The URL of the web page to summarize |
| `lang` | string | ❌ | Accept-Language header value (e.g., `en`, `ja`) |

### Example Request

```bash
curl "https://your-worker.workers.dev/?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

### Response Format

```typescript
{
  title: string | null;
  icon: string | null;
  description: string | null;
  thumbnail: string | null;
  sitename: string | null;
  player: {
    url: string | null;
    width: number | null;
    height: number | null;
    allow: string[];
  };
  sitename: string | null;
  sensitive: boolean;
  activityPub: string | null;
  fediverseCreator: string | null;
  url: string;
}
```

### Example Response

```json
{
  "title": "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)",
  "icon": "https://m.youtube.com/static/favicon.ico",
  "description": "The official video for “Never Gonna Give You Up” by Rick Astley. \n\nNever: The Autobiography 📚 OUT NOW! \nFollow this link to get your copy and listen to Rick’s ‘Never’ playlist ❤️ #RickAstleyNever\nhttps://linktr.ee/rickastleynever\n\n“Never Gonna Give You Up” was a global smash on its release in July ...",
  "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "player": {
    "url": "https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed",
    "width": 200,
    "height": 113,
    "allow": [
      "autoplay",
      "clipboard-write",
      "encrypted-media",
      "picture-in-picture",
      "web-share",
      "fullscreen"
    ]
  },
  "sitename": "YouTube",
  "sensitive": false,
  "activityPub": null,
  "fediverseCreator": null,
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

### Additional Endpoints

#### Health Check

```bash
GET /health
```

Returns `{"status": "ok"}` with HTTP 200.

## 🧪 Testing

```bash
# Run unit tests (Workers runtime)
pnpm test

# Run Worker integration tests
pnpm test:worker

# Run all test suites
pnpm test:all

# Watch mode for development
pnpm test:watch
```

See [TESTING.md](TESTING.md) for comprehensive testing documentation.

## 🏗️ Project Structure

```
src/
├── worker.ts          # Cloudflare Workers entry point
├── index.ts           # Core summaly() function
├── general.ts         # HTML parsing and metadata extraction
├── summary.ts         # TypeScript type definitions
├── plugins/           # Site-specific plugins
│   ├── amazon.ts      # Amazon product pages
│   ├── bluesky.ts     # Bluesky social posts
│   ├── wikipedia.ts   # Wikipedia articles
│   └── branchio-deeplinks.ts  # Branch.io deep links
└── utils/             # Utility functions
    ├── fetch.ts       # HTTP client wrapper
    ├── encoding.ts    # Character encoding handling
    └── ...

test/
├── index.test.ts      # Core functionality tests
├── worker.test.ts     # Worker integration tests
└── fixtures/          # Test data
```

## 🔧 Configuration

The project uses `wrangler.jsonc` for Cloudflare Workers configuration:

```jsonc
{
  "name": "worker-summaly",
  "main": "src/worker.ts",
  "compatibility_date": "2026-01-07",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📚 Documentation

- [AGENTS.md](AGENTS.md) - Detailed project documentation and coding standards
- [TESTING.md](TESTING.md) - Comprehensive testing guide
- [CHANGELOG.md](CHANGELOG.md) - Version history and changes

## 📄 License

This project is licensed under the AGPLv3 License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Original project: [misskey-dev/summaly](https://github.com/misskey-dev/summaly)
- Original author: syuilo
- Cloudflare Workers migration and maintenance: Jim Chen
