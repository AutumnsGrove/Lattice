import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { drift, majorOf, setupDefault, versionsIn } from "./node-version.mjs";

const ROOT = new URL("../..", import.meta.url).pathname;

// --- the parsers -------------------------------------------------------------

test("a major survives the shapes people write", () => {
	assert.equal(majorOf("24"), 24);
	assert.equal(majorOf("24.4.1"), 24);
	assert.equal(majorOf("v24"), 24);
	assert.equal(majorOf('"24"'), 24);
	assert.equal(majorOf(""), null);
	assert.equal(majorOf(undefined), null);
});

test("reads a plain, quoted or oneline pin", () => {
	const yaml = [
		"      - uses: actions/setup-node@v6",
		"        with:",
		'          node-version: "24"',
		"          node-version: 24",
		"          node-version: 24.4.1",
		"      - run: echo hi",
	].join("\n");

	assert.deepEqual(versionsIn(yaml), ["24", "24", "24.4.1"]);
});

test("a templated version is not a claim about a version", () => {
	const yaml = [
		"        with:",
		"          node-version: ${{ inputs.node-version }}",
		"          node-version: ${{ matrix.node }}",
	].join("\n");

	assert.deepEqual(versionsIn(yaml), []);
});

test("a commented-out pin is ignored", () => {
	assert.deepEqual(versionsIn("  # node-version: 20\n"), []);
	assert.deepEqual(versionsIn('  node-version: "24" # keep in step\n'), ["24"]);
});

test("finds the default inside the node-version input, and only that one", () => {
	const action = [
		"inputs:",
		"  node-version:",
		'    description: "Node.js version"',
		"    required: false",
		'    default: "24"',
		"  build-engine:",
		'    default: "false"',
		"runs:",
		"  using: composite",
	].join("\n");

	assert.equal(setupDefault(action), "24");
});

test("an input with no default reports null rather than guessing", () => {
	const action = ["inputs:", "  node-version:", "    description: Node"].join("\n");

	assert.equal(setupDefault(action), null);
});

// --- what the comparison reports ---------------------------------------------

const CLEAN = {
	nvmrc: "24\n",
	action: 'inputs:\n  node-version:\n    default: "24"\n',
	workflows: {
		"ci.yml": '          node-version: "24"',
		"deploy.yml": "          node-version: 24",
	},
};

test("the shape we ship reports nothing", () => {
	assert.deepEqual(drift(CLEAN), []);
});

test("a CI default behind .nvmrc is a problem", () => {
	const problems = drift({ ...CLEAN, action: 'inputs:\n  node-version:\n    default: "20"\n' });

	assert.equal(problems.length, 1);
	assert.match(problems[0], /grove-setup defaults to Node 20; \.nvmrc says 24/);
});

test("one workflow pinning something else is a problem", () => {
	const problems = drift({
		...CLEAN,
		workflows: { ...CLEAN.workflows, "deploy.yml": '          node-version: "20"' },
	});

	assert.equal(problems.length, 1);
	assert.match(problems[0], /deploy\.yml pins Node 20/);
});

test("a missing default is a problem, not a crash", () => {
	const problems = drift({ ...CLEAN, action: "inputs:\n  node-version:\n    description: Node\n" });

	assert.equal(problems.length, 1);
	assert.match(problems[0], /no node-version default/);
});

test("an unreadable .nvmrc is the first and only problem", () => {
	const problems = drift({ ...CLEAN, nvmrc: "" });

	assert.equal(problems.length, 1);
	assert.match(problems[0], /does not name a Node version/);
});

// --- the real repository -----------------------------------------------------

test("the repository pins one Node version, in every place that pins one", () => {
	const nvmrc = readFileSync(join(ROOT, ".nvmrc"), "utf8");
	const action = readFileSync(join(ROOT, ".github/actions/grove-setup/action.yml"), "utf8");

	const workflows = readdirSync(join(ROOT, ".github/workflows"))
		.filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
		.map((name) => [name, readFileSync(join(ROOT, ".github/workflows", name), "utf8")]);

	const problems = drift({ nvmrc, action, workflows: Object.fromEntries(workflows) });
	assert.deepEqual(problems, []);
});
