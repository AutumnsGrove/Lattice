/// WASM Export Module
///
/// This is the main entry point for the WASM module.
/// It re-exports memory management functions and provides
/// thin wrappers around validation/search functions.

const std = @import("std");
const memory = @import("memory.zig");
const validation = @import("validation");
const search = @import("search");

// =============================================================
// Memory Management Exports (from memory.zig)
// =============================================================

pub const setInput = memory.setInput;
pub const setQuery = memory.setQuery;
pub const getInputBufferPtr = memory.getInputBufferPtr;
pub const getOutputBufferPtr = memory.getOutputBufferPtr;
pub const getOutputLen = memory.getOutputLen;
pub const clearBuffers = memory.clearBuffers;

// =============================================================
// Validation Exports
// =============================================================

/// Validate email from input buffer
/// Returns: 0=invalid, 1=valid, 2+=specific error code
export fn validateEmail() u8 {
    const input = memory.getInput();
    return @intFromEnum(validation.email.validate(input));
}

/// Validate URL from input buffer
/// Returns: 0=invalid, 1=http, 2=https, 3+=specific error code
export fn validateURL() u8 {
    const input = memory.getInput();
    return @intFromEnum(validation.url.validate(input));
}

/// Validate slug from input buffer
/// Returns: 0=invalid, 1=valid, 2+=specific error code
export fn validateSlug() u8 {
    const input = memory.getInput();
    return @intFromEnum(validation.slug.validate(input));
}

/// Validate path from input buffer (directory traversal prevention)
/// Returns: 0=unsafe, 1=safe, 2+=specific error code
export fn validatePath() u8 {
    const input = memory.getInput();
    return @intFromEnum(validation.path.validate(input));
}

/// Slugify input string, write result to output buffer
/// Returns: length of slugified string, or 0 if failed
export fn slugify() usize {
    const input = memory.getInput();
    if (validation.slug.slugify(input, &memory.output_buffer)) |len| {
        memory.output_len = len;
        return len;
    }
    return 0;
}

// =============================================================
// Search Exports
// =============================================================

/// Initialize the search index with JSON data
/// Input buffer should contain serialized index data
/// Returns: 1=success, 0=failure
export fn initSearchIndex() u8 {
    const data = memory.getInput();
    return if (search.index.init(data)) 1 else 0;
}

/// Perform a search
/// Query should be set via setQuery(), max_results is the limit
/// Results are written to output buffer as binary data
/// Returns: number of results found
export fn performSearch(max_results: u8) u8 {
    const query = memory.getQuery();
    return search.index.search(query, max_results, &memory.output_buffer, &memory.output_len);
}

/// Get a specific search result's document ID
/// index is 0-based position in results
export fn getResultId(result_index: u8) u16 {
    return search.index.getResultId(result_index);
}

/// Get a specific search result's score
/// index is 0-based position in results
export fn getResultScore(result_index: u8) f32 {
    return search.index.getResultScore(result_index);
}

/// Clear the search index and free memory
export fn clearSearchIndex() void {
    search.index.clear();
}

// =============================================================
// Utility Exports
// =============================================================

/// Get the WASM module version (for debugging)
export fn getVersion() u32 {
    return 1; // Version 0.1.0 encoded as integer
}

// =============================================================
// Tests
// =============================================================

test "validation exports work" {
    // Test email validation
    const email_str = "test@example.com";
    _ = memory.setInput(email_str.ptr, email_str.len);
    try std.testing.expectEqual(@as(u8, 1), validateEmail());

    // Test invalid email
    const bad_email = "notanemail";
    _ = memory.setInput(bad_email.ptr, bad_email.len);
    try std.testing.expect(validateEmail() != 1);
}

test "URL validation exports work" {
    const url_str = "https://example.com";
    _ = memory.setInput(url_str.ptr, url_str.len);
    try std.testing.expectEqual(@as(u8, 2), validateURL()); // 2 = valid_https

    const http_str = "http://example.com";
    _ = memory.setInput(http_str.ptr, http_str.len);
    try std.testing.expectEqual(@as(u8, 1), validateURL()); // 1 = valid_http
}

test "path validation exports work" {
    const safe_path = "images/photo.jpg";
    _ = memory.setInput(safe_path.ptr, safe_path.len);
    try std.testing.expectEqual(@as(u8, 1), validatePath()); // 1 = safe

    const unsafe_path = "../etc/passwd";
    _ = memory.setInput(unsafe_path.ptr, unsafe_path.len);
    try std.testing.expectEqual(@as(u8, 4), validatePath()); // 4 = traversal_detected
}

test "slugify exports work" {
    const input = "Hello World!";
    _ = memory.setInput(input.ptr, input.len);
    const len = slugify();
    try std.testing.expect(len > 0);
    try std.testing.expectEqualStrings("hello-world", memory.output_buffer[0..len]);
}
