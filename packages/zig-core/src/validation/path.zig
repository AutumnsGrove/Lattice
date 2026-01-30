/// Path Validation
///
/// Security-focused path validation to prevent directory traversal attacks:
/// - Blocks .. sequences (including encoded variants)
/// - Rejects absolute paths
/// - Only allows safe characters
/// - Detects URL-encoded and hex-encoded attack patterns

const std = @import("std");

/// Validation result codes
pub const PathResult = enum(u8) {
    safe = 1,
    unsafe = 0,
    empty = 2,
    too_long = 3,
    traversal_detected = 4,
    absolute_path = 5,
    invalid_char = 6,
    double_slash = 7,
    encoded_attack = 8,
};

/// Maximum path length
const MAX_PATH_LENGTH: usize = 1024;

/// Validate a path for directory traversal attacks
pub fn validate(input: []const u8) PathResult {
    if (input.len == 0) return .empty;
    if (input.len > MAX_PATH_LENGTH) return .too_long;

    // Check for absolute paths
    if (input[0] == '/' or input[0] == '\\') return .absolute_path;

    // Check for Windows drive letters (C:, D:, etc.)
    if (input.len >= 2 and input[1] == ':') {
        if ((input[0] >= 'A' and input[0] <= 'Z') or
            (input[0] >= 'a' and input[0] <= 'z'))
        {
            return .absolute_path;
        }
    }

    // Check for encoded attacks in the raw input
    if (containsEncodedAttack(input)) return .encoded_attack;

    // Normalize slashes and check for traversal
    var i: usize = 0;
    var prev_slash = false;

    while (i < input.len) {
        const c = input[i];

        // Check for double slashes
        if ((c == '/' or c == '\\') and prev_slash) {
            return .double_slash;
        }

        // Check for .. (directory traversal)
        if (c == '.' and i + 1 < input.len and input[i + 1] == '.') {
            // Check if it's a proper .. traversal
            const at_start = i == 0;
            const after_slash = i > 0 and (input[i - 1] == '/' or input[i - 1] == '\\');
            const before_end = i + 2 >= input.len;
            const before_slash = i + 2 < input.len and (input[i + 2] == '/' or input[i + 2] == '\\');

            if ((at_start or after_slash) and (before_end or before_slash)) {
                return .traversal_detected;
            }
        }

        // Validate character
        if (!isPathChar(c)) return .invalid_char;

        prev_slash = (c == '/' or c == '\\');
        i += 1;
    }

    return .safe;
}

/// Check for URL-encoded and hex-encoded attack patterns
fn containsEncodedAttack(input: []const u8) bool {
    // Common encoded patterns for ".."
    const patterns = [_][]const u8{
        "%2e%2e", // URL encoded ..
        "%2E%2E", // URL encoded .. (uppercase)
        "%2e.", // Mixed encoded
        ".%2e", // Mixed encoded
        "%2E.", // Mixed encoded (uppercase)
        ".%2E", // Mixed encoded (uppercase)
        "..%2f", // .. followed by encoded /
        "..%2F", // .. followed by encoded / (uppercase)
        "%2f..", // encoded / followed by ..
        "%2F..", // encoded / (uppercase) followed by ..
        "..%5c", // .. followed by encoded \
        "..%5C", // .. followed by encoded \ (uppercase)
        "%5c..", // encoded \ followed by ..
        "%5C..", // encoded \ (uppercase) followed by ..
        "0x2e0x2e", // Hex encoded ..
        "0x2E0x2E", // Hex encoded .. (uppercase)
    };

    // Convert to lowercase for comparison
    var lower_buf: [MAX_PATH_LENGTH]u8 = undefined;
    const lower_len = @min(input.len, MAX_PATH_LENGTH);
    for (input[0..lower_len], 0..) |c, idx| {
        lower_buf[idx] = toLower(c);
    }
    const lower = lower_buf[0..lower_len];

    for (patterns) |pattern| {
        // Convert pattern to lowercase for comparison
        var pattern_lower: [20]u8 = undefined;
        for (pattern, 0..) |c, idx| {
            pattern_lower[idx] = toLower(c);
        }

        if (std.mem.indexOf(u8, lower, pattern_lower[0..pattern.len]) != null) {
            return true;
        }
    }

    return false;
}

/// Convert to lowercase
fn toLower(c: u8) u8 {
    if (c >= 'A' and c <= 'Z') return c + 32;
    return c;
}

/// Valid path characters
fn isPathChar(c: u8) bool {
    return switch (c) {
        'a'...'z', 'A'...'Z', '0'...'9' => true,
        '/', '\\', '.', '-', '_' => true,
        else => false,
    };
}

/// Simple boolean validation
pub fn isSafe(input: []const u8) bool {
    return validate(input) == .safe;
}

// =============================================================
// Tests
// =============================================================

test "safe paths" {
    try std.testing.expect(isSafe("images/photo.jpg"));
    try std.testing.expect(isSafe("path/to/file.txt"));
    try std.testing.expect(isSafe("simple-file.md"));
    try std.testing.expect(isSafe("dir_name/file_name.ext"));
    try std.testing.expect(isSafe("a/b/c/d/e"));
}

test "single dot is safe" {
    try std.testing.expect(isSafe("./file.txt")); // Current dir reference
    try std.testing.expect(isSafe("path/./file")); // Current dir in path
}

test "traversal attacks - basic" {
    try std.testing.expectEqual(PathResult.traversal_detected, validate("../secret"));
    try std.testing.expectEqual(PathResult.traversal_detected, validate("path/../../../etc/passwd"));
    try std.testing.expectEqual(PathResult.traversal_detected, validate(".."));
    try std.testing.expectEqual(PathResult.traversal_detected, validate("foo/.."));
    try std.testing.expectEqual(PathResult.traversal_detected, validate("foo/../bar"));
}

test "traversal attacks - encoded" {
    try std.testing.expectEqual(PathResult.encoded_attack, validate("%2e%2e/secret"));
    try std.testing.expectEqual(PathResult.encoded_attack, validate("path/%2e%2e/file"));
    try std.testing.expectEqual(PathResult.encoded_attack, validate("..%2f..%2fetc"));
    try std.testing.expectEqual(PathResult.encoded_attack, validate("0x2e0x2e/etc"));
}

test "absolute paths" {
    try std.testing.expectEqual(PathResult.absolute_path, validate("/etc/passwd"));
    try std.testing.expectEqual(PathResult.absolute_path, validate("\\Windows\\System32"));
    try std.testing.expectEqual(PathResult.absolute_path, validate("C:\\Windows"));
    try std.testing.expectEqual(PathResult.absolute_path, validate("d:\\data"));
}

test "invalid characters" {
    try std.testing.expectEqual(PathResult.invalid_char, validate("path<script>"));
    try std.testing.expectEqual(PathResult.invalid_char, validate("file:name"));
    try std.testing.expectEqual(PathResult.invalid_char, validate("path?query"));
}

test "double slashes" {
    try std.testing.expectEqual(PathResult.double_slash, validate("path//file"));
    try std.testing.expectEqual(PathResult.double_slash, validate("path\\\\file"));
}
