/// Search Library Root
///
/// This module re-exports all search components and provides the public API.
/// The search engine uses BM25 ranking with optional fuzzy matching.

pub const tokenizer = @import("tokenizer.zig");
pub const bm25 = @import("bm25.zig");
pub const fuzzy = @import("fuzzy.zig");
pub const index = @import("index.zig");

// Re-export key types
pub const TokenIterator = tokenizer.TokenIterator;
pub const SearchResult = index.SearchResult;
pub const Document = index.Document;

// Re-export constants
pub const FUZZY_THRESHOLD = index.FUZZY_THRESHOLD;
pub const MAX_RESULTS = index.MAX_RESULTS;
pub const MAX_DOCUMENTS = index.MAX_DOCUMENTS;

// =============================================================
// Comprehensive tests
// =============================================================

test {
    // Run all sub-module tests
    @import("std").testing.refAllDecls(@This());
}
