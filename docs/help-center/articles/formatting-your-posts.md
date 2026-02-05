---
title: Formatting Your Posts
description: Markdown syntax and formatting options for your writing
category: help
section: customization
lastUpdated: '2025-12-24'
keywords:
  - markdown
  - formatting
  - bold
  - italic
  - links
  - lists
  - headers
  - code
  - blockquotes
order: 2
---

# Formatting Your Posts

Grove uses Markdown for formatting: a simple way to style text that's been around since 2004. If you've used Reddit, GitHub, Discord, or Notion, you've probably seen it before.

Here's everything you need to make your posts look exactly how you want.

## The basics

### Bold and italic

```markdown
**bold text**
*italic text*
***bold and italic***
```

Renders as:

- **bold text**
- *italic text*
- ***bold and italic***

### Headers

Headers structure your post and create hierarchy. Use `#` symbols:

```markdown
# Main Title
## Section Header
### Subsection
#### Smaller heading
```

One `#` is the largest. Each additional `#` makes it smaller. Most posts use `##` for main sections and `###` for subsections.

### Links

```markdown
[link text](https://example.com)
```

Example: `[Grove](https://grove.place)` becomes [Grove](https://grove.place).

For a plain URL that's also clickable, just paste it—Grove auto-links URLs.

### Lists

**Unordered lists** use `-`, `*`, or `+`:

```markdown
- First item
- Second item
- Third item
```

**Ordered lists** use numbers:

```markdown
1. First step
2. Second step
3. Third step
```

**Nested lists** use indentation (two spaces or a tab):

```markdown
- Main item
  - Sub-item
  - Another sub-item
- Next main item
```

## Quotes and callouts

### Blockquotes

Use `>` for quotes:

```markdown
> This is a quote from someone wise.
```

Multi-line quotes:

```markdown
> First line of the quote.
> Second line continues here.
>
> A new paragraph in the same quote.
```

### Horizontal rules

Three or more dashes create a divider:

```markdown
---
```

Useful for separating sections or creating visual breaks.

## Code

### Inline code

Wrap text in backticks for inline code: `` `like this` ``.

Good for mentioning function names, keyboard shortcuts, or technical terms: Press `Ctrl+S` to save.

### Code blocks

Triple backticks create code blocks:

````markdown
```
function hello() {
  console.log("Hello, world!");
}
```
````

Add a language name for syntax highlighting:

````markdown
```javascript
function hello() {
  console.log("Hello, world!");
}
```
````

Grove supports syntax highlighting for many languages: javascript, python, css, html, bash, json, markdown, and more.

## Advanced formatting

### Strikethrough

```markdown
~~crossed out text~~
```

Renders as: ~~crossed out text~~

### Task lists

```markdown
- [ ] Unchecked task
- [x] Completed task
```

Creates interactive checkboxes, useful for to-do lists or checklists in your posts.

### Tables

```markdown
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

Tables can be tricky to format by hand. The editor preview helps you see if it's rendering correctly.

### Footnotes

```markdown
Here's a sentence with a footnote.[^1]

[^1]: This is the footnote content.
```

Footnotes appear at the bottom of your post, linked from where you reference them.

## Images

See [[media|Adding Images and Media]] for the full guide. The short version:

```markdown
![Alt text description](image-url.jpg)
```

You don't need to write this manually—just drag an image into the editor or use the upload button.

## Tips for readable posts

**Use headers generously.** They help readers scan and navigate longer pieces.

**Keep paragraphs short.** Two to four sentences is often ideal for web reading.

**Leave blank lines.** In Markdown, a blank line creates a new paragraph. Text without blank lines runs together.

**Preview often.** The editor shows you exactly how your post will look. Use it.

## What if I forget?

The editor toolbar has buttons for common formatting. Click them to insert the Markdown syntax. Over time, you'll memorize the ones you use most.

And honestly? For most posts, you only need:
- `**bold**` and `*italic*`
- `## Headers`
- `[links](url)`
- `-` for lists

Everything else is there when you need it.

---

*Markdown is designed to be readable even in its raw form. What you write is almost what you get.*
