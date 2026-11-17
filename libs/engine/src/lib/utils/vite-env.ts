/**
 * Read a Vite environment variable without breaking a plain Worker bundle
 *
 * `import.meta.env` is a Vite transform. In a Worker bundled by wrangler there
 * is no Vite, so `import.meta.env` is `undefined` and `import.meta.env.FOO`
 * throws `TypeError: Cannot read properties of undefined` **at module load**.
 *
 * That failure mode is nasty: it is not a type error, it is not caught by any
 * test, and it does not show up until Cloudflare refuses the upload — costing
 * the whole deploy, hours after the import was added. Which is exactly what
 * happened to `deploy-durable-objects` when tenant creation began importing the
 * platform config barrel (#1723).
 *
 * The same hazard runs the other way, and this function was written wrong the
 * first time because of it: Vite finds `import.meta.env` by its **literal
 * token**. Hoist it into a variable first — `const meta = import.meta; meta.env.FOO`
 * — and neither the dev injection nor the build substitution fires, so every
 * `VITE_*` override silently falls back to its default. Verified in a real Vite
 * build: the hoisted form emitted `import.meta.env?.VITE_BILLING_URL` untouched
 * and resolved to the default, while this form inlined the override.
 *
 * So the literal has to appear, guarded so it cannot throw.
 *
 * @param name - the `VITE_`-prefixed variable, e.g. "VITE_BILLING_URL"
 * @returns the value when running under Vite, otherwise undefined
 */
export function readViteEnv(name: string): string | undefined {
	// Keep `import.meta.env` literal — see above. `typeof` is what makes it safe
	// outside Vite: accessing a property on undefined would throw, but asking for
	// its type does not.
	if (typeof import.meta.env === "undefined") return undefined;

	// The bare object is substituted as a whole under Vite, so a dynamic key
	// works: every `VITE_*` variable present at build time is in that object.
	return (import.meta.env as Record<string, string | undefined>)[name];
}
