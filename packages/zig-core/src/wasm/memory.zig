/// WASM Memory Management
///
/// This module handles string passing between JavaScript and Zig.
/// We use a simple fixed-size input buffer approach:
/// - JS writes UTF-8 bytes to the buffer via setInput()
/// - Zig reads from the buffer for validation/search operations
/// - Results are returned as simple integers (status codes)
///
/// For more complex return values (like search results), we use
/// a separate output buffer that JS can read from.

const std = @import("std");

/// Input buffer for strings from JavaScript
/// 4KB should be plenty for validation (emails, URLs, slugs, paths)
pub const INPUT_BUFFER_SIZE: usize = 4096;
pub var input_buffer: [INPUT_BUFFER_SIZE]u8 = undefined;
pub var input_len: usize = 0;

/// Output buffer for complex return values (search results, etc.)
/// 16KB for search results (up to ~200 results with metadata)
pub const OUTPUT_BUFFER_SIZE: usize = 16384;
pub var output_buffer: [OUTPUT_BUFFER_SIZE]u8 = undefined;
pub var output_len: usize = 0;

/// Secondary buffer for search queries (separate from main input)
pub const QUERY_BUFFER_SIZE: usize = 1024;
pub var query_buffer: [QUERY_BUFFER_SIZE]u8 = undefined;
pub var query_len: usize = 0;

/// Set the input string from JavaScript
/// Returns 1 on success, 0 if input is too large
pub export fn setInput(ptr: [*]const u8, len: usize) u8 {
    if (len > INPUT_BUFFER_SIZE) {
        return 0;
    }
    @memcpy(input_buffer[0..len], ptr[0..len]);
    input_len = len;
    return 1;
}

/// Set the search query from JavaScript
pub export fn setQuery(ptr: [*]const u8, len: usize) u8 {
    if (len > QUERY_BUFFER_SIZE) {
        return 0;
    }
    @memcpy(query_buffer[0..len], ptr[0..len]);
    query_len = len;
    return 1;
}

/// Get pointer to input buffer (for JS to write directly)
pub export fn getInputBufferPtr() [*]u8 {
    return &input_buffer;
}

/// Get pointer to output buffer (for JS to read results)
pub export fn getOutputBufferPtr() [*]const u8 {
    return &output_buffer;
}

/// Get the current output length
pub export fn getOutputLen() usize {
    return output_len;
}

/// Get the input as a slice (for internal Zig use)
pub fn getInput() []const u8 {
    return input_buffer[0..input_len];
}

/// Get the query as a slice (for internal Zig use)
pub fn getQuery() []const u8 {
    return query_buffer[0..query_len];
}

/// Write to output buffer (for internal Zig use)
pub fn writeOutput(data: []const u8) bool {
    if (data.len > OUTPUT_BUFFER_SIZE) {
        return false;
    }
    @memcpy(output_buffer[0..data.len], data);
    output_len = data.len;
    return true;
}

/// Clear all buffers
pub export fn clearBuffers() void {
    input_len = 0;
    output_len = 0;
    query_len = 0;
}

// =============================================================
// Tests
// =============================================================

test "setInput works for normal strings" {
    const test_str = "hello@example.com";
    const result = setInput(test_str.ptr, test_str.len);
    try std.testing.expectEqual(@as(u8, 1), result);
    try std.testing.expectEqualStrings(test_str, getInput());
}

test "setInput rejects oversized input" {
    // Create a string larger than buffer
    var large_str: [INPUT_BUFFER_SIZE + 1]u8 = undefined;
    @memset(&large_str, 'a');
    const result = setInput(&large_str, large_str.len);
    try std.testing.expectEqual(@as(u8, 0), result);
}

test "clearBuffers resets state" {
    const test_str = "test";
    _ = setInput(test_str.ptr, test_str.len);
    clearBuffers();
    try std.testing.expectEqual(@as(usize, 0), input_len);
}
