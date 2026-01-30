/// BM25 Ranking Algorithm
///
/// Okapi BM25 is a probabilistic relevance ranking function.
/// It considers:
/// - Term frequency (TF) - how often a term appears in a document
/// - Inverse document frequency (IDF) - rarity of the term across all documents
/// - Document length normalization - adjusts for long vs short documents
///
/// Formula:
/// score = IDF * (TF * (k1 + 1)) / (TF + k1 * (1 - b + b * docLen/avgLen))
///
/// Parameters:
/// - k1 = 1.2 (term saturation, higher = more weight to term frequency)
/// - b = 0.75 (length normalization, 0 = none, 1 = full)

const std = @import("std");

/// BM25 parameters
pub const k1: f32 = 1.2;
pub const b: f32 = 0.75;

/// Calculate IDF (Inverse Document Frequency)
/// IDF = ln((N - n + 0.5) / (n + 0.5) + 1)
/// where N = total docs, n = docs containing term
pub fn idf(total_docs: u32, docs_with_term: u32) f32 {
    const n = @as(f32, @floatFromInt(total_docs));
    const df = @as(f32, @floatFromInt(docs_with_term));

    // Ensure we don't get negative IDF for very common terms
    const numerator = n - df + 0.5;
    const denominator = df + 0.5;

    // Add 1 to ensure IDF is always positive
    return @log(numerator / denominator + 1.0);
}

/// Calculate BM25 score for a single term in a document
pub fn termScore(
    term_freq: u32,
    doc_length: u32,
    avg_doc_length: f32,
    total_docs: u32,
    docs_with_term: u32,
) f32 {
    const tf = @as(f32, @floatFromInt(term_freq));
    const dl = @as(f32, @floatFromInt(doc_length));

    // IDF component
    const idf_score = idf(total_docs, docs_with_term);

    // TF component with length normalization
    const length_norm = 1.0 - b + b * (dl / avg_doc_length);
    const tf_component = (tf * (k1 + 1.0)) / (tf + k1 * length_norm);

    return idf_score * tf_component;
}

/// Calculate combined BM25 score for multiple query terms
/// Returns the sum of individual term scores
pub fn score(
    term_frequencies: []const u32,
    doc_freqs: []const u32,
    doc_length: u32,
    avg_doc_length: f32,
    total_docs: u32,
) f32 {
    var total_score: f32 = 0.0;

    for (term_frequencies, doc_freqs) |tf, df| {
        if (tf > 0 and df > 0) {
            total_score += termScore(tf, doc_length, avg_doc_length, total_docs, df);
        }
    }

    return total_score;
}

// =============================================================
// Tests
// =============================================================

test "IDF calculation" {
    // Rare term (1 doc out of 1000) should have high IDF
    const rare_idf = idf(1000, 1);
    try std.testing.expect(rare_idf > 5.0);

    // Common term (900 docs out of 1000) should have low IDF
    const common_idf = idf(1000, 900);
    try std.testing.expect(common_idf < 1.0);

    // Term in all docs should have minimal (but positive) IDF
    const ubiquitous_idf = idf(1000, 1000);
    try std.testing.expect(ubiquitous_idf > 0.0);
    try std.testing.expect(ubiquitous_idf < 0.5);
}

test "term score calculation" {
    // High TF in short doc with rare term = high score
    const high_score = termScore(
        5, // term appears 5 times
        100, // doc length 100
        200.0, // avg doc length 200
        1000, // 1000 total docs
        10, // only 10 docs have this term
    );
    // BM25 scores depend on parameters; this should be positive and meaningful
    try std.testing.expect(high_score > 5.0);

    // Low TF in long doc with common term = low score
    const low_score = termScore(
        1, // term appears once
        500, // doc length 500
        200.0, // avg doc length 200
        1000, // 1000 total docs
        900, // 900 docs have this term
    );
    try std.testing.expect(low_score < 1.0);
}

test "combined score" {
    // Multi-term query
    const tfs = [_]u32{ 3, 2, 0 }; // term frequencies in doc
    const dfs = [_]u32{ 10, 100, 500 }; // document frequencies

    const total = score(&tfs, &dfs, 150, 200.0, 1000);

    // Score should be positive (first two terms match)
    try std.testing.expect(total > 0.0);

    // Rare term (df=10) should contribute more than common term (df=100)
    const rare_only = score(&[_]u32{3}, &[_]u32{10}, 150, 200.0, 1000);
    const common_only = score(&[_]u32{2}, &[_]u32{100}, 150, 200.0, 1000);
    try std.testing.expect(rare_only > common_only);
}

test "length normalization" {
    // Same term frequency, different doc lengths
    const short_doc_score = termScore(2, 50, 200.0, 1000, 100);
    const long_doc_score = termScore(2, 400, 200.0, 1000, 100);

    // Short doc should score higher (term is more significant)
    try std.testing.expect(short_doc_score > long_doc_score);
}
