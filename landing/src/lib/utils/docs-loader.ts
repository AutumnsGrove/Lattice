import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";
import matter from "gray-matter";
import { marked, Renderer } from "marked";
import type {
  Doc,
  DocCategory,
  DocWithContent,
  DocHeader,
} from "$lib/types/docs";

// Custom renderer that adds IDs to headings for TOC navigation
const renderer = new Renderer();
renderer.heading = function ({ text, depth }) {
  const id = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  return `<h${depth} id="${id}">${text}</h${depth}>\n`;
};

marked.use({ renderer });

// Re-export types for convenience
export type { Doc, DocWithContent } from "$lib/types/docs";

// Docs are at project root, not in landing folder
const DOCS_ROOT = resolve(process.cwd(), "..", "docs");

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
    // Create a slug-style ID from the header text
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

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
    _filePath: filePath,
  };
}

function loadDocsFromDir(
  dirPath: string,
  category: DocCategory,
): DocInternal[] {
  const docs: DocInternal[] = [];
  const seenSlugs = new Set<string>();

  function readDirRecursive(currentPath: string) {
    const items = readdirSync(currentPath);

    for (const item of items) {
      const fullPath = join(currentPath, item);
      const stat = statSync(fullPath);

      // Include all subdirectories including "completed" specs
      if (stat.isDirectory()) {
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
    design: join(DOCS_ROOT, "design"),
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
