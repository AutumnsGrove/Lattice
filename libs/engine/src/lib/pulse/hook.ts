/**
 * Grove Pulse — SvelteKit Handle Hook
 *
 * Automatic request instrumentation. Add to any app's hooks.server.ts
 * via sequence(). Emits a page.viewed event for every request with
 * route, method, status, duration, and privacy-preserving visitor hash.
 *
 * Usage:
 *   import { pulseHandle } from "@autumnsgrove/lattice/pulse";
 *   export const handle = sequence(pulseHandle({ app: "aspen" }), ...otherHooks);
 *
 * @module pulse/hook
 */

import type { Handle } from "@sveltejs/kit";
import { initPulse, emitPulseEvent, flushPulse } from "./emitter.js";
import { hashVisitor } from "./visitor.js";
import type { PulseCollector } from "./types.js";

export interface PulseHandleOptions {
	app: string;
	/** Skip routes matching these prefixes (e.g., ["/_app", "/api/health"]) */
	skip?: string[];
}

/**
 * Create a SvelteKit handle hook that automatically instruments all requests.
 * Requires PULSE_COLLECTOR service binding on platform.env.
 */
export function pulseHandle(options: PulseHandleOptions): Handle {
	const { app, skip = ["/_app", "/favicon", "/__data"] } = options;
	let initialized = false;
	let visitorSecret: string | undefined;

	return async ({ event, resolve }) => {
		const pathname = event.url.pathname;

		if (skip.some((prefix) => pathname.startsWith(prefix))) {
			return resolve(event);
		}

		// adapter-cloudflare proxies platform.env and throws on property
		// access during prerender — wrap the entire env block in try/catch
		if (!initialized) {
			try {
				const env = event.platform?.env as Record<string, unknown> | undefined;
				const raw = env?.PULSE_COLLECTOR;
				const collector =
					raw && typeof (raw as { fetch?: unknown }).fetch === "function"
						? (raw as PulseCollector)
						: undefined;
				if (collector) {
					initPulse(collector);
					initialized = true;
				}
				const maybeSecret = env?.PULSE_VISITOR_SECRET;
				if (typeof maybeSecret === "string" && maybeSecret.length > 0) {
					visitorSecret = maybeSecret;
				}
			} catch {
				// prerender or missing bindings — skip Pulse for this request
				return resolve(event);
			}
		}

		const start = performance.now();
		const response = await resolve(event);
		const duration_ms = Math.round(performance.now() - start);

		if (initialized) {
			const ip = event.request.headers.get("cf-connecting-ip") ?? "unknown";
			const ua = event.request.headers.get("user-agent") ?? "unknown";
			const visitor_hash = await hashVisitor(ip, ua, undefined, visitorSecret);

			const tenant_id = extractTenantId(event);

			// Acquisition refs (?ref=card from a business card QR, #1426) ride along
			// in metadata so scans are countable without a separate endpoint. The
			// collector already stores metadata as JSON; truncate to keep events small.
			const ref = event.url.searchParams.get("ref")?.slice(0, 64);

			emitPulseEvent("page.viewed", {
				route: event.route?.id ?? pathname,
				method: event.request.method,
				status: response.status,
				duration_ms,
				tenant_id,
				visitor_hash,
				app,
				metadata: ref ? { ua: ua.slice(0, 200), ref } : { ua: ua.slice(0, 200) },
			});
		}

		return response;
	};
}

/**
 * Flush hook — call at the end of request lifecycle to ensure buffered
 * events are sent before the isolate potentially sleeps.
 */
export function createPulseFlushHook(): Handle {
	return async ({ event, resolve }) => {
		const response = await resolve(event);
		await flushPulse();
		return response;
	};
}

function extractTenantId(event: {
	url: URL;
	locals?: Record<string, unknown> | object;
}): string | undefined {
	const locals = event.locals as Record<string, unknown> | undefined;
	if (locals?.tenantId && typeof locals.tenantId === "string") {
		return locals.tenantId;
	}
	if (locals?.tenant && typeof locals.tenant === "object" && locals.tenant !== null) {
		const t = locals.tenant as Record<string, unknown>;
		if (typeof t.id === "string") return t.id;
	}
	return undefined;
}
