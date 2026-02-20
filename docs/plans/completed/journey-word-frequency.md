# Plan: Fun Documentation Statistics for Journey Page

**Issue:** #708 - Add fun documentation statistics to Journey page (word cloud, etc.)
**Status:** Planning
**Created:** 2026-01-27

---

## Executive Summary

Add a "Documentation Insights" section to the Journey page featuring word frequency analysis from Grove's 370 documentation files. This replaces the removed TypeScript migration stat with something more personality-driven and evergreen.

---

## Design Decisions

- **Visualization**: Weighted Tag List - words flow inline with varying sizes based on frequency
- **Word count**: Top 15 words - focused and clean without overwhelming
- **Style**: Warm, readable, matches Grove aesthetic with natural reading flow

---

## Architecture

### Data Flow

```
/.github/workflows/auto-tag.yml
           │
           ▼
scripts/generate/analyze-doc-keywords.ts  ← NEW
           │
           ▼
snapshots/word-frequencies/v{X.Y.Z}.json  ← NEW
           │
           ▼  (sync step)
apps/landing/static/data/word-frequencies/  ← NEW
           │
           ▼
+page.server.ts loads via import.meta.glob()
           │
           ▼
+page.svelte renders word visualization
```

### Why Separate JSON Files (Not CSV)?

1. **Schema stability** - CSV has 18 columns, changing it risks breaking parsers
2. **Flexibility** - JSON can hold arrays of words with metadata
3. **Matches existing pattern** - Summaries already use `summaries/*.json`
4. **Easy iteration** - Can adjust word processing without touching CSV

---

## Implementation

### Phase 1: Word Frequency Script

**File:** `scripts/generate/analyze-doc-keywords.ts`

```typescript
interface WordFrequency {
  word: string;
  count: number;
  pct: number;  // percentage of total non-stopword words
}

interface WordAnalysis {
  version: string;
  timestamp: string;
  topWords: WordFrequency[];  // Top 15 words
  totalWords: number;
  totalFiles: number;
  funFacts: {
    mostUsedWord: string;
    groveCount: number;  // How many times "grove" appears
  };
}
```

**Stopword handling:**
- Use standard English stopwords (the, a, is, are, etc.)
- Also exclude: markdown syntax artifacts, code keywords
- Keep brand words: grove, lattice, heartwood, amber, etc.

**Output:** `snapshots/word-frequencies/v{version}.json`

### Phase 2: Workflow Integration

**File:** `.github/workflows/auto-tag.yml`

Add after `repo-snapshot.sh`:

```yaml
- name: Analyze documentation keywords
  run: |
    npx tsx scripts/generate/analyze-doc-keywords.ts ${{ steps.version.outputs.tag }}

- name: Sync word frequencies
  run: |
    mkdir -p apps/landing/static/data/word-frequencies
    cp snapshots/word-frequencies/*.json apps/landing/static/data/word-frequencies/
```

### Phase 3: Server-Side Loading

**File:** `apps/landing/src/routes/journey/+page.server.ts`

```typescript
// Load word frequency files (similar to summaries)
const wordFrequencyFiles = import.meta.glob(
  '../../../static/data/word-frequencies/*.json',
  { eager: true, import: 'default' }
);

function loadWordFrequencies(): Record<string, WordAnalysis> {
  const frequencies: Record<string, WordAnalysis> = {};
  for (const [path, data] of Object.entries(wordFrequencyFiles)) {
    const version = path.match(/\/(v[\d.]+)\.json$/)?.[1];
    if (version && data) {
      frequencies[version] = data as WordAnalysis;
    }
  }
  return frequencies;
}

export function load() {
  // ... existing code ...
  return {
    snapshots,
    latest,
    growth,
    summaries,
    wordFrequencies: loadWordFrequencies(),  // NEW
  };
}
```

### Phase 4: UI Component

**File:** `apps/landing/src/routes/journey/+page.svelte`

Add new section after "Documentation" and before "Milestones":

```svelte
<!-- Documentation Insights (Word Frequency) -->
{#if data.wordFrequencies[data.latest.label]}
  {@const words = data.wordFrequencies[data.latest.label]}
  <section id="doc-insights" class="mb-16 scroll-mt-24">
    <h2 class="text-sm font-sans text-foreground-faint uppercase tracking-wide mb-6 text-center">
      Documentation Insights
    </h2>

    <div class="card p-6">
      <!-- Weighted tag list - top 15 words -->
      <div class="flex flex-wrap justify-center gap-3">
        {#each words.topWords.slice(0, 15) as word, i}
          <span
            class="inline-block px-3 py-1 rounded-full bg-surface text-foreground-muted
                   transition-all hover:bg-accent/10 hover:text-accent"
            style="font-size: {0.75 + (word.pct / 5)}rem"
          >
            {word.word}
          </span>
        {/each}
      </div>

      <!-- Fun fact -->
      <div class="mt-6 pt-4 border-t border-default text-center">
        <p class="text-sm text-foreground-muted">
          <span class="font-mono text-accent-muted">"{words.funFacts.mostUsedWord}"</span>
          appears {words.topWords[0].count} times across {words.totalFiles} docs
        </p>
      </div>
    </div>
  </section>
{/if}
```

Update TOC sections array:
```typescript
const sections = [
  { id: 'current-growth', text: 'Current Growth' },
  { id: 'code-composition', text: 'Code Composition' },
  { id: 'growth-over-time', text: 'Growth Over Time' },
  { id: 'documentation', text: 'Documentation' },
  { id: 'doc-insights', text: 'Doc Insights' },  // NEW
  { id: 'milestones', text: 'Milestones' },
  { id: 'package-size', text: 'Package Size' }
];
```

---

## Files to Create/Modify

| File | Change |
|------|--------|
| `scripts/generate/analyze-doc-keywords.ts` | **NEW** - Word frequency analysis |
| `.github/workflows/auto-tag.yml` | Add keyword analysis step |
| `apps/landing/src/routes/journey/+page.server.ts` | Load word frequency JSON |
| `apps/landing/src/routes/journey/+page.svelte` | Add visualization section |
| `snapshots/word-frequencies/` | **NEW** directory for JSON output |
| `apps/landing/static/data/word-frequencies/` | **NEW** synced data |

---

## Curio Version (Future)

For tenant-specific word clouds from their blog posts:

1. **Data source**: `posts` table (`markdown_content` column)
2. **Generation**: During Journey Curio summary generation
3. **Storage**: Add `top_keywords` JSON column to `journey_summaries` table
4. **API**: Return in `/api/curios/journey` response

This is separate from the public Journey page and would be implemented when Journey Curio UI is built.

---

## Verification

1. [ ] Script runs successfully on `/docs/**/*.md`
2. [ ] JSON output has correct structure
3. [ ] Workflow generates file on version bump
4. [ ] Landing page displays word visualization
5. [ ] Mobile responsive
6. [ ] Stopwords are properly filtered

---

## Fun Facts We Could Show

- "grove" appears X times (is it really #1?)
- Most documentation-heavy release
- New words that appeared this version
- Ratio of technical vs. personality words
