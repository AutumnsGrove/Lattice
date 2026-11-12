#!/usr/bin/env tsx
/**
 * Sync .github/labels.yml to GitHub.
 *
 *   pnpm labels:check              validate the manifest, talk to nobody
 *   pnpm labels:sync               dry run — show what would change
 *   pnpm labels:sync --apply       create and update labels
 *   pnpm labels:sync --apply --prune   also delete labels the manifest omits
 *
 * The manifest is the source of truth. A label that is not in it does not
 * belong on the repo; a label that is in it is described, coloured, and given
 * a rule for when to apply it.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const ROOT = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
const MANIFEST = join(ROOT, ".github/labels.yml");

const GROUPS = [
	"type",
	"component",
	"pattern",
	"size",
	"priority",
	"readiness",
	"machine",
] as const;
type Group = (typeof GROUPS)[number];

interface Label {
	name: string;
	group: Group;
	color: string;
	description: string;
	when: string;
	path?: string;
	doc?: string;
}

interface Manifest {
	version: number;
	policy: {
		max_per_group: Record<string, number>;
		auto_groups: Group[];
		component_needs_title_or_path: boolean;
		unlabelled_ok: boolean;
	};
	labels: Label[];
	dormant?: { name: string; state: string; note: string }[];
	retired?: { name: string; why: string }[];
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const prune = args.includes("--prune");
const quiet = args.includes("--quiet");
// Validation only: no network, no auth, nothing a CI runner has to provide.
const offline = args.includes("--offline");

function fail(errors: string[]): never {
	console.error(`\n✖ ${MANIFEST} has ${errors.length} problem${errors.length === 1 ? "" : "s"}:\n`);
	for (const e of errors) console.error(`  • ${e}`);
	console.error("");
	process.exit(1);
}

function load(): Manifest {
	if (!existsSync(MANIFEST)) throw new Error(`No manifest at ${MANIFEST}`);
	return parse(readFileSync(MANIFEST, "utf8")) as Manifest;
}

/** Everything the manifest promises, checked before it touches GitHub. */
function validate(m: Manifest): void {
	const errors: string[] = [];
	if (m.version !== 1) errors.push(`version: expected 1, got ${String(m.version)}`);
	if (!Array.isArray(m.labels) || m.labels.length === 0)
		errors.push("labels: expected a non-empty list");

	const seen = new Map<string, number>();
	const declaredGroups = new Set<Group>();

	for (const [i, l] of m.labels.entries()) {
		const at = `labels[${i}]${l?.name ? ` (${l.name})` : ""}`;
		if (!l?.name) {
			errors.push(`${at}: missing name`);
			continue;
		}
		seen.set(l.name, (seen.get(l.name) ?? 0) + 1);

		if (!GROUPS.includes(l.group)) {
			errors.push(`${at}: group "${String(l.group)}" is not one of ${GROUPS.join(", ")}`);
		} else {
			declaredGroups.add(l.group);
		}

		// YAML turns an all-digit colour into a number and eats leading zeros.
		if (typeof l.color !== "string") {
			errors.push(`${at}: color parsed as ${typeof l.color} — quote it, e.g. color: '795548'`);
		} else if (!/^[0-9a-fA-F]{6}$/.test(l.color)) {
			errors.push(`${at}: color "${l.color}" must be 6 hex digits, no #`);
		}

		if (!l.description?.trim()) errors.push(`${at}: needs a description`);
		// GitHub truncates label descriptions past 100 characters.
		if ((l.description ?? "").length > 100) {
			errors.push(`${at}: description is ${l.description.length} chars, GitHub's limit is 100`);
		}

		if (!l.when?.trim()) {
			errors.push(`${at}: needs a "when" rule — that is the whole point of this file`);
		}

		if (l.group === "component" && !l.path?.trim()) {
			errors.push(`${at}: components need a "path" so the label can be verified`);
		}

		if (l.group === "pattern") {
			if (!l.doc) errors.push(`${at}: patterns need a "doc"`);
			else if (!existsSync(join(ROOT, l.doc))) errors.push(`${at}: doc not found at ${l.doc}`);
		}
	}

	for (const [name, count] of seen) {
		if (count > 1) errors.push(`"${name}" is declared ${count} times`);
	}

	// The manifest must not resurrect something it buried, or argue with itself.
	const retiredNames = new Set([
		...(m.dormant ?? []).map((d) => d.name),
		...(m.retired ?? []).map((r) => r.name),
	]);
	for (const name of retiredNames) {
		if (seen.has(name)) errors.push(`"${name}" is both active and dormant/retired`);
	}

	const autoGroups = m.policy?.auto_groups ?? [];
	for (const g of autoGroups) {
		if (!GROUPS.includes(g)) errors.push(`policy.auto_groups: "${g}" is not a group`);
		if (["priority", "readiness", "size", "machine"].includes(g)) {
			errors.push(`policy.auto_groups: "${g}" is a human judgement — a machine must not guess it`);
		}
		if (!declaredGroups.has(g)) errors.push(`policy.auto_groups: "${g}" has no labels`);
	}

	for (const g of Object.keys(m.policy?.max_per_group ?? {})) {
		if (!GROUPS.includes(g as Group)) errors.push(`policy.max_per_group: "${g}" is not a group`);
	}

	if (errors.length) fail(errors);
}

interface Remote {
	name: string;
	color: string;
	description: string;
}

function listRemote(): Remote[] {
	const out = execFileSync(
		"gh",
		["label", "list", "--limit", "500", "--json", "name,color,description"],
		{
			encoding: "utf8",
			cwd: ROOT,
		},
	);
	return JSON.parse(out) as Remote[];
}

function run(cmd: string[]): void {
	execFileSync("gh", cmd, { cwd: ROOT, stdio: "inherit" });
}

function main(): void {
	const manifest = load();
	validate(manifest);

	const counts = new Map<Group, number>();
	for (const l of manifest.labels) counts.set(l.group, (counts.get(l.group) ?? 0) + 1);

	if (!quiet) {
		console.log(
			`\nManifest: ${manifest.labels.length} labels · ${manifest.dormant?.length ?? 0} dormant · ${manifest.retired?.length ?? 0} retired`,
		);
		console.log(
			"  " +
				GROUPS.filter((g) => counts.has(g))
					.map((g) => `${g} ${counts.get(g)}`)
					.join(" · "),
		);
		console.log(
			`  automation may choose: ${(manifest.policy.auto_groups ?? []).join(", ") || "nothing"}`,
		);
	}

	if (offline) {
		if (!quiet) console.log("\n✔ Manifest is valid.\n");
		return;
	}

	const remote = new Map(listRemote().map((r) => [r.name, r]));
	const want = new Map(manifest.labels.map((l) => [l.name, l]));

	const creates: Label[] = [];
	const updates: { label: Label; because: string[] }[] = [];

	for (const label of manifest.labels) {
		const have = remote.get(label.name);
		if (!have) {
			creates.push(label);
			continue;
		}
		const because: string[] = [];
		if (have.color.toLowerCase() !== label.color.toLowerCase())
			because.push(`color ${have.color} → ${label.color}`);
		if ((have.description ?? "") !== label.description) because.push("description");
		if (because.length) updates.push({ label, because });
	}

	const orphaned = [...remote.keys()].filter((n) => !want.has(n)).sort();

	if (!quiet) {
		console.log(
			`\n  create ${creates.length} · update ${updates.length} · delete ${orphaned.length} · unchanged ${manifest.labels.length - creates.length - updates.length}`,
		);
		for (const l of creates) console.log(`  + ${l.name}`);
		for (const u of updates) console.log(`  ~ ${u.label.name}  (${u.because.join(", ")})`);
		for (const n of orphaned)
			console.log(`  ${prune ? "-" : "?"} ${n}${prune ? "" : "  (not in manifest)"}`);
	}

	// A dry run must still show the plan; it just must not write.
	if (!apply) {
		const writes = creates.length + updates.length + (prune ? orphaned.length : 0);
		console.log(
			writes === 0
				? "\n✔ GitHub already matches the manifest.\n"
				: `\n✔ Manifest is valid — ${writes} change${writes === 1 ? "" : "s"} pending. Run with --apply to push them.\n`,
		);
		return;
	}

	for (const l of creates) {
		run(["label", "create", l.name, "--color", l.color, "--description", l.description]);
	}
	for (const { label } of updates) {
		// --force updates in place; without it gh refuses on an existing name.
		run([
			"label",
			"create",
			label.name,
			"--color",
			label.color,
			"--description",
			label.description,
			"--force",
		]);
	}

	if (orphaned.length && !prune) {
		console.log(`\n  ${orphaned.length} labels exist on GitHub but not in the manifest.`);
		console.log("  Re-run with --apply --prune to delete them.\n");
	}

	if (prune) {
		for (const name of orphaned) run(["label", "delete", name, "--yes"]);
	}

	console.log("\n✔ Synced.\n");
}

main();
