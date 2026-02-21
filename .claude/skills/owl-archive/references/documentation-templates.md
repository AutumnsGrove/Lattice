# Owl Archive — Documentation Templates

## Help Article Template

```markdown
# [Action-Oriented Title, e.g., "Add Your First Post"]

[1-2 sentences: what this article covers and what the reader will be able to do]

## Before You Begin

- [Prerequisite 1, if any]
- [Prerequisite 2, if any]

## [Step 1: First Major Action]

[1-3 sentences explaining this step]

[Screenshot or code block if helpful]

> 💡 **Tip:** [Optional helpful note]

## [Step 2: Next Action]

[Continue pattern]

## [Step N: Final Action]

[Final step, usually confirms success]

---

**Something not working?** [Link to troubleshooting] or ask a Pathfinder.

_[Optional: earned poetic closer]_
```

## API Documentation Template

```markdown
# [Resource Name] API

[1-2 sentences describing what this resource represents]

## Endpoints

### [METHOD] /api/[path]

[One sentence describing what this endpoint does]

**Authentication:** Required / Optional / None

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `param` | string | Yes | What it controls |

**Request Body:**

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

**Error Codes:**

| Code | Status | Meaning |
|------|--------|---------|
| `GROVE-API-020` | 401 | Not authenticated |
| `GROVE-API-040` | 400 | Validation failed |
```

## Onboarding Flow Template

```markdown
## [Step N of N]: [Step Name]

[Main instruction — one clear action]

[Optional: brief explanation of why this matters]

[Visual or example if helpful]

**Next:** [What happens after this step]
```

## Error Message Template

```
[What happened] (brief, factual)
[What they can do next] (one clear option)
```

**Examples:**

```
Couldn't save your post. Check your connection and try again.
```

```
That page doesn't exist. It may have been moved or deleted.
```

```
Something went wrong on our end. We're looking into it.
Your draft is saved locally.
```

**Avoid:**

```
Oops! 😅 Looks like something went wrong! Don't worry though,
these things happen! Please try again later!
```

## Tooltip Copy Template

Max 1-2 sentences. State what it is or does. No fluff.

**Good examples:**

- "This is your dashboard. Everything you need, nothing you don't."
- "Schedule posts to publish automatically at any time."
- "Your Rooted readers receive this in their email."

## Release Note / Changelog Template

```markdown
## [Month Year] — [Brief Theme]

**New:** [Feature name] — [One sentence: what it does and why it matters]

**Improved:** [Thing that got better] — [What changed]

**Fixed:** [Bug that was squashed] — [What it was doing wrong]
```

## Documentation Level Reference

**Level 1 — Quick/Functional (owl-archive):**
- Help articles
- Error messages
- Tooltips
- Onboarding copy

**Level 2 — Technical Specs (swan-design):**
- Architecture docs
- API references
- Implementation guides

**Level 3 — Narrative (museum-documentation):**
- "How it works" stories
- Codebase tours
- Exhibit-style docs
