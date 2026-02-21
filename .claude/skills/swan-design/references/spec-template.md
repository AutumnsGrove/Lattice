# Swan Design — Full Specification Template

## Complete Spec Template

```markdown
---
aliases: []
date created: Monday, January 6th 2026
date modified: Monday, January 6th 2026
tags:
  - primary-domain
  - tech-stack
  - category
type: tech-spec
---

         [ASCII ART HERE — see diagram-patterns.md for examples]

         [poetic tagline in italics]

# [Public Name]: [Brief Description]

> *[Poetic tagline in italics]*

[2-3 sentence description of what this is in the Grove ecosystem]

**Public Name:** [Name]
**Internal Name:** Grove[Name]
**Domain:** `name.grove.place`
**Repository:** [Link if applicable]
**Last Updated:** [Month Year]

[1-2 paragraphs explaining the nature metaphor and how it applies]

---

## Overview

### What This Is

[2-4 sentences covering: purpose, who uses it, what problem it solves]

### Goals

- [Goal 1]
- [Goal 2]
- [Goal 3]

### Non-Goals (Out of Scope)

- [What this deliberately does NOT do]

---

## Architecture

[ASCII flow diagram — required for process-based specs]

```
┌─────────────────────────────────────────────────────────────────────┐
│                         [Component Name]                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  [Part A]    │  │  [Part B]    │  │  [Part C]    │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
└─────────┼─────────────────┼─────────────────┼────────────────────── ┘
          │                 │                 │
          ▼                 ▼                 ▼
```

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Framework | SvelteKit | ... |
| Database | D1 (SQLite) | ... |
| Storage | R2 | ... |

---

## API Reference

### Endpoint: [METHOD] /api/[path]

[One sentence description]

**Request:**
```json
{
  "field": "value"
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors:**

| Code | Status | Meaning |
|------|--------|---------|
| `GROVE-API-020` | 401 | Not authenticated |

---

## Data Schema

```sql
CREATE TABLE [table_name] (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  -- columns...
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

---

## Security Considerations

- [Auth requirements]
- [Data isolation requirements]
- [Specific risks and mitigations]

---

## Implementation Checklist

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

---

*[Closing poetic line — earned, not forced]*
```

## Frontmatter Reference

### Date Format

- `Monday, December 29th 2025`
- `Saturday, January 4th 2026`
- `Friday, February 21st 2026`

**Ordinal suffixes:**
- 1st, 2nd, 3rd, 4th–20th, 21st, 22nd, 23rd, 24th–30th, 31st

### Type Options

- `tech-spec` — Technical specification (most common)
- `implementation-plan` — Step-by-step implementation guide
- `index` — Index/navigation document

### Common Tags

- `lattice`, `heartwood`, `engine` (system components)
- `auth`, `database`, `storage`, `api` (tech categories)
- `feature`, `integration`, `refactor` (work type)

## Voice Checklist

Before finalizing any spec:

- [ ] Frontmatter with all required fields and `aliases: []`
- [ ] Date format: `Weekday, Month Ordinal Year`
- [ ] ASCII art header present and under 20 lines
- [ ] Poetic tagline in italics
- [ ] At least one ASCII flow diagram (if process-based)
- [ ] UI mockups if describing an interface
- [ ] No em-dashes — use periods or commas instead
- [ ] No "not X, but Y" patterns
- [ ] No AI-coded words (robust, seamless, leverage, etc.)
- [ ] Short paragraphs (2-3 sentences)
- [ ] Poetic closer — earned, not forced
- [ ] Implementation checklist at the end
- [ ] Would you want to read this at 2 AM?
