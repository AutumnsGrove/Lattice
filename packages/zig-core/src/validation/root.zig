/// Validation Library Root
///
/// This module re-exports all validators and provides the public API.
/// Each validator is designed to be security-focused and performant.

pub const email = @import("email.zig");
pub const url = @import("url.zig");
pub const slug = @import("slug.zig");
pub const path = @import("path.zig");

// Re-export main types for convenience
pub const EmailResult = email.EmailResult;
pub const UrlResult = url.UrlResult;
pub const SlugResult = slug.SlugResult;
pub const PathResult = path.PathResult;

// =============================================================
// Comprehensive tests
// =============================================================

test {
    // Run all sub-module tests
    @import("std").testing.refAllDecls(@This());
}
