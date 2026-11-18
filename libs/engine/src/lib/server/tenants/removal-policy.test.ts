import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it, expect } from "vitest";
import {
	DEFAULT_REMOVAL_POLICY,
	REMOVAL_POLICIES,
	isRemovalPolicyKey,
	resolveRemovalPolicy,
} from "./removal-policy";

/**
 * The citation an email sends has to point at a rule the person can find. These
 * read the actual legal documents so a renamed section fails here rather than
 * arriving in somebody's inbox.
 *
 * The file is found by walking up from the working directory rather than from
 * `import.meta.url`: under Vite the latter is not always a `file:` URL, and the
 * package is run from both the repo root and its own workspace.
 */
function doc(name: string): string {
	let dir = process.cwd();
	for (let depth = 0; depth < 8; depth++) {
		const candidate = join(dir, "docs", "legal", name);
		if (existsSync(candidate)) return readFileSync(candidate, "utf8");
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	throw new Error(`could not find docs/legal/${name} above ${process.cwd()}`);
}

describe("removal policy", () => {
	it("cites sections that still exist in the Acceptable Use Policy", () => {
		const aup = doc("acceptable-use-policy.md");

		for (const policy of Object.values(REMOVAL_POLICIES)) {
			if (!policy.section) continue;
			// The AUP headings are `### 1.4 Spam and Malicious Content` — the section
			// number without the marker we print in the email.
			expect(aup, `${policy.key} cites a section the AUP no longer has`).toContain(
				`### ${policy.section.replace("§", "")} ${policy.title}`,
			);
			expect(policy.url).toContain("acceptable-use");
		}
	});

	it("marks only the abuse sections as abuse", () => {
		expect(REMOVAL_POLICIES["aup-1.4"].abuse).toBe(true);
		expect(REMOVAL_POLICIES["aup-1.5"].abuse).toBe(true);
		expect(REMOVAL_POLICIES["aup-1.9"].abuse).toBe(true);
		expect(REMOVAL_POLICIES.requested.abuse).toBe(false);
	});

	it("has a plain-language description of what was found for each section", () => {
		for (const policy of Object.values(REMOVAL_POLICIES)) {
			expect(policy.found.length, `${policy.key} has no description`).toBeGreaterThan(20);
			// A citation the person has to decode is not an explanation.
			expect(policy.found).not.toMatch(/tenant_id|link_spam|row/i);
		}
	});

	it("defaults to the link-farm section, which is what removals are usually for", () => {
		expect(resolveRemovalPolicy(undefined).key).toBe(DEFAULT_REMOVAL_POLICY);
		expect(DEFAULT_REMOVAL_POLICY).toBe("aup-1.4");
	});

	it("refuses an unknown citation instead of guessing", () => {
		expect(() => resolveRemovalPolicy("aup-9.9")).toThrow(/unknown removal policy/);
		expect(isRemovalPolicyKey("aup-9.9")).toBe(false);
	});
});
