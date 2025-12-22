import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";
import matter from "gray-matter";
import { marked } from "marked";

// Docs are at project root, not in landing folder
const DOCS_ROOT = resolve(process.cwd(), "..", "docs");

export interface Doc {
  slug: string;
  title: string;
  description?: string;
  excerpt: string;
  category: "specs" | "help" | "legal";
  lastUpdated?: string;
  readingTime: number;
  content?: string;
  html?: string;
  /** Internal: full path to the markdown file for content loading */
  _filePath?: string;
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

function parseDoc(filePath: string, category: "specs" | "help" | "legal"): Doc {
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
  category: "specs" | "help" | "legal",
): Doc[] {
  const docs: Doc[] = [];

  function readDirRecursive(currentPath: string) {
    const items = readdirSync(currentPath);

    for (const item of items) {
      const fullPath = join(currentPath, item);
      const stat = statSync(fullPath);

      // Skip "completed" subdirectory (archived specs)
      if (stat.isDirectory() && item !== "completed") {
        readDirRecursive(fullPath);
      } else if (stat.isFile() && item.endsWith(".md")) {
        try {
          docs.push(parseDoc(fullPath, category));
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
} {
  const specs = loadDocsFromDir(join(DOCS_ROOT, "specs"), "specs");
  const helpArticles = loadDocsFromDir(
    join(DOCS_ROOT, "help-center/articles"),
    "help",
  );
  const legalDocs = loadDocsFromDir(join(DOCS_ROOT, "legal"), "legal");

  return { specs, helpArticles, legalDocs };
}

export function loadDocBySlug(
  slug: string,
  category: "specs" | "help" | "legal",
): Doc | null {
  const docsPath =
    category === "specs"
      ? join(DOCS_ROOT, "specs")
      : category === "help"
        ? join(DOCS_ROOT, "help-center/articles")
        : join(DOCS_ROOT, "legal");

  const docs = loadDocsFromDir(docsPath, category);

  const doc = docs.find((d) => d.slug === slug);
  if (!doc) return null;

  // Use stored file path to support nested directories
  const filePath = doc._filePath || join(docsPath, `${slug}.md`);

  try {
    const content = readFileSync(filePath, "utf-8");
    const { content: markdownContent } = matter(content);

    // Remove internal _filePath from returned doc
    const { _filePath, ...docWithoutPath } = doc;

    return {
      ...docWithoutPath,
      content: markdownContent,
      html: marked(markdownContent) as string,
    };
  } catch (error) {
    console.error(`Error loading full content for ${slug}:`, error);
    const { _filePath, ...docWithoutPath } = doc;
    return docWithoutPath;
  }
}
