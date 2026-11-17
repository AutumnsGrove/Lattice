import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { readViteEnv } from "./vite-env.js";

/**
 * The point of this helper is that it does not throw. Under vitest there is no
 * Vite `import.meta.env`, which is exactly the Worker condition that broke
 * deploy-durable-objects (#1723): a bare `import.meta.env.FOO` is a
 * `TypeError: Cannot read properties of undefined` at module load, and it takes
 * the whole upload with it.
 */
describe("readViteEnv", () => {
	it("returns undefined instead of throwing when there is no Vite env", () => {
		expect(() => readViteEnv("VITE_BILLING_URL")).not.toThrow();
		expect(readViteEnv("VITE_BILLING_URL")).toBeUndefined();
	});

	it("reports undefined for a variable that is not set", () => {
		expect(readViteEnv("VITE_DEFINITELY_NOT_SET_ANYWHERE")).toBeUndefined();
	});
});

// =============================================================================
// THE REGRESSION GUARD
// =============================================================================

/** Comments explain the hazard; they are not the hazard. */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/** Every source file under `src/lib`, so a new one cannot slip past. */
function sourceFiles(dir: string, found: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			sourceFiles(full, found);
		} else if (full.endsWith(".ts") && !full.endsWith(".test.ts")) {
			found.push(full);
		}
	}
	return found;
}

/**
 * `import.meta.env.FOO` at module scope is a Worker deploy failure.
 *
 * It is not a type error, no test exercises it, and the only symptom is
 * Cloudflare rejecting the upload with `Cannot read properties of undefined`
 * — hours after the import that caused it. This happened to
 * `deploy-durable-objects` on 2026-11-17 (#1723): tenant creation began
 * importing the platform config barrel, which read `import.meta.env` at module
 * load, and the worker stopped deploying for two hours while every PR stayed
 * green.
 *
 * A dot access is the tell. `import.meta.env?.FOO` is fine, `import.meta.env[name]`
 * behind a truthiness check is fine, and `vite-env.ts` is where the one
 * considered access lives.
 */
describe("no module reads import.meta.env without a guard", () => {
	// The single file allowed to touch it, where the access is deliberate.
	const ALLOWED = new Set(["utils/vite-env.ts"]);

	it("finds no bare `import.meta.env.` access outside the helper", () => {
		const root = join(process.cwd(), "src/lib");
		const offenders = sourceFiles(root)
			.map((file) => file.slice(root.length + 1).replaceAll("\\", "/"))
			.filter((relative) => !ALLOWED.has(relative))
			.filter((relative) =>
				/import\.meta\.env\./.test(stripComments(readFileSync(join(root, relative), "utf8"))),
			);

		expect(offenders).toEqual([]);
	});
});

/**
 * The other half of the same lesson.
 *
 * Vite finds `import.meta.env` by its literal token. The first version of this
 * helper hoisted it (`const meta = import.meta; meta.env?.[name]`), which is
 * safe in a Worker and silently kills every `VITE_*` override under Vite — the
 * build leaves `import.meta.env` untouched, so `meta.env` is undefined at
 * runtime and the default always wins. Confirmed in a real build: the override
 * was dropped.
 *
 * So: the literal has to stay visible, and this asserts it does.
 */
describe("readViteEnv keeps the literal Vite looks for", () => {
	const source = stripComments(
		readFileSync(join(process.cwd(), "src/lib/utils/vite-env.ts"), "utf8"),
	);

	it("contains the literal `import.meta.env` token", () => {
		expect(source).toContain("import.meta.env");
	});

	it("guards that literal with typeof rather than hoisting it", () => {
		expect(source).toMatch(/typeof import\.meta\.env/);
		// Hoisting import.meta into a variable is what breaks the substitution.
		expect(source).not.toMatch(/const meta = import\.meta/);
	});
});
