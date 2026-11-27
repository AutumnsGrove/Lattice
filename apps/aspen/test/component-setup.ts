import { cleanup } from "@testing-library/svelte";
import { afterEach } from "vitest";

/**
 * Component-test setup.
 *
 * Only two jobs: unmount whatever a test mounted, and put `fetch` back. A component
 * that silently kept talking to the previous test's stub is the kind of failure that
 * looks like a bug in the component.
 */
afterEach(() => {
	cleanup();
});
