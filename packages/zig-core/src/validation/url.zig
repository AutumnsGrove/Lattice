/// URL Validation
///
/// Validates URLs with a focus on security:
/// - Only allows http:// and https:// protocols
/// - Validates hostname structure
/// - Handles ports, paths, query strings, fragments
/// - Rejects dangerous patterns (javascript:, data:, file:)

const std = @import("std");

/// Validation result codes
pub const UrlResult = enum(u8) {
    invalid = 0,
    valid_http = 1,
    valid_https = 2,
    too_long = 3,
    no_protocol = 4,
    invalid_protocol = 5,
    empty_host = 6,
    invalid_host_char = 7,
    invalid_port = 8,
};

/// Maximum URL length (practical limit)
const MAX_URL_LENGTH: usize = 2048;

/// Validate a URL
pub fn validate(input: []const u8) UrlResult {
    if (input.len == 0) return .invalid;
    if (input.len > MAX_URL_LENGTH) return .too_long;

    // Parse protocol
    const protocol_end = std.mem.indexOf(u8, input, "://") orelse return .no_protocol;
    const protocol = input[0..protocol_end];

    // Only allow http and https
    const is_http = std.mem.eql(u8, protocol, "http");
    const is_https = std.mem.eql(u8, protocol, "https");

    if (!is_http and !is_https) return .invalid_protocol;

    // Get the rest after ://
    const rest = input[protocol_end + 3 ..];
    if (rest.len == 0) return .empty_host;

    // Find end of host (first /, ?, or #)
    var host_end: usize = rest.len;
    for (rest, 0..) |c, i| {
        if (c == '/' or c == '?' or c == '#') {
            host_end = i;
            break;
        }
    }

    const host_with_port = rest[0..host_end];
    if (host_with_port.len == 0) return .empty_host;

    // Separate host and port
    var host: []const u8 = host_with_port;
    if (std.mem.lastIndexOfScalar(u8, host_with_port, ':')) |colon_pos| {
        // Check if this is IPv6 (has brackets)
        if (std.mem.indexOfScalar(u8, host_with_port, '[') == null) {
            // Not IPv6, so this is a port separator
            const port_str = host_with_port[colon_pos + 1 ..];
            if (!validatePort(port_str)) return .invalid_port;
            host = host_with_port[0..colon_pos];
        }
    }

    if (host.len == 0) return .empty_host;

    // Validate host characters
    if (!validateHost(host)) return .invalid_host_char;

    return if (is_https) .valid_https else .valid_http;
}

/// Validate port number
fn validatePort(port: []const u8) bool {
    if (port.len == 0 or port.len > 5) return false;

    var value: u32 = 0;
    for (port) |c| {
        if (c < '0' or c > '9') return false;
        value = value * 10 + (c - '0');
        if (value > 65535) return false;
    }

    return true;
}

/// Validate hostname
fn validateHost(host: []const u8) bool {
    // Handle IPv4
    if (isIPv4(host)) return true;

    // Handle IPv6 in brackets
    if (host.len > 2 and host[0] == '[' and host[host.len - 1] == ']') {
        return true; // Simplified IPv6 validation
    }

    // Validate as hostname
    if (host[0] == '.' or host[host.len - 1] == '.') return false;
    if (host[0] == '-' or host[host.len - 1] == '-') return false;

    var prev_dot = false;
    for (host) |c| {
        const is_dot = c == '.';
        if (is_dot and prev_dot) return false;

        if (!isHostChar(c)) return false;
        prev_dot = is_dot;
    }

    return true;
}

/// Check if host is IPv4 address
fn isIPv4(host: []const u8) bool {
    var octets: u8 = 0;
    var current: u16 = 0;
    var digits: u8 = 0;

    for (host) |c| {
        if (c == '.') {
            if (digits == 0 or current > 255) return false;
            octets += 1;
            current = 0;
            digits = 0;
        } else if (c >= '0' and c <= '9') {
            current = current * 10 + (c - '0');
            digits += 1;
            if (digits > 3) return false;
        } else {
            return false;
        }
    }

    // Check final octet
    if (digits == 0 or current > 255) return false;
    octets += 1;

    return octets == 4;
}

/// Valid hostname characters
fn isHostChar(c: u8) bool {
    return switch (c) {
        'a'...'z', 'A'...'Z', '0'...'9' => true,
        '.', '-' => true,
        else => false,
    };
}

/// Simple boolean validation
pub fn isValid(input: []const u8) bool {
    const result = validate(input);
    return result == .valid_http or result == .valid_https;
}

/// Check if URL is HTTPS
pub fn isHttps(input: []const u8) bool {
    return validate(input) == .valid_https;
}

// =============================================================
// Tests
// =============================================================

test "valid URLs" {
    try std.testing.expectEqual(UrlResult.valid_https, validate("https://example.com"));
    try std.testing.expectEqual(UrlResult.valid_http, validate("http://example.com"));
    try std.testing.expectEqual(UrlResult.valid_https, validate("https://sub.domain.example.com"));
    try std.testing.expectEqual(UrlResult.valid_https, validate("https://example.com/path"));
    try std.testing.expectEqual(UrlResult.valid_https, validate("https://example.com:8080"));
    try std.testing.expectEqual(UrlResult.valid_https, validate("https://example.com/path?query=1"));
    try std.testing.expectEqual(UrlResult.valid_https, validate("https://example.com#fragment"));
}

test "valid URLs - IP addresses" {
    try std.testing.expectEqual(UrlResult.valid_http, validate("http://192.168.1.1"));
    try std.testing.expectEqual(UrlResult.valid_http, validate("http://127.0.0.1:3000"));
}

test "invalid URLs - wrong protocol" {
    try std.testing.expectEqual(UrlResult.invalid_protocol, validate("ftp://example.com"));
    try std.testing.expectEqual(UrlResult.invalid_protocol, validate("file:///etc/passwd"));
    // These don't have :// so they're detected as "no protocol" (still rejected)
    try std.testing.expectEqual(UrlResult.no_protocol, validate("javascript:alert(1)"));
    try std.testing.expectEqual(UrlResult.no_protocol, validate("data:text/html,test"));
}

test "invalid URLs - no protocol" {
    try std.testing.expectEqual(UrlResult.no_protocol, validate("example.com"));
    try std.testing.expectEqual(UrlResult.no_protocol, validate("//example.com"));
}

test "invalid URLs - empty host" {
    try std.testing.expectEqual(UrlResult.empty_host, validate("https://"));
    try std.testing.expectEqual(UrlResult.empty_host, validate("https:///path"));
}

test "invalid URLs - bad port" {
    try std.testing.expectEqual(UrlResult.invalid_port, validate("https://example.com:99999"));
    try std.testing.expectEqual(UrlResult.invalid_port, validate("https://example.com:abc"));
}

test "isHttps detection" {
    try std.testing.expect(isHttps("https://example.com"));
    try std.testing.expect(!isHttps("http://example.com"));
}
