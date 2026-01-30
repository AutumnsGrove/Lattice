/// Search Index
///
/// In-memory inverted index for full-text search with BM25 ranking.
///
/// Index format (JSON, loaded from JS):
/// {
///   "documents": [
///     { "id": 1, "title": "...", "content": "...", "length": 150 },
///     ...
///   ],
///   "terms": {
///     "hello": [0, 2, 5],  // document indices containing "hello"
///     ...
///   },
///   "avgLength": 200.5
/// }
///
/// The index is pre-built in JavaScript and loaded into WASM for
/// fast searching. This avoids expensive index building in WASM.

const std = @import("std");
const bm25 = @import("bm25.zig");
const fuzzy = @import("fuzzy.zig");
const tokenizer = @import("tokenizer.zig");

/// Maximum documents in index
pub const MAX_DOCUMENTS: usize = 2000;

/// Maximum unique terms in index
pub const MAX_TERMS: usize = 10000;

/// Maximum postings per term (documents containing that term)
pub const MAX_POSTINGS_PER_TERM: usize = MAX_DOCUMENTS;

/// Maximum search results
pub const MAX_RESULTS: usize = 100;

/// Fuzzy match threshold (0.0 to 1.0)
pub const FUZZY_THRESHOLD: f32 = 0.7;

/// Document metadata
pub const Document = struct {
    id: u16,
    length: u16, // Token count
    title_len: u16, // For title boost
};

/// Search result
pub const SearchResult = struct {
    doc_id: u16,
    score: f32,
};

/// Global index state
var documents: [MAX_DOCUMENTS]Document = undefined;
var doc_count: usize = 0;

/// Term -> document indices mapping (simple linear storage)
/// Format: term_start[i], term_len[i] -> postings[term_start[i]..term_start[i]+term_len[i]]
var term_hashes: [MAX_TERMS]u32 = undefined;
var term_posting_start: [MAX_TERMS]usize = undefined;
var term_posting_len: [MAX_TERMS]u16 = undefined;
var term_count: usize = 0;

var postings: [MAX_TERMS * 100]u16 = undefined; // Document indices per term
var posting_next: usize = 0;

var avg_doc_length: f32 = 0.0;
var index_loaded: bool = false;

/// Search results buffer
var results: [MAX_RESULTS]SearchResult = undefined;
var result_count: usize = 0;

/// Initialize index from JSON data
/// This is a simplified parser - production would use proper JSON
pub fn init(data: []const u8) bool {
    // Reset state
    doc_count = 0;
    term_count = 0;
    posting_next = 0;
    index_loaded = false;
    result_count = 0;

    var i: usize = 0;

    // For now, use a simplified binary format instead of JSON
    // This avoids complex JSON parsing in Zig
    // Format:
    // [4 bytes] doc_count (u32 little-endian)
    // [4 bytes] avg_length * 100 (u32, fixed point)
    // For each doc:
    //   [2 bytes] id (u16)
    //   [2 bytes] length (u16)
    // [4 bytes] term_count (u32)
    // For each term:
    //   [4 bytes] term_hash (u32)
    //   [2 bytes] posting_count (u16)
    //   [2 bytes * posting_count] document indices

    if (data.len < 8) return false;

    // Read doc count
    doc_count = readU32(data, 0);
    if (doc_count > MAX_DOCUMENTS) return false;

    // Read average length
    const avg_len_fixed = readU32(data, 4);
    avg_doc_length = @as(f32, @floatFromInt(avg_len_fixed)) / 100.0;

    i = 8;

    // Read documents
    var d: usize = 0;
    while (d < doc_count) : (d += 1) {
        if (i + 4 > data.len) return false;
        documents[d].id = readU16(data, i);
        documents[d].length = readU16(data, i + 2);
        documents[d].title_len = 0; // Not used in binary format
        i += 4;
    }

    // Read term count
    if (i + 4 > data.len) return false;
    term_count = readU32(data, i);
    if (term_count > MAX_TERMS) return false;
    i += 4;

    // Read terms and postings
    var t: usize = 0;
    while (t < term_count) : (t += 1) {
        if (i + 6 > data.len) return false;

        term_hashes[t] = readU32(data, i);
        const posting_count = readU16(data, i + 4);
        i += 6;

        term_posting_start[t] = posting_next;
        term_posting_len[t] = posting_count;

        if (posting_count > MAX_POSTINGS_PER_TERM) return false;

        var p: usize = 0;
        while (p < posting_count) : (p += 1) {
            if (i + 2 > data.len) return false;
            if (posting_next >= postings.len) return false;

            postings[posting_next] = readU16(data, i);
            posting_next += 1;
            i += 2;
        }

        t += 0; // Just to use t
    }

    index_loaded = true;
    return true;
}

/// Read u32 from bytes (little-endian)
fn readU32(data: []const u8, offset: usize) u32 {
    return @as(u32, data[offset]) |
        (@as(u32, data[offset + 1]) << 8) |
        (@as(u32, data[offset + 2]) << 16) |
        (@as(u32, data[offset + 3]) << 24);
}

/// Read u16 from bytes (little-endian)
fn readU16(data: []const u8, offset: usize) u16 {
    return @as(u16, data[offset]) | (@as(u16, data[offset + 1]) << 8);
}

/// Hash a term for lookup
fn hashTerm(term: []const u8) u32 {
    // FNV-1a hash
    var hash: u32 = 2166136261;
    for (term) |c| {
        hash ^= tokenizer.toLower(c);
        hash *%= 16777619;
    }
    return hash;
}

/// Find term in index, return index or null
fn findTerm(term_hash: u32) ?usize {
    for (term_hashes[0..term_count], 0..) |th, i| {
        if (th == term_hash) return i;
    }
    return null;
}

/// Perform search
/// Returns number of results
pub fn search(query: []const u8, max_results: u8, output: []u8, output_len: *usize) u8 {
    if (!index_loaded) return 0;
    if (query.len == 0) return 0;

    result_count = 0;
    const limit = @min(max_results, MAX_RESULTS);

    // Tokenize query
    var query_iter = tokenizer.TokenIterator.init(query);
    var query_terms: [20][tokenizer.MAX_TOKEN_LENGTH]u8 = undefined;
    var query_term_lens: [20]usize = undefined;
    var query_term_count: usize = 0;

    while (query_iter.next()) |token| {
        if (query_term_count >= 20) break;
        const len = tokenizer.normalizeToken(token, &query_terms[query_term_count]);
        query_term_lens[query_term_count] = len;
        query_term_count += 1;
    }

    if (query_term_count == 0) return 0;

    // Score each document
    var scores: [MAX_DOCUMENTS]f32 = undefined;
    @memset(scores[0..doc_count], 0.0);

    for (query_terms[0..query_term_count], query_term_lens[0..query_term_count]) |*term_buf, term_len| {
        const term = term_buf[0..term_len];
        const term_hash = hashTerm(term);

        if (findTerm(term_hash)) |term_idx| {
            // Exact match - apply BM25 scoring
            const start = term_posting_start[term_idx];
            const len = term_posting_len[term_idx];
            const df = @as(u32, len);

            for (postings[start .. start + len]) |doc_idx| {
                // Simplified TF - assume 1 occurrence (proper index would store TF)
                const doc = documents[doc_idx];
                const term_score = bm25.termScore(
                    1, // TF (simplified)
                    doc.length,
                    avg_doc_length,
                    @intCast(doc_count),
                    df,
                );
                scores[doc_idx] += term_score;
            }
        }
        // Note: Fuzzy matching would require iterating all terms, which is expensive
        // For now, we skip fuzzy matching in the WASM version
    }

    // Collect top results
    var heap_size: usize = 0;

    for (0..doc_count) |d| {
        if (scores[d] > 0) {
            if (heap_size < limit) {
                results[heap_size] = .{
                    .doc_id = documents[d].id,
                    .score = scores[d],
                };
                heap_size += 1;
                // Bubble up (min-heap by score to keep top N)
                bubbleUp(heap_size - 1);
            } else if (scores[d] > results[0].score) {
                // Replace minimum
                results[0] = .{
                    .doc_id = documents[d].id,
                    .score = scores[d],
                };
                bubbleDown(0, heap_size);
            }
        }
    }

    result_count = heap_size;

    // Sort results by score (descending)
    sortResults();

    // Write results to output buffer (for JS to read)
    // Format: [2 bytes id, 4 bytes score] per result
    const bytes_needed = result_count * 6;
    if (bytes_needed > output.len) {
        output_len.* = 0;
        return 0;
    }

    var out_idx: usize = 0;
    for (results[0..result_count]) |result| {
        output[out_idx] = @truncate(result.doc_id);
        output[out_idx + 1] = @truncate(result.doc_id >> 8);
        const score_bits: u32 = @bitCast(result.score);
        output[out_idx + 2] = @truncate(score_bits);
        output[out_idx + 3] = @truncate(score_bits >> 8);
        output[out_idx + 4] = @truncate(score_bits >> 16);
        output[out_idx + 5] = @truncate(score_bits >> 24);
        out_idx += 6;
    }
    output_len.* = out_idx;

    return @intCast(result_count);
}

/// Min-heap bubble up
fn bubbleUp(idx: usize) void {
    var i = idx;
    while (i > 0) {
        const parent = (i - 1) / 2;
        if (results[i].score < results[parent].score) {
            const tmp = results[i];
            results[i] = results[parent];
            results[parent] = tmp;
            i = parent;
        } else {
            break;
        }
    }
}

/// Min-heap bubble down
fn bubbleDown(idx: usize, size: usize) void {
    var i = idx;
    while (true) {
        var smallest = i;
        const left = 2 * i + 1;
        const right = 2 * i + 2;

        if (left < size and results[left].score < results[smallest].score) {
            smallest = left;
        }
        if (right < size and results[right].score < results[smallest].score) {
            smallest = right;
        }

        if (smallest != i) {
            const tmp = results[i];
            results[i] = results[smallest];
            results[smallest] = tmp;
            i = smallest;
        } else {
            break;
        }
    }
}

/// Sort results by score descending
fn sortResults() void {
    // Simple insertion sort (small N)
    var i: usize = 1;
    while (i < result_count) : (i += 1) {
        const key = results[i];
        var j: usize = i;
        while (j > 0 and results[j - 1].score < key.score) {
            results[j] = results[j - 1];
            j -= 1;
        }
        results[j] = key;
    }
}

/// Get result document ID by index
pub fn getResultId(result_index: u8) u16 {
    if (result_index >= result_count) return 0;
    return results[result_index].doc_id;
}

/// Get result score by index
pub fn getResultScore(result_index: u8) f32 {
    if (result_index >= result_count) return 0.0;
    return results[result_index].score;
}

/// Clear the index
pub fn clear() void {
    doc_count = 0;
    term_count = 0;
    posting_next = 0;
    index_loaded = false;
    result_count = 0;
}

/// Check if index is loaded
pub fn isLoaded() bool {
    return index_loaded;
}

/// Get document count
pub fn getDocCount() usize {
    return doc_count;
}

// =============================================================
// Tests
// =============================================================

test "hashTerm is consistent" {
    const h1 = hashTerm("hello");
    const h2 = hashTerm("hello");
    const h3 = hashTerm("HELLO");

    try std.testing.expectEqual(h1, h2);
    try std.testing.expectEqual(h1, h3); // Case insensitive
}

test "hashTerm differs for different terms" {
    const h1 = hashTerm("hello");
    const h2 = hashTerm("world");

    try std.testing.expect(h1 != h2);
}

test "readU16 and readU32" {
    const data = [_]u8{ 0x01, 0x02, 0x03, 0x04 };

    try std.testing.expectEqual(@as(u16, 0x0201), readU16(&data, 0));
    try std.testing.expectEqual(@as(u32, 0x04030201), readU32(&data, 0));
}
