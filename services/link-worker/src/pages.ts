/**
 * Pages shown when a short link can't send anyone anywhere.
 *
 * Copy lives here as data; render() only translates it to HTML. Colors come from
 * the browser's own system palette (light/dark aware) so this worker carries no
 * design tokens of its own.
 */

import { SHORT_LINK_HOME_URL } from "@autumnsgrove/lattice/platform/config/short-links";

export type PageKind = "gone" | "not_found" | "error" | "method_not_allowed";

interface PageCopy {
	status: number;
	title: string;
	message: string;
}

export const PAGES: Record<PageKind, PageCopy> = {
	gone: {
		status: 410,
		title: "This link has gone quiet",
		message:
			"The page this short link pointed to isn't there anymore. It may have been unpublished or taken down by whoever shared it.",
	},
	not_found: {
		status: 404,
		title: "We couldn't find that link",
		message: "Check the address for typos. Short links are only letters, numbers, and hyphens.",
	},
	error: {
		status: 500,
		title: "Something stumbled",
		message: "We couldn't follow that link just now. Please try again in a moment.",
	},
	method_not_allowed: {
		status: 405,
		title: "Short links are for visiting",
		message: "This address only answers to ordinary page visits.",
	},
};

const HOME_LINK_LABEL = "Wander over to Grove";

function escapeHtml(text: string): string {
	return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function renderPage(kind: PageKind): Response {
	const { status, title, message } = PAGES[kind];
	const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<style>
	:root { color-scheme: light dark; }
	body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 1.5rem; box-sizing: border-box; background: Canvas; color: CanvasText; font: 1.0625rem/1.65 system-ui, sans-serif; }
	main { max-width: 30rem; padding: 2.25rem 2rem; border: 1px solid color-mix(in srgb, CanvasText 14%, transparent); border-radius: 1.25rem; background: color-mix(in srgb, CanvasText 3%, Canvas); }
	h1 { font: 600 1.625rem/1.3 Georgia, "Times New Roman", serif; margin: 0 0 0.75rem; }
	p { margin: 0 0 1.5rem; color: color-mix(in srgb, CanvasText 78%, transparent); }
	a { color: LinkText; }
</style>
</head>
<body>
<main>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(message)}</p>
<a href="${escapeHtml(SHORT_LINK_HOME_URL)}">${escapeHtml(HOME_LINK_LABEL)}</a>
</main>
</body>
</html>`;

	const headers = new Headers({
		"Content-Type": "text/html; charset=utf-8",
		"Cache-Control": "no-store",
		"X-Robots-Tag": "noindex",
	});
	if (kind === "method_not_allowed") headers.set("Allow", "GET, HEAD");
	return new Response(html, { status, headers });
}
