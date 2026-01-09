/**
 * Mock for $app/stores in vitest
 * Used when testing components that import from the engine package
 */

import { writable, readable } from "svelte/store";

export const page = readable({
  url: new URL("http://localhost:5173"),
  params: {},
  route: { id: "/" },
  status: 200,
  error: null,
  data: {},
  form: null,
});

export const navigating = readable(null);

export const updated = {
  subscribe: readable(false).subscribe,
  check: async () => false,
};
