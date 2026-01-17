import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";
import matter from "gray-matter";
import { marked, Renderer, type Tokens } from "marked";
import type {
  Doc,
  DocCategory,
  DocWithContent,
  DocHeader,
} from "$lib/types/docs";

/**
 * Strip HTML tags from text to get plain text content.
 * In marked v17+, the heading renderer receives `text` with rendered HTML
 * (e.g., `Hello <strong>World</strong>` instead of `Hello **World**`).
 * This ensures IDs match between extractHeaders (raw markdown) and the renderer.
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Generate a URL-safe ID from text.
 * Used by both extractHeaders and the heading renderer to ensure consistency.
 */
function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// Custom renderer that adds IDs to headings and wraps code blocks
const renderer = new Renderer();

// Heading renderer - adds IDs for TOC navigation
renderer.heading = function ({ text, depth }) {
  // Strip HTML tags to get plain text, then generate ID
  // This ensures IDs match what extractHeaders produces from raw markdown
  const plainText = stripHtmlTags(text);
  const id = generateHeadingId(plainText);
  return `<h${depth} id="${id}">${text}</h${depth}>\n`;
};

// Code renderer - wraps code blocks with GitHub-style header and copy button
renderer.code = function (token: Tokens.Code | string): string {
  // Handle both old (code, language) and new (token) API signatures
  const code = typeof token === "string" ? token : token.text;
  const language =
    typeof token === "string"
      ? (arguments as unknown as [string, string])[1]
      : token.lang;

  const lang = language || "text";

  // Escape the code for safe HTML embedding
  const escapedCode = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  return `<div class="code-block-wrapper">
  <div class="code-block-header">
    <span class="code-block-language">${lang}</span>
    <button class="code-block-copy" aria-label="Copy code to clipboard" data-code="${escapedCode}">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.75 4.75H10.25V1.75H5.75V4.75ZM5.75 4.75H2.75V14.25H10.25V11.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="5.75" y="4.75" width="7.5" height="9.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="copy-text">Copy</span>
    </button>
  </div>
  <pre><code class="language-${lang}">${escapedCode}</code></pre>
</div>`;
};

marked.use({ renderer });

// Re-export types for convenience
export type { Doc, DocWithContent } from "$lib/types/docs";

// Docs are at project root - landing is now at packages/landing/
// so we need to go up two levels to reach the repo root
const DOCS_ROOT = resolve(process.cwd(), "..", "..", "docs");

/** Internal type with file path for content loading */
interface DocInternal extends Doc {
  _filePath: string;
}

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

function generateExcerpt(content: string): string {
  // Remove markdown headers and take first paragraph
  const cleanContent = content
    .replace(/^#+\s+.*$/gm, "") // Remove headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Remove links but keep text
    .trim();

  const firstParagraph = cleanContent.split("\n\n")[0];
  const excerpt = firstParagraph.substring(0, 200).trim();

  return excerpt + (firstParagraph.length > 200 ? "..." : "");
}

/**
 * Extract headers from markdown content for table of contents
 */
function extractHeaders(markdown: string): DocHeader[] {
  const headers: DocHeader[] = [];

  // Remove fenced code blocks before extracting headers
  // This prevents # comments inside code blocks from being treated as headers
  const markdownWithoutCodeBlocks = markdown.replace(/```[\s\S]*?```/g, "");

  const headerRegex = /^(#{1,6})\s+(.+)$/gm;

  let match;
  while ((match = headerRegex.exec(markdownWithoutCodeBlocks)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    // Use shared helper to generate ID - ensures consistency with heading renderer
    const id = generateHeadingId(text);

    headers.push({
      level,
      text,
      id,
    });
  }

  return headers;
}

function parseDoc(filePath: string, category: DocCategory): DocInternal {
  const content = readFileSync(filePath, "utf-8");
  const { data, content: markdownContent } = matter(content);

  const slug = filePath.split("/").pop()?.replace(".md", "") || "";
  const title =
    data.title ||
    slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .replace("And", "and");

  return {
    slug,
    title,
    description: data.description,
    excerpt: data.description || generateExcerpt(markdownContent),
    category,
    lastUpdated: data.lastUpdated || new Date().toISOString().split("T")[0],
    readingTime: calculateReadingTime(markdownContent),
    related: Array.isArray(data.related) ? data.related : undefined,
    _filePath: filePath,
  };
}

// Categories that should recursively include subdirectories.
// - specs: includes completed specs in specs/completed/
// - Other categories (philosophy, design, etc.) may contain internal
//   scratch/draft folders that shouldn't be exposed publicly.
const RECURSIVE_CATEGORIES: DocCategory[] = ["specs"];

function loadDocsFromDir(
  dirPath: string,
  category: DocCategory,
): DocInternal[] {
  const docs: DocInternal[] = [];
  const seenSlugs = new Set<string>();
  const shouldRecurse = RECURSIVE_CATEGORIES.includes(category);

  function readDirRecursive(currentPath: string) {
    const items = readdirSync(currentPath);

    for (const item of items) {
      const fullPath = join(currentPath, item);

      // Gracefully handle broken symlinks or inaccessible files
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        console.warn(`Skipping inaccessible file: ${fullPath}`);
        continue;
      }

      // Only recurse into subdirectories for certain categories (e.g., specs/completed)
      // Other categories like philosophy have internal scratch folders that shouldn't be public
      if (stat.isDirectory() && shouldRecurse) {
        readDirRecursive(fullPath);
      } else if (stat.isFile() && item.endsWith(".md")) {
        try {
          const doc = parseDoc(fullPath, category);

          // Detect duplicate slugs (e.g., same file in both specs/ and specs/completed/)
          if (seenSlugs.has(doc.slug)) {
            console.warn(
              `Duplicate slug "${doc.slug}" found at ${fullPath}, skipping`,
            );
            continue;
          }

          seenSlugs.add(doc.slug);
          docs.push(doc);
        } catch (error) {
          console.error(`Error parsing ${fullPath}:`, error);
        }
      }
    }
  }

  try {
    readDirRecursive(dirPath);
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }

  return docs.sort((a, b) => a.title.localeCompare(b.title));
}

export function loadAllDocs(): {
  specs: Doc[];
  helpArticles: Doc[];
  legalDocs: Doc[];
  marketingDocs: Doc[];
  patterns: Doc[];
} {
  const specs = loadDocsFromDir(join(DOCS_ROOT, "specs"), "specs");
  const helpArticles = loadDocsFromDir(
    join(DOCS_ROOT, "help-center/articles"),
    "help",
  );
  const legalDocs = loadDocsFromDir(join(DOCS_ROOT, "legal"), "legal");
  const marketingDocs = loadDocsFromDir(
    join(DOCS_ROOT, "marketing"),
    "marketing",
  );
  const patterns = loadDocsFromDir(join(DOCS_ROOT, "patterns"), "patterns");

  return { specs, helpArticles, legalDocs, marketingDocs, patterns };
}

export function loadDocBySlug(
  slug: string,
  category: DocCategory,
): DocWithContent | null {
  // Sanitize slug to prevent path traversal attacks
  if (
    !slug ||
    slug.includes("..") ||
    slug.includes("/") ||
    slug.includes("\\")
  ) {
    return null;
  }

  const categoryPaths: Record<DocCategory, string> = {
    specs: join(DOCS_ROOT, "specs"),
    help: join(DOCS_ROOT, "help-center/articles"),
    marketing: join(DOCS_ROOT, "marketing"),
    patterns: join(DOCS_ROOT, "patterns"),
    legal: join(DOCS_ROOT, "legal"),
    philosophy: join(DOCS_ROOT, "philosophy"),
    design: join(DOCS_ROOT, "design-system"),
    developer: join(DOCS_ROOT, "developer"),
  };
  const docsPath = categoryPaths[category];

  const docs = loadDocsFromDir(docsPath, category);

  const doc = docs.find((d) => d.slug === slug);
  if (!doc) return null;

  // Use stored file path to support nested directories
  const filePath = doc._filePath || join(docsPath, `${slug}.md`);

  try {
    const content = readFileSync(filePath, "utf-8");
    const { content: markdownContent } = matter(content);

    // Extract headers for table of contents
    const headers = extractHeaders(markdownContent);

    // Remove internal _filePath from returned doc
    const { _filePath, ...docWithoutPath } = doc;

    return {
      ...docWithoutPath,
      content: markdownContent,
      html: marked(markdownContent) as string,
      headers,
    };
  } catch (error) {
    // Return null on failure - don't serve incomplete content
    console.error(`Error loading full content for ${slug}:`, error);
    return null;
  }
}
