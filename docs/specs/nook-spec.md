---
aliases: []
date created: Saturday, January 4th 2026
date modified: Saturday, January 4th 2026
source: https://github.com/AutumnsGrove/Nook/blob/main/nook-spec.md
tags:
  - video-sharing
  - privacy
  - ai-processing
  - friends
type: tech-spec
---

```
      ~~~~~~~~~~~~~
     |             |
     |    🌿  🌿    |
     |             |
     |   .----.    |
     |  /      \   |
     | |  🪵🪵  |  |
     | |  🪵🪵  |  |
     |  \______/   |
     |      💡      |
     |   cozy &    |
     |    warm     |
      ~~~~~~~~~~~~~
```

> *Gather close. Share quietly.*

---

# Nook — Private Video Sharing

> *A cozy corner of the grove. Videos for close friends.*

Where you share moments with the people who matter. Not a YouTube channel, not a public archive. Just a tucked-away space where your closest friends can watch the videos you've been meaning to share.

**Public Name:** Nook
**Internal Name:** GroveNook
**Domain:** `nook.grove.place`
**Repository:** [AutumnsGrove/Nook](https://github.com/AutumnsGrove/Nook)

A nook is a tucked-away corner, a quiet space set apart from the main room. Somewhere intimate and private.

---

## Overview

Nook is a privacy-focused video sharing platform designed for small, trusted friend groups. It addresses a specific problem: users with extensive personal video libraries who want to share with close friends without uploading to public platforms.

### Goals

- **Privacy-first**: All processing happens locally before content becomes accessible
- **Intimate sharing**: Small, trusted friend groups only
- **AI-powered curation**: Automatic categorization and face detection
- **Zero public exposure**: Not a YouTube channel, not a public archive

### Non-Goals

- Public video hosting
- Social media features
- Viral distribution

---

## Technical Architecture

### Stack

- **Frontend**: SvelteKit
- **Backend**: Cloudflare Workers
- **Storage**: Cloudflare R2
- **Database**: Cloudflare D1
- **Processing**: Local Mac Mini pipeline (Python)

### Local Processing Pipeline

Processing relies on a local Mac Mini using Python tools:
- **Qwen3-VL**: AI categorization
- **MediaPipe**: Face detection
- Compression and progressive MP4 generation

This decentralized approach keeps sensitive video data on local machines during processing.

---

## Privacy Architecture

The system enforces multiple security layers:

1. **Heartwood Authentication**: Centralized auth through Grove's auth system
2. **Allowlist Gate**: Restricts access to approved users only
3. **Non-guessable Storage**: R2 identifiers that can't be enumerated
4. **Authenticated Streaming**: All video routes require authentication
5. **Local Processing**: All AI processing on local hardware, not cloud

### Face Privacy

- Unknown individuals in videos receive automatic blurring
- Consent management lets friends control their appearance in shared content
- Personal moments stay private

---

## Development Roadmap

### Phase 0: Foundation
- Basic authentication
- Manual video uploads
- Simple streaming

### Phase 1: Compression Pipeline
- Progressive MP4 support
- Efficient compression
- Quality optimization

### Phase 2: AI Categorization
- Automatic content categorization
- Public/private/review buckets
- Smart organization

### Phase 3: Face Privacy
- Face detection and tracking
- Automatic blurring of unknown faces
- Consent-level management per person

---

## Cost Structure

Projected monthly costs remain minimal:
- **R2 Storage**: $0.90-$2.25 for 60-150 GB compressed video
- **Local Compute**: Negligible (Mac Mini power)
- **Workers/D1**: Minimal at friend-group scale

**Total**: ~$1-3/month

---

## Integration

- **Heartwood**: Authentication
- **Amber**: Storage management integration (optional)
- **Mycelium**: Future MCP integration for AI agent access

---

*See the full specification at: [AutumnsGrove/Nook](https://github.com/AutumnsGrove/Nook/blob/main/nook-spec.md)*

*Spec Version: 1.0*
*Last Updated: January 2026*
