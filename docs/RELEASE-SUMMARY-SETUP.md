# Release Summary Generation - Setup Guide

## Quick Setup (Required for Production)

The release summary feature uses **DeepSeek V3.2** via OpenRouter to generate meaningful summaries of each version release. This costs about **$0.0005 per release** (~2.5 cents/year for 50 releases).

### Step 1: Get OpenRouter API Key

1. Visit https://openrouter.ai/
2. Sign up or log in (Google/GitHub login available)
3. Go to https://openrouter.ai/keys
4. Click **"Create Key"**
5. Copy the key (starts with `sk-or-v1-...`)

### Step 2: Add to GitHub Secrets

1. Go to https://github.com/AutumnsGrove/GroveEngine
2. Navigate to: **Settings → Secrets and variables → Actions**
3. Click **"New repository secret"**
4. Name: `OPENROUTER_API_KEY`
5. Value: Paste your API key from Step 1
6. Click **"Add secret"**

### Step 3: Test (Optional)

Test locally before relying on automation:

```bash
# Export your API key
export OPENROUTER_API_KEY="sk-or-v1-..."

# Test summary generation
./scripts/generate-release-summary.sh v0.9.0

# Check the output
cat snapshots/summaries/v0.9.0.json
```

## How It Works

When you bump the version in `packages/engine/package.json` and push to main:

1. ✅ GitHub Action auto-tags the release
2. ✅ Generates repository snapshot (existing)
3. ✅ **NEW:** Generates release summary using DeepSeek V3.2
4. ✅ Syncs summaries to landing page
5. ✅ Commits and pushes changes

Summaries appear on: https://grove.place/journey

## Fallback Behavior

If the API key is missing or the call fails:
- ⚠️ Warning logged in GitHub Actions
- ✅ Basic summary generated (no LLM)
- ✅ Workflow continues successfully
- 📝 Can regenerate manually later

## Cost Tracking

Monitor your usage at: https://openrouter.ai/activity

Expected costs:
- Per release: ~$0.0005
- Per year (50 releases): ~$0.025
- First 10 releases: ~$0.005 (half a penny)

## Manual Operations

### Regenerate a Single Summary

```bash
export OPENROUTER_API_KEY="your-key"
./scripts/generate-release-summary.sh v0.9.0
```

### Backfill All Historical Versions

```bash
export OPENROUTER_API_KEY="your-key"
./scripts/backfill-summaries.sh
```

### Sync to Landing Page

```bash
cp -r snapshots/summaries/* landing/static/data/summaries/
```

## Troubleshooting

**Problem:** Summaries not appearing on roadmap page

**Solutions:**
1. Check if `OPENROUTER_API_KEY` is set in GitHub Secrets
2. Look for errors in GitHub Actions logs
3. Verify files exist in `snapshots/summaries/`
4. Check `landing/static/data/summaries/` was synced
5. Regenerate manually if needed

**Problem:** Low quality summaries

**Solution:** Edit the prompt in `scripts/generate-release-summary.sh` or switch models in the script (see docs/specs/release-summaries-spec.md for alternatives)

## More Info

Full technical specification: `docs/specs/release-summaries-spec.md`
