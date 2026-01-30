/// Fuzzy Matching with Trigrams
///
/// Uses trigram similarity for typo-tolerant search.
/// A trigram is a sequence of 3 characters from a string.
/// Example: "hello" -> {"hel", "ell", "llo"}
///
/// Similarity is calculated as:
/// 2 * |intersection| / (|trigrams_a| + |trigrams_b|)
///
/// This gives a value between 0 (no match) and 1 (identical).

const std = @import("std");
const tokenizer = @import("tokenizer.zig");

/// Maximum trigrams we'll store per term
pub const MAX_TRIGRAMS: usize = 50;

/// Trigram type (3 bytes packed)
pub const Trigram = [3]u8;

/// Extract trigrams from a string
/// Pads with spaces for short strings
pub fn extractTrigrams(input: []const u8, output: []Trigram) usize {
    if (input.len == 0) return 0;

    // Normalize to lowercase
    var normalized: [tokenizer.MAX_TOKEN_LENGTH + 2]u8 = undefined;
    normalized[0] = ' '; // Pad start

    const len = @min(input.len, tokenizer.MAX_TOKEN_LENGTH);
    for (input[0..len], 1..) |c, i| {
        normalized[i] = tokenizer.toLower(c);
    }
    normalized[len + 1] = ' '; // Pad end

    const total_len = len + 2;

    // Extract trigrams
    var count: usize = 0;
    var i: usize = 0;
    while (i + 3 <= total_len and count < output.len) {
        output[count] = .{ normalized[i], normalized[i + 1], normalized[i + 2] };
        count += 1;
        i += 1;
    }

    return count;
}

/// Calculate trigram similarity between two strings
/// Returns value between 0.0 (no match) and 1.0 (identical)
pub fn similarity(a: []const u8, b: []const u8) f32 {
    if (a.len == 0 and b.len == 0) return 1.0;
    if (a.len == 0 or b.len == 0) return 0.0;

    // Quick exact match check
    if (a.len == b.len) {
        var match = true;
        for (a, b) |ca, cb| {
            if (tokenizer.toLower(ca) != tokenizer.toLower(cb)) {
                match = false;
                break;
            }
        }
        if (match) return 1.0;
    }

    var trigrams_a: [MAX_TRIGRAMS]Trigram = undefined;
    var trigrams_b: [MAX_TRIGRAMS]Trigram = undefined;

    const count_a = extractTrigrams(a, &trigrams_a);
    const count_b = extractTrigrams(b, &trigrams_b);

    if (count_a == 0 or count_b == 0) return 0.0;

    // Count matching trigrams
    var match_count: usize = 0;
    for (trigrams_a[0..count_a]) |ta| {
        for (trigrams_b[0..count_b]) |tb| {
            if (trigramEqual(ta, tb)) {
                match_count += 1;
                break; // Only count each match once
            }
        }
    }

    // Dice coefficient: 2 * match_count / (count_a + count_b)
    return 2.0 * @as(f32, @floatFromInt(match_count)) / @as(f32, @floatFromInt(count_a + count_b));
}

/// Compare two trigrams
fn trigramEqual(a: Trigram, b: Trigram) bool {
    return a[0] == b[0] and a[1] == b[1] and a[2] == b[2];
}

/// Check if a term fuzzy-matches a query term with given threshold
pub fn matches(query_term: []const u8, doc_term: []const u8, threshold: f32) bool {
    return similarity(query_term, doc_term) >= threshold;
}

/// Find best fuzzy match score for a query term among document terms
pub fn bestMatch(query_term: []const u8, doc_terms: []const []const u8) f32 {
    var best: f32 = 0.0;
    for (doc_terms) |dt| {
        const sim = similarity(query_term, dt);
        if (sim > best) best = sim;
        if (sim >= 1.0) break; // Perfect match found
    }
    return best;
}

// =============================================================
// Tests
// =============================================================

test "extractTrigrams" {
    var trigrams: [MAX_TRIGRAMS]Trigram = undefined;

    const count = extractTrigrams("hello", &trigrams);
    try std.testing.expect(count > 0);

    // "hello" with padding becomes " hello "
    // Trigrams: " he", "hel", "ell", "llo", "lo "
    try std.testing.expectEqual(@as(usize, 5), count);
    try std.testing.expectEqual(Trigram{ ' ', 'h', 'e' }, trigrams[0]);
    try std.testing.expectEqual(Trigram{ 'h', 'e', 'l' }, trigrams[1]);
}

test "similarity - identical strings" {
    try std.testing.expectEqual(@as(f32, 1.0), similarity("hello", "hello"));
    try std.testing.expectEqual(@as(f32, 1.0), similarity("HELLO", "hello")); // Case insensitive
}

test "similarity - similar strings" {
    // "helo" is a typo of "hello"
    const sim = similarity("hello", "helo");
    try std.testing.expect(sim > 0.5);
    try std.testing.expect(sim < 1.0);
}

test "similarity - different strings" {
    const sim = similarity("hello", "world");
    try std.testing.expect(sim < 0.3);
}

test "similarity - empty strings" {
    try std.testing.expectEqual(@as(f32, 1.0), similarity("", ""));
    try std.testing.expectEqual(@as(f32, 0.0), similarity("hello", ""));
    try std.testing.expectEqual(@as(f32, 0.0), similarity("", "world"));
}

test "matches with threshold" {
    // "hello" and "helo" should match at 0.5 threshold
    try std.testing.expect(matches("hello", "helo", 0.5));

    // But not at 0.9 threshold
    try std.testing.expect(!matches("hello", "helo", 0.9));
}

test "bestMatch" {
    const terms = [_][]const u8{ "world", "hello", "help" };
    const best = bestMatch("hello", &terms);
    try std.testing.expectEqual(@as(f32, 1.0), best);
}
