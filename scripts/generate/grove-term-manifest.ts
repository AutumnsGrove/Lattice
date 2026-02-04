#!/usr/bin/env npx tsx
/**
 * 🌲 Grove Term Manifest Generator
 *
 * Parses docs/philosophy/grove-naming.md and generates a JSON manifest
 * of all Grove terminology for the GroveTerm component.
 *
 * Usage: npx tsx scripts/generate/grove-term-manifest.ts
 *
 * Output: packages/engine/src/lib/data/grove-term-manifest.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ============================================================================
// TYPES
// ============================================================================

type GroveTermCategory =
  | "foundational"
  | "platform"
  | "content"
  | "tools"
  | "operations";

interface GroveTermEntry {
  slug: string;
  term: string;
  category: GroveTermCategory;
  tagline: string;
  definition: string;
  usageExample?: string;
  seeAlso?: string[];
}

type GroveTermManifest = Record<string, GroveTermEntry>;

// ============================================================================
// SECTION → CATEGORY MAPPING
// ============================================================================

const SECTION_TO_CATEGORY: Record<string, GroveTermCategory> = {
  "the heart of it all": "foundational",
  "core infrastructure": "foundational",
  "platform services": "platform",
  "content & community": "content",
  "standalone tools": "tools",
  operations: "operations",
  "user identity": "foundational",
};

// ============================================================================
// PARSING HELPERS
// ============================================================================

/**
 * Convert a term name to a URL-safe slug
 */
function toSlug(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Extract tagline from the bold text after term name
 * Format: **Category** · tagline
 * or: **Tagline**
 */
function parseTagline(line: string): string {
  // Match pattern like: **Your Space** · `{you}.grove.place`
  // or: **Authentication** · `heartwood.grove.place`
  const match = line.match(/\*\*([^*]+)\*\*/);
  if (match) {
    return match[1].trim();
  }
  return "";
}

/**
 * Clean markdown formatting from text
 */
function cleanMarkdown(text: string): string {
  return (
    text
      // Remove bold/italic markers
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // Remove code blocks but keep inline code
      .replace(/```[\s\S]*?```/g, "")
      // Keep inline code readable
      .replace(/`([^`]+)`/g, "$1")
      // Remove links but keep link text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Collapse multiple spaces
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Extract blockquote usage examples
 */
function extractUsageExample(lines: string[]): string | undefined {
  const examples: string[] = [];
  let inExample = false;

  for (const line of lines) {
    if (line.startsWith("> ")) {
      // Skip lines that are clearly not usage examples (like philosophy quotes)
      const content = line.substring(2).trim();
      if (content.startsWith('"') || content.startsWith("'")) {
        examples.push(content);
        inExample = true;
      } else if (content.startsWith("*") && content.endsWith("*")) {
        // Italicized tagline quote - include it
        examples.push(content);
      }
    } else if (inExample && line.trim() === "") {
      inExample = false;
    }
  }

  if (examples.length > 0) {
    return examples.join("\n");
  }
  return undefined;
}

/**
 * Extract definition paragraphs (first non-blockquote, non-header content)
 */
function extractDefinition(lines: string[]): string {
  const paragraphs: string[] = [];
  let foundContent = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines at the start
    if (!foundContent && trimmed === "") continue;

    // Skip headers
    if (trimmed.startsWith("#")) continue;

    // Skip blockquotes (handled separately as examples)
    if (trimmed.startsWith(">")) continue;

    // Skip bold tagline lines (first line after header)
    if (trimmed.startsWith("**") && !foundContent) {
      continue;
    }

    // Skip bullet points (often feature lists)
    if (trimmed.startsWith("-") || trimmed.startsWith("*")) continue;

    // Skip table lines
    if (trimmed.startsWith("|")) continue;

    // Found content
    if (trimmed !== "") {
      foundContent = true;
      paragraphs.push(trimmed);
    } else if (foundContent && paragraphs.length > 0) {
      // Hit an empty line after finding content - we have our first paragraph
      break;
    }
  }

  return cleanMarkdown(paragraphs.join(" "));
}

/**
 * Find related terms mentioned in the content
 */
function findRelatedTerms(
  content: string,
  allTerms: Set<string>,
  currentTerm: string,
): string[] {
  const related: string[] = [];
  const lowerContent = content.toLowerCase();

  for (const term of allTerms) {
    if (term === currentTerm.toLowerCase()) continue;
    // Check if the term appears in the content (case insensitive)
    if (lowerContent.includes(term)) {
      related.push(term);
    }
  }

  // Limit to 4 related terms
  return related.slice(0, 4);
}

// ============================================================================
// MAIN PARSER
// ============================================================================

function parseGroveNaming(content: string): GroveTermManifest {
  const manifest: GroveTermManifest = {};
  const lines = content.split("\n");

  let currentSection = "";
  let currentCategory: GroveTermCategory = "foundational";
  let currentTerm = "";
  let termLines: string[] = [];
  let allTermSlugs = new Set<string>();

  // First pass: collect all term names for cross-referencing
  for (const line of lines) {
    if (line.startsWith("### ")) {
      const termName = line.substring(4).trim();
      // Skip "The Metaphor Chain", "Implementation Pattern", etc.
      if (
        !termName.includes("Metaphor") &&
        !termName.includes("Pattern") &&
        !termName.includes("Symmetry") &&
        !termName.includes("Layers") &&
        !termName.includes("Lexicon") &&
        !termName.includes("Identity vs")
      ) {
        allTermSlugs.add(toSlug(termName));
      }
    }
  }

  // Second pass: parse each term
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track H2 sections for category mapping
    if (line.startsWith("## ")) {
      const sectionName = line.substring(3).trim().toLowerCase();
      currentSection = sectionName;
      currentCategory = SECTION_TO_CATEGORY[sectionName] || currentCategory;

      // Commit any pending term
      if (currentTerm && termLines.length > 0) {
        commitTerm();
      }
      continue;
    }

    // Track H3 terms
    if (line.startsWith("### ")) {
      // Commit previous term
      if (currentTerm && termLines.length > 0) {
        commitTerm();
      }

      const termName = line.substring(4).trim();

      // Skip non-term sections
      if (
        termName.includes("Metaphor") ||
        termName.includes("Pattern") ||
        termName.includes("Symmetry") ||
        termName.includes("Layers") ||
        termName.includes("Lexicon") ||
        termName.includes("Identity vs")
      ) {
        currentTerm = "";
        termLines = [];
        continue;
      }

      currentTerm = termName;
      termLines = [];
      continue;
    }

    // Accumulate lines for current term
    if (currentTerm) {
      termLines.push(line);
    }
  }

  // Commit final term
  if (currentTerm && termLines.length > 0) {
    commitTerm();
  }

  function commitTerm() {
    const slug = toSlug(currentTerm);

    // Handle special cases for "Your" prefix
    let displayTerm = currentTerm;
    if (currentTerm.startsWith("Your ")) {
      displayTerm = currentTerm.substring(5); // "Your Grove" -> "Grove"
    }

    // Parse the first line after the header for tagline
    let tagline = "";
    for (const line of termLines) {
      if (line.trim().startsWith("**")) {
        tagline = parseTagline(line);
        break;
      }
    }

    const definition = extractDefinition(termLines);
    const usageExample = extractUsageExample(termLines);
    const seeAlso = findRelatedTerms(
      termLines.join("\n"),
      allTermSlugs,
      displayTerm,
    );

    if (definition) {
      manifest[slug] = {
        slug,
        term: displayTerm,
        category: currentCategory,
        tagline: tagline || displayTerm,
        definition,
        ...(usageExample && { usageExample }),
        ...(seeAlso.length > 0 && { seeAlso }),
      };
    }
  }

  return manifest;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  // Find project root
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const projectRoot = join(scriptDir, "..", "..");

  console.log(`🌲 Grove Term Manifest Generator`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Read source document
  const sourcePath = join(projectRoot, "docs/philosophy/grove-naming.md");
  if (!existsSync(sourcePath)) {
    console.error(`❌ Source not found: ${sourcePath}`);
    process.exit(1);
  }

  console.log(`Reading: ${sourcePath}`);
  const content = readFileSync(sourcePath, "utf-8");

  // Parse and generate manifest
  const manifest = parseGroveNaming(content);

  // Output directory
  const outputDir = join(projectRoot, "packages/engine/src/lib/data");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = join(outputDir, "grove-term-manifest.json");
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + "\n");

  // Print summary
  console.log();
  console.log(`📊 Results`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total terms: ${Object.keys(manifest).length}`);

  // Count by category
  const byCategory: Record<string, number> = {};
  for (const entry of Object.values(manifest)) {
    byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
  }

  console.log();
  console.log("By category:");
  for (const [cat, count] of Object.entries(byCategory).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${cat.padEnd(15)} ${count}`);
  }

  console.log();
  console.log("Sample terms:");
  const samples = Object.values(manifest).slice(0, 5);
  for (const entry of samples) {
    console.log(`  • ${entry.term} (${entry.category}): ${entry.tagline}`);
  }

  console.log();
  console.log(`✨ Output: ${outputPath}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
