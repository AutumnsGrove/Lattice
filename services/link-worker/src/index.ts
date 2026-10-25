/**
 * Grove Link Worker — link.grove.place/{slug}
 *
 * Resolves a short link to where it points right now and redirects there.
 * All lookup rules live in @autumnsgrove/lattice/services/short-links; this
 * worker only speaks HTTP. See docs/specs/short-links-spec.md.
 */

import { resolveShortLink, recordClick } from "@autumnsgrove/lattice/services/short-links";
import { SHORT_LINK_HOME_URL } from "@autumnsgrove/lattice/platform/config/short-links";
import { LINK_ERRORS, logGroveError } from "@autumnsgrove/lattice/errors";
import { renderPage } from "./pages";

export interface Env {
	DB: D1Database;
}

const LOG_PREFIX = "LinkWorker";

/** `/abc123` or `/abc123/` → `abc123`. Anything deeper isn't a short link. */
export function extractSlug(pathname: string): string | null {
	const trimmed = pathname.replace(/^\//, "").replace(/\/$/, "");
	return trimmed && !trimmed.includes("/") ? trimmed : null;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (request.method !== "GET" && request.method !== "HEAD") {
			return renderPage("method_not_allowed");
		}

		const { pathname } = new URL(request.url);
		if (pathname === "/") {
			return new Response(null, { status: 302, headers: { Location: SHORT_LINK_HOME_URL } });
		}

		const slug = extractSlug(pathname);
		if (!slug) return renderPage("not_found");

		let resolved;
		try {
			resolved = await resolveShortLink(env.DB, slug);
		} catch (cause) {
			logGroveError(LOG_PREFIX, LINK_ERRORS.DB_NOT_AVAILABLE, { detail: String(cause), slug });
			return renderPage("error");
		}

		if (resolved.status === "not_found") return renderPage("not_found");
		// Everything we store was validated as https, but never redirect on a bad row.
		if (resolved.status === "gone" || !resolved.url.startsWith("https://")) {
			return renderPage("gone");
		}

		if (request.method === "GET") {
			ctx.waitUntil(
				recordClick(env.DB, slug).catch((cause) =>
					logGroveError(LOG_PREFIX, LINK_ERRORS.DB_NOT_AVAILABLE, {
						detail: `click count failed: ${String(cause)}`,
						slug,
					}),
				),
			);
		}

		// 302, not 301: the destination can change and browsers must not remember it.
		return new Response(null, {
			status: 302,
			headers: {
				Location: resolved.url,
				"Cache-Control": "private, max-age=0",
				"X-Robots-Tag": "noindex",
			},
		});
	},
};
