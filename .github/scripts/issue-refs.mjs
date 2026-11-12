/**
 * Which issues does a pull request actually close?
 *
 * GitHub closes an issue on merge only when the PR body or title uses a
 * closing keyword — `close`, `closes`, `closed`, `fix`, `fixes`, `fixed`,
 * `resolve`, `resolves`, `resolved`, optionally followed by a colon. Every
 * other `#123` is a cross-reference, and GitHub already renders it as a link,
 * so this module reports those separately and the workflow ignores them.
 *
 * That distinction is the whole bug in #1623: the old parse treated any
 * `#123` as a completion, so a PR body saying "this matters once #1439 lands"
 * completed #1439 on merge.
 */

const CLOSING_KEYWORD = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s+#(\d+)/gi;
const ANY_REFERENCE = /#(\d+)/g;

/**
 * @param {string} text PR body or title.
 * @returns {{closes: number[], mentions: number[]}} Sorted, de-duplicated,
 *   disjoint: an issue that is explicitly closed is not also a mention.
 */
export function parseIssueRefs(text) {
	const source = String(text ?? "");
	const closes = collect(source, CLOSING_KEYWORD);
	const all = collect(source, ANY_REFERENCE);
	const mentioned = all.filter((n) => !closes.includes(n));
	return { closes, mentions: mentioned };
}

function collect(source, pattern) {
	const found = [];
	// String.prototype.matchAll needs the global flag; a fresh regex per call
	// keeps lastIndex from leaking between invocations.
	for (const match of source.matchAll(new RegExp(pattern.source, pattern.flags))) {
		const number = Number.parseInt(match[1], 10);
		if (Number.isFinite(number) && number > 0 && !found.includes(number)) {
			found.push(number);
		}
	}
	return found.sort((a, b) => a - b);
}
