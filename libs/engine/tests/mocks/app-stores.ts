/**
 * Mock for SvelteKit's $app/stores module
 * Used in vitest to allow testing components that depend on SvelteKit stores
 */

import { readable, writable } from "svelte/store";

// Mock page store with default values
export const page = readable({
  url: new URL("http://localhost/"),
  params: {},
  route: { id: "/" },
  status: 200,
  error: null,
  data: {},
  form: null,
});

// Mock navigating store (null when not navigating)
export const navigating = readable(null);

// Mock updated store
export const updated = {
  subscribe: readable(false).subscribe,
  check: async () => false,
};
