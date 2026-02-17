# Posts Directory

This directory contains all your blog posts. Each post is a markdown file with frontmatter metadata.

## Post Format

Posts are written in Markdown with YAML frontmatter at the top. The frontmatter contains metadata about the post, while the body contains the actual content.

### Required Frontmatter Fields

- **title**: The title of your post (string)
- **description**: A brief description or excerpt (string)
- **date**: Publication date in YYYY-MM-DD format (string)
- **tags**: Array of tags/categories for the post (array of strings)

### Optional Frontmatter Fields

- **hero**: URL or path to a hero/banner image (string)
- **font**: Custom font setting for the post (string)

## Example Post Structure

Create a new file like `my-first-post.md`:

```markdown
---
title: "My First Blog Post"
description: "This is my first post using Lattice. It's going to be amazing!"
date: "2025-12-01"
tags: ["blog", "introduction", "first-post"]
hero: "/images/my-hero-image.jpg"
font: "serif"
---

# Welcome to My Blog

This is the main content of your blog post. You can use all standard Markdown formatting:

- **Bold text**
- _Italic text_
- [Links](https://example.com)
- Images
- Code blocks
- And much more!

## Adding More Content

Write your post content here using Markdown syntax. The Lattice will automatically render it beautifully.

### Code Examples

You can include code blocks:

\`\`\`javascript
const greeting = "Hello, Grove!";
console.log(greeting);
\`\`\`

Happy blogging!
```

## File Naming

- Use lowercase filenames
- Use hyphens to separate words
- Use `.md` extension
- Example: `my-awesome-post.md`

## Tips

- Keep your descriptions concise (1-2 sentences)
- Use relevant tags to help organize your content
- Always include a publication date
- Hero images enhance visual appeal but are optional
