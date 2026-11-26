/**
 * Fail when a model ID is typed somewhere other than the registry.
 *
 * Seven call sites used to hold their own model string or price table, and they
 * drifted: the same model was `deepseek-v3.2` in four places, two of them
 * pointing at models OpenRouter had already retired (#1602). A hardcoded ID is
 * invisible until someone audits it, so this makes it fail instead.
 *
 *   pnpm models:ids
 *
 * The fix for a hit is `MODELS.SOMETHING` from `@autumnsgrove/lumen-registry`.
 * When the ID is genuinely data — the registry itself, a test fixture, a spec —
 * add the file to ALLOWED below, saying why.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/**
 * Vendor prefixes that make a `vendor/model` string an OpenRouter model ID
 * rather than an import path. Deliberately a list: "src/lib" and
 * "@autumnsgrove/curios" are also `a/b`, and flagging those would make the check
 * noise nobody reads.
 */
const VENDORS = [
	"ai21",
	"alibaba",
	"anthropic",
	"baai",
	"cerebras",
	"cohere",
	"deepseek",
	"google",
	"groq",
	"meta-llama",
	"minimax",
	"mistralai",
	"moonshotai",
	"nvidia",
	"openai",
	"perplexity",
	"qwen",
	"together",
	"x-ai",
	"xiaomi",
	"@cf",
	"@hf",
];

const PATTERN = new RegExp(
	String.raw`["'\`]((?:${VENDORS.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})/[A-Za-z0-9][A-Za-z0-9._:-]*)["'\`]`,
	"g",
);

/** Files where a literal ID is the point, not a copy. */
const ALLOWED: RegExp[] = [
	// The registry's own data.
	/^libs\/lumen-registry\/src\/data\//,
	// The catalog module's comments name the models it cannot cover, so a person
	// reading the gap knows which two are hand-priced.
	/^libs\/lumen-registry\/src\/catalog\.ts$/,
	// Parked and archived code is not routed anywhere.
	/^_junkdrawer\//,
	/^_archived\//,
	// Fixtures: a test that names a model is describing a stored row, not routing.
	/\.test\.ts$/,
	/\.spec\.ts$/,
	/\/__tests__\//,
	/\/e2e\//,
];

const SCANNED = /\.(ts|tsx|js|mjs|svelte|astro|toml)$/;

function trackedFiles(): string[] {
	const out = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" });
	return out.split("\0").filter((file) => file !== "" && SCANNED.test(file));
}

const hits: string[] = [];

for (const file of trackedFiles()) {
	if (ALLOWED.some((allowed) => allowed.test(file))) {
		continue;
	}

	let text: string;
	try {
		text = readFileSync(file, "utf8");
	} catch {
		continue;
	}

	const lines = text.split("\n");
	for (const [index, line] of lines.entries()) {
		for (const match of line.matchAll(PATTERN)) {
			hits.push(`${file}:${index + 1}  ${match[1]}`);
		}
	}
}

if (hits.length > 0) {
	console.error(
		[
			`${hits.length} model ${hits.length === 1 ? "ID is" : "IDs are"} hardcoded outside the registry:`,
			"",
			...hits.map((hit) => `- ${hit}`),
			"",
			"Use `MODELS.<NAME>` from `@autumnsgrove/lumen-registry` instead, or add the",
			"file to ALLOWED in scripts/models/check-ids.ts with a reason.",
		].join("\n"),
	);
	process.exit(1);
}

console.log("No model IDs outside the registry.");
