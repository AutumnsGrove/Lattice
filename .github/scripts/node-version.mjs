/**
 * One Node version, everywhere (#1758).
 *
 * CI ran Node 20 for years while the deploy workflows ran Node 24, and nothing
 * noticed. It surfaced as fourteen failing foliage tests: `DecompressionStream`
 * only learned `"brotli"` in Node 22, so the tests passed on the machine that
 * wrote them and failed on CI. The version lives in three places (`.nvmrc`, the
 * `grove-setup` composite action's default, and any workflow that pins one
 * inline) and they drift silently.
 *
 * These functions read those places and say what disagrees. The test beside this
 * file runs them against the real repository, so drift fails `Repo Tooling`
 * instead of a test suite six months later.
 */

/** The major of a version string: "24", "24.4.1" and "v24" all give 24. */
export function majorOf(version) {
	const match = String(version ?? "")
		.trim()
		.replace(/^["']|["']$/g, "")
		.match(/^v?(\d+)/);
	return match ? Number.parseInt(match[1], 10) : null;
}

/**
 * Every literal `node-version:` value in a workflow or action file.
 *
 * A templated value (`${{ inputs.node-version }}`) is skipped: it is not a
 * claim about a version. So is a commented-out line.
 *
 * @param {string} text YAML source.
 * @returns {string[]} Bare version strings, in file order.
 */
export function versionsIn(text) {
	const found = [];
	for (const line of String(text ?? "").split("\n")) {
		const match = line.match(/^\s*node-version:\s*"?([^"\s#]+)"?\s*(?:#.*)?$/);
		if (!match) continue;
		const value = match[1];
		if (value.includes("${{")) continue;
		found.push(value);
	}
	return found;
}

/**
 * The default value of the `node-version` input in the `grove-setup` composite
 * action — the version every CI job runs unless it says otherwise.
 *
 * @param {string} actionYaml The composite action's source.
 * @returns {string | null} The default, or null when the input has none.
 */
export function setupDefault(actionYaml) {
	const lines = String(actionYaml ?? "").split("\n");
	for (let i = 0; i < lines.length; i++) {
		if (!/^\s{2}node-version:\s*$/.test(lines[i])) continue;
		// Inside that input block: the first `default:` before the next input.
		for (let j = i + 1; j < lines.length; j++) {
			if (/^\s{2}\S/.test(lines[j])) break;
			const match = lines[j].match(/^\s+default:\s*"?([^"\s#]+)"?\s*(?:#.*)?$/);
			if (match) return match[1];
		}
	}
	return null;
}

/**
 * What disagrees with `.nvmrc`, if anything.
 *
 * @param {{nvmrc: string, action: string, workflows: Record<string, string>}} files
 *   `.nvmrc`, the `grove-setup` action source, and every active workflow, keyed
 *   by a name to report.
 * @returns {string[]} One message per problem; empty means consistent.
 */
export function drift({ nvmrc, action, workflows = {} }) {
	const problems = [];
	const expected = String(nvmrc ?? "").trim();
	const want = majorOf(expected);

	if (want === null) {
		problems.push(`.nvmrc does not name a Node version: ${JSON.stringify(expected)}`);
		return problems;
	}

	const fallback = setupDefault(action);
	if (fallback === null) {
		problems.push("grove-setup has no node-version default, so CI jobs inherit an unpinned Node");
	} else if (majorOf(fallback) !== want) {
		problems.push(
			`grove-setup defaults to Node ${fallback}; .nvmrc says ${expected}. ` +
				"Every typecheck, test and lint job runs the default.",
		);
	}

	for (const [file, text] of Object.entries(workflows)) {
		for (const version of versionsIn(text)) {
			if (majorOf(version) !== want) {
				problems.push(`${file} pins Node ${version}; .nvmrc says ${expected}.`);
			}
		}
	}

	return problems;
}
