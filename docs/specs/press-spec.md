---
title: Press — Image Processing CLI
description: 'CLI tool for WebP conversion, AI descriptions, and CDN upload'
category: specs
specCategory: operations
icon: stamp
lastUpdated: '2026-01-06'
aliases: []
tags:
  - cli
  - images
  - cdn
  - ai
  - cloudflare-r2
---

# Press — Image Processing CLI

```
    📷 RAW                              🌐 CDN
      │                                   ▲
      │   ┌─────────────────────────┐     │
      └──►│         PRESS           │─────┘
          │                         │
          │  ┌─────┐ ┌─────┐ ┌────┐ │
          │  │ 🔄  │ │ 🤖  │  │ 📤 │ │
          │  │ WebP│ │ AI  │ │ R2 │ │
          │  └─────┘ └─────┘ └────┘ │
          │                         │
          └─────────────────────────┘

         Raw in. Ready out. Going to press.
```

> *Raw in. Ready out. Going to press.*

A press is a tool of transformation. The olive press extracts oil from fruit. The wine press releases juice from grapes. The printing press prepares words for the world. Every press takes something raw and makes it ready.

Press is Grove's image processing CLI. It takes your raw photos and presses them into web-ready form: converted to WebP, described by AI for accessibility, deduplicated by content hash, and uploaded to Cloudflare R2. One command, and your images are ready to publish.

**Public Name:** Press
**Internal Name:** GrovePress
**Repository:** [AutumnsGrove/CDNUploader](https://github.com/AutumnsGrove/CDNUploader)

---

## Overview

**Philosophy**: Images should be optimized, accessible, and organized without manual effort. Press handles the entire pipeline from raw file to CDN URL, with AI-powered descriptions that make your content accessible by default.

**Target**: Content creators, developers, and writers who need optimized images for blogs, documentation, and web projects.

**Position in Grove**: Press sits at the beginning of the image pipeline, preparing media for storage in Amber and display via Foliage.

```
    RAW IMAGES                          YOUR BLOG
         │                                   ▲
         ▼                                   │
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │  PRESS   │ ───► │  AMBER   │ ───► │ FOLIAGE  │
    │ process  │      │  store   │      │ display  │
    │ describe │      │  serve   │      │          │
    │ dedupe   │      │          │      │          │
    └──────────┘      └──────────┘      └──────────┘
```

---

## Technology Stack

| Component | Choice | Reason |
|-----------|--------|--------|
| **Language** | Python 3.11+ | Rich ecosystem for image processing |
| **CLI Framework** | Typer | Modern, type-hinted CLI with auto-help |
| **Package Manager** | UV | Fast Python package management |
| **Image Processing** | Pillow | Industry-standard image manipulation |
| **Video Processing** | ffmpeg-python | WebP animation from video |
| **Storage** | boto3 (S3-compatible) | Cloudflare R2 uploads |
| **AI (Cloud)** | Anthropic Claude | Vision API for descriptions |
| **AI (Local)** | MLX-VLM | On-device inference for Apple Silicon |
| **Output** | Rich | Beautiful terminal formatting |

---

## Core Features

### 1. WebP Conversion & Optimization

All images are converted to WebP format with intelligent compression:

| Quality Level | Max Dimension | Use Case |
|---------------|---------------|----------|
| 85 (default) | 2048px | General web use |
| 90+ | 3072px | High-quality galleries |
| 70-84 | 1600px | Blog thumbnails |
| --full | Original | When quality matters most |

**Privacy by default**: GPS/location EXIF data is stripped. Other metadata preserved.

### 2. Video to Animated WebP

Short videos become lightweight animated WebPs:

- Maximum duration: 10 seconds
- Scaled to 720p max
- 10 fps sampling
- Audio stripped
- Infinite loop

### 3. AI-Powered Analysis

Two AI providers for image understanding:

**Claude (Anthropic API)**
- Model: `claude-sonnet-4-20250514`
- Generates: 15-word descriptions, detailed alt text, 3-5 tags
- Best for: Accuracy and nuance

**MLX (Local, Apple Silicon)**
- Model: `mlx-community/Qwen3-VL-8B-Instruct-8bit`
- Runs entirely on-device
- Best for: Privacy, no API costs

**Analysis Cache**: Results stored by content hash in `~/.cache/cdn-cli/analysis.json`. Same image = same analysis, forever.

### 4. Content-Addressed Deduplication

Every file gets a SHA-256 hash. Before uploading:
1. Check R2 for existing file with same hash
2. If found, return existing URL immediately
3. No duplicate uploads, no wasted storage

### 5. Markdown/HTML Processing

Process entire documents:
```bash
press upload blog-post.md
```

Press will:
1. Extract all image references (Markdown `![]()` and HTML `<img>`)
2. Categorize as: local, external, or already on CDN
3. Upload local images only
4. Rewrite document with CDN URLs
5. Output `blog-post_cdn.md`

### 6. Batch & Parallel Processing

Upload entire folders with parallel workers:

```bash
press upload ./photos/ --analyze
```

- Default: 4 parallel workers
- Progress bars per file and overall
- Graceful error handling (failed files don't stop batch)

---

## File Organization

Press organizes uploads by category and date:

**With AI Analysis:**
```
photos/2026/01/06/sunset_over_calm_ocean_waters_a3f9b2c1.webp
<category>/<year>/<month>/<day>/<ai_description>_<hash>.webp
```

**Without AI Analysis:**
```
photos/2026/01/06/a3f9b2c1_my_photo.webp
<category>/<year>/<month>/<day>/<hash>_<original_name>.webp
```

**Auto-detected Categories:**
| File Type | Category |
|-----------|----------|
| MP4, MOV, AVI, WebM | `videos/` |
| GIF | `gifs/` |
| Everything else | `photos/` |

Override with `--category` flag.

---

## CLI Commands

### `press upload`

The main command. Upload and process files.

```bash
press upload [FILES...] [OPTIONS]

Options:
  --quality, -q INTEGER      # WebP quality 0-100 (default: 85)
  --full, -f                 # Keep full resolution
  --skip-compression, -s     # Upload original without WebP conversion
  --analyze, -a              # Enable AI analysis
  --category, -c TEXT        # Override category (photos/videos/gifs)
  --output-format, -o TEXT   # plain|markdown|html
  --dry-run, -n             # Preview without uploading
  --provider, -p TEXT        # AI provider: claude|mlx
```

**Examples:**
```bash
# Basic upload
press upload photo.jpg

# With AI descriptions
press upload photo.jpg --analyze

# Batch with custom quality
press upload *.jpg --quality 90

# Process markdown file
press upload blog.md

# Upload folder recursively
press upload ./photos/

# Dry run to preview
press upload ./photos/ --dry-run --analyze
```

### `press auth`

Validate configuration and test R2 connection.

```bash
press auth
```

Shows:
- ✅ Configuration valid
- ✅ R2 bucket accessible
- ✅ Custom domain configured
- ✅ AI API key valid (if configured)

### `press list`

Browse recent uploads.

```bash
press list [OPTIONS]

Options:
  --page, -p INTEGER      # Page number (10 per page)
  --category, -c TEXT     # Filter by category
```

### `press undo`

Delete the most recent upload batch.

```bash
press undo [OPTIONS]

Options:
  --force, -f  # Skip confirmation prompt
```

### `press history`

View upload history.

```bash
press history [OPTIONS]

Options:
  --count, -n INTEGER  # Number of batches to show (default: 5)
```

### `press setup`

Interactive configuration wizard.

```bash
press setup
```

Features:
- Detects Wrangler config automatically
- Pre-fills account ID and bucket names
- Lists available R2 buckets
- Creates `secrets.json` with correct structure
- Provides helpful links to Cloudflare dashboard

---

## Configuration

### Secrets File

Press looks for configuration in this order:
1. `~/.config/cdn-upload/secrets.json` (recommended)
2. `./secrets.json` (current directory)
3. Explicit path via CLI

**Structure:**
```json
{
  "r2": {
    "account_id": "your_cloudflare_account_id",
    "access_key_id": "your_r2_access_key_id",
    "secret_access_key": "your_r2_secret_access_key",
    "bucket_name": "your_bucket_name",
    "custom_domain": "cdn.yourdomain.com"
  },
  "ai": {
    "anthropic_api_key": "sk-ant-...",
    "openrouter_api_key": null
  }
}
```

### Where to Find Credentials

| Credential | Location |
|------------|----------|
| Account ID | Cloudflare Dashboard → Overview → API section |
| R2 API Tokens | Dashboard → R2 → Manage API Tokens |
| Bucket Name | Dashboard → R2 → Overview |
| Custom Domain | Bucket Settings → Public Access → Custom Domain |

### Cache Locations

| Cache | Path |
|-------|------|
| AI Analysis | `~/.cache/cdn-cli/analysis.json` |
| Upload History | `~/.cdn-upload-history.json` |

---

## Output Formats

Press copies results to clipboard automatically in your chosen format:

**Plain** (default):
```
https://cdn.grove.place/photos/2026/01/06/sunset_a3f9b2c1.webp
```

**Markdown** (`-o markdown`):
```markdown
![Sunset over calm ocean waters](https://cdn.grove.place/photos/2026/01/06/sunset_a3f9b2c1.webp)
```

**HTML** (`-o html`):
```html
<img src="https://cdn.grove.place/photos/2026/01/06/sunset_a3f9b2c1.webp" alt="Sunset over calm ocean waters" />
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Unsupported format | Skip with warning, continue batch |
| Corrupted image | Skip with error, continue batch |
| Network failure | Retry 3x with exponential backoff |
| R2 quota exceeded | Abort with clear error |
| Invalid credentials | Fail immediately with setup instructions |
| AI API failure | Warn, continue upload without metadata |
| Video too long | Error with suggestion to trim |
| ffmpeg not installed | Error with installation instructions |
| Duplicate found | Return existing URL, don't re-upload |

---

## Installation

**As UV Tool (Recommended):**
```bash
git clone https://github.com/AutumnsGrove/CDNUploader
cd CDNUploader
uv tool install .
press --help
```

**For Development:**
```bash
git clone https://github.com/AutumnsGrove/CDNUploader
cd CDNUploader
uv pip install -e ".[dev]"
```

**System Requirements:**
- Python 3.11+
- ffmpeg (for video processing)

---

## Architecture

Press is organized into focused modules:

```
press/
├── cli.py          # Typer app, command handlers, progress display
├── upload.py       # R2 client, upload/delete, duplicate detection
├── process.py      # Image/video/GIF processing, WebP conversion
├── ai.py           # AI provider abstraction, Claude/MLX integration
├── parser.py       # Markdown/HTML parsing, document rewriting
├── storage.py      # Hash calculation, filename generation
├── config.py       # Secrets loading, validation
├── models.py       # Data classes (ImageMetadata, UploadResult, etc.)
└── utils.py        # Clipboard, output formatting, Rich helpers
```

**Key Design Patterns:**
- Content-addressed storage (SHA-256 hashing)
- Provider abstraction (AI backends swappable)
- Parallel processing with ThreadPoolExecutor
- Progress tracking with Rich library
- Caching for expensive operations

---

## Integration with Grove

### Amber (Storage)
Press uploads to R2 buckets that Amber manages. Users see their Press uploads in Amber's storage dashboard.

### Foliage (Theming)
Optimized images from Press display beautifully in user blogs styled by Foliage.

### Arbor (Admin)
Future: Press integration in Arbor's media library for drag-and-drop uploads with automatic optimization.

### Bloom (Remote Coding)
Press is available in Bloom workspaces for processing images during development.

---

## Future Enhancements

### Planned
- [ ] Delete command (remove from R2 by URL or hash)
- [ ] Metadata editing (update descriptions post-upload)
- [ ] Search by tag/description
- [ ] Image transformations (crop, rotate, resize)
- [ ] Webhook notifications on upload
- [ ] Storage statistics dashboard
- [ ] Export catalog as JSON/CSV

### Integrations
- [ ] Arbor media library integration
- [ ] Mycelium MCP tool for AI agents
- [ ] Grove CLI umbrella command (`grove press upload`)

### Providers
- [ ] OpenRouter integration (multiple models)
- [ ] Ollama support (local models beyond MLX)

---

## Quick Reference

| Action | Command |
|--------|---------|
| Upload file | `press upload photo.jpg` |
| Upload with AI | `press upload photo.jpg --analyze` |
| Upload folder | `press upload ./photos/` |
| Process markdown | `press upload blog.md` |
| High quality | `press upload photo.jpg --quality 95 --full` |
| Dry run | `press upload ./photos/ --dry-run` |
| Check config | `press auth` |
| View history | `press history` |
| Undo last batch | `press undo` |
| Setup wizard | `press setup` |

| AI Provider | Flag | Notes |
|-------------|------|-------|
| Claude | `--provider claude` | Best accuracy, requires API key |
| MLX (local) | `--provider mlx` | Apple Silicon only, no API costs |

| Output Format | Flag | Use Case |
|---------------|------|----------|
| Plain URLs | `-o plain` | Scripts, automation |
| Markdown | `-o markdown` | Blog posts, docs |
| HTML | `-o html` | Web pages |

---

*Last updated: January 2026*
*Status: Production-ready, in active use*
