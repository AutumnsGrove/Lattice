---
title: "Release Summaries — Automated LLM Generation"
description: "Automated generation of meaningful release summaries using LLM analysis of git commits for display on the public roadmap."
category: specs
specCategory: "reference"
icon: filecode
lastUpdated: "2026-01-22"
aliases: []
date created: Tuesday, January 7th 2026
date modified: Tuesday, January 7th 2026
tags:
  - automation
  - releases
  - llm
  - roadmap
type: tech-spec
---

# Release Summaries — Automated LLM Generation

```
    v0.9.0 ───┐
              │  "This release introduces Loam, Grove's new name
    v0.8.6 ───┤   protection system..."
              │
    v0.8.5 ───┤  "Major expansion of the workshop showcase..."
              │
    v0.8.0 ───┘  "Significant infrastructure improvements..."
```

Automatically generates meaningful release summaries using LLM analysis of git commits. Summaries are displayed on the public roadmap to help users understand what changed in each version.

**Purpose:** Transform sparse version metadata into engaging release narratives
**Integration:** GitHub Actions workflow + OpenRouter API
**Cost:** ~$0.001 per release (Claude 3.5 Haiku)

---

## Overview

The Grove roadmap previously displayed only basic version metadata: version number, date, line count, and commit count. This felt sparse and didn't communicate what actually changed in each release.

This system automatically generates 2-4 sentence summaries for each version release by:
1. Extracting commits between version tags
2. Analyzing conventional commit messages
3. Sending to LLM with context about Grove
4. Storing structured summaries as JSON
5. Displaying on the roadmap versions page

---

## Architecture

### Data Flow

```
┌─────────────────┐
│  Version Bump   │  Developer updates packages/engine/package.json
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Auto-tag GH   │  GitHub Action detects version change
│     Action      │
└────────┬────────┘
         │
         ├──────────┐
         │          ▼
         │   ┌──────────────────┐
         │   │ Repo Snapshot    │  Collects metrics (existing)
         │   │ (repo-snapshot)  │
         │   └──────────────────┘
         │
         ▼
┌─────────────────┐
│ Generate        │  NEW: Extract commits, call LLM
│ Summary         │
│ (generate-      │
│  release-       │
│  summary.sh)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Store JSON      │  snapshots/summaries/v0.9.0.json
│ Summary         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sync to Landing │  Copy to landing/static/data/summaries/
│ Static Data     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Roadmap Page    │  /journey displays summaries
│ Displays        │
└─────────────────┘
```

### File Structure

```
GroveEngine/
├── scripts/
│   ├── generate-release-summary.sh    # Core summary generator
│   └── backfill-summaries.sh          # Historical backfill tool
│
├── snapshots/
│   ├── summaries/
│   │   ├── v0.9.0.json                # Generated summaries
│   │   ├── v0.8.6.json
│   │   └── v0.8.5.json
│   └── history.csv                    # Existing metrics
│
├── landing/
│   ├── src/routes/journey/
│   │   └── +page.svelte               # Version history page
│   └── static/data/summaries/         # Synced summaries
│       ├── v0.9.0.json
│       └── ...
│
└── .github/workflows/
    └── auto-tag.yml                    # Integrated workflow
```

---

## Summary JSON Schema

Each version summary is stored as JSON:

```json
{
  "version": "v0.9.0",
  "date": "2026-01-07T02:54:11Z",
  "commitHash": "7e4f237",
  "summary": "This release introduces Loam, Grove's new name protection system...",
  "stats": {
    "totalCommits": 119,
    "features": 45,
    "fixes": 18,
    "refactoring": 12,
    "docs": 8,
    "tests": 5,
    "performance": 2
  },
  "highlights": {
    "features": [
      "Loam name protection system with domain blocklist",
      "Floating icon navigation on workshop page",
      ...
    ],
    "fixes": [
      "Tailwind content paths for engine package",
      "Body scroll cleanup to prevent stuck states",
      ...
    ]
  }
}
```

**Fields:**
- `version`: Version tag (e.g., "v0.9.0")
- `date`: ISO 8601 timestamp of release
- `commitHash`: Short git commit hash
- `summary`: 2-4 sentence narrative (LLM-generated)
- `stats`: Breakdown by conventional commit type
- `highlights`: Top 10 features and fixes (extracted from commits)

---

## LLM Integration

### Provider: OpenRouter

**Why OpenRouter:**
- Cost-effective access to multiple models
- No vendor lock-in (can switch models easily)
- Straightforward API (OpenAI-compatible)
- Pay-as-you-go pricing

**Model:** `deepseek/deepseek-v3.2`
- Cost: ~$0.55 per million tokens (input) / ~$2.20 per million tokens (output)
- Estimated: $0.0005 per release summary
- Quality: Excellent for summarization tasks, competitive with GPT-4
- Speed: ~2-3 seconds per summary

### Prompt Engineering

The prompt sent to the LLM includes:
1. Context about Grove (platform description)
2. Full commit list for the version
3. Instructions for tone and style
4. Length constraints (2-4 sentences)

**Example prompt:**
```
You are analyzing git commits for a release of Grove, a multi-tenant blog
platform built with SvelteKit and Cloudflare Workers.

Here are the commits for version v0.9.0:
[commit list]

Please create a concise 2-4 sentence summary of this release for display on
a public roadmap page. Focus on:
1. Major new features or capabilities
2. Significant improvements or changes
3. Important bug fixes
4. Overall theme or direction of this release

The summary should be in a warm, friendly tone that matches Grove's voice.
Avoid technical jargon where possible. Make it engaging for users to read.

Respond with ONLY the summary text, no additional formatting or labels.
```

### Fallback Behavior

If the LLM API call fails:
1. Script continues with basic summary
2. Basic summary: "Version X includes N features, M fixes, P refactoring changes"
3. GitHub Action doesn't fail (warning only)
4. Summary can be regenerated manually later

---

## GitHub Actions Integration

### Workflow: `.github/workflows/auto-tag.yml`

**New step added after snapshot generation:**

```yaml
- name: Generate release summary
  id: summary
  if: steps.snapshot.outcome == 'success'
  env:
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
  run: |
    TAG="${{ steps.snapshot.outputs.tag_name }}"
    echo "Generating release summary for: $TAG"

    chmod +x ./scripts/generate-release-summary.sh
    ./scripts/generate-release-summary.sh "$TAG" || echo "Warning: Summary generation failed, continuing..."
```

**Required Secret:**
- `OPENROUTER_API_KEY`: OpenRouter API key (set in GitHub repo secrets)

**Sync step updated:**

```yaml
- name: Sync data to landing page
  if: steps.snapshot.outcome == 'success'
  run: |
    mkdir -p landing/static/data/summaries
    cp -r snapshots/summaries/* landing/static/data/summaries/ 2>/dev/null || echo "No summaries to copy"
```

---

## Usage

### Automatic Generation (Production)

Summaries are generated automatically when:
1. Developer bumps version in `packages/engine/package.json`
2. Changes are pushed to `main` branch
3. Auto-tag workflow detects version change
4. Creates git tag (e.g., `v0.9.0`)
5. Generates repository snapshot
6. **Generates release summary** ← NEW
7. Syncs data to landing page
8. Commits and pushes changes

**No manual intervention required.**

### Manual Generation

Generate a summary for a specific version:

```bash
# Generate for specific version (will find previous tag automatically)
./scripts/generate-release-summary.sh v0.9.0

# Generate with explicit previous tag
./scripts/generate-release-summary.sh v0.9.0 v0.8.6

# Generate using commit hashes (if tags don't exist yet)
./scripts/generate-release-summary.sh v0.9.0 d621d9b
```

### Backfilling Historical Versions

Generate summaries for all versions in `history.csv`:

```bash
# Requires OPENROUTER_API_KEY environment variable
export OPENROUTER_API_KEY="your-key-here"

# Generate all missing summaries
./scripts/backfill-summaries.sh

# Sync to landing page
mkdir -p landing/static/data/summaries
cp -r snapshots/summaries/* landing/static/data/summaries/
```

**Note:** Backfilling will process only versions that don't already have summaries (idempotent).

---

## Roadmap Display

### Version History Page

**URL:** `/journey`

**Features:**
- Displays all releases in reverse chronological order
- Shows version number, date, lines of code, commit count
- Displays LLM-generated summary prominently
- Shows stats breakdown (features, fixes, refactoring, etc.)
- Expandable "View detailed changes" section
- Lists top features and fixes extracted from commits

**Data loading:**
1. Fetches `history.csv` for basic metrics
2. Fetches individual JSON summaries for each version
3. Merges data for complete display
4. Gracefully handles missing summaries (shows basic info only)

### Link from Main Roadmap

The main `/roadmap` page includes a prominent link to version history in the hero section.

---

## Cost Analysis

### Per-Release Cost

**LLM API Call:**
- Model: DeepSeek V3.2
- Input tokens: ~500-1000 (prompt + commits)
- Output tokens: ~100-150 (summary)
- Cost: ~$0.0005 per release

**GitHub Actions:**
- Minutes used: +30 seconds per release
- Cost: Free (within GitHub free tier)

### Annual Projection

Assuming 50 releases per year:
- LLM costs: $0.025/year (~2.5 cents)
- GitHub Actions: Free

**Negligible cost impact** for significant UX improvement.

---

## Monitoring & Maintenance

### Success Indicators

1. **Summaries generated**: Check `snapshots/summaries/` directory
2. **Summaries synced**: Check `landing/static/data/summaries/`
3. **Page displays correctly**: Visit `/journey`
4. **No workflow failures**: Check GitHub Actions logs

### Common Issues

**Issue:** Summary generation fails with API error
- **Cause:** Missing or invalid OPENROUTER_API_KEY
- **Fix:** Set secret in GitHub repo settings
- **Fallback:** Basic summary is used, workflow continues

**Issue:** Summary quality is poor
- **Cause:** Prompt needs refinement or model change
- **Fix:** Edit prompt in `generate-release-summary.sh`
- **Re-generate:** Run script manually for that version

**Issue:** Historical versions missing summaries
- **Cause:** Backfill not run yet
- **Fix:** Run `./scripts/backfill-summaries.sh`

---

## Future Enhancements

### Potential Improvements

1. **Editable summaries**: Allow manual editing via admin UI
2. **CHANGELOG.md integration**: Auto-update CHANGELOG with summaries
3. **PR descriptions**: Include PR bodies for more context
4. **Breaking changes detection**: Highlight breaking changes prominently
5. **Release notes emails**: Send summaries to subscribers
6. **Version comparison**: Show diff between any two versions
7. **Search**: Full-text search across all release notes

### Model Alternatives

If cost or quality becomes an issue:

**Current model:**
- `deepseek/deepseek-v3.2` - $0.55/$2.20 per M tokens (~$0.0005/release) ← **In use**

**Cheaper options:**
- `openai/gpt-4o-mini` - $0.15/M tokens (~$0.0002/release)
- `google/gemini-2.0-flash-exp` - Free tier available

**Higher quality (if needed):**
- `anthropic/claude-3.5-sonnet` - $3/M tokens (~$0.003/release)
- `anthropic/claude-3.5-haiku` - $1/M tokens (~$0.001/release)
- `openai/gpt-4o` - $2.5/M tokens (~$0.0025/release)

---

## Testing

### Manual Testing

```bash
# Test without LLM (uses fallback)
unset OPENROUTER_API_KEY
./scripts/generate-release-summary.sh v0.9.0-test

# Test with LLM
export OPENROUTER_API_KEY="your-key"
./scripts/generate-release-summary.sh v0.9.0

# View generated summary
cat snapshots/summaries/v0.9.0.json | jq .

# Test version page (requires dev server)
cd landing
pnpm dev
# Visit http://localhost:5173/journey
```

### Validation Checklist

- [ ] Summary is 2-4 sentences
- [ ] Tone is warm and friendly (Grove voice)
- [ ] Major features are mentioned
- [ ] Avoid excessive technical jargon
- [ ] Stats accurately reflect commit breakdown
- [ ] Highlights list is meaningful (not just commit messages)
- [ ] JSON structure is valid
- [ ] Page displays correctly on mobile and desktop

---

## Security & Privacy

### API Key Management

- OpenRouter API key stored in GitHub Secrets
- Never logged or exposed in workflow output
- Only accessible to GitHub Actions runners

### Data Privacy

- **No user data sent to LLM**: Only git commit messages (public info)
- **No PII**: Commit messages should not contain personal information
- **Retention**: OpenRouter has zero data retention policy

### Rate Limiting

- GitHub Actions has natural rate limit (one release at a time)
- OpenRouter free tier: 10 requests/minute (more than sufficient)
- Script includes error handling and fallback

---

## Documentation Updates

### Files Modified

1. **`.github/workflows/auto-tag.yml`** - Added summary generation step
2. **`landing/src/routes/roadmap/+page.svelte`** - Added link to versions
3. **`landing/src/routes/journey/+page.svelte`** - NEW: Version history page

### Files Created

1. **`scripts/generate-release-summary.sh`** - Core summary generator
2. **`scripts/backfill-summaries.sh`** - Historical backfill tool
3. **`docs/specs/release-summaries-spec.md`** - This specification

---

## Setup Instructions

### 1. Get OpenRouter API Key

1. Visit https://openrouter.ai/
2. Sign up or log in
3. Go to https://openrouter.ai/keys
4. Create a new API key
5. Copy the key (starts with `sk-or-v1-...`)

### 2. Add to GitHub Secrets

1. Go to your GitHub repository
2. Navigate to: **Settings → Secrets and variables → Actions**
3. Click **"New repository secret"**
4. Name: `OPENROUTER_API_KEY`
5. Value: Paste your API key
6. Click **"Add secret"**

### 3. Verify Setup

The workflow will automatically use the key when generating summaries. You can verify by:
- Checking workflow logs for "Generating release summary"
- Looking for generated files in `snapshots/summaries/`
- No error messages about missing API key

**Cost tracking:** OpenRouter dashboard shows usage at https://openrouter.ai/activity

---

*Last Updated: January 2026*
*Model: DeepSeek V3.2 via OpenRouter*
