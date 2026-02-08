/**
 * Waystone Excerpt API
 *
 * Returns KB article excerpts for Waystone popups.
 * Extracts title, description, first section, and reading time.
 *
 * This endpoint is prerendered at build time since Cloudflare Workers
 * don't have filesystem access at runtime.
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler, EntryGenerator } from "./$types";
import { getDocFilePath, findDocBySlug } from "$lib/server/docs-scanner";
import { readFileSync } from "fs";
import matter from "@11ty/gray-matter";
import MarkdownIt from "markdown-it";
import { groveTermPlugin } from "$lib/utils/markdown-groveterm";

// Prerender all excerpt endpoints at build time
export const prerender = true;

// Markdown renderer for excerpts with GroveTerm support
const md = new MarkdownIt({ html: false, linkify: true });
md.use(groveTermPlugin);

/**
 * Extract first section from markdown content.
 * Gets content from after the title (# heading) to the first ## heading.
 */
function extractFirstSection(markdownContent: string): string {
  // Remove the title line (# heading)
  const lines = markdownContent.split("\n");
  let startIndex = 0;

  // Find where content starts (after first # heading or at beginning)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^#\s+/)) {
      startIndex = i + 1;
      break;
    }
  }

  // Find the first ## heading (section break)
  let endIndex = lines.length;
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].match(/^##\s+/)) {
      endIndex = i;
      break;
    }
  }

  // Extract the first section
  const firstSectionLines = lines.slice(startIndex, endIndex);
  const firstSection = firstSectionLines.join("\n").trim();

  // Handle video embeds - replace with placeholder
  const cleanedSection = firstSection
    .replace(/!\[video\][^\n]*/gi, "") // Remove video embeds
    .replace(/\n{3,}/g, "\n\n"); // Collapse multiple newlines

  return cleanedSection;
}

/**
 * Check if content contains images
 */
function hasImages(content: string): boolean {
  return /!\[(?!video)[^\]]*\]\([^)]+\)/.test(content);
}

/**
 * Calculate reading time for full article
 */
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * List of help article slugs that should have excerpt endpoints.
 * These are the articles commonly linked from Waystones in the admin panel.
 */
const WAYSTONE_ARTICLE_SLUGS = [
  "choosing-a-theme",
  "custom-fonts",
  "what-is-rings",
  "what-are-trails",
  "what-is-journey",
  "what-is-gallery",
  "what-are-curios",
  "how-grove-protects-your-content",
  "how-grove-protects-your-secrets", // Used in Timeline curio
  "exporting-your-content",
  "formatting-your-posts",
  "data-portability",
  "understanding-your-privacy",
  "what-is-arbor",
  "what-is-amber",
  "what-is-sentinel",
  "what-is-flow",
  "what-is-heartwood",
  "what-is-plant",
  "what-is-greenhouse",
  "what-is-scribe",
  "what-is-prism",
  "what-are-grafts",
  "what-are-vines",
  "account-deletion",
  "sessions-and-cookies",
  "image-upload-failures", // Used in Arbor image upload error state
];

// Generate entries for all waystone-linked articles
export const entries: EntryGenerator = () => {
  return WAYSTONE_ARTICLE_SLUGS.map((slug) => ({ slug }));
};

export const GET: RequestHandler = async ({ params }) => {
  const { slug } = params;

  // Validate slug
  if (!slug || slug.includes("..") || slug.includes("/")) {
    throw error(400, "Invalid slug");
  }

  // Only serve excerpts for waystone-linked articles
  if (!WAYSTONE_ARTICLE_SLUGS.includes(slug)) {
    throw error(404, "Article not found");
  }

  // Find the document
  const doc = findDocBySlug(slug, "help");
  if (!doc) {
    throw error(404, "Article not found");
  }

  // Get file path and read content
  const filePath = getDocFilePath(slug, "help");
  if (!filePath) {
    throw error(404, "Article not found");
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const { data: frontmatter, content: markdownContent } = matter(content);

    // Extract first section
    const firstSectionMarkdown = extractFirstSection(markdownContent);
    const firstSectionHtml = md.render(firstSectionMarkdown);

    // Build response
    const excerpt = {
      slug,
      title: frontmatter.title || doc.title,
      description: frontmatter.description || doc.description || "",
      firstSection: firstSectionHtml,
      readingTime: calculateReadingTime(markdownContent),
      hasMedia: hasImages(firstSectionMarkdown),
    };

    return json(excerpt, {
      headers: {
        // Cache for 1 day (excerpts rarely change)
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (e) {
    console.error(`Error generating excerpt for ${slug}:`, e);
    throw error(500, "Failed to generate excerpt");
  }
};
