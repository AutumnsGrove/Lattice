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
 * @param name - the `VITE_`-prefixed variable, e.g. "VITE_BILLING_URL"
 * @returns the value when running under Vite, otherwise undefined
 */
export function readViteEnv(name: string): string | undefined {
	// Assigning import.meta to a local first keeps the property access off a
	// possibly-undefined object under bundlers that leave it as `{}`.
	const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
	return meta.env?.[name];
}
