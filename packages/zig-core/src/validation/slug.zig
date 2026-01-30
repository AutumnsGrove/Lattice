/// Slug Validation
///
/// Validates URL-safe slugs:
/// - Lowercase alphanumeric characters
/// - Hyphens (but not consecutive, leading, or trailing)
/// - No spaces, underscores, or special characters
/// - Length between 1 and 200 characters

const std = @import("std");

/// Validation result codes
pub const SlugResult = enum(u8) {
    valid = 1,
    invalid = 0,
    empty = 2,
    too_long = 3,
    invalid_char = 4,
    leading_hyphen = 5,
    trailing_hyphen = 6,
    consecutive_hyphens = 7,
    uppercase_found = 8,
};

/// Maximum slug length
const MAX_SLUG_LENGTH: usize = 200;

/// Validate a slug
pub fn validate(input: []const u8) SlugResult {
    if (input.len == 0) return .empty;
    if (input.len > MAX_SLUG_LENGTH) return .too_long;

    // Check leading/trailing hyphens
    if (input[0] == '-') return .leading_hyphen;
    if (input[input.len - 1] == '-') return .trailing_hyphen;

    var prev_hyphen = false;

    for (input) |c| {
        const is_hyphen = c == '-';

        // Check for consecutive hyphens
        if (is_hyphen and prev_hyphen) return .consecutive_hyphens;

        // Check for uppercase
        if (c >= 'A' and c <= 'Z') return .uppercase_found;

        // Validate character
        if (!isSlugChar(c)) return .invalid_char;

        prev_hyphen = is_hyphen;
    }

    return .valid;
}

/// Valid slug characters (lowercase alphanumeric and hyphen)
fn isSlugChar(c: u8) bool {
    return switch (c) {
        'a'...'z', '0'...'9', '-' => true,
        else => false,
    };
}

/// Simple boolean validation
pub fn isValid(input: []const u8) bool {
    return validate(input) == .valid;
}

/// Slugify a string (convert to valid slug)
/// Returns the number of bytes written, or null if buffer too small
pub fn slugify(input: []const u8, output: []u8) ?usize {
    if (output.len == 0) return null;

    var out_idx: usize = 0;
    var prev_hyphen = true; // Start true to skip leading hyphens

    for (input) |c| {
        if (out_idx >= output.len - 1) break;
        if (out_idx >= MAX_SLUG_LENGTH) break;

        const lower = toLower(c);

        if (lower >= 'a' and lower <= 'z') {
            output[out_idx] = lower;
            out_idx += 1;
            prev_hyphen = false;
        } else if (lower >= '0' and lower <= '9') {
            output[out_idx] = lower;
            out_idx += 1;
            prev_hyphen = false;
        } else if ((c == '-' or c == '_' or c == ' ') and !prev_hyphen and out_idx > 0) {
            // Convert spaces and underscores to hyphens
            output[out_idx] = '-';
            out_idx += 1;
            prev_hyphen = true;
        }
        // Skip other characters
    }

    // Remove trailing hyphen
    if (out_idx > 0 and output[out_idx - 1] == '-') {
        out_idx -= 1;
    }

    return if (out_idx > 0) out_idx else null;
}

/// Convert character to lowercase
fn toLower(c: u8) u8 {
    if (c >= 'A' and c <= 'Z') {
        return c + 32;
    }
    return c;
}

// =============================================================
// Tests
// =============================================================

test "valid slugs" {
    try std.testing.expect(isValid("hello-world"));
    try std.testing.expect(isValid("my-post-123"));
    try std.testing.expect(isValid("a"));
    try std.testing.expect(isValid("123"));
    try std.testing.expect(isValid("a1b2c3"));
}

test "invalid slugs - empty" {
    try std.testing.expectEqual(SlugResult.empty, validate(""));
}

test "invalid slugs - hyphens" {
    try std.testing.expectEqual(SlugResult.leading_hyphen, validate("-hello"));
    try std.testing.expectEqual(SlugResult.trailing_hyphen, validate("hello-"));
    try std.testing.expectEqual(SlugResult.consecutive_hyphens, validate("hello--world"));
}

test "invalid slugs - characters" {
    try std.testing.expectEqual(SlugResult.uppercase_found, validate("Hello"));
    try std.testing.expectEqual(SlugResult.invalid_char, validate("hello_world"));
    try std.testing.expectEqual(SlugResult.invalid_char, validate("hello world"));
    try std.testing.expectEqual(SlugResult.invalid_char, validate("hello@world"));
}

test "slugify basic strings" {
    var buffer: [100]u8 = undefined;

    const len1 = slugify("Hello World", &buffer).?;
    try std.testing.expectEqualStrings("hello-world", buffer[0..len1]);

    const len2 = slugify("My Post Title!", &buffer).?;
    try std.testing.expectEqualStrings("my-post-title", buffer[0..len2]);

    const len3 = slugify("UPPERCASE", &buffer).?;
    try std.testing.expectEqualStrings("uppercase", buffer[0..len3]);
}

test "slugify edge cases" {
    var buffer: [100]u8 = undefined;

    // Multiple spaces/hyphens collapse to one
    const len1 = slugify("hello   world", &buffer).?;
    try std.testing.expectEqualStrings("hello-world", buffer[0..len1]);

    // Leading/trailing cleaned
    const len2 = slugify("  hello  ", &buffer).?;
    try std.testing.expectEqualStrings("hello", buffer[0..len2]);

    // Special chars removed
    const len3 = slugify("hello@world#test", &buffer).?;
    try std.testing.expectEqualStrings("helloworldtest", buffer[0..len3]);
}
