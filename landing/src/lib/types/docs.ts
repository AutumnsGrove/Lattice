/**
 * Shared types for knowledge base documents.
 *
 * Note on HTML rendering: Document content is rendered using {@html} in Svelte
 * components. This is safe because all markdown files are version-controlled
 * source code in the docs/ directory - they are not user-generated content.
 */

/** Document category */
export type DocCategory = "specs" | "help" | "legal" | "marketing" | "patterns";

/** Spec subcategories (mirrors workshop page organization) */
export type SpecCategory =
  | "core-infrastructure"
  | "platform-services"
  | "content-community"
  | "standalone-tools"
  | "operations"
  | "reference";

/** Base document metadata (used for listings and static data) */
export interface Doc extends Record<string, unknown> {
  slug: string;
  title: string;
  description?: string;
  excerpt: string;
  category: DocCategory;
  lastUpdated?: string;
  readingTime: number;
  /** Optional icon key for documents (matches keys in toolIcons) */
  icon?: string;
  /** Optional spec subcategory for grouping specs like workshop page */
  specCategory?: SpecCategory;
}

/** Header extracted from markdown for table of contents */
export interface DocHeader {
  level: number;
  text: string;
  id: string;
}

/** Document with full content loaded (used for individual article pages) */
export interface DocWithContent extends Doc {
  /** Raw markdown content */
  content: string;
  /** Rendered HTML content (safe to use with {@html} - see note above) */
  html: string;
  /** Headers for table of contents */
  headers: DocHeader[];
}
