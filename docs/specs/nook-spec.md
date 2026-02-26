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
| HLS packaging | ffmpeg HLS muxer | Segment long videos into adaptive quality tiers |
| Cloud backend | Lattice engine module | Composes with Amber, Threshold, Heartwood |
| Video storage | Cloudflare R2 | S3-compatible, $0.015/GB/month, multipart upload |
| Video catalog | Cloudflare D1 | SQLite at the edge, tenant-scoped metadata |
| Streaming | Cloudflare Workers | Progressive MP4 (<5 min) + HLS adaptive (≥5 min) |
| Video player | Lattice MediaPlayer + hls.js | Extend existing glassmorphic player with HLS support |
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
├─ 3b. HLS PACKAGING ──── for videos ≥5 minutes
│     │
│     ├─ 3 quality tiers: 1080p, 720p, 480p
│     ├─ 6-10 second segments + .m3u8 manifest
│     └─ Videos <5 min stay as progressive MP4
│
├─ 4. REVIEW UI ──────── batch lands in local web app
│     │
│     ├─ Grid view: quick triage (approve / skip / flag)
│     ├─ Detail view: full curation (thumbnails, tags, description)
│     └─ "Upload approved" button
│
├─ 5. UPLOAD ────────── throttled background, R2 multipart
│     │
│     ├─ Bandwidth cap: user-configured (set on first run)
│     ├─ Auto-resume on failure
│     └─ Runs in background without saturating connection
│
└─ 6. REGISTER ──────── JSON manifest to Lattice Nook API
```

### Calibration Loop (First-Time Import)

When you first point Nook at your library of hundreds of videos, you don't fire-and-forget. You calibrate.

```
Round 1: CALIBRATION (20 videos)
────────────────────────────────
  Process 20 videos → review in UI → approve/skip/edit

  Your review decisions become few-shot examples:
    "You categorized this cooking video as 'shareable' with tag 'friends'"
    "You changed this description from X to Y"
    "You skipped this blurry phone clip"

Round 2+: INFORMED BATCHES (50 videos each)
───────────────────────────────────────────
  AI receives your Round 1 decisions as context
  Prompts include: "Here are examples of how the owner categorized
  similar videos. Match their style and preferences."

  After each batch, new decisions refine the few-shot pool.
  The AI learns your taste. Accuracy improves with each round.
```

The calibration loop turns a weekend project into a smooth first experience. Instead of fixing 200 miscategorized videos, you fix 3-4 in the first batch and the AI gets it right for the rest.

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

  Prompt: "Analyze these frames and fill out the following template.
           Be factual and consistent. Flag any segments that might
           contain private conversations, identifiable people, or
           content you'd hesitate to share."

  Returns (structured template):
    setting: "Kitchen, afternoon light"
    people: "3 people visible, 1 unidentified"
    activity: "Cooking, conversation"
    mood: "Relaxed, casual"
    moments: [
        { time: 45, label: "Kneading dough" },
        { time: 210, label: "Taste test" }
    ]
    context: "Indoor, daytime, 12 minutes"
    privacy: "Unidentified person at 3:00-5:00, conversation at 9:00-10:00"
    vibe: "A lazy afternoon making pasta from scratch — flour everywhere,
           friendly arguments about sauce."
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

### Structured Template (AI Output Format)

Every video gets a fixed-format template. Consistent, scannable, easy to build UI around. The AI fills these fields:

| Field | Example | Purpose |
|-------|---------|---------|
| **Setting** | "Cabin kitchen, afternoon light" | Where it happens |
| **People** | "Sam, Alex, one unidentified" | Who's visible |
| **Activity** | "Making pasta from scratch" | What's happening |
| **Mood** | "Relaxed, laughing, casual" | Emotional tone |
| **Moments** | "0:45 kneading dough, 2:10 taste test" | Navigable timestamps |
| **Context** | "Indoor, daytime, 4min 32s" | Duration + environment |
| **Privacy** | "Unidentified person at 1:15-2:30" | Flags for review |
| **Vibe** | "A lazy afternoon making pasta from scratch — flour everywhere, friendly arguments about sauce." | One human-readable sentence for browsing |

Plus the standard extraction:

- **Category** and **confidence score** (0.0-1.0)
- **Tags**: cooking, travel, hangout, birthday, outdoors, etc.
- **Thumbnail candidates**: the 5 best frames, ranked by visual quality and representativeness

The structured fields are for machines (filtering, searching, review UI). The vibe line is for humans (browsing the library, seeing what a video is about at a glance). Seven fields to scan, one sentence to feel.

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

```sql
-- Local indexes (decided at implementation time, starting set)
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_batch ON videos(batch_id);
CREATE INDEX idx_analysis_video ON analysis(video_id);
CREATE INDEX idx_reviews_video ON reviews(video_id);
CREATE INDEX idx_uploads_video ON uploads(video_id);
CREATE INDEX idx_uploads_status ON uploads(status);
```

### JSON Manifest (Cloud Contract)

The JSON manifest is what gets sent to the Lattice Nook registration API alongside the uploaded video. It's the contract between local pipeline and cloud.

```json
{
    "version": "2.0",
    "video": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "r2_key": "nook/v/550e8400.mp4",
        "file_name": "cooking_trip_2024.mp4",
        "duration_seconds": 272.5,
        "resolution": { "width": 1920, "height": 1080 },
        "codec": "h265",
        "file_size": 156000000,
        "compressed_from": 890000000,
        "streaming_format": "progressive"
    },
    "template": {
        "setting": "Cabin kitchen, afternoon light",
        "people": "Sam, Alex, one unidentified",
        "activity": "Making pasta from scratch",
        "mood": "Relaxed, laughing, casual",
        "context": "Indoor, daytime, 4min 32s",
        "privacy_notes": "Unidentified person at 1:15-2:30",
        "vibe": "A lazy afternoon making pasta from scratch — flour everywhere, friendly arguments about sauce."
    },
    "metadata": {
        "category": "shareable",
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
        "pipeline_version": "0.2.0"
    }
}
```

For HLS videos (≥5 min), `streaming_format` is `"hls"` and `r2_key` points to the HLS directory (`nook/v/{id}/`) instead of a single file. The manifest schema mirrors the D1 `nook_videos` table — every field in the manifest maps to a column.

---

## Cloud Side (Lattice Engine Module)

The cloud side lives inside `libs/engine/nook/` as a new Lattice engine module. This is the key architectural decision: Nook's cloud infrastructure is shared Lattice infrastructure.

When you bump the Lattice version and publish to npm, every property using `@autumnsgrove/lattice` gains access to the video serving capabilities. The streaming endpoint, the metadata schema, the upload handler. All composed from existing systems.

### Lattice Integration Map

```
libs/engine/
├── nook/                    ← NEW MODULE
│   ├── upload.ts            ← R2 multipart upload handler
│   ├── stream.ts            ← Progressive + HLS video serving
│   ├── catalog.ts           ← D1 video metadata (from manifest)
│   ├── collections.ts       ← User collections + AI auto-groups
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

Videos use a hybrid streaming strategy based on duration:

- **Under 5 minutes**: Progressive MP4 with range-request serving. Simple, fast seeking, one file per video.
- **5 minutes and over**: HLS adaptive streaming with 3 quality tiers (1080p, 720p, 480p). The player auto-selects quality based on connection speed.

Every request is authenticated through Heartwood and rate-limited through Threshold. Access is all-or-nothing: if you're on the allowlist, you see everything approved. No per-video access controls.

```
GET /nook/v/:videoId
    │
    ├─ Heartwood auth check ─── FAIL ──→ 401
    │
    ├─ Allowlist gate ────────── FAIL ──→ 403
    │
    ├─ Threshold rate check ─── FAIL ──→ 429
    │
    ├─ Check streaming format
    │     ├─ Progressive MP4 (short videos):
    │     │     ├─ Parse Range header
    │     │     ├─ No Range → 200, full file
    │     │     └─ Range: bytes=X-Y → 206 Partial Content
    │     │
    │     └─ HLS (long videos):
    │           ├─ GET /nook/v/:videoId/master.m3u8 → quality manifest
    │           ├─ GET /nook/v/:videoId/:quality/playlist.m3u8 → segment list
    │           └─ GET /nook/v/:videoId/:quality/:segment.ts → video chunk
    │
    └─ Amber.getObject(r2_key) → stream response
```

### HLS Pipeline (Local)

For videos ≥5 minutes, the local pipeline generates HLS assets after compression:

```
Input: compressed_video.mp4 (1080p source)
    │
    ├─ ffmpeg -i input.mp4 [1080p encode] → segments + playlist
    ├─ ffmpeg -i input.mp4 [720p encode]  → segments + playlist
    ├─ ffmpeg -i input.mp4 [480p encode]  → segments + playlist
    │
    └─ Generate master.m3u8 (points to all 3 quality playlists)

Output in R2:
  nook/v/{id}/master.m3u8
  nook/v/{id}/1080p/playlist.m3u8
  nook/v/{id}/1080p/segment_000.ts ... segment_NNN.ts
  nook/v/{id}/720p/playlist.m3u8
  nook/v/{id}/720p/segment_000.ts ... segment_NNN.ts
  nook/v/{id}/480p/playlist.m3u8
  nook/v/{id}/480p/segment_000.ts ... segment_NNN.ts
```

Segment duration: 6-10 seconds. Each segment is individually addressable in R2, enabling fast seeking and adaptive quality switching mid-stream.

### Video Player (Lattice MediaPlayer + hls.js)

Nook extends the existing `MediaPlayer` component from `@autumnsgrove/lattice/ui/media-player`. The component is currently frame-based (used for the Living Grove visualization), with glassmorphic controls, seasonal scrubber colors, keyboard shortcuts, speed toggle, and fullscreen support.

For Nook, a `<video>` element lives in the MediaPlayer's content slot. hls.js handles adaptive streaming for HLS videos, falling back to native `<video>` playback for progressive MP4s.

```
Existing MediaPlayer (keep as-is)
├── MediaControls (glassmorphic bar)
│   ├── play/pause, step back/forward
│   ├── MediaScrubber (seasonal accent colors)
│   ├── MediaSpeedToggle (0.5x, 1x, 2x)
│   ├── loop toggle, fullscreen
│   └── keyboard: Space, ←→, F, L
│
└── Content slot ← Nook wraps <video> here

Nook extensions needed:
├── NookVideoPlayer.svelte
│   ├── Wraps <video> + hls.js in MediaPlayer content slot
│   ├── Syncs video.currentTime ↔ MediaPlayer.currentTime
│   ├── Passes video.duration to MediaPlayer
│   └── Handles HLS manifest loading + quality switching
│
├── Key moment markers on MediaScrubber
│   ├── Small dots on the timeline at moment timestamps
│   ├── Hover tooltip shows moment label
│   └── Click jumps to that timestamp
│
└── Quality indicator (optional)
    └── Shows current HLS quality tier (1080p/720p/480p)
```

The existing seasonal theming carries through automatically — the scrubber fill color, the glassmorphic controls, dark/light mode awareness. Nook's player looks like it belongs in the grove because it's built from the same components.

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

The cloud schema supports flat tags, user-created collections, and AI-suggested auto-groups. Access is all-or-nothing (allowlist), so there's no per-video access table. The consent tables support the Phase 3 face privacy feature (designed now, built later).

**D1 binding**: All Nook tables live in the core `platform.env.DB` binding (not CURIO_DB). Nook is a first-class Lattice module, not optional widget data.

```sql
-- Core video catalog (platform.env.DB)

-- Allowlist: who can view this owner's Nook
CREATE TABLE nook_allowlist (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,        -- Heartwood user ID of the Nook owner
    friend_id TEXT NOT NULL,       -- Heartwood user ID of the friend
    added_at INTEGER NOT NULL,
    UNIQUE(owner_id, friend_id)
);

-- Core video catalog
CREATE TABLE nook_videos (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,        -- Heartwood user ID
    r2_key TEXT NOT NULL,          -- progressive MP4 or HLS directory
    thumbnail_r2_key TEXT,
    file_name TEXT NOT NULL,
    duration_seconds REAL,
    resolution_width INTEGER,
    resolution_height INTEGER,
    codec TEXT,
    file_size INTEGER,
    category TEXT NOT NULL,        -- shareable, friends_only
    streaming_format TEXT NOT NULL DEFAULT 'progressive',
        -- 'progressive' (<5 min) or 'hls' (≥5 min)

    -- Structured template fields
    setting TEXT,                  -- "Cabin kitchen, afternoon light"
    people TEXT,                   -- "Sam, Alex, one unidentified"
    activity TEXT,                 -- "Making pasta from scratch"
    mood TEXT,                     -- "Relaxed, laughing, casual"
    context TEXT,                  -- "Indoor, daytime, 4min 32s"
    privacy_notes TEXT,            -- "Unidentified person at 1:15-2:30"
    vibe TEXT,                     -- freeform human-readable sentence
    description TEXT,              -- legacy/fallback description

    tags TEXT,                     -- JSON array: ["cooking", "friends"]
    ai_confidence REAL,
    pipeline_version TEXT,
    processed_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Navigable timestamps within videos
CREATE TABLE nook_moments (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL REFERENCES nook_videos(id) ON DELETE CASCADE,
    time_seconds REAL NOT NULL,
    label TEXT NOT NULL,
    moment_type TEXT DEFAULT 'key', -- 'key' or 'flagged'
    created_at INTEGER NOT NULL
);

-- User-created collections (ordered, named, with optional cover)
CREATE TABLE nook_collections (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,             -- "Japan Trip 2024"
    description TEXT,
    cover_video_id TEXT REFERENCES nook_videos(id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Videos in collections (many-to-many, ordered)
CREATE TABLE nook_collection_videos (
    id TEXT PRIMARY KEY,
    collection_id TEXT NOT NULL REFERENCES nook_collections(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL REFERENCES nook_videos(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    added_at INTEGER NOT NULL,
    UNIQUE(collection_id, video_id)
);

-- AI-suggested groupings (date proximity + tag overlap)
CREATE TABLE nook_auto_groups (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    suggested_name TEXT NOT NULL,   -- "Weekend of Feb 15, 2024"
    grouping_reason TEXT,           -- "8 videos within 48 hours, 5 share 'cooking' tag"
    status TEXT NOT NULL DEFAULT 'suggested',
        -- 'suggested', 'accepted' (promoted to collection), 'dismissed'
    created_at INTEGER NOT NULL
);

-- Videos in auto-groups
CREATE TABLE nook_auto_group_videos (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES nook_auto_groups(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL REFERENCES nook_videos(id) ON DELETE CASCADE,
    UNIQUE(group_id, video_id)
);

-- Face consent (designed now, built in Phase 3)
-- Friends self-manage consent at nook.grove.place/consent
CREATE TABLE nook_face_consent (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,          -- Heartwood user ID of the friend
    display_name TEXT,              -- how they want to appear in metadata
    consent_status TEXT NOT NULL DEFAULT 'pending',
        -- 'pending', 'opted_in', 'opted_out'
    reference_image_r2_key TEXT,   -- selfie for face matching (encrypted via Warden)
    consented_at INTEGER,
    revoked_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Indexes
CREATE INDEX idx_nook_allowlist_owner ON nook_allowlist(owner_id);
CREATE INDEX idx_nook_videos_owner ON nook_videos(owner_id);
CREATE INDEX idx_nook_videos_category ON nook_videos(category);
CREATE INDEX idx_nook_videos_created ON nook_videos(created_at);
CREATE INDEX idx_nook_moments_video ON nook_moments(video_id);
CREATE INDEX idx_nook_collections_owner ON nook_collections(owner_id);
CREATE INDEX idx_nook_auto_groups_owner ON nook_auto_groups(owner_id);
CREATE INDEX idx_nook_auto_groups_status ON nook_auto_groups(status);
CREATE INDEX idx_nook_face_consent_user ON nook_face_consent(user_id);
```

### Auto-Group Algorithm

Auto-groups are generated when new videos are registered. The algorithm clusters by date proximity and tag overlap:

```
For each new video:
  1. Find all videos within 48 hours of this video's processed_at
  2. Among those, check tag overlap (≥2 shared tags)
  3. If ≥3 videos match both criteria → suggest a group
  4. Name suggestion: "Weekend of {earliest_date}" or
     "{shared_tag} — {date_range}"

Groups surface in the UI as suggestions:
  "These 8 videos seem to be from the same weekend"
  [Accept as collection] [Dismiss]
```

When accepted, an auto-group gets promoted to a full collection with a name you can edit.

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

### Face Privacy (Phase 3 — designed now, built later)

Friends manage their own consent at `nook.grove.place/consent`. You don't decide for them. They do.

**Self-Service Consent Flow:**

```
Friend visits nook.grove.place/consent (authenticated via Heartwood)
    │
    ├─ "Nook uses face detection to protect privacy.
    │   If you'd like to appear unblurred in videos,
    │   opt in below."
    │
    ├─ [Opt In]
    │     ├─ Upload a reference selfie (stored encrypted in R2)
    │     ├─ Set display name (how they appear in metadata)
    │     └─ Status: opted_in
    │
    ├─ [Opt Out] or [Revoke]
    │     ├─ Reference image deleted from R2
    │     ├─ All future videos blur their face
    │     └─ Status: opted_out (face still detected, always blurred)
    │
    └─ Default for friends who haven't visited: opted_out (blurred)
```

**Pipeline Integration:**

- **MediaPipe face detection** runs locally during AI analysis pass
- **Face matching** compares detected faces against opted-in reference images
- **Unknown faces** (no match or opted-out) get automatic blurring
- **Blur is applied before upload**, not at streaming time — the cloud never sees unblurred faces of non-consenting people
- **You retain final override**: the review UI shows which faces were detected and their consent status, and you can override per-video

**D1 Schema:** The `nook_face_consent` table (defined in the catalog schema above) stores consent status, reference image keys, and timestamps. Designed into the schema now so no migration is needed when Phase 3 ships.

---

## Watch Folder + CLI

Two ways to feed the pipeline:

### Watch Folder (Staging Pattern)

The watch folder uses a two-directory staging pattern: `inbox/` and `ready/`. Files land in inbox (drag-and-drop, Finder copy, whatever). When they're done copying, you move them to `ready/`. The pipeline only processes files in `ready/`. No ambiguity about partial copies, no file lock detection, no settle delays.

```
~/Videos/nook/
├── inbox/          ← drop files here (copying, incomplete, whatever)
│   ├── trip_video.mp4      (still copying...)
│   └── cooking_2024.mp4    (still copying...)
│
└── ready/          ← move here when done, pipeline picks them up
    ├── birthday.mp4         (queued as pending)
    └── park_day.mp4         (queued as pending)
```

```bash
# Start watching the ready folder
nook watch ~/Videos/nook/

# Files in ready/ get auto-queued as "pending" in SQLite
# Process them when ready:
nook batch --size 30
```

The staging pattern is manual but unambiguous. You control when files are ready. The pipeline never touches a half-written file.

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

Projected monthly costs at friend-group scale. HLS increases storage (3 quality tiers per long video) but R2 pricing stays cheap:

| Resource | Usage | Cost |
|----------|-------|------|
| R2 Storage | 100-250 GB (progressive + HLS tiers) | $1.50-$3.75/month |
| R2 Operations | ~3,000 reads/month (HLS segments + thumbnails) | ~$0.01/month |
| Workers | ~10,000 requests/month (HLS segments are individual requests) | Free tier |
| D1 | ~15,000 reads/month (catalog + collections + auto-groups) | Free tier |
| Local compute | Mac Mini power draw during encoding | Negligible |

**Total: ~$2-4/month**

Storage is higher than progressive-only because each long video exists at 3 quality tiers. But the economics still work because this is friend-group scale. 5-15 viewers, not 5,000. That's the whole point.

---

## Development Roadmap

### Phase 0: Foundation

Get the basic loop working end-to-end.

- [ ] Heartwood auth integration for nook.grove.place
- [ ] Manual video upload to R2 (no pipeline, just direct)
- [ ] Progressive MP4 streaming endpoint with range request support
- [ ] HLS streaming endpoint (manifest + segment serving)
- [ ] Simple video list page with authentication
- [ ] Allowlist gate (all-or-nothing, Heartwood users only)
- [ ] Extend Lattice MediaPlayer with `<video>` + hls.js support

### Phase 1: Local Pipeline

The core Nook experience. Where most of the work lives.

- [ ] Complete video compressor refactor (library API, probe_video)
- [ ] Pipeline orchestrator: probe → compress → analyze → HLS package → review → upload
- [ ] HLS packaging step (ffmpeg, 3 quality tiers for videos ≥5 min)
- [ ] LM Studio integration: structured template output (7 fields + vibe)
- [ ] Two-pass adaptive analysis with calibration loop
- [ ] SQLite state management
- [ ] FastAPI backend for review UI
- [ ] SvelteKit review UI with Lattice components (grid + detail views)
- [ ] Thumbnail extraction and picker
- [ ] JSON manifest generation (v2.0 schema)
- [ ] Throttled background upload to R2 (user-configured bandwidth cap, auto-resume)
- [ ] Nook registration API in Lattice engine
- [ ] Watch folder with staging pattern (inbox → ready)
- [ ] CLI interface (add, batch, status, export)
- [ ] Calibration loop: first 20 videos → review → few-shot context for subsequent batches

### Phase 2: Rich Catalog

Make the viewing experience great.

- [ ] Video browsing by tag, date, collection
- [ ] Key moment markers on MediaScrubber timeline
- [ ] Search across structured template fields and tags
- [ ] User-created collections (ordered, named, cover thumbnails)
- [ ] AI auto-groups (date proximity + tag overlap → suggested collections)
- [ ] "New since last visit" indicator for friends
- [ ] Thumbnail grid view on nook.grove.place
- [ ] Notification hook interface (designed, not implemented)

### Phase 3: Face Privacy

The consent layer. Schema already in D1, UX designed, ready to build.

- [ ] MediaPipe face detection in pipeline analysis pass
- [ ] Face clustering (same person across videos)
- [ ] Friend self-service consent page at nook.grove.place/consent
- [ ] Reference image upload + Warden-encrypted storage (see AGENT.md §Warden)
- [ ] Automatic blur for unknown/opted-out faces before upload
- [ ] Owner override controls in review UI
- [ ] Consent status display in video metadata

---

## Resolved Decisions

These questions were resolved during spec design:

| Decision | Resolution | Details |
|----------|-----------|---------|
| AI description format | **Structured template: 7 fields + vibe line** | Setting, People, Activity, Mood, Moments, Context, Privacy, plus freeform vibe sentence |
| Streaming strategy | **Hybrid: progressive <5 min, HLS ≥5 min** | 3 quality tiers (1080p/720p/480p), 6-10s segments |
| Watch folder | **Staging pattern (inbox → ready)** | Two directories, manual move signals file completeness |
| Video organization | **Tags + collections + AI auto-groups** | Flat tags, user collections, date+tag-overlap auto-clustering |
| Bulk migration | **Calibration loop** | 20 videos → review → few-shot context → scale to batches of 50 |
| Upload strategy | **Throttled background, user-configured cap** | Set on first run, auto-resume on failure |
| Friend access model | **All-or-nothing allowlist** | On the list = see everything approved |
| Face consent UX | **Friend self-service at /consent** | Friends opt in/out, upload reference selfie, owner retains override |
| Video player | **Extend existing Lattice MediaPlayer** | hls.js for HLS, key moment markers on scrubber |
| Notifications | **Hook for later** | Design the notification hook now, no notifications at launch |
| Auto-group signals | **Date proximity + tag overlap** | Videos within 48h sharing ≥2 tags → suggested group |
| Bandwidth default | **No default — user-configured** | Pipeline asks on first run |

## Remaining Implementation Questions

| Question | Context | When to Decide |
|----------|---------|----------------|
| Exact LM Studio prompts | System prompts incorporating structured template + few-shot examples from calibration | Phase 1 implementation |
| HLS segment duration | 6s vs 10s segments, tradeoff between seek granularity and request overhead | Phase 0 implementation |
| Review UI components | Which Lattice components to compose for grid/detail views, custom components needed | Phase 1 implementation |
| Face matching threshold | MediaPipe confidence threshold for face recognition against reference images | Phase 3 implementation |
| Notification hook design | Interface shape for the notification hook (email, webhook, future Grove notifications) | Phase 2 design |

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

*Spec Version: 3.0 — All open questions resolved*
*Last Updated: February 2026*
