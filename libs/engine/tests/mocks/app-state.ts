/**
 * Mock for SvelteKit's $app/state module (Svelte 5 / SvelteKit 2)
 * Used in vitest to allow testing components that depend on SvelteKit state
 *
 * Unlike $app/stores which uses Svelte stores with subscribe(),
 * $app/state provides reactive objects directly accessed via runes.
 */

// Mock page state with default values
// This is a plain object (not a store) - reactivity comes from Svelte 5 runes
export const page = {
  url: new URL("http://localhost/"),
  params: {},
  route: { id: "/" },
  status: 200,
  error: null,
  data: {},
  form: null,
};

// Mock navigating state (null when not navigating)
export const navigating = null;

// Mock updated state
export const updated = {
  current: false,
  check: async () => false,
};
