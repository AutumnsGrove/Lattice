/**
 * Knowledge base re-exports.
 *
 * Document metadata is now scanned from frontmatter in each .md file.
 * See $lib/server/docs-scanner.ts for the filesystem-based discovery.
 *
 * This file provides:
 * - Type re-exports for convenience (Doc, SpecCategory, etc.)
 * - Category metadata re-exports (specCategories, helpSections, etc.)
 *
 * To get documents, use scanAllDocs() or scanDocsCategory() from docs-scanner.ts
 * in your +page.server.ts files.
 */

// Re-export types for convenience
export type {
  Doc,
  SpecCategory,
  HelpSection,
  ExhibitWing,
} from "$lib/types/docs";

// Re-export category metadata from the single source of truth
export {
  specCategories,
  helpSections,
  exhibitWings,
  categoryMetadata,
} from "$lib/data/category-metadata";
