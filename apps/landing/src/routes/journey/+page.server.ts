import historyData from "../../../static/data/history.csv?raw";
import { safeParseInt, parseTimestampToDate } from "$lib/utils/journey";

/**
 * CSV Schema (23 columns):
 * timestamp, label, git_hash, total_code_lines, svelte_lines, ts_lines,
 * js_lines, css_lines, doc_words, doc_lines, total_files, directories,
 * estimated_tokens, commits, test_files, test_lines, bundle_size_kb,
 * npm_unpacked_size, py_lines, go_lines, sql_lines, sh_lines, tsx_lines
 *
 * IMPORTANT: This schema uses hardcoded column indexes (0-22) in parseCSV().
 * New columns MUST be added at the end to maintain backward compatibility.
 * If you add a column in the middle, all subsequent indexes will break.
 */
const EXPECTED_COLUMNS = 23;

interface VersionSummary {
  version: string;
  date: string;
  commitHash: string;
  summary: string;
  stats: {
    totalCommits: number;
    features: number;
    fixes: number;
    refactoring: number;
    docs: number;
    tests: number;
    performance: number;
  };
  highlights: {
    features: string[];
    fixes: string[];
  };
}

interface WordFrequency {
  word: string;
  count: number;
  pct: number;
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

interface SnapshotData {
  timestamp: string;
  label: string;
  gitHash: string;
  totalCodeLines: number;
  svelteLines: number;
  tsLines: number;
  jsLines: number;
  cssLines: number;
  docWords: number;
  docLines: number;
  totalFiles: number;
  directories: number;
  estimatedTokens: number;
  commits: number;
  testFiles: number;
  testLines: number;
  bundleSizeKb: number;
  npmUnpackedSize: number;
  pyLines: number;
  goLines: number;
  sqlLines: number;
  shLines: number;
  tsxLines: number;
  date: string;
}

function parseCSV(csv: string): SnapshotData[] {
  if (!csv || typeof csv !== "string") {
    console.warn("CSV data is empty or invalid");
    return [];
  }

  const lines = csv.trim().split("\n");

  // Need at least header + 1 data row
  if (lines.length < 2) {
    console.warn("CSV has no data rows");
    return [];
  }

  const results: SnapshotData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = line.split(",");

    if (values.length !== EXPECTED_COLUMNS) {
      console.warn(
        `Skipping malformed CSV line ${i}: expected ${EXPECTED_COLUMNS} columns, got ${values.length}`,
      );
      continue;
    }

    results.push({
      timestamp: values[0] || "",
      label: values[1] || "",
      gitHash: values[2] || "",
      totalCodeLines: safeParseInt(values[3]),
      svelteLines: safeParseInt(values[4]),
      tsLines: safeParseInt(values[5]),
      jsLines: safeParseInt(values[6]),
      cssLines: safeParseInt(values[7]),
      docWords: safeParseInt(values[8]),
      docLines: safeParseInt(values[9]),
      totalFiles: safeParseInt(values[10]),
      directories: safeParseInt(values[11]),
      estimatedTokens: safeParseInt(values[12]),
      commits: safeParseInt(values[13]),
      testFiles: safeParseInt(values[14]),
      testLines: safeParseInt(values[15]),
      bundleSizeKb: safeParseInt(values[16]),
      npmUnpackedSize: safeParseInt(values[17]),
      pyLines: safeParseInt(values[18]),
      goLines: safeParseInt(values[19]),
      sqlLines: safeParseInt(values[20]),
      shLines: safeParseInt(values[21]),
      tsxLines: safeParseInt(values[22]),
      date: parseTimestampToDate(values[0]),
    });
  }

  return results;
}

// Load all summary JSON files at build time using Vite's import.meta.glob
const summaryModules = import.meta.glob(
  "../../../static/data/summaries/*.json",
  {
    eager: true,
    import: "default",
  },
) as Record<string, VersionSummary>;

// Load all word frequency JSON files at build time
const wordFrequencyModules = import.meta.glob(
  "../../../static/data/word-frequencies/*.json",
  {
    eager: true,
    import: "default",
  },
) as Record<string, WordAnalysis>;

function loadSummaries(): Map<string, VersionSummary> {
  const summaries = new Map<string, VersionSummary>();

  for (const [path, summary] of Object.entries(summaryModules)) {
    if (summary && summary.version) {
      summaries.set(summary.version, summary);
    }
  }

  return summaries;
}

function loadWordFrequencies(): Record<string, WordAnalysis> {
  const frequencies: Record<string, WordAnalysis> = {};

  for (const [path, data] of Object.entries(wordFrequencyModules)) {
    if (data && data.version) {
      frequencies[data.version] = data;
    }
  }

  return frequencies;
}

export function load() {
  const snapshots = parseCSV(historyData);
  const summaries = loadSummaries();

  // Handle empty data gracefully
  if (snapshots.length === 0) {
    return {
      snapshots: [],
      latest: null,
      growth: null,
      totalSnapshots: 0,
      summaries: Object.fromEntries(summaries),
      wordFrequencies: loadWordFrequencies(),
    };
  }

  const latest = snapshots[snapshots.length - 1];
  const first = snapshots[0];

  // Calculate growth between first and latest snapshot
  const growth =
    snapshots.length > 1
      ? {
          codeLines: latest.totalCodeLines - first.totalCodeLines,
          docLines: latest.docLines - first.docLines,
          files: latest.totalFiles - first.totalFiles,
          commits: latest.commits - first.commits,
        }
      : null;

  return {
    snapshots,
    latest,
    growth,
    totalSnapshots: snapshots.length,
    summaries: Object.fromEntries(summaries),
    wordFrequencies: loadWordFrequencies(),
  };
}
