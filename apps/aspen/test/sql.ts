/**
 * Splits a SQL file into statements, respecting quoted strings and comments.
 *
 * D1's `exec()` splits on `;`, which is fine until a blog post contains one —
 * and the seed data is full of them ("isn't mysticism; it's chemistry"). A
 * naive split leaves a half-open quote and SQLite answers "incomplete input".
 * Wrangler handles this itself; we are running the same files without wrangler,
 * so we do it here, once.
 */
export function splitSqlStatements(sql: string): string[] {
	const statements: string[] = [];
	let current = "";
	let inSingle = false;
	let inLineComment = false;
	let inBlockComment = false;

	for (let i = 0; i < sql.length; i++) {
		const char = sql[i];
		const next = sql[i + 1];

		if (inLineComment) {
			if (char === "\n") {
				inLineComment = false;
				current += char;
			}
			continue;
		}

		if (inBlockComment) {
			if (char === "*" && next === "/") {
				inBlockComment = false;
				i++;
			}
			continue;
		}

		if (!inSingle && char === "-" && next === "-") {
			inLineComment = true;
			i++;
			continue;
		}

		if (!inSingle && char === "/" && next === "*") {
			inBlockComment = true;
			i++;
			continue;
		}

		if (char === "'") {
			// SQL escapes a quote by doubling it.
			if (inSingle && next === "'") {
				current += "''";
				i++;
				continue;
			}
			inSingle = !inSingle;
			current += char;
			continue;
		}

		if (char === ";" && !inSingle) {
			if (current.trim()) statements.push(current.trim());
			current = "";
			continue;
		}

		current += char;
	}

	if (current.trim()) statements.push(current.trim());
	return statements;
}
