---
title: Flow — The Writing Sanctuary
description: The immersive Markdown editor where words take shape
category: specs
specCategory: platform-services
icon: drafting-compass
lastUpdated: "2026-01-25"
aliases: []
tags:
  - markdown-editor
  - writing
  - arbor
  - creativity
---

```
              .     .    .      .
           .    ~~~~~~~~~~~    .
         .   ~~╱ ~~~~~~~~~~~~ .
       .    ~~╱   ~~~~~~~~~~~~   .
            ~~╱      ~~~~~~~~~~~
             ╱         ~~~~~~~~
           .╱.   .   .   ~~~~~~ .
          . ╱ .       .   ~~~~  .
            ╱              ~~
           ╱    words find
          ╱      their way
         ╱
```

> _Where the current carries you, and the only sound is the rhythm of your thoughts._

---

# Flow: The Writing Sanctuary

> _A place to lose yourself in words._

Flow is Grove's immersive Markdown editor—the space inside Arbor where Wanderers compose their blog posts. It's not just a text field with formatting buttons. It's a sanctuary designed around one belief: **the best writing happens when the world fades away.**

**Public Name:** Flow
**Internal Name:** MarkdownEditor
**Location:** Arbor (Admin Panel)
**Last Updated:** January 2026

Like water finding its path through stone, Flow follows the contours of how writers actually work. Some need to see their words rendered. Some need the raw syntax. Some need to talk through their ideas before they can type them. Flow accommodates all of this—and then steps back.

The name captures that timeless state every writer seeks: when hours pass like minutes, when the cursor moves as fast as thought, when you look up and realize you've written something true.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Editor Modes](#editor-modes)
4. [Zen Mode](#zen-mode)
5. [Fireside Mode](#fireside-mode)
6. [Draft Management](#draft-management)
7. [Image Handling](#image-handling)
8. [Floating Toolbar](#floating-toolbar)
9. [Status Bar](#status-bar)
10. [Keyboard Shortcuts](#keyboard-shortcuts)
11. [Markdown Support](#markdown-support)
12. [Accessibility](#accessibility)
13. [Implementation Notes](#implementation-notes)

---

## Overview

### What Flow Is

Flow is the Markdown editor embedded in every Grove admin panel. When a Wanderer clicks "New Post" or edits an existing one, they enter Flow.

### What Flow Provides

| Feature                  | Purpose                                               |
| ------------------------ | ----------------------------------------------------- |
| **Three editor modes**   | Write (source), Split (50/50), Preview (read-only)    |
| **Zen mode**             | Full-screen distraction-free writing                  |
| **Typewriter scrolling** | Centers cursor vertically for focused writing         |
| **Draft auto-save**      | Never lose work—localStorage backup every few seconds |
| **Image upload**         | Drag/drop or paste images directly into content       |
| **Floating toolbar**     | Medium-style formatting on text selection             |
| **Status bar**           | Word count, line count, reading time, save status     |
| **Fireside mode**        | Conversational drafting via Wisp integration          |

### Who Uses Flow

Every Grove Wanderer who publishes content. Flow handles:

- Blog posts (primary use case)
- Static pages (About, Contact, etc.)
- Any long-form Markdown content

---

## Core Principles

### Distraction-Free by Design

Flow hides complexity until you need it:

- Toolbar appears only when text is selected
- Status bar shows information without demanding attention
- Zen mode removes everything but your words

### Writer-First, Features-Second

Every feature serves the writing experience:

- Auto-save eliminates anxiety about losing work
- Mode switching is instant (no page reloads)
- Keyboard shortcuts match what writers already know

### Immersive, Not Overwhelming

Flow creates focus without feeling clinical:

- Monospace font for the editor (JetBrains Mono)
- Proportional font for preview (system sans-serif)
- Subtle visual feedback (current line highlighting, save indicators)
- No flashing notifications or attention-grabbing elements

### Your Voice, Your Way

Flow accommodates different writing styles:

- **Raw markdown writers**: Stay in Write mode, see your syntax
- **Visual thinkers**: Use Split mode to see rendered output
- **Reviewers**: Preview mode for read-through before publish
- **Conversation starters**: Fireside mode for those who freeze at blank pages

---

## Editor Modes

Flow offers three distinct modes for different stages of writing:

### Write Mode (Source Only)

```
┌─────────────────────────────────────────────────────────┐
│  [Write] [Split] [Preview]                              │
├─────────────────────────────────────────────────────────┤
│  1 │ # My Post Title                                    │
│  2 │                                                    │
│  3 │ Here's the first paragraph of my post.            │
│  4 │ I can see my markdown **syntax** as I type.       │
│  5 │                                                    │
│  6 │ ## A Subheading                                    │
│  7 │                                                    │
│  8 │ More content here...                               │
├─────────────────────────────────────────────────────────┤
│  Ln 4, Col 23 | 8 lines | 24 words | ~1 min read       │
└─────────────────────────────────────────────────────────┘
```

- Full-width editor with line numbers
- Best for: Markdown-fluent writers, focused drafting
- Shortcut: `Cmd/Ctrl + 1`

### Split Mode (Source + Preview)

```
┌──────────────────────────┬──────────────────────────────┐
│  [Write] [Split] [Preview│:: live preview               │
├──────────────────────────┼──────────────────────────────┤
│  1 │ # My Post Title     │  My Post Title               │
│  2 │                     │                              │
│  3 │ Here's the first    │  Here's the first paragraph  │
│  4 │ paragraph...        │  of my post. I can see my    │
│  5 │                     │  markdown syntax as I type.  │
│  6 │ ## A Subheading     │                              │
│  7 │                     │  A Subheading                │
│  8 │ More content...     │  ─────────────               │
├──────────────────────────┴──────────────────────────────┤
│  Ln 4, Col 23 | 8 lines | 24 words | ~1 min read       │
└─────────────────────────────────────────────────────────┘
```

- 50/50 split between editor and rendered preview
- Synchronized scrolling between panes
- Best for: Learning markdown, seeing formatting results
- Shortcut: `Cmd/Ctrl + 2`

### Preview Mode (Read-Only)

```
┌─────────────────────────────────────────────────────────┐
│  [Write] [Split] [Preview]     :: preview (read-only)   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│          My Post Title                                  │
│                                                         │
│    Here's the first paragraph of my post. I can see     │
│    my markdown syntax as I type.                        │
│                                                         │
│          A Subheading                                   │
│          ─────────────                                  │
│                                                         │
│    More content here...                                 │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Preview | 8 lines | 24 words | ~1 min read            │
└─────────────────────────────────────────────────────────┘
```

- Full-width rendered preview, centered for readability
- Read-only (cannot edit in this mode)
- Best for: Final review before publishing
- Shortcut: `Cmd/Ctrl + 3`

### Mode Cycling

Press `Cmd/Ctrl + P` to cycle through modes: Write → Split → Preview → Write

---

## Zen Mode

### The Full-Screen Experience

Zen mode strips away everything except your words. No sidebar. No distractions. Just you and the text.

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                                                                     │
│     1 │ The cursor sits here, waiting.                              │
│     2 │                                                             │
│     3 │ In zen mode, the world fades.                               │
│     4 │ There's only the rhythm of keys,                            │
│     5 │ the dance of thoughts becoming words.█                      │
│     6 │                                                             │
│     7 │                                                             │
│                                                                     │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Ln 5, Col 42 | Typewriter | 7 lines | 23 words                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Features in Zen Mode

| Feature                  | Behavior                                             |
| ------------------------ | ---------------------------------------------------- |
| **Full screen**          | Editor fills entire viewport                         |
| **Typewriter scrolling** | Automatically enabled—cursor stays centered          |
| **Toolbar**              | Still accessible but faded (30% opacity until hover) |
| **Status bar**           | Still accessible but faded (50% opacity until hover) |
| **Exit**                 | Press `Escape` or click minimize button              |

### Entering Zen Mode

- Keyboard: `Cmd/Ctrl + Shift + Enter`
- Button: Focus icon in toolbar (becomes minimize icon when active)

### Typewriter Scrolling

When enabled, the cursor line stays vertically centered in the viewport. As you type, the text scrolls up to keep your focus point stable.

```
                    ┌───────────────────────┐
   scrolls up →     │  Previous lines...    │
                    │  Previous lines...    │
                    │  Previous lines...    │
   cursor always →  │  Current line █       │  ← always centered
                    │  (blank below)        │
                    │                       │
                    │                       │
                    └───────────────────────┘
```

This mimics the experience of a typewriter, where your eyes stay in one place while the paper moves.

---

## Fireside Mode

### What It Is

Fireside is a conversational writing mode powered by [Wisp](/knowledge/specs/wisp-spec). Instead of facing a blank page, you have a conversation with Wisp, and your words get organized into a draft.

> _A good listener, not a ghostwriter._

### When It's Available

Fireside mode appears only when the editor is empty. If you already have content, the Fireside button is hidden—it's designed for starting fresh, not augmenting existing work.

### How It Works

1. Click the flame icon or press `Cmd/Ctrl + Shift + F`
2. Wisp asks a thoughtful opening question
3. You respond naturally, as if talking to a friend
4. After 3+ exchanges with enough substance, "Ready to draft" becomes available
5. Wisp organizes _your words_ into a cohesive post
6. You review, edit, and decide whether to publish

### The Transparency Marker

Every post created through Fireside includes:

```markdown
_~ written fireside with Wisp ~_
```

This marker is:

- Appended automatically at publish time
- Stored in post metadata (`fireside_assisted: true`)
- Cannot be removed (enforced at API level)
- Visible to all readers

This maintains Grove's commitment to transparency about AI assistance while making clear the words are the author's own.

### Learn More

For complete Fireside documentation including guardrails, API details, and philosophy, see the [Wisp Specification → Fireside Mode](/knowledge/specs/wisp-spec#fireside-mode).

---

## Draft Management

### Auto-Save

Flow automatically saves drafts to localStorage as you type:

- **Save interval**: Debounced (waits for pause in typing)
- **Storage key**: Based on post slug or `new-post`
- **What's saved**: Content, timestamp, word count

### Draft Recovery

When you return to an editor with an unsaved draft:

```
┌─────────────────────────────────────────────────────────────┐
│  ~ Unsaved draft found                                      │
│    Saved January 25, 2026, 3:42 PM                          │
│                                                             │
│    [restore]  [discard]                                     │
└─────────────────────────────────────────────────────────────┘
```

- **Restore**: Loads the saved draft content
- **Discard**: Clears localStorage, starts fresh

### Draft Status Indicators

The status bar shows draft state:

| Indicator         | Meaning                               |
| ----------------- | ------------------------------------- |
| `Saving draft...` | Currently writing to localStorage     |
| `Draft saved ✓`   | Successfully saved                    |
| `Unsaved`         | Changes exist that haven't been saved |
| `Saving...`       | Server save in progress               |

---

## Image Handling

### Drag and Drop

Drag images directly into the editor:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│              ┌─────────────────────────┐                    │
│              │         +               │                    │
│              │   Drop image to upload  │                    │
│              └─────────────────────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Paste from Clipboard

Copy an image and paste (`Cmd/Ctrl + V`) directly into the editor. Flow:

1. Detects the clipboard contains an image
2. Creates a timestamped filename (`pasted-1706234567890.png`)
3. Uploads to R2 storage
4. Inserts markdown at cursor position

### Upload Flow

1. File detected (drag, drop, or paste)
2. Client validates type (images only) and size
3. Upload begins with progress indicator
4. Image stored in R2 under `/blog/` folder
5. Markdown inserted: `![alt text](https://cdn.grove.place/...)`

### Upload Status

```
┌─────────────────────────────────────────┐
│  ◌ Uploading my-image.png...            │
└─────────────────────────────────────────┘
```

Errors display briefly:

```
┌─────────────────────────────────────────┐
│  ! Upload failed: File too large        │
└─────────────────────────────────────────┘
```

---

## Floating Toolbar

### Medium-Style Formatting

When you select text, a floating toolbar appears above the selection:

```
           ┌────────────────────────────────────┐
           │  B   I   </>   |   🔗   |   H1  H2  H3  │
           └────────────────────────────────────┘
                           ▼
        "This is some selected text that I want to format"
```

### Available Actions

| Button  | Action      | Result               |
| ------- | ----------- | -------------------- |
| **B**   | Bold        | `**text**`           |
| **I**   | Italic      | `_text_`             |
| **</>** | Inline code | `` `text` ``         |
| **🔗**  | Link        | `[text](url)`        |
| **H1**  | Heading 1   | `# ` at line start   |
| **H2**  | Heading 2   | `## ` at line start  |
| **H3**  | Heading 3   | `### ` at line start |

### Behavior

- Appears only when text is selected
- Positioned above selection, centered horizontally
- Stays within viewport bounds (won't clip off edges)
- Fades in with subtle animation
- Disappears when selection is cleared or clicked outside

---

## Status Bar

The status bar provides at-a-glance information without demanding attention:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Ln 42, Col 17 | 156 lines | 847 words | ~4 min read  |  Split | ✓ │
└─────────────────────────────────────────────────────────────────────┘
```

### Left Side (Statistics)

| Stat          | Description                      |
| ------------- | -------------------------------- |
| `Ln X, Col Y` | Current cursor position          |
| `N lines`     | Total line count                 |
| `N words`     | Total word count                 |
| `~N min read` | Estimated reading time (200 wpm) |

### Right Side (State)

| Indicator                      | Meaning                        |
| ------------------------------ | ------------------------------ |
| `Source` / `Split` / `Preview` | Current editor mode            |
| `Typewriter`                   | Typewriter scrolling is active |
| `Saving...`                    | Server save in progress        |
| `Saving draft...`              | localStorage save in progress  |
| `Draft saved ✓`                | Draft successfully saved       |
| `Unsaved`                      | Unsaved changes exist          |
| `Markdown`                     | No special state (default)     |

---

## Keyboard Shortcuts

### Text Formatting

| Shortcut       | Action            |
| -------------- | ----------------- |
| `Cmd/Ctrl + B` | Bold (`**text**`) |
| `Cmd/Ctrl + I` | Italic (`_text_`) |

### Editor Control

| Shortcut                   | Action                        |
| -------------------------- | ----------------------------- |
| `Cmd/Ctrl + S`             | Save to server                |
| `Cmd/Ctrl + 1`             | Switch to Write mode          |
| `Cmd/Ctrl + 2`             | Switch to Split mode          |
| `Cmd/Ctrl + 3`             | Switch to Preview mode        |
| `Cmd/Ctrl + P`             | Cycle through modes           |
| `Cmd/Ctrl + Shift + Enter` | Toggle Zen mode               |
| `Cmd/Ctrl + Shift + F`     | Toggle Fireside mode          |
| `Tab`                      | Insert 2 spaces (indentation) |
| `Escape`                   | Exit Zen mode / Exit Fireside |

### Navigation

| Shortcut                 | Action                                 |
| ------------------------ | -------------------------------------- |
| Standard text navigation | Works as expected                      |
| Scroll sync              | Preview follows editor scroll position |

---

## Markdown Support

Flow uses [markdown-it](https://github.com/markdown-it/markdown-it) for rendering with the following configuration:

### Supported Features

| Feature              | Syntax                     | Rendered            |
| -------------------- | -------------------------- | ------------------- |
| **Bold**             | `**text**`                 | **text**            |
| **Italic**           | `_text_` or `*text*`       | _text_              |
| **Headings**         | `# H1` through `###### H6` | Proper hierarchy    |
| **Links**            | `[text](url)`              | Clickable link      |
| **Images**           | `![alt](url)`              | Rendered image      |
| **Code (inline)**    | `` `code` ``               | Monospace           |
| **Code blocks**      | ` ``` ` fenced             | Syntax highlighting |
| **Blockquotes**      | `> quote`                  | Indented quote      |
| **Lists**            | `- item` or `1. item`      | Bulleted/numbered   |
| **Horizontal rules** | `---`                      | Divider line        |
| **Auto-linking**     | URLs become clickable      | Enabled             |

### What's Disabled

| Feature  | Reason                    |
| -------- | ------------------------- |
| Raw HTML | Security (XSS prevention) |

All content is sanitized through `sanitizeMarkdown()` before rendering to prevent XSS attacks.

---

## Accessibility

### Keyboard Navigation

- All functionality accessible via keyboard
- Tab through toolbar buttons
- Arrow keys for standard text navigation
- Escape to exit overlay states

### Screen Reader Support

| Element          | Announcement                                                        |
| ---------------- | ------------------------------------------------------------------- |
| Editor           | `role="application"` with label "Markdown editor with live preview" |
| Floating toolbar | `role="toolbar"` with label "Text formatting toolbar"               |
| Line numbers     | `aria-hidden="true"` (decorative)                                   |
| Mode buttons     | Descriptive `aria-label` for each                                   |

### Reduced Motion

Respects `prefers-reduced-motion`:

- Toolbar animations disabled
- Scroll behavior uses `auto` instead of `smooth`

### Visual Considerations

- Current line number highlighted
- Sufficient color contrast in both light and dark modes
- Focus indicators on interactive elements
- No flashing or rapidly changing content

---

## Implementation Notes

### Key Files

| File                                                         | Purpose                                                                   |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `libs/engine/src/lib/components/admin/MarkdownEditor.svelte` | Main editor component (~1700 lines)                                       |
| ~~`FloatingToolbar.svelte`~~                                 | Removed — formatting buttons moved to MarkdownEditor's persistent toolbar |
| `libs/engine/src/lib/components/admin/FiresideChat.svelte`   | Fireside conversation UI                                                  |
| `libs/engine/src/lib/components/admin/composables/`          | Editor composables (draft manager, themes)                                |

### Component Architecture

```
MarkdownEditor.svelte
├── FiresideChat.svelte (conditional, replaces editor area)
├── ContentWithGutter.svelte (in full preview modal)
└── Internal:
    ├── Toolbar (formatting buttons, mode switching, zen toggle)
    ├── Editor panel (textarea + line numbers)
    ├── Preview panel (rendered markdown)
    └── Status bar (statistics + state)
```

### Composables

| Composable        | Purpose                               |
| ----------------- | ------------------------------------- |
| `useDraftManager` | localStorage draft saving/restoration |
| `useEditorTheme`  | Editor theme management               |

### State Management

Flow uses Svelte 5 runes (`$state`, `$derived`, `$effect`) for reactive state:

- `content` - The markdown content (bindable prop)
- `editorMode` - Current mode (write/split/preview)
- `isZenMode` - Zen mode active state
- `isFiresideMode` - Fireside mode active state
- `cursorLine` / `cursorCol` - Cursor position tracking
- `wordCount` / `lineCount` / `readingTime` - Derived statistics

---

## Related Specifications

- [Arbor Specification](/knowledge/specs/arbor-spec) - The admin panel where Flow lives
- [Wisp Specification](/knowledge/specs/wisp-spec) - Writing assistant and Fireside mode

---

_Spec Version: 1.0_
_Created: January 2026_
_Status: Documentation of existing feature_
