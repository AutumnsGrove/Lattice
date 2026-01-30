const std = @import("std");

pub fn build(b: *std.Build) void {
    // WASM target for browser execution
    const wasm_target = b.resolveTargetQuery(.{
        .cpu_arch = .wasm32,
        .os_tag = .freestanding,
    });

    // Build options
    const optimize = b.standardOptimizeOption(.{});
    const wasm_optimize = if (optimize == .Debug) .ReleaseSmall else optimize;

    // =============================================================
    // Shared modules (for imports across directories)
    // =============================================================
    const validation_module = b.createModule(.{
        .root_source_file = b.path("src/validation/root.zig"),
    });

    const search_module = b.createModule(.{
        .root_source_file = b.path("src/search/root.zig"),
    });

    // =============================================================
    // WASM Library (for browser)
    // =============================================================
    const wasm_root_module = b.createModule(.{
        .root_source_file = b.path("src/wasm/exports.zig"),
        .target = wasm_target,
        .optimize = wasm_optimize,
    });
    wasm_root_module.addImport("validation", validation_module);
    wasm_root_module.addImport("search", search_module);

    const wasm_lib = b.addExecutable(.{
        .name = "zig-core",
        .root_module = wasm_root_module,
    });

    // Export memory for JS interop
    wasm_lib.entry = .disabled;
    wasm_lib.root_module.export_symbol_names = &.{
        "setInput",
        "setQuery",
        "getInputBufferPtr",
        "getOutputBufferPtr",
        "getOutputLen",
        "clearBuffers",
        "validateEmail",
        "validateURL",
        "validateSlug",
        "validatePath",
        "slugify",
        "initSearchIndex",
        "performSearch",
        "getResultId",
        "getResultScore",
        "clearSearchIndex",
        "getVersion",
    };

    // Install WASM artifact to dist/
    const install_wasm = b.addInstallArtifact(wasm_lib, .{
        .dest_dir = .{ .override = .{ .custom = "../dist" } },
    });

    // =============================================================
    // Native tests
    // =============================================================
    const validation_test_module = b.createModule(.{
        .root_source_file = b.path("src/validation/root.zig"),
        .target = b.graph.host,
        .optimize = optimize,
    });

    const validation_tests = b.addTest(.{
        .root_module = validation_test_module,
    });

    const search_test_module = b.createModule(.{
        .root_source_file = b.path("src/search/root.zig"),
        .target = b.graph.host,
        .optimize = optimize,
    });

    const search_tests = b.addTest(.{
        .root_module = search_test_module,
    });

    // WASM exports test needs the module imports too
    const wasm_test_module = b.createModule(.{
        .root_source_file = b.path("src/wasm/exports.zig"),
        .target = b.graph.host,
        .optimize = optimize,
    });
    wasm_test_module.addImport("validation", validation_module);
    wasm_test_module.addImport("search", search_module);

    const wasm_tests = b.addTest(.{
        .root_module = wasm_test_module,
    });

    const run_validation_tests = b.addRunArtifact(validation_tests);
    const run_search_tests = b.addRunArtifact(search_tests);
    const run_wasm_tests = b.addRunArtifact(wasm_tests);

    // =============================================================
    // Build steps
    // =============================================================

    // Default build step
    const build_step = b.step("wasm", "Build WASM module");
    build_step.dependOn(&install_wasm.step);
    b.default_step.dependOn(build_step);

    // Test step
    const test_step = b.step("test", "Run all unit tests");
    test_step.dependOn(&run_validation_tests.step);
    test_step.dependOn(&run_search_tests.step);
    test_step.dependOn(&run_wasm_tests.step);
}
