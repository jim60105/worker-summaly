# Summaly for Cloudflare Workers

A fast, edge-based web page summarization API powered by **Cloudflare Workers**. Extract metadata, Open Graph tags, Twitter Cards, oEmbed players, and more from any URL at lightning speed.

Designed for Misskey.

## ✨ Features

- 🚀 **Edge-Native**: Runs on Cloudflare's global edge network for minimal latency
- 🔍 **Rich Metadata Extraction**: Open Graph, Twitter Cards, standard HTML metadata
- 🎬 **oEmbed Support**: Automatic player detection for YouTube, Vimeo, and more
- 🔌 **Built-in Plugins**: Specialized handlers for major platforms and services
- ⚠️ **Content Safety**: Automatic sensitive content detection
- 🌐 **CORS Enabled**: Ready for browser-based applications

## 🚀 Quick Start

### Deploy to Cloudflare Workers

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jim60105/worker-summaly)

### Misskey Control Panel Settings

![Misskey Control Panel](https://github.com/user-attachments/assets/1391be0a-522d-4921-a5e5-efcef67006ff)

### Local Development

Run the development server with hot reload:

```bash
pnpm run dev
```

The API will be available at `http://localhost:8787`

## 🔌 Built-in Plugins

Worker Summaly includes **25+ specialized plugins** for extracting metadata from popular platforms and services:

### Social Media & Communication

- **Twitter/X** - Enhanced metadata extraction for tweets
- **Threads** - Meta's Threads platform support
- **Bluesky** - Decentralized social network support
- **Misskey** - Japanese microblogging platform
- **Plurk** - Timeline-based social network
- **Weibo** - Chinese microblogging platform
- **ActivityPub** - Federated ActivityPub/Fediverse metadata for Mastodon, Pleroma, Lemmy, PeerTube, PixelFed, GoToSocial, Friendica, Hubzilla, and other federated networks

### Video & Streaming

- **YouTube** - Video metadata and player embedding
- **TikTok** - Short-form video content
- **Bilibili** - Chinese video sharing platform
- **Iwara** - Video sharing platform
- **Spotify** - Music and podcast streaming

### Content Platforms

- **Wikipedia** - Encyclopedia articles with API integration
- **Amazon** - Product page metadata extraction
- **DLsite** - Digital content marketplace
- **Bahamut** - Taiwanese gaming and anime community
- **PTT** - Taiwan's largest online forum
- **Komiflo** - Comic platform
- **E-Hentai** - Adult content platform
- **Booth** - Creator marketplace metadata via the Booth JSON API

### Gaming

- **Steam** - Valve's digital game distribution platform

### Art & Creative

- **Pixiv** - Japanese illustration community
- **Nijie** - Japanese art community

### E-commerce

- **PChome** - Taiwanese e-commerce platform

### Other Services

- **Branch.io** - Deep link resolution

> [!WARNING]
> The Instagram plugin is included but currently non-functional due to platform restrictions. It forces sitename to "Instagram" but cannot reliably extract metadata.

## 📖 API Documentation

### Endpoint

```http
GET /?url={target_url}&lang={language}
```

### Query Parameters

| Parameter | Type     | Required | Description                                       |
|-----------|----------|----------|---------------------------------------------------|
| `url`     | string   | ✅       | The URL of the web page to summarize              |
| `lang`    | string   | ❌       | Accept-Language header value (e.g., `en`, `ja`)   |

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
 "icon": "https://www.youtube.com/s/desktop/014dbbed/img/favicon_32x32.png",
 "description": null,
 "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
 "sitename": "YouTube",
 "player": {
   "url": "https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed",
   "width": 200,
   "height": 113,
   "allow": [
     "autoplay",
     "clipboard-write",
     "encrypted-media",
     "fullscreen",
     "picture-in-picture"
   ]
 },
 "sensitive": false,
 "activityPub": null,
 "fediverseCreator": null,
 "url": "https://m.youtube.com/watch?v=dQw4w9WgXcQ"
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

```text
src/
├── worker.ts          # Cloudflare Workers entry point
├── index.ts           # Core summaly() function
├── general.ts         # HTML parsing and metadata extraction
├── summary.ts         # TypeScript type definitions
├── iplugin.ts         # Plugin interface definition
├── plugins/           # 24 site-specific plugins
│   ├── index.ts       # Plugin registry
│   ├── amazon.ts      # Amazon products
│   ├── bahamut.ts     # Bahamut forum
│   ├── bilibili.ts    # Bilibili videos
│   ├── bluesky.ts     # Bluesky posts
│   ├── pixiv.ts       # Pixiv artworks
│   ├── steam.ts       # Steam games
│   ├── twitter.ts     # Twitter/X tweets
│   ├── wikipedia.ts   # Wikipedia articles
│   ├── youtube.ts     # YouTube videos
│   └── ...            # 16 more plugins
└── utils/             # Utility functions
    ├── fetch.ts       # HTTP client wrapper
    ├── encoding.ts    # Character encoding handling
    ├── clip.ts        # Text truncation
    └── ...

test/
├── index.test.ts      # Core functionality tests (57 tests)
├── worker.test.ts     # Worker integration tests (7 tests)
├── plugins/           # Plugin-specific tests (21 files, 173 tests)
│   ├── bahamut.test.ts
│   ├── booth.test.ts   # Booth marketplace plugin tests
│   ├── pixiv.test.ts
│   ├── twitter.test.ts
│   └── ...
├── fixtures/          # Embedded test fixtures
│   ├── html.ts
│   └── oembed.ts
└── utils/
    └── test-utils.ts  # Shared test utilities
```

## 📚 Documentation

- [AGENTS.md](AGENTS.md) - Detailed project documentation and coding standards
- [TESTING.md](TESTING.md) - Comprehensive testing guide
- [CHANGELOG.md](CHANGELOG.md) - Version history and changes

## 📄 License

<img src="https://github.com/user-attachments/assets/c361271f-f9e6-4372-af8d-c555432f40a7" alt="agplv3" width="300" />

[GNU AFFERO GENERAL PUBLIC LICENSE Version 3](./LICENSE)

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.

## 🙏 Acknowledgments

- Original project: [misskey-dev/summaly](https://github.com/misskey-dev/summaly)
- Plugins inspired by:
  - [ermiana](https://github.com/canaria3406/ermiana)
  - [mei23/summaly](https://github.com/mei23/summaly)
  - [FxBilibili](https://github.com/cubewhy/fxbilibili)
  - [Tissue](https://github.com/shikorism/tissue)
- Underlying proxy:
  - [fxTikTok](https://github.com/okdargy/fxTikTok)
  - [FixThreads](https://github.com/milanmdev/fixthreads)
  - [FxEmbed](https://github.com/FxEmbed/FxEmbed)
  - [vxTwitter](https://github.com/dylanpdx/BetterTwitFix)
