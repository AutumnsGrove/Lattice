/// Email Validation
///
/// Validates email addresses according to a practical subset of RFC 5321/5322.
/// We prioritize real-world validity over strict RFC compliance:
/// - Local part: alphanumeric, dots, hyphens, underscores, plus signs
/// - @ symbol required
/// - Domain part: valid hostname with at least one dot
/// - No consecutive dots, no leading/trailing dots
/// - Max length: 254 characters (RFC 5321)

const std = @import("std");

/// Validation result codes
pub const EmailResult = enum(u8) {
    valid = 1,
    invalid = 0,
    too_long = 2,
    no_at_symbol = 3,
    empty_local = 4,
    empty_domain = 5,
    invalid_local_char = 6,
    invalid_domain_char = 7,
    consecutive_dots = 8,
    leading_dot = 9,
    trailing_dot = 10,
    no_domain_dot = 11,
};

/// Maximum email length per RFC 5321
const MAX_EMAIL_LENGTH: usize = 254;

/// Validate an email address
pub fn validate(input: []const u8) EmailResult {
    // Check length
    if (input.len == 0) return .invalid;
    if (input.len > MAX_EMAIL_LENGTH) return .too_long;

    // Find @ symbol
    const at_pos = std.mem.indexOfScalar(u8, input, '@') orelse return .no_at_symbol;

    // Split into local and domain parts
    const local = input[0..at_pos];
    const domain = input[at_pos + 1 ..];

    // Validate local part
    if (local.len == 0) return .empty_local;
    if (!validateLocalPart(local)) return .invalid_local_char;

    // Validate domain part
    if (domain.len == 0) return .empty_domain;
    const domain_result = validateDomain(domain);
    if (domain_result != .valid) return domain_result;

    return .valid;
}

/// Validate the local part (before @)
fn validateLocalPart(local: []const u8) bool {
    // Check for leading/trailing dots
    if (local[0] == '.') return false;
    if (local[local.len - 1] == '.') return false;

    var prev_dot = false;
    for (local) |c| {
        const is_dot = c == '.';

        // Check for consecutive dots
        if (is_dot and prev_dot) return false;

        // Allowed characters: alphanumeric, dots, hyphens, underscores, plus
        if (!isLocalChar(c)) return false;

        prev_dot = is_dot;
    }

    return true;
}

/// Validate the domain part (after @)
fn validateDomain(domain: []const u8) EmailResult {
    // Check for leading/trailing dots or hyphens
    if (domain[0] == '.') return .leading_dot;
    if (domain[domain.len - 1] == '.') return .trailing_dot;
    if (domain[0] == '-') return .invalid_domain_char;
    if (domain[domain.len - 1] == '-') return .invalid_domain_char;

    var has_dot = false;
    var prev_dot = false;

    for (domain) |c| {
        const is_dot = c == '.';

        // Check for consecutive dots
        if (is_dot and prev_dot) return .consecutive_dots;

        // Hyphen cannot follow dot or precede dot
        if (c == '-' and prev_dot) return .invalid_domain_char;

        // Allowed characters: alphanumeric, dots, hyphens
        if (!isDomainChar(c)) return .invalid_domain_char;

        if (is_dot) has_dot = true;
        prev_dot = is_dot;
    }

    // Domain must have at least one dot (TLD required)
    if (!has_dot) return .no_domain_dot;

    return .valid;
}

/// Check if character is valid in local part
fn isLocalChar(c: u8) bool {
    return switch (c) {
        'a'...'z', 'A'...'Z', '0'...'9' => true,
        '.', '-', '_', '+' => true,
        else => false,
    };
}

/// Check if character is valid in domain
fn isDomainChar(c: u8) bool {
    return switch (c) {
        'a'...'z', 'A'...'Z', '0'...'9' => true,
        '.', '-' => true,
        else => false,
    };
}

/// Simple boolean validation (for WASM export)
pub fn isValid(input: []const u8) bool {
    return validate(input) == .valid;
}

// =============================================================
// Tests
// =============================================================

test "valid emails" {
    try std.testing.expect(isValid("test@example.com"));
    try std.testing.expect(isValid("user.name@domain.org"));
    try std.testing.expect(isValid("user+tag@example.co.uk"));
    try std.testing.expect(isValid("a@b.co"));
    try std.testing.expect(isValid("test_user@sub.domain.com"));
    try std.testing.expect(isValid("CAPS@DOMAIN.COM"));
}

test "invalid emails - no @" {
    try std.testing.expectEqual(EmailResult.no_at_symbol, validate("nodomain.com"));
    try std.testing.expectEqual(EmailResult.no_at_symbol, validate("justastring"));
}

test "invalid emails - empty parts" {
    try std.testing.expectEqual(EmailResult.empty_local, validate("@domain.com"));
    try std.testing.expectEqual(EmailResult.empty_domain, validate("user@"));
}

test "invalid emails - consecutive dots" {
    try std.testing.expect(!isValid("user..name@domain.com"));
    try std.testing.expectEqual(EmailResult.consecutive_dots, validate("user@domain..com"));
}

test "invalid emails - leading/trailing dots" {
    try std.testing.expect(!isValid(".user@domain.com"));
    try std.testing.expect(!isValid("user.@domain.com"));
    try std.testing.expectEqual(EmailResult.leading_dot, validate("user@.domain.com"));
    try std.testing.expectEqual(EmailResult.trailing_dot, validate("user@domain.com."));
}

test "invalid emails - no TLD" {
    try std.testing.expectEqual(EmailResult.no_domain_dot, validate("user@localhost"));
}

test "invalid emails - too long" {
    var long_email: [300]u8 = undefined;
    @memset(&long_email, 'a');
    long_email[50] = '@';
    long_email[100] = '.';
    try std.testing.expectEqual(EmailResult.too_long, validate(&long_email));
}
