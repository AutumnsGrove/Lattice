/// <reference types="@cloudflare/vitest-plugin/types" />

/**
 * Bindings as seen from inside the test pool.
 *
 * Aspen's own `App.Platform["env"]` is the source of truth — if a binding is
 * added to the app, it is visible here without a second list to keep in step.
 * `STUB_CONTROL` is the one addition: a KV namespace the stubbed service
 * bindings read, so a test can make Heartwood unreachable on purpose.
 *
 * The alias exists because an interface can only extend an identifier, not an
 * indexed access (`App.Platform["env"]` directly is TS2499).
 *
 * `checkJs` is off in `tsconfig.json`, so the built artifact imported by
 * `pool-entry.ts` is not type-checked — SvelteKit's generated bundle is not ours
 * to fix, and following it buried this file in unrelated errors.
 */
type AspenTestEnv = App.Platform["env"] & {
	STUB_CONTROL: KVNamespace;
};

declare namespace Cloudflare {
	interface Env extends AspenTestEnv {}
}
