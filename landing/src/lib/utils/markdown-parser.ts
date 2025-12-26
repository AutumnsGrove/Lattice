import { readFileSync } from "fs";
import { join } from "path";
import matter from "gray-matter";
import { marked } from "marked";

export interface MarkdownDoc {
  slug: string;
  title: string;
  description?: string;
  content: string;
  html: string;
  category: string;
  lastUpdated?: string;
  filePath: string;
}

export interface ParsedDoc extends MarkdownDoc {
  excerpt: string;
  wordCount: number;
  readingTime: number;
}

export function parseMarkdownFile(filePath: string): ParsedDoc {
  const content = readFileSync(filePath, "utf-8");
  const { data, content: markdownContent } = matter(content);

  const htmlPromise = marked(markdownContent);
  const htmlResult =
    typeof htmlPromise === "string" ? htmlPromise : htmlPromise.toString();
  const slug = filePath.split("/").pop()?.replace(".md", "") || "";

  // Generate excerpt (first paragraph or first 200 chars)
  const excerpt =
    markdownContent
      .split("\n\n")[0]
      .replace(/^#+\s+/, "")
      .substring(0, 200)
      .trim() + (markdownContent.length > 200 ? "..." : "");

  // Calculate reading time (200 words per minute)
  const wordCount = markdownContent.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  return {
    slug,
    title:
      data.title ||
      slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    description: data.description || excerpt,
    content: markdownContent,
    html: htmlResult,
    category: data.category || "general",
    lastUpdated: data.lastUpdated || new Date().toISOString().split("T")[0],
    filePath,
    excerpt,
    wordCount,
    readingTime,
  };
}

export function loadDocsFromDirectory(
  dirPath: string,
  type: "specs" | "help" | "legal",
): ParsedDoc[] {
  const fs = require("fs");
  const path = require("path");

  const docs: ParsedDoc[] = [];

  function readDirRecursive(currentPath: string) {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && item !== "completed") {
        readDirRecursive(fullPath);
      } else if (stat.isFile() && item.endsWith(".md")) {
        try {
          const doc = parseMarkdownFile(fullPath);
          doc.category = type;
          docs.push(doc);
        } catch (error) {
          console.error(`Error parsing ${fullPath}:`, error);
        }
      }
    }
  }

  readDirRecursive(dirPath);
  return docs.sort((a, b) => a.title.localeCompare(b.title));
}

export function getDocBySlug(
  docs: ParsedDoc[],
  slug: string,
): ParsedDoc | undefined {
  return docs.find((doc) => doc.slug === slug);
}

export function searchDocs(docs: ParsedDoc[], query: string): ParsedDoc[] {
  if (!query) return docs;

  const lowercaseQuery = query.toLowerCase();
  return docs.filter(
    (doc) =>
      doc.title.toLowerCase().includes(lowercaseQuery) ||
      (doc.description?.toLowerCase().includes(lowercaseQuery) ?? false) ||
      doc.content.toLowerCase().includes(lowercaseQuery),
  );
}
