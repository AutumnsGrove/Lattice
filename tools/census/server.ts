/**
 * Grove Census Dashboard Server
 *
 * Serves the census dashboard and its data files.
 * Usage: bun run census (from project root)
 */

const PORT = 4322;
const DATA_DIR = "apps/landing/static/data";

// ─── Already-running check ───────────────────────────────────────────────────

try {
	const res = await fetch(`http://localhost:${PORT}/census-dashboard.html`, {
		signal: AbortSignal.timeout(400),
	});
	if (res.ok) {
		console.log(`\n🌲 Census is already running — http://localhost:${PORT}`);
		console.log(`   Watching the forest grow.\n`);
		process.exit(0);
	}
} catch {
	// Port is free — proceed
}

// ─── MIME types ──────────────────────────────────────────────────────────────

const MIME: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".db": "application/octet-stream",
};

function getMime(path: string): string {
	const ext = path.slice(path.lastIndexOf("."));
	return MIME[ext] ?? "application/octet-stream";
}

// ─── Server ──────────────────────────────────────────────────────────────────

try {
	Bun.serve({
		port: PORT,
		hostname: "localhost",

		async fetch(req) {
			const url = new URL(req.url);
			let path = url.pathname;

			// Root → dashboard
			if (path === "/" || path === "") {
				path = "/census-dashboard.html";
			}

			// Only serve files from the data directory
			const filename = path.startsWith("/") ? path.slice(1) : path;

			// Prevent path traversal
			if (filename.includes("..") || filename.startsWith("/")) {
				return new Response("Forbidden", { status: 403 });
			}

			const filePath = `${DATA_DIR}/${filename}`;
			const file = Bun.file(filePath);

			if (await file.exists()) {
				return new Response(file, {
					headers: {
						"Content-Type": getMime(filePath),
						"Cache-Control": "no-cache",
					},
				});
			}

			return new Response("Not found", { status: 404 });
		},
	});
} catch (err: unknown) {
	const e = err as NodeJS.ErrnoException;
	if (e?.code === "EADDRINUSE") {
		console.error(`\n✗  Port ${PORT} is in use.`);
		console.error(`   To free it: kill $(lsof -ti :${PORT})\n`);
		process.exit(1);
	}
	throw err;
}

console.log(`\n🌲 Grove Census — http://localhost:${PORT}`);
console.log(`   Watching the forest grow.\n`);
console.log(`   Dashboard: http://localhost:${PORT}/census-dashboard.html`);
console.log(`   Raw data:  http://localhost:${PORT}/grove_census.json\n`);
