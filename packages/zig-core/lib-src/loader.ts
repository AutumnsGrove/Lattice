/**
 * WASM Module Loader
 *
 * Handles lazy loading and initialization of the Zig WASM module.
 * Following the same pattern as imageProcessor.ts in the engine.
 */

// WASM instance and memory references (lazy loaded)
let wasmInstance: WebAssembly.Instance | null = null;
let wasmMemory: WebAssembly.Memory | null = null;
let loadAttempted = false;
let loadPromise: Promise<boolean> | null = null;

// Text encoder/decoder for string conversion
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * WASM exports interface
 */
export interface ZigCoreExports {
  memory: WebAssembly.Memory;
  // Memory management
  setInput: (ptr: number, len: number) => number;
  setQuery: (ptr: number, len: number) => number;
  getInputBufferPtr: () => number;
  getOutputBufferPtr: () => number;
  getOutputLen: () => number;
  clearBuffers: () => void;
  // Validation
  validateEmail: () => number;
  validateURL: () => number;
  validateSlug: () => number;
  validatePath: () => number;
  slugify: () => number;
  // Search
  initSearchIndex: () => number;
  performSearch: (maxResults: number) => number;
  getResultId: (index: number) => number;
  getResultScore: (index: number) => number;
  clearSearchIndex: () => void;
  // Utility
  getVersion: () => number;
}

/**
 * Check if WebAssembly is supported in the current environment
 */
export function isWasmSupported(): boolean {
  return (
    typeof WebAssembly === "object" &&
    typeof WebAssembly.instantiate === "function"
  );
}

/**
 * Load the WASM module
 * Returns true if loaded successfully, false otherwise
 */
export async function loadWasm(): Promise<boolean> {
  // Return cached promise if already loading
  if (loadPromise) return loadPromise;

  // Return cached result if already attempted
  if (loadAttempted) return wasmInstance !== null;

  loadPromise = (async () => {
    loadAttempted = true;

    if (!isWasmSupported()) {
      console.warn("[zig-core] WebAssembly not supported, using JS fallback");
      return false;
    }

    try {
      // Try to fetch and instantiate the WASM module
      // The path will be resolved by the bundler (Vite, etc.)
      const wasmUrl = new URL("../dist/zig-core.wasm", import.meta.url);
      const response = await fetch(wasmUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch WASM: ${response.status}`);
      }

      const wasmBytes = await response.arrayBuffer();
      const result = await WebAssembly.instantiate(wasmBytes, {
        // No imports needed for our WASM module
      });

      wasmInstance = result.instance;
      wasmMemory = (wasmInstance.exports as unknown as ZigCoreExports).memory;

      console.log("[zig-core] WASM module loaded successfully");
      return true;
    } catch (error) {
      console.warn("[zig-core] Failed to load WASM, using JS fallback:", error);
      wasmInstance = null;
      wasmMemory = null;
      return false;
    }
  })();

  return loadPromise;
}

/**
 * Get the WASM exports (must call loadWasm first)
 */
export function getExports(): ZigCoreExports | null {
  if (!wasmInstance) return null;
  return wasmInstance.exports as unknown as ZigCoreExports;
}

/**
 * Check if WASM is currently loaded
 */
export function isWasmLoaded(): boolean {
  return wasmInstance !== null;
}

/**
 * Write a string to the WASM input buffer
 * Returns true if successful
 */
export function writeInput(str: string): boolean {
  const exports = getExports();
  if (!exports || !wasmMemory) return false;

  const bytes = textEncoder.encode(str);
  const ptr = exports.getInputBufferPtr();

  // Write bytes to WASM memory
  const view = new Uint8Array(wasmMemory.buffer, ptr, bytes.length);
  view.set(bytes);

  // Tell WASM about the input
  return exports.setInput(ptr, bytes.length) === 1;
}

/**
 * Write a string to the WASM query buffer (for search)
 */
export function writeQuery(str: string): boolean {
  const exports = getExports();
  if (!exports || !wasmMemory) return false;

  const bytes = textEncoder.encode(str);
  const ptr = exports.getInputBufferPtr(); // Reuse input buffer ptr calculation

  // Query buffer is separate, but we need to write via setQuery
  // For simplicity, write to input area then call setQuery
  const view = new Uint8Array(wasmMemory.buffer, ptr, bytes.length);
  view.set(bytes);

  return exports.setQuery(ptr, bytes.length) === 1;
}

/**
 * Read the output buffer as a string
 */
export function readOutput(): string {
  const exports = getExports();
  if (!exports || !wasmMemory) return "";

  const len = exports.getOutputLen();
  if (len === 0) return "";

  const ptr = exports.getOutputBufferPtr();
  const view = new Uint8Array(wasmMemory.buffer, ptr, len);
  return textDecoder.decode(view);
}

/**
 * Read the output buffer as raw bytes
 */
export function readOutputBytes(): Uint8Array {
  const exports = getExports();
  if (!exports || !wasmMemory) return new Uint8Array(0);

  const len = exports.getOutputLen();
  if (len === 0) return new Uint8Array(0);

  const ptr = exports.getOutputBufferPtr();
  // Return a copy to avoid memory issues
  return new Uint8Array(wasmMemory.buffer.slice(ptr, ptr + len));
}

/**
 * Clear all WASM buffers
 */
export function clearBuffers(): void {
  const exports = getExports();
  if (exports) {
    exports.clearBuffers();
  }
}
