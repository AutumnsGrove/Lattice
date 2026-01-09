/**
 * Mock for $app/environment in vitest
 * Used when testing components that import from the engine package
 */

export const browser = true;
export const dev = true;
export const building = false;
export const version = "test";
