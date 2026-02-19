/**
 * Mock for SvelteKit's $app/environment module
 * Used in vitest to test stores that depend on browser detection
 */

// Default to true for browser-based tests (happy-dom simulates browser)
export let browser = true;

// Allow tests to override the browser value
export function setBrowser(value: boolean) {
  browser = value;
}

// Building/dev flags (not typically needed for store tests)
export const building = false;
export const dev = true;
export const version = "test";
