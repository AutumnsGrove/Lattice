---
title: Nook — Private Video Sharing
description: 'A cozy corner for sharing videos with close friends, powered by local AI curation and Lattice shared infrastructure'
category: specs
specCategory: lattice-module
icon: projector
lastUpdated: '2026-02-26'
aliases: []
tags:
  - video-sharing
  - privacy
  - ai-processing
  - friends
  - lattice-engine
  - local-pipeline
  - r2-storage
  - streaming
---

# Nook — Private Video Sharing

```
              🌿                           🌿
           ╭───────────────────────────────────╮
           │         ╭─────────────╮           │
           │        ╱    · · · ·    ╲          │
           │       │   ·  ░░░░░  ·   │         │
           │       │  ·  ░▓▓▓▓░  ·   │         │
           │       │   ·  ░░░░░  ·   │         │
           │        ╲    · · · ·    ╱          │
           │         ╰─────────────╯           │
           │                                   │
           │    tucked away. softly glowing.    │
           │    for the few who were invited.   │
           │                                   │
           ╰───────────────────────────────────╯
                 🌿                       🌿

               Gather close. Share quietly.
```

> *A cozy corner of the grove. Videos for close friends.*

Where you share moments with the people who matter. A tucked-away space where your closest friends can watch the videos you've been meaning to share. Processed locally. Curated by you. Uploaded only when you say so.

**Public Name:** Nook
**Internal Name:** GroveNook
**Domain:** `nook.grove.place`
**Pipeline Repository:** [AutumnsGrove/nook-pipeline](https://github.com/AutumnsGrove/nook-pipeline)
**Last Updated:** February 2026

A nook is a tucked-away corner, a quiet space set apart from the main room. Somewhere intimate and private. You don't stumble into a nook. You're invited.

Nook is two things: a local pipeline that compresses, analyzes, and curates your video library on your own hardware, and a cloud layer built into Lattice that streams those approved videos to your friends. The AI helps you sort. You make the final call. Nothing uploads without your approval.

---

## Overview

### What This Is

A privacy-focused video sharing platform for small, trusted friend groups. You have hundreds of personal videos. You want to share some with close friends without uploading to public platforms. Nook processes everything locally, lets you curate what goes up, and serves it through Lattice's existing infrastructure.

### Goals

- **Privacy-first**: All processing happens locally on your Mac Mini before anything touches the cloud
- **Human-in-the-loop**: AI assists with categorization, you make every upload decision
- **Intimate sharing**: Small, trusted friend groups with allowlist access
- **Composable infrastructure**: Cloud side reuses Lattice's existing systems (Amber, Threshold, Heartwood)
- **Smart about your time**: Batch workflow, smart-skip compression, two-pass analysis

### Non-Goals

- Public video hosting or social media features
- Real-time live streaming
- Video editing or post-production tools
- Hosting other people's uploads (this is your library, shared outward)

---

## Architecture

Nook lives in two places: your local machine and the Lattice cloud.

```
LOCAL (nook-pipeline repo)                CLOUD (Lattice engine)
Mac Mini, 32GB, Apple Silicon             Cloudflare Workers

┌─────────────────────────────┐           ┌──────────────────────────┐
│                             │           │  libs/engine/nook/       │
│  ┌─────────┐  ┌──────────┐ │           │                          │
│  │ Watch   │  │  Manual  │ │           │  ┌────────┐ ┌─────────┐ │
│  │ Folder  │  │  CLI     │ │           │  │ Upload │ │ Stream  │ │
│  └────┬────┘  └────┬─────┘ │           │  │ API    │ │ (range) │ │
│       │            │       │           │  └────────┘ └─────────┘ │
│       ▼            ▼       │           │                          │
│  ┌─────────────────────┐   │           │  ┌────────┐ ┌─────────┐ │
│  │  Pipeline           │   │           │  │Catalog │ │Register │ │
│  │  ┌───┐ ┌────┐ ┌───┐│   │  upload   │  │ (D1)   │ │ API     │ │
│  │  │ 1 │ │ 2  │ │ 3 ││   │  + JSON   │  └────────┘ └─────────┘ │
│  │  │   │ │    │ │   ││───────────────▶│                          │
│  │  │   │ │    │ │   ││   │  manifest  │  Composes with:         │
│  │  └───┘ └────┘ └───┘│   │           │  Amber, Threshold,      │
│  │ probe compress  AI  │   │           │  Heartwood, Thorn       │
│  └─────────┬───────────┘   │           │                          │
│            ▼               │           └──────────────────────────┘
│  ┌─────────────────────┐   │
│  │  Review UI          │   │           nook.grove.place
│  │  (SvelteKit+Lattice)│   │           ┌──────────────────────────┐
│  │  approve / skip     │   │           │  Viewing experience      │
│  └─────────────────────┘   │           │  for invited friends     │
│                             │           └──────────────────────────┘
│  SQLite state + JSON export│
└─────────────────────────────┘
```

The key insight: the cloud side is not a separate Nook Worker. It's a **new module in the Lattice engine**. Bump the version, publish to npm, and the video infrastructure becomes shared across all Grove properties. Streaming endpoints, metadata schema, upload handling. All composed from what already exists.

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Local orchestrator | Python (FastAPI) | Same language as video compressor, LM Studio API client |
| Review UI | SvelteKit + @autumnsgrove/lattice | Reuse all Grove UI components, glassmorphism, forms |
| Local state | SQLite + JSON export | Survives crashes, queryable, JSON as cloud contract |
| AI inference | LM Studio (localhost) | Already setup, OpenAI-compatible API, Qwen3-VL 7B |
| Video analysis | ffprobe + Qwen3-VL | Probe for smart-skip, VLM for content understanding |
| Compression | video-compressor (Python lib) | Existing project, imported as library via UV |
| Cloud backend | Lattice engine module | Composes with Amber, Threshold, Heartwood |
| Video storage | Cloudflare R2 | S3-compatible, $0.015/GB/month, multipart upload |
| Video catalog | Cloudflare D1 | SQLite at the edge, tenant-scoped metadata |
| Streaming | Cloudflare Workers | Range-request serving, authenticated access |
| Auth | Heartwood | OAuth + passkey, PKCE flow, allowlist gate |

---

## Local Pipeline

### The Batch Flow

Processing happens in batches of 20-50 videos. This lets you course-correct the AI's behavior early without wasting cycles on the full library.

```
┌─ Batch of 20-50 videos
│
├─ 1. PROBE ─────────────── ffprobe each file
│     │
│     ├─ Already good? (H.264/H.265, reasonable bitrate, progressive)
│     │     └─ Skip compression, go straight to AI analysis
│     │
│     └─ Needs work? (raw footage, oversized, interlaced)
│           └─ Queue for compression
│
├─ 2. COMPRESS + 3. ANALYZE ─── run in parallel
│     │                          │
│     │  CPU + hardware encoder  │  6-8 GB unified memory
│     │  (VideoToolbox)          │  (Qwen3-VL 7B via LM Studio)
│     │                          │
│     │  These barely overlap    │  Two-pass adaptive sampling
│     │  in resource usage       │
│     │                          │
│     ▼                          ▼
│
├─ 4. REVIEW UI ──────── batch lands in local web app
│     │
│     ├─ Grid view: quick triage (approve / skip / flag)
│     ├─ Detail view: full curation (thumbnails, tags, description)
│     └─ "Upload approved" button
│
├─ 5. UPLOAD ────────── R2 multipart, S3 API
│
└─ 6. REGISTER ──────── JSON manifest to Lattice Nook API
```

### Smart Skip (Probe)

Before compressing anything, probe with ffprobe. If a video is already well-encoded, skip compression entirely. Your library probably has a mix of raw footage and already-edited exports. No sense recompressing a file that's already a clean progressive MP4.

```
probe_video(path) → VideoInfo
    │
    ├─ codec: H.264 or H.265?
    ├─ bitrate: reasonable for resolution?
    ├─ container: progressive MP4?
    ├─ resolution, duration, file_size
    │
    └─ Decision:
         SKIP   → already good, just analyze + upload
         COMPRESS → needs work, queue for compressor
```

This check is essentially free (milliseconds per file). For a library of 300 videos where half are already well-encoded, this saves hours of compression time.

### Video Compressor Integration

The compressor is imported as a Python library, installed via UV. It lives in a separate repository and has three processing strategies: generator-based workers for large jobs, thread pool for smaller ones, and a producer-consumer pipeline for multiple large files. Apple Silicon VideoToolbox hardware acceleration is supported.

```python
from video_compressor import CompressionPipeline, probe_video

# Probe first (smart-skip)
info = probe_video("/path/to/video.mp4")
if needs_compression(info):
    pipeline = CompressionPipeline(config=compression_config)
    result = pipeline.compress_file(
        input_path="/path/to/video.mp4",
        output_dir="/path/to/output/",
        progress_callback=on_progress,
    )
```

The compressor is currently mid-refactor from a 4,521-line monolith into a modular package. It needs a clean `compress_file()` API with progress callbacks and a standalone `probe_video()` utility before Nook can import it. See the compressor improvement prompt in the pipeline repository.

### Two-Pass Adaptive Analysis

The AI analysis uses a tiered approach to avoid wasting inference time on uninteresting segments.

```
Pass 1: SPARSE SURVEY (every ~30 seconds)
─────────────────────────────────────────
Video: cooking_trip_2024.mp4 (12 minutes)

  Frame samples: 0:00  0:30  1:00  1:30 ... 11:30  12:00
                  │      │     │     │         │      │
                  ▼      ▼     ▼     ▼         ▼      ▼
               [ 24 frames sent to Qwen3-VL ]

  Prompt: "What's happening in this video? Describe each frame
           briefly. Flag any segments that might contain:
           private conversations, identifiable people who
           haven't consented, intimate moments, or content
           you'd hesitate to share publicly."

  Returns:
    overall_vibe: "cooking session with friends"
    category_hint: "shareable"
    interesting_segments: [
        { start: 180, end: 300, reason: "conversation visible" },
        { start: 540, end: 600, reason: "faces of strangers" }
    ]
    confidence: 0.82

Pass 2: TARGETED DEEP SCAN (2-5 second intervals, flagged segments only)
─────────────────────────────────────────────────────────────────────────
Only runs on the 2 flagged segments (3:00-5:00 and 9:00-10:00).

  Frame samples from 3:00-5:00: every 3 seconds → ~40 frames
  Frame samples from 9:00-10:00: every 3 seconds → ~20 frames

  Prompt: "Examine these frames closely. For each:
           1. Describe the scene
           2. Rate as a potential thumbnail (1-5)
           3. Is this a key moment worth timestamping?
           4. Any privacy concerns? (faces, locations, text)"

  Returns per segment:
    scene_descriptions: [...]
    thumbnail_candidates: [frame_42, frame_67, frame_103]
    key_moments: [{ time: 195, label: "group laughing" }]
    privacy_flags: [{ time: 210, concern: "stranger face" }]
```

A 10-minute video might get 20 frames in Pass 1, identify 2-3 interesting segments, then 40-60 targeted frames in Pass 2. Compare to naively sampling 120 frames across the whole thing. Faster, cheaper, and more thorough where it matters.

### AI Content Strategy

The AI's role is **curator, not bouncer**. This is a private, friends-only platform. You're not moderating user-generated content from strangers. You're curating your own video library for your friends. The AI is an assistant librarian sorting books, asking "would this be a good one to share?" rather than "is this dangerous?"

**Categories:**

| Category | Color | Meaning | Action |
|----------|-------|---------|--------|
| Shareable | Green | Obviously good to share (cooking, travel, hangouts, daily life) | Auto-approved, one-click upload |
| Friends-only | Blue | Fine for close friends, might have personal content | Approved with a note |
| Needs review | Yellow | AI isn't confident, flagged moments to check | Lands in review queue |
| Skip | Red | AI suggests not uploading (too personal, poor quality) | Hidden by default, can override |

The confidence threshold is tunable. After your first batch of 20 videos, you'll see if the AI is being too conservative or too loose and can adjust the prompts and thresholds before processing more.

### Metadata Extraction

For every video, the AI extracts:

- **Category** and **confidence score** (0.0-1.0)
- **Description**: 1-2 sentence summary of the video content
- **Tags**: cooking, travel, hangout, birthday, outdoors, etc.
- **Key moments**: timestamps with labels ("group photo", "sunset view", "cake cutting")
- **Thumbnail candidates**: the 5 best frames, ranked by visual quality and representativeness
- **Scene descriptions**: per-segment narrative for browsing context
- **Privacy flags**: moments with identifiable strangers, sensitive text, or locations

This rich extraction makes the Nook browsing experience great from day one. Your friends see organized, described, navigable video content.

---

## Review UI

The review interface is a local SvelteKit app that imports `@autumnsgrove/lattice` for the full Grove component library. It runs alongside the FastAPI backend as two separate processes.

### Grid View (Triage Mode)

Fast triage for obvious decisions. Get through 50 videos in minutes.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Nook Pipeline          Batch 3 of 12              [Processing...] │
│─────────────────────────────────────────────────────────────────────│
│  [Grid] [Detail]              Filter: [All ▼]  Search: [________]  │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ ● green  │  │ ● green  │  │ ● yellow │  │ ● green  │           │
│  │ ░░░░░░░░ │  │ ░░░░░░░░ │  │ ░░░░░░░░ │  │ ░░░░░░░░ │           │
│  │ ░ thumb ░ │  │ ░ thumb ░ │  │ ░ thumb ░ │  │ ░ thumb ░ │           │
│  │ ░░░░░░░░ │  │ ░░░░░░░░ │  │ ░░░░░░░░ │  │ ░░░░░░░░ │           │
│  │ Cooking  │  │ Trip to  │  │ Chat w/  │  │ Park     │           │
│  │ 4:32     │  │ 12:08    │  │ 2:15     │  │ 8:44     │           │
│  │ [✓]  [✗] │  │ [✓]  [✗] │  │ [?]  [→] │  │ [✓]  [✗] │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
│                                                                     │
│  ┌──────────┐  ┌──────────┐                                        │
│  │ ● red    │  │ ● green  │                                        │
│  │ ░░░░░░░░ │  │ ░░░░░░░░ │    Summary                            │
│  │ ░ thumb ░ │  │ ░ thumb ░ │    ● Auto-approved: 31               │
│  │ ░░░░░░░░ │  │ ░░░░░░░░ │    ● Needs review: 12                │
│  │ Blurry   │  │ Garden   │    ● Suggested skip: 5                │
│  │ 0:48     │  │ 6:20     │                                        │
│  │ [✓]  [✗] │  │ [✓]  [✗] │    [Approve All Green]                │
│  └──────────┘  └──────────┘    [Review Yellow →]                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Detail View (Curation Mode)

One video at a time, full context. For the "needs review" pile and for curating metadata.

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Grid           Video 7 of 12 (needs review)      [→]   │
│─────────────────────────────────────────────────────────────────────│
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │                    ░░░░░░░░░░░░░░░░░░░░░                      │ │
│  │                    ░                   ░                      │ │
│  │                    ░   Video Player    ░                      │ │
│  │                    ░                   ░                      │ │
│  │                    ░░░░░░░░░░░░░░░░░░░░░                      │ │
│  │                                                               │ │
│  │  [▶]  ──●────────────────────────────── 3:24 / 8:44          │ │
│  │         ▲         ▲                                           │ │
│  │         │         └─ flagged moment (2:15)                    │ │
│  │         └─ key moment (0:45)                                  │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  AI Reasoning                                                       │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Category: Needs Review (confidence: 0.61)                     │ │
│  │ Reason: "Contains a conversation segment (2:00-3:30) where   │ │
│  │ personal topics may be discussed. Two unidentified faces at   │ │
│  │ 2:15. Otherwise appears to be a casual outdoor hangout."      │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Thumbnail Picker                                                   │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                         │
│  │ ░░░ │ │ ░█░ │ │ ░░░ │ │ ░░░ │ │ ░░░ │  ← AI's top 5 frames   │
│  │  1  │ │  2  │ │  3  │ │  4  │ │  5  │  █ = selected           │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                         │
│                                                                     │
│  ┌─ Description ─────────────────────────────────────────────────┐ │
│  │ Outdoor hangout at Riverside Park with friends. Includes a    │ │
│  │ casual conversation segment and some scenic shots.            │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Tags: [outdoor] [hangout] [friends] [park] [+ add]                │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  [ Skip ]           [ Friends Only ]           [ Approve ✦ ]       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

The dual-mode approach: start in Grid for quick triage (obviously good / obviously skip), then switch to Detail for the uncertain pile. Two speeds of decision-making for two kinds of content.

---

## Pipeline State

### SQLite Schema (Local)

SQLite is the source of truth for pipeline state. One file, no server, survives crashes.

```sql
-- Every video the pipeline has ever seen
CREATE TABLE videos (
    id TEXT PRIMARY KEY,           -- uuid
    file_path TEXT NOT NULL,       -- original location on disk
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,    -- bytes
    duration_seconds REAL,
    resolution_width INTEGER,
    resolution_height INTEGER,
    codec TEXT,                    -- h264, h265, etc.
    bitrate INTEGER,               -- kbps

    -- Pipeline state
    status TEXT NOT NULL DEFAULT 'pending',
        -- pending, probing, compressing, analyzing,
        -- review, approved, uploading, uploaded, skipped
    batch_id TEXT,                  -- which batch this belongs to
    needs_compression BOOLEAN,
    compressed_path TEXT,           -- output after compression
    compressed_size INTEGER,

    -- Timestamps
    discovered_at INTEGER NOT NULL,
    processed_at INTEGER,
    reviewed_at INTEGER,
    uploaded_at INTEGER,

    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- AI analysis results
CREATE TABLE analysis (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL REFERENCES videos(id),
    category TEXT NOT NULL,        -- shareable, friends_only, review, skip
    confidence REAL NOT NULL,      -- 0.0-1.0
    description TEXT,
    tags TEXT,                     -- JSON array
    key_moments TEXT,              -- JSON array of {time, label}
    thumbnail_frames TEXT,         -- JSON array of {time, score, path}
    scene_descriptions TEXT,       -- JSON array of {start, end, text}
    privacy_flags TEXT,            -- JSON array of {time, concern}
    ai_reasoning TEXT,             -- full explanation for review UI
    pass1_raw TEXT,                -- raw Pass 1 response (for debugging)
    pass2_raw TEXT,                -- raw Pass 2 response

    created_at INTEGER NOT NULL
);

-- Human review decisions
CREATE TABLE reviews (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL REFERENCES videos(id),
    decision TEXT NOT NULL,        -- approved, skipped, friends_only
    chosen_thumbnail TEXT,         -- path to selected thumbnail
    edited_description TEXT,       -- human-edited description (nullable)
    edited_tags TEXT,              -- human-edited tags (nullable)
    notes TEXT,                    -- optional reviewer notes

    reviewed_at INTEGER NOT NULL
);

-- Upload tracking
CREATE TABLE uploads (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL REFERENCES videos(id),
    r2_key TEXT NOT NULL,          -- R2 object key
    manifest_json TEXT NOT NULL,   -- the JSON sent to Nook API
    upload_started_at INTEGER,
    upload_completed_at INTEGER,
    registered_at INTEGER,         -- when Nook API confirmed receipt
    status TEXT NOT NULL DEFAULT 'pending'
        -- pending, uploading, uploaded, registered, failed
);

-- Batch management
CREATE TABLE batches (
    id TEXT PRIMARY KEY,
    name TEXT,                     -- optional human label
    video_count INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'processing',
        -- processing, ready_for_review, reviewed, uploading, complete
    created_at INTEGER NOT NULL,
    completed_at INTEGER
);
```

> 🔲 **OPEN**: Exact index strategy. Likely: `videos(status)`, `videos(batch_id)`, `analysis(video_id)`.

### JSON Manifest (Cloud Contract)

The JSON manifest is what gets sent to the Lattice Nook registration API alongside the uploaded video. It's the contract between local pipeline and cloud.

```json
{
    "version": "1.0",
    "video": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "r2_key": "nook/v/550e8400.mp4",
        "file_name": "cooking_trip_2024.mp4",
        "duration_seconds": 272.5,
        "resolution": { "width": 1920, "height": 1080 },
        "codec": "h265",
        "file_size": 156000000,
        "compressed_from": 890000000
    },
    "metadata": {
        "category": "shareable",
        "description": "Making pasta from scratch at the cabin with Sam and Alex.",
        "tags": ["cooking", "friends", "cabin", "travel"],
        "thumbnail_r2_key": "nook/t/550e8400.webp"
    },
    "moments": [
        { "time": 45, "label": "Kneading dough", "type": "key" },
        { "time": 132, "label": "First taste test", "type": "key" },
        { "time": 210, "label": "Final plating", "type": "key" }
    ],
    "privacy": {
        "face_blur_applied": false,
        "consent_status": "not_applicable",
        "local_only_segments": []
    },
    "pipeline": {
        "processed_at": "2026-02-26T14:30:00Z",
        "ai_model": "qwen3-vl-7b",
        "ai_confidence": 0.91,
        "compression_ratio": 0.175,
        "pipeline_version": "0.1.0"
    }
}
```

> 🔲 **OPEN**: Finalize the manifest schema once the D1 catalog schema is designed. These should mirror each other.

---

## Cloud Side (Lattice Engine Module)

The cloud side lives inside `libs/engine/nook/` as a new Lattice engine module. This is the key architectural decision: Nook's cloud infrastructure is shared Lattice infrastructure.

When you bump the Lattice version and publish to npm, every property using `@autumnsgrove/lattice` gains access to the video serving capabilities. The streaming endpoint, the metadata schema, the upload handler. All composed from existing systems.

### Lattice Integration Map

```
libs/engine/
├── nook/                    ← NEW MODULE
│   ├── upload.ts            ← R2 multipart upload handler
│   ├── stream.ts            ← Range-request video serving
│   ├── catalog.ts           ← D1 video metadata (from manifest)
│   └── api.ts               ← Registration endpoint
│
├── amber/                   ← R2 storage + quota tracking
│   └── (Nook uses Amber for R2 operations and quota)
│
├── threshold/               ← Rate limiting
│   └── (Nook adds video streaming rate limit category)
│
├── heartwood/               ← Auth client
│   └── (Nook uses Heartwood for OAuth + passkey + allowlist)
│
├── thorn/                   ← Content moderation
│   └── (Nook extends Thorn with video content type metadata)
│
├── loom/                    ← Durable Object coordination
│   └── (Nook could use Loom for upload processing state)
│
└── feature-flags/           ← Tier gating
    └── (Nook features behind flags during rollout)
```

### Streaming Endpoint

Videos are served with HTTP range requests for seeking support. Every request is authenticated through Heartwood and rate-limited through Threshold.

```
GET /nook/v/:videoId
    │
    ├─ Heartwood auth check ─── FAIL ──→ 401
    │
    ├─ Allowlist gate ────────── FAIL ──→ 403
    │
    ├─ Threshold rate check ─── FAIL ──→ 429
    │
    ├─ Parse Range header
    │     ├─ No Range → 200, full file (small videos)
    │     └─ Range: bytes=X-Y → 206 Partial Content
    │
    └─ Amber.getObject(r2_key) → stream response
```

> 🔲 **OPEN**: Progressive MP4 vs HLS for long videos. Progressive is simpler and works for friend-group scale. HLS adds complexity but enables adaptive bitrate. Start with progressive, revisit if needed.

### Registration API

When the local pipeline uploads a video and sends the JSON manifest:

```
POST /nook/api/register
    │
    ├─ Heartwood auth (must be the account owner)
    │
    ├─ Validate manifest schema
    │
    ├─ Confirm R2 object exists (Amber.headObject)
    │
    ├─ Insert into D1 catalog
    │     ├─ video metadata
    │     ├─ moments
    │     └─ thumbnail reference
    │
    └─ Return: { success: true, video_id, stream_url }
```

### D1 Catalog Schema (Cloud)

> 🔲 **OPEN**: Full schema design. Preliminary structure:

```sql
CREATE TABLE nook_videos (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,        -- Heartwood user ID
    r2_key TEXT NOT NULL,
    thumbnail_r2_key TEXT,
    file_name TEXT NOT NULL,
    duration_seconds REAL,
    resolution_width INTEGER,
    resolution_height INTEGER,
    codec TEXT,
    file_size INTEGER,
    category TEXT NOT NULL,
    description TEXT,
    tags TEXT,                     -- JSON array
    ai_confidence REAL,
    pipeline_version TEXT,
    processed_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE nook_moments (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL REFERENCES nook_videos(id),
    time_seconds REAL NOT NULL,
    label TEXT NOT NULL,
    moment_type TEXT DEFAULT 'key',
    created_at INTEGER NOT NULL
);

CREATE TABLE nook_access (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL REFERENCES nook_videos(id),
    user_id TEXT NOT NULL,         -- Heartwood user ID of viewer
    granted_at INTEGER NOT NULL
);
```

---

## Privacy Architecture

Multiple layers, all enforced:

1. **Local processing**: All AI analysis, compression, and curation happens on your Mac Mini. Video content never touches cloud AI services.

2. **Human gate**: Nothing uploads without your explicit approval in the review UI. The AI categorizes and suggests. You decide.

3. **Heartwood authentication**: Centralized auth through Grove's auth system. OAuth + passkey + PKCE flow.

4. **Allowlist gate**: Only approved Heartwood users can access Nook. You maintain the list. There is no public access, no discovery, no search indexing.

5. **Non-guessable storage**: R2 keys use UUIDs. There's no enumeration endpoint, no directory listing, no sequential IDs to guess.

6. **Authenticated streaming**: Every video request requires a valid Heartwood session. No direct R2 URLs are exposed.

7. **Rate limiting**: Threshold enforces per-user rate limits on the streaming endpoint, even within the allowlist.

### Face Privacy (Phase 3)

> 🔲 **OPEN**: Full implementation design. Preliminary approach:

- **MediaPipe face detection** runs locally during AI analysis
- **Unknown faces** (not in your consent database) get automatic blurring
- **Consent management**: friends opt in to appearing unblurred
- **Granular control**: per-video, per-person consent decisions
- **Processing**: blur is applied before upload, not at streaming time

---

## Watch Folder + CLI

Two ways to feed the pipeline:

### Watch Folder (Passive Intake)

Point it at a directory. New videos dropped in get auto-queued as pending. The watch folder accumulates, you process when ready.

```bash
# Start watching (runs in background)
nook watch ~/Videos/to-share/

# Videos accumulate as "pending" in SQLite
# Process them when ready:
nook batch --size 30
```

> 🔲 **OPEN**: Implementation: fswatch, watchdog (Python), or simple polling interval. Watchdog is the likely choice (pure Python, cross-platform, well-maintained).

### Manual CLI

Explicit control for one-offs:

```bash
# Add specific files
nook add video1.mp4 video2.mp4

# Add a whole directory
nook add ~/Videos/vacation-2024/

# Process the current pending queue
nook batch

# Check status
nook status

# Export manifest for a batch
nook export --batch 3 --format json
```

---

## Cost Structure

Projected monthly costs at friend-group scale:

| Resource | Usage | Cost |
|----------|-------|------|
| R2 Storage | 60-150 GB compressed video | $0.90-$2.25/month |
| R2 Operations | ~1,000 reads/month (friend viewing) | ~$0.01/month |
| Workers | ~5,000 requests/month | Free tier |
| D1 | ~10,000 reads/month | Free tier |
| Local compute | Mac Mini power draw | Negligible |

**Total: ~$1-3/month**

The economics only work because this is friend-group scale. 5-15 viewers, not 5,000. That's the whole point.

---

## Development Roadmap

### Phase 0: Foundation

Get the basic loop working end-to-end.

- [ ] Heartwood auth integration for nook.grove.place
- [ ] Manual video upload to R2 (no pipeline, just direct)
- [ ] Basic streaming endpoint with range request support
- [ ] Simple video list page with authentication
- [ ] Allowlist gate (hardcoded list, Heartwood users only)

### Phase 1: Local Pipeline

The core Nook experience. Where most of the work lives.

- [ ] Complete video compressor refactor (library API, probe_video)
- [ ] Pipeline orchestrator: probe → compress → analyze → review → upload
- [ ] LM Studio integration for two-pass adaptive analysis
- [ ] SQLite state management
- [ ] FastAPI backend for review UI
- [ ] SvelteKit review UI with Lattice components (grid + detail views)
- [ ] Thumbnail extraction and picker
- [ ] JSON manifest generation
- [ ] R2 multipart upload from pipeline
- [ ] Nook registration API in Lattice engine
- [ ] Watch folder + CLI interface
- [ ] Batch processing flow (20-50 at a time)

### Phase 2: Rich Catalog

Make the viewing experience great.

- [ ] Video browsing by tag, date, collection
- [ ] Key moment navigation (jump to timestamps)
- [ ] Search across descriptions and tags
- [ ] Collections / playlists
- [ ] "New since last visit" indicator for friends
- [ ] Thumbnail grid view on nook.grove.place

### Phase 3: Face Privacy

The consent layer.

- [ ] MediaPipe face detection in pipeline analysis pass
- [ ] Face clustering (same person across videos)
- [ ] Consent database (who has opted in)
- [ ] Automatic blur for unknown faces before upload
- [ ] Friend consent management UI
- [ ] Per-video override controls

---

## Open Questions

These decisions are flagged for future resolution:

| Question | Context | When to Decide |
|----------|---------|----------------|
| LM Studio prompt strategy | Exact system prompts for Pass 1 and Pass 2 analysis | Phase 1 implementation |
| Progressive vs HLS streaming | Start with progressive MP4, but may need HLS for long videos | Phase 0, revisit Phase 2 |
| Watch folder implementation | watchdog (Python) vs fswatch vs polling | Phase 1 implementation |
| D1 catalog schema (final) | Must mirror JSON manifest format | Phase 0-1 boundary |
| Review UI component architecture | Which Lattice components to compose, custom components needed | Phase 1 implementation |
| Face consent UX | How friends opt in/out, granularity of control | Phase 3 design |
| Bulk migration strategy | First run through hundreds of existing videos, tuning thresholds | Phase 1 testing |
| Upload bandwidth management | Throttling, scheduling, resume-on-failure for large libraries | Phase 1 implementation |

---

## Related Systems

- **[Heartwood](/docs/specs/heartwood-spec.md)**: Authentication, OAuth, passkeys
- **[Amber](/docs/specs/amber-spec.md)**: R2 storage management, quota tracking
- **[Threshold](/docs/specs/threshold-spec.md)**: Rate limiting
- **[Thorn](/docs/specs/thorn-spec.md)**: Content moderation framework
- **[Loom](/docs/specs/meadow-loom-spec.md)**: Durable Object coordination
- **[Lattice Engine](/docs/specs/engine-spec.md)**: The engine this module lives inside

---

*The nook stays quiet until you invite someone in. Then the screen glows warm, and the moment belongs to everyone in the room.*

*Spec Version: 2.0*
*Last Updated: February 2026*
