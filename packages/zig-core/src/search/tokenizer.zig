/// Tokenizer for Search
///
/// Breaks text into searchable tokens with:
/// - Lowercase normalization
/// - Whitespace/punctuation splitting
/// - Minimum token length filtering
/// - Stop word removal (optional)

const std = @import("std");

/// Minimum token length to consider
pub const MIN_TOKEN_LENGTH: usize = 2;

/// Maximum token length
pub const MAX_TOKEN_LENGTH: usize = 50;

/// Maximum tokens per document
pub const MAX_TOKENS_PER_DOC: usize = 1000;

/// Token iterator over a string
pub const TokenIterator = struct {
    text: []const u8,
    pos: usize,

    pub fn init(text: []const u8) TokenIterator {
        return .{
            .text = text,
            .pos = 0,
        };
    }

    /// Get next token (returns null when exhausted)
    pub fn next(self: *TokenIterator) ?[]const u8 {
        // Skip non-alphanumeric
        while (self.pos < self.text.len and !isAlphaNum(self.text[self.pos])) {
            self.pos += 1;
        }

        if (self.pos >= self.text.len) return null;

        const start = self.pos;

        // Consume alphanumeric
        while (self.pos < self.text.len and isAlphaNum(self.text[self.pos])) {
            self.pos += 1;
        }

        const token = self.text[start..self.pos];

        // Skip too short or too long tokens
        if (token.len < MIN_TOKEN_LENGTH or token.len > MAX_TOKEN_LENGTH) {
            return self.next();
        }

        // Skip common stop words
        if (isStopWord(token)) {
            return self.next();
        }

        return token;
    }

    /// Reset to beginning
    pub fn reset(self: *TokenIterator) void {
        self.pos = 0;
    }
};

/// Check if character is alphanumeric
fn isAlphaNum(c: u8) bool {
    return switch (c) {
        'a'...'z', 'A'...'Z', '0'...'9' => true,
        else => false,
    };
}

/// Common English stop words (minimal set for size)
fn isStopWord(token: []const u8) bool {
    // Convert to lowercase for comparison
    var lower: [MAX_TOKEN_LENGTH]u8 = undefined;
    const len = @min(token.len, MAX_TOKEN_LENGTH);
    for (token[0..len], 0..) |c, i| {
        lower[i] = toLower(c);
    }
    const word = lower[0..len];

    const stop_words = [_][]const u8{
        "the", "a",   "an",  "and", "or",  "but", "in",   "on",
        "at",  "to",  "for", "of",  "is",  "it",  "this", "that",
        "be",  "are", "was", "been", "has", "have", "had", "do",
        "does", "did", "will", "would", "could", "should", "may",
        "can", "with", "as", "by", "from", "not", "no", "so",
    };

    for (stop_words) |sw| {
        if (std.mem.eql(u8, word, sw)) return true;
    }

    return false;
}

/// Convert to lowercase
pub fn toLower(c: u8) u8 {
    if (c >= 'A' and c <= 'Z') return c + 32;
    return c;
}

/// Normalize a token (lowercase it)
pub fn normalizeToken(token: []const u8, output: []u8) usize {
    const len = @min(token.len, output.len);
    for (token[0..len], 0..) |c, i| {
        output[i] = toLower(c);
    }
    return len;
}

/// Count tokens in text
pub fn countTokens(text: []const u8) usize {
    var iter = TokenIterator.init(text);
    var count: usize = 0;
    while (iter.next() != null) {
        count += 1;
    }
    return count;
}

// =============================================================
// Tests
// =============================================================

test "basic tokenization" {
    var iter = TokenIterator.init("Hello World");
    try std.testing.expectEqualStrings("Hello", iter.next().?);
    try std.testing.expectEqualStrings("World", iter.next().?);
    try std.testing.expect(iter.next() == null);
}

test "punctuation handling" {
    var iter = TokenIterator.init("Hello, World! How are you?");
    try std.testing.expectEqualStrings("Hello", iter.next().?);
    try std.testing.expectEqualStrings("World", iter.next().?);
    try std.testing.expectEqualStrings("How", iter.next().?);
    // "are" is a stop word, but "you" passes (3 letters, not in stop list)
    try std.testing.expectEqualStrings("you", iter.next().?);
    try std.testing.expect(iter.next() == null);
}

test "stop word filtering" {
    var iter = TokenIterator.init("the quick brown fox");
    // "the" is a stop word
    try std.testing.expectEqualStrings("quick", iter.next().?);
    try std.testing.expectEqualStrings("brown", iter.next().?);
    try std.testing.expectEqualStrings("fox", iter.next().?);
    try std.testing.expect(iter.next() == null);
}

test "minimum length filtering" {
    var iter = TokenIterator.init("I a to cat");
    // "I" and "a" are too short (< 2 chars), "to" is a stop word, "cat" passes
    try std.testing.expectEqualStrings("cat", iter.next().?);
    try std.testing.expect(iter.next() == null);
}

test "countTokens" {
    try std.testing.expectEqual(@as(usize, 3), countTokens("the quick brown fox"));
}

test "normalizeToken" {
    var output: [50]u8 = undefined;
    const len = normalizeToken("HeLLo", &output);
    try std.testing.expectEqualStrings("hello", output[0..len]);
}
