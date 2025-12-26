# Wisp Migration Prompt for AutumnsGrove

> **Target:** AutumnsGrove project
> **Purpose:** Migrate from old AI Writing Assistant to the new Wisp system from GroveEngine
> **Status:** Ready for implementation

---

## Overview

Migrate AutumnsGrove from the local AIWritingPanel + Anthropic Claude implementation to use the new **Wisp** writing assistant from `@autumnsgrove/groveengine`. Wisp uses DeepSeek V3.2 via Fireworks AI for privacy-first, cost-effective analysis.

---

## Files to Modify

### 1. Update Component Index (`src/lib/components/index.js`)

**Change:**
```javascript
// REMOVE this line:
export { default as AIWritingPanel } from "./custom/AIWritingPanel.svelte";

// ADD this line (import from groveengine):
export { WispPanel, WispButton } from "@autumnsgrove/groveengine";
```

---

### 2. Update Settings Page (`src/routes/admin/settings/+page.svelte`)

**Rename variables:**
```javascript
// OLD:
let aiEnabled = $state(false);
let aiModel = $state('haiku');
let savingAI = $state(false);
let aiMessage = $state('');
let loadingAI = $state(true);
let aiUsage = $state({ requests: 0, tokens: 0, cost: 0 });

// NEW:
let wispEnabled = $state(false);
let wispMode = $state('quick');
let savingWisp = $state(false);
let wispMessage = $state('');
let loadingWisp = $state(true);
let wispUsage = $state({ requests: 0, tokens: 0, cost: 0 });
```

**Update API endpoint:**
```javascript
// OLD:
const usage = await api.get('/api/ai/writing-assist');

// NEW:
const usage = await api.get('/api/grove/wisp');
```

**Update setting keys:**
```javascript
// OLD keys:
'ai_assistant_enabled'
'ai_model'

// NEW keys:
'wisp_enabled'
'wisp_mode'
```

**Update section heading:**
```svelte
<!-- OLD: -->
<h2>AI Writing Assistant</h2>
<p class="section-description">
  Get grammar, tone, and readability feedback on your writing. Powered by Claude AI.
</p>

<!-- NEW: -->
<h2>Wisp</h2>
<p class="section-description">
  A gentle writing helper - grammar, tone, and readability. Never generation, never expansion.
</p>
```

**Update model selector to mode selector:**
```svelte
<!-- OLD: -->
<div class="ai-model-selector">
  <label for="ai-model">Preferred Model</label>
  <select id="ai-model" value={aiModel} onchange={changeAIModel} disabled={savingAI}>
    <option value="haiku">Claude Haiku (faster, cheaper)</option>
    <option value="sonnet">Claude Sonnet (more thorough)</option>
  </select>
</div>

<!-- NEW: -->
<div class="wisp-mode-selector">
  <label for="wisp-mode">Analysis Mode</label>
  <select id="wisp-mode" value={wispMode} onchange={changeWispMode} disabled={savingWisp}>
    <option value="quick">Quick (fast iteration)</option>
    <option value="thorough">Thorough (comprehensive)</option>
  </select>
</div>
```

**Update ASCII vibe:**
```svelte
<!-- Replace the ai-vibe content with: -->
<pre class="wisp-vibe">
   .  *  .    .  *
 .    ~    .      .
    / \    *  .
   /   \  .    .
  ~~~~~~~\______
 ~~~~~~~~~~~~~~~~~~~
  a helper, not a writer</pre>
```

**Update info text:**
```svelte
<!-- OLD: -->
<p class="ai-note">
  Your content is sent to Anthropic for analysis.
  The assistant will never generate or expand content.
</p>

<!-- NEW: -->
<p class="wisp-note">
  Analyzed with zero data retention. Your words are never stored.
  A wisp of help - nothing more, nothing less.
</p>
```

---

### 3. Find and Update MarkdownEditor Integration

Locate where `AIWritingPanel` is used (likely in the markdown editor or post editor) and update:

```svelte
<!-- OLD: -->
<AIWritingPanel
  content={markdownContent}
  enabled={aiEnabled}
  postTitle={title}
  postSlug={slug}
  onApplyFix={(original, fix) => { /* apply */ }}
/>

<!-- NEW: -->
<WispPanel
  content={markdownContent}
  enabled={wispEnabled}
  postTitle={title}
  postSlug={slug}
  onApplyFix={(original, fix) => { /* apply */ }}
/>
```

---

### 4. Delete Old Files

After migration is complete and tested:

```bash
rm src/lib/components/custom/AIWritingPanel.svelte
rm src/lib/config/ai-models.js
rm -rf src/routes/api/ai/writing-assist/
```

---

### 5. Database Migration

The old `ai_writing_requests` table should be migrated to `wisp_requests`. The new API will use `/api/grove/wisp` which talks to the engine's endpoint.

**Option A: Keep old data**
```sql
-- Rename the table
ALTER TABLE ai_writing_requests RENAME TO wisp_requests;

-- Update column if needed (action values should work as-is)
```

**Option B: Fresh start**
```sql
-- Just let the new migration create wisp_requests
-- Old data in ai_writing_requests can be archived or dropped
```

---

### 6. Update package.json (if needed)

Ensure `@autumnsgrove/groveengine` is updated to the version that includes Wisp:

```json
{
  "dependencies": {
    "@autumnsgrove/groveengine": "^X.X.X"
  }
}
```

---

## Key Differences: Old vs New

| Aspect | Old (AI Writing Assistant) | New (Wisp) |
|--------|---------------------------|------------|
| Model | Claude Haiku/Sonnet (Anthropic) | DeepSeek V3.2 (Fireworks AI) |
| Privacy | Content sent to Anthropic | Zero Data Retention (ZDR) |
| Modes | Model selection | Prompt depth (quick/thorough) |
| API | `/api/ai/writing-assist` | `/api/grove/wisp` |
| Component | Local `AIWritingPanel.svelte` | Engine `WispPanel.svelte` |
| Cost | ~$0.25-$1 per request | ~$0.001 per request |

---

## Verification Checklist

After migration:

- [ ] Settings page loads without errors
- [ ] Wisp toggle saves and persists
- [ ] Mode selector works
- [ ] Usage stats display correctly
- [ ] WispPanel renders in editor
- [ ] Grammar analysis works
- [ ] Tone analysis works
- [ ] Readability analysis works (local, no API call)
- [ ] Apply fix functionality works
- [ ] Old files are removed
- [ ] No console errors

---

## Philosophy Reminder

Wisp is:
- **A helper, not a writer** - never generates content
- **Off by default** - user must opt in
- **Privacy-first** - zero data retention
- **Ephemeral** - appears when needed, fades when not

*Like a will-o'-the-wisp in the forest - light, airy, guiding without forcing.*

---

*Created: December 2025*
*For use by: AutumnsGrove migration agent*
