#!/usr/bin/env npx tsx
/**
 * 🌲 Grove Documentation Keyword Analyzer
 *
 * Analyzes word frequency across Grove's documentation files to generate
 * interesting statistics for the Journey page.
 *
 * Usage: npx tsx scripts/generate/analyze-doc-keywords.ts [version]
 * Example: npx tsx scripts/generate/analyze-doc-keywords.ts v0.9.92
 *
 * Output: snapshots/word-frequencies/v{version}.json
 */

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  existsSync,
  mkdirSync,
} from "fs";
import { join, relative } from "path";

// ============================================================================
// TYPES
// ============================================================================

interface WordFrequency {
  word: string;
  count: number;
  pct: number; // percentage of total non-stopword words
}

interface WordAnalysis {
  version: string;
  timestamp: string;
  topWords: WordFrequency[];
  totalWords: number;
  uniqueWords: number;
  totalFiles: number;
  funFacts: {
    mostUsedWord: string;
    groveCount: number;
    wandererCount: number;
    mostDocumentedTopic: string;
  };
}

// ============================================================================
// STOPWORDS
// ============================================================================

// Standard English stopwords plus markdown/code artifacts
const STOPWORDS = new Set([
  // Articles & determiners
  "a",
  "an",
  "the",
  "this",
  "that",
  "these",
  "those",
  // Pronouns
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "me",
  "him",
  "her",
  "us",
  "them",
  "my",
  "your",
  "his",
  "its",
  "our",
  "their",
  "mine",
  "yours",
  "hers",
  "ours",
  "theirs",
  "who",
  "whom",
  "whose",
  "which",
  "what",
  // Conjunctions
  "and",
  "or",
  "but",
  "nor",
  "so",
  "yet",
  "for",
  "because",
  "although",
  "while",
  "if",
  "then",
  "else",
  "when",
  "where",
  "whether",
  // Prepositions
  "in",
  "on",
  "at",
  "to",
  "from",
  "by",
  "with",
  "without",
  "about",
  "above",
  "below",
  "between",
  "into",
  "through",
  "during",
  "before",
  "after",
  "over",
  "under",
  "again",
  "of",
  "off",
  "up",
  "down",
  "out",
  "around",
  "against",
  "along",
  "across",
  "behind",
  // Verbs (common)
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "having",
  "do",
  "does",
  "did",
  "doing",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "can",
  "need",
  "dare",
  "ought",
  "used",
  "get",
  "got",
  "getting",
  "make",
  "makes",
  "made",
  "making",
  "let",
  "lets",
  // Adverbs
  "not",
  "no",
  "yes",
  "very",
  "just",
  "only",
  "also",
  "too",
  "more",
  "most",
  "less",
  "least",
  "well",
  "now",
  "here",
  "there",
  "always",
  "never",
  "often",
  "still",
  "already",
  "even",
  "ever",
  "however",
  "therefore",
  "thus",
  // Other common words
  "all",
  "any",
  "both",
  "each",
  "few",
  "many",
  "some",
  "such",
  "other",
  "another",
  "same",
  "different",
  "own",
  "every",
  "either",
  "neither",
  "first",
  "last",
  "next",
  "new",
  "old",
  "good",
  "bad",
  "best",
  "worst",
  "right",
  "wrong",
  "much",
  "little",
  "way",
  "ways",
  "thing",
  "things",
  "one",
  "two",
  "three",
  "see",
  "use",
  "uses",
  "using",
  "used",
  "like",
  "want",
  "wants",
  "know",
  "knows",
  "think",
  "thinks",
  "take",
  "takes",
  "come",
  "comes",
  "go",
  "goes",
  "going",
  "give",
  "gives",
  "say",
  "says",
  "said",
  "work",
  "works",
  "working",
  "set",
  "sets",
  "setting",
  // Markdown artifacts
  "http",
  "https",
  "www",
  "com",
  "org",
  "io",
  "md",
  "html",
  "css",
  "js",
  "ts",
  "svg",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "json",
  "yaml",
  "yml",
  "toml",
  // Code artifacts
  "const",
  "let",
  "var",
  "function",
  "return",
  "import",
  "export",
  "default",
  "class",
  "interface",
  "type",
  "extends",
  "implements",
  "public",
  "private",
  "static",
  "async",
  "await",
  "true",
  "false",
  "null",
  "undefined",
  "void",
  "string",
  "number",
  "boolean",
  "object",
  "array",
  "any",
  "never",
  // Common documentation words that aren't interesting
  "example",
  "examples",
  "note",
  "notes",
  "tip",
  "tips",
  "important",
  "warning",
  "todo",
  "fixme",
  "xxx",
  "etc",
  "eg",
  "ie",
  "vs",
  "nbsp",
  "amp",
  "file",
  "files",
  "folder",
  "folders",
  "directory",
  "directories",
  "code",
  "line",
  "lines",
  "section",
  "sections",
  "page",
  "pages",
  "click",
  "run",
  "add",
  "create",
  "update",
  "delete",
  "remove",
  "change",
  "changes",
  "please",
  "following",
  "below",
  "above",
  "here",
  "available",
  // Additional generic words filtered for cleaner results
  "how",
  "why",
  "name",
  "names",
  "value",
  "values",
  "key",
  "keys",
  "user",
  "users",
  "data",
  "time",
  "times",
  "phase",
  "step",
  "steps",
  "item",
  "items",
  "list",
  "test",
  "tests",
  "text",
  "help",
  "start",
  "end",
  "called",
  "based",
  "support",
  "supported",
  "specific",
  "version",
]);

// Words we specifically want to highlight (Grove brand/personality words)
const HIGHLIGHT_WORDS = new Set([
  "grove",
  "lattice",
  "heartwood",
  "amber",
  "meadow",
  "wanderer",
  "wanderers",
  "rooted",
  "pathfinder",
  "wayfinder",
  "curio",
  "curios",
  "forest",
  "tree",
  "trees",
  "nature",
  "seasonal",
  "autumn",
  "spring",
  "summer",
  "winter",
  "cozy",
  "warm",
  "community",
  "queer",
  "indie",
  "solarpunk",
  "authentic",
  "svelte",
  "sveltekit",
  "cloudflare",
  "workers",
  "tenant",
  "tenants",
  "blog",
  "blogs",
  "post",
  "posts",
  "theme",
  "themes",
  "component",
  "components",
  "engine",
  "router",
  "auth",
  "authentication",
  "api",
  "database",
]);

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Recursively find all markdown files in a directory
 */
function findMarkdownFiles(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);

    // Skip common non-doc directories
    if (
      entry === "node_modules" ||
      entry === ".git" ||
      entry === "dist" ||
      entry === ".svelte-kit" ||
      entry === "archives" // Skip archived docs
    ) {
      continue;
    }

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      findMarkdownFiles(fullPath, files);
    } else if (entry.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Extract words from markdown text, cleaning up artifacts
 */
function extractWords(text: string): string[] {
  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`[^`]+`/g, " ");

  // Remove URLs
  text = text.replace(/https?:\/\/[^\s]+/g, " ");

  // Remove markdown links but keep link text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Remove markdown formatting
  text = text.replace(/[#*_~>\-|=]/g, " ");

  // Remove numbers and special characters, keep letters and spaces
  text = text.replace(/[^a-zA-Z\s]/g, " ");

  // Convert to lowercase and split
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length >= 3) // Minimum 3 characters
    .filter((word) => !STOPWORDS.has(word));

  return words;
}

/**
 * Count word frequencies
 */
function countWords(words: string[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const word of words) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  return counts;
}

/**
 * Determine the most documented topic based on keyword clusters
 */
function findMostDocumentedTopic(wordCounts: Map<string, number>): string {
  const topics: Record<string, string[]> = {
    "UI & Design": [
      "component",
      "components",
      "ui",
      "theme",
      "themes",
      "design",
      "style",
      "glass",
      "button",
      "card",
    ],
    Authentication: [
      "auth",
      "authentication",
      "login",
      "session",
      "oauth",
      "heartwood",
      "token",
    ],
    Database: [
      "database",
      "db",
      "query",
      "queries",
      "sql",
      "table",
      "tables",
      "migration",
    ],
    "API & Backend": [
      "api",
      "endpoint",
      "endpoints",
      "worker",
      "workers",
      "route",
      "routes",
      "server",
    ],
    "Content & Blogging": [
      "post",
      "posts",
      "blog",
      "content",
      "markdown",
      "editor",
      "writing",
    ],
    "Multi-tenancy": ["tenant", "tenants", "subdomain", "domain", "multi"],
    Infrastructure: [
      "cloudflare",
      "deploy",
      "deployment",
      "ci",
      "workflow",
      "github",
    ],
  };

  let maxScore = 0;
  let topTopic = "General";

  for (const [topic, keywords] of Object.entries(topics)) {
    const score = keywords.reduce(
      (sum, kw) => sum + (wordCounts.get(kw) || 0),
      0,
    );
    if (score > maxScore) {
      maxScore = score;
      topTopic = topic;
    }
  }

  return topTopic;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const version = process.argv[2] || "snapshot";

  // Find project root (script is in scripts/generate/)
  const scriptDir = new URL(".", import.meta.url).pathname;
  const projectRoot = join(scriptDir, "..", "..");

  console.log(`🌲 Grove Documentation Keyword Analyzer`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Version: ${version}`);
  console.log(`Project root: ${projectRoot}`);
  console.log();

  // Find all markdown files
  const docsDir = join(projectRoot, "docs");
  console.log(`Scanning: ${docsDir}`);

  const markdownFiles = findMarkdownFiles(docsDir);
  console.log(`Found ${markdownFiles.length} markdown files\n`);

  // Process all files
  const allWords: string[] = [];

  for (const file of markdownFiles) {
    const content = readFileSync(file, "utf-8");
    const words = extractWords(content);
    allWords.push(...words);

    // Progress indicator
    const relPath = relative(projectRoot, file);
    process.stdout.write(
      `  Processing: ${relPath.substring(0, 50).padEnd(50)}  (${words.length} words)\r`,
    );
  }

  console.log("\n");

  // Count frequencies
  const wordCounts = countWords(allWords);

  // Sort by frequency
  const sortedWords = Array.from(wordCounts.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  // Calculate total for percentages
  const totalWords = allWords.length;

  // Build top words list (top 15)
  const topWords: WordFrequency[] = sortedWords
    .slice(0, 15)
    .map(([word, count]) => ({
      word,
      count,
      pct: Math.round((count / totalWords) * 10000) / 100, // 2 decimal places
    }));

  // Calculate fun facts
  const groveCount = wordCounts.get("grove") || 0;
  const wandererCount =
    (wordCounts.get("wanderer") || 0) + (wordCounts.get("wanderers") || 0);
  const mostDocumentedTopic = findMostDocumentedTopic(wordCounts);

  // Build output
  const analysis: WordAnalysis = {
    version,
    timestamp: new Date().toISOString(),
    topWords,
    totalWords,
    uniqueWords: wordCounts.size,
    totalFiles: markdownFiles.length,
    funFacts: {
      mostUsedWord: topWords[0]?.word || "unknown",
      groveCount,
      wandererCount,
      mostDocumentedTopic,
    },
  };

  // Output directory
  const outputDir = join(projectRoot, "snapshots", "word-frequencies");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = join(outputDir, `${version}.json`);
  writeFileSync(outputFile, JSON.stringify(analysis, null, 2));

  // Print summary
  console.log(`📊 Results`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total words analyzed: ${totalWords.toLocaleString()}`);
  console.log(`Unique words: ${wordCounts.size.toLocaleString()}`);
  console.log(`Files processed: ${markdownFiles.length}`);
  console.log();
  console.log(`Top 15 words:`);
  for (const { word, count, pct } of topWords) {
    const bar = "█".repeat(Math.round(pct * 2));
    console.log(
      `  ${word.padEnd(15)} ${count.toString().padStart(4)} (${pct.toFixed(1)}%) ${bar}`,
    );
  }
  console.log();
  console.log(`Fun Facts:`);
  console.log(`  • Most used word: "${analysis.funFacts.mostUsedWord}"`);
  console.log(`  • "grove" appears ${groveCount} times`);
  console.log(`  • "wanderer(s)" appears ${wandererCount} times`);
  console.log(`  • Most documented topic: ${mostDocumentedTopic}`);
  console.log();
  console.log(`✨ Output: ${outputFile}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
