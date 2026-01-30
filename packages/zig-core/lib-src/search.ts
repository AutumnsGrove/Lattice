/**
 * Search Functions
 *
 * BM25-based full-text search using WASM with JS fallback.
 */

import {
  loadWasm,
  isWasmLoaded,
  getExports,
  writeInput,
  writeQuery,
  readOutputBytes,
} from "./loader.js";

// ============================================================
// Types
// ============================================================

export interface SearchResult {
  id: number;
  score: number;
}

export interface SearchDocument {
  id: number;
  title: string;
  content: string;
}

export interface SearchIndex {
  documents: Array<{ id: number; length: number }>;
  terms: Record<string, number[]>;
  avgLength: number;
}

// ============================================================
// Index Management
// ============================================================

// JS fallback index storage
let jsIndex: SearchIndex | null = null;
let jsDocuments: SearchDocument[] = [];

/**
 * Build and load a search index from documents
 */
export async function buildIndex(
  documents: SearchDocument[],
): Promise<boolean> {
  // Store for JS fallback
  jsDocuments = documents;

  // Build index structure
  const terms: Record<string, number[]> = {};
  const docMeta: Array<{ id: number; length: number }> = [];
  let totalLength = 0;

  documents.forEach((doc, docIndex) => {
    const text = `${doc.title} ${doc.content}`.toLowerCase();
    const tokens = tokenize(text);

    docMeta.push({ id: doc.id, length: tokens.length });
    totalLength += tokens.length;

    // Build inverted index
    const seenTerms = new Set<string>();
    for (const token of tokens) {
      if (!seenTerms.has(token)) {
        seenTerms.add(token);
        if (!terms[token]) terms[token] = [];
        terms[token].push(docIndex);
      }
    }
  });

  jsIndex = {
    documents: docMeta,
    terms,
    avgLength: documents.length > 0 ? totalLength / documents.length : 0,
  };

  // Try to load into WASM
  await loadWasm();

  if (isWasmLoaded()) {
    const exports = getExports()!;
    const binaryIndex = serializeIndex(jsIndex);

    if (writeInput(new TextDecoder().decode(binaryIndex))) {
      // Actually write the binary data
      const result = exports.initSearchIndex();
      if (result === 1) {
        console.log("[zig-core] Search index loaded into WASM");
        return true;
      }
    }
  }

  console.log("[zig-core] Using JS search fallback");
  return true;
}

/**
 * Serialize index to binary format for WASM
 */
function serializeIndex(index: SearchIndex): Uint8Array {
  const parts: number[] = [];

  // Write doc count (u32 LE)
  writeU32(parts, index.documents.length);

  // Write avg length * 100 (u32 LE, fixed point)
  writeU32(parts, Math.round(index.avgLength * 100));

  // Write documents
  for (const doc of index.documents) {
    writeU16(parts, doc.id);
    writeU16(parts, doc.length);
  }

  // Write term count
  const termEntries = Object.entries(index.terms);
  writeU32(parts, termEntries.length);

  // Write terms
  for (const [term, postings] of termEntries) {
    // Hash the term (FNV-1a)
    const hash = hashTerm(term);
    writeU32(parts, hash);
    writeU16(parts, postings.length);

    for (const docIdx of postings) {
      writeU16(parts, docIdx);
    }
  }

  return new Uint8Array(parts);
}

function writeU32(arr: number[], val: number): void {
  arr.push(val & 0xff);
  arr.push((val >> 8) & 0xff);
  arr.push((val >> 16) & 0xff);
  arr.push((val >> 24) & 0xff);
}

function writeU16(arr: number[], val: number): void {
  arr.push(val & 0xff);
  arr.push((val >> 8) & 0xff);
}

function hashTerm(term: string): number {
  let hash = 2166136261;
  for (let i = 0; i < term.length; i++) {
    hash ^= term.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Clear the search index
 */
export function clearIndex(): void {
  jsIndex = null;
  jsDocuments = [];

  if (isWasmLoaded()) {
    const exports = getExports()!;
    exports.clearSearchIndex();
  }
}

// ============================================================
// Search
// ============================================================

/**
 * Perform a search query
 */
export async function search(
  query: string,
  maxResults: number = 20,
): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  await loadWasm();

  if (isWasmLoaded()) {
    const exports = getExports()!;
    if (writeQuery(query)) {
      const count = exports.performSearch(Math.min(maxResults, 100));

      if (count > 0) {
        const results: SearchResult[] = [];
        for (let i = 0; i < count; i++) {
          results.push({
            id: exports.getResultId(i),
            score: exports.getResultScore(i),
          });
        }
        return results;
      }
    }
  }

  // JS fallback using BM25
  return searchJS(query, maxResults);
}

/**
 * JS fallback search using BM25
 */
function searchJS(query: string, maxResults: number): SearchResult[] {
  if (!jsIndex || jsDocuments.length === 0) return [];

  const queryTokens = tokenize(query.toLowerCase());
  if (queryTokens.length === 0) return [];

  const scores: Map<number, number> = new Map();
  const k1 = 1.2;
  const b = 0.75;
  const N = jsIndex.documents.length;
  const avgDL = jsIndex.avgLength;

  for (const token of queryTokens) {
    const postings = jsIndex.terms[token];
    if (!postings) continue;

    const df = postings.length;
    const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

    for (const docIdx of postings) {
      const doc = jsIndex.documents[docIdx];
      const dl = doc.length;

      // Simplified TF = 1 (we don't store TF in the index)
      const tf = 1;
      const lengthNorm = 1 - b + b * (dl / avgDL);
      const tfComponent = (tf * (k1 + 1)) / (tf + k1 * lengthNorm);
      const score = idf * tfComponent;

      scores.set(doc.id, (scores.get(doc.id) || 0) + score);
    }
  }

  // Sort by score descending
  const results = Array.from(scores.entries())
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return results;
}

// ============================================================
// Tokenization
// ============================================================

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "is",
  "it",
  "this",
  "that",
  "be",
  "are",
  "was",
  "been",
  "has",
  "have",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "can",
  "with",
  "as",
  "by",
  "from",
  "not",
  "no",
  "so",
]);

/**
 * Tokenize text into searchable terms
 */
export function tokenize(text: string): string[] {
  return text
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}
