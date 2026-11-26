import { env } from "cloudflare:workers";
import { createExecutionContext } from "cloudflare:test";
import worker from "./pool-entry";

/**
 * The seeded tenants, exactly as `scripts/db/seed-*.sql` creates them.
 */
export const TENANTS = {
	/** 4 posts, 5 pages, the golden path. */
	midnightBloom: "midnight-bloom",
	/** 3 posts, used for cross-account tests. */
	driftwoodInk: "driftwood-ink",
	/** 3 posts, used for cross-account tests. */
	quietOrchard: "quiet-orchard",
	/** A tenant that exists and has never written anything. */
	emptyGrove: "empty-grove",
} as const;

export interface RequestOptions {
	/** Which tenant the request is for. Defaults to Midnight Bloom. */
	tenant?: string | null;
	method?: string;
	body?: BodyInit | null;
	headers?: Record<string, string>;
	/** Raw Cookie header value, for session and demo-mode tests. */
	cookie?: string;
}

/**
 * Sends a request through the real worker: hooks, routing, D1, KV, R2, DOs.
 *
 * The tenant is addressed the way grove-router addresses it — an
 * `X-Forwarded-Host` header — rather than the local `?subdomain=` shortcut.
 * In-worker requests carry no `Host` header, so the localhost branch of
 * `extractSubdomain()` cannot fire here; the forwarded-host branch is both the
 * production-faithful path and the one that works.
 */
export async function request(path: string, options: RequestOptions = {}): Promise<Response> {
	const tenant = options.tenant === null ? null : (options.tenant ?? TENANTS.midnightBloom);
	const headers = new Headers(options.headers);
	headers.set("cf-connecting-ip", "127.0.0.1");
	if (tenant) headers.set("x-forwarded-host", `${tenant}.grove.place`);
	if (options.cookie) headers.set("cookie", options.cookie);

	// The URL carries the tenant too. The built worker answers through
	// `caches.default`, whose key is the URL alone — two tests hitting
	// `https://localhost/` for different tenants would serve each other's
	// cached HTML, and the suite would lie.
	const origin = `https://${tenant ?? "grove"}.grove.place`;

	return worker.fetch(
		new Request(`${origin}${path}`, {
			method: options.method ?? "GET",
			headers,
			body: options.body,
		}),
		env,
		createExecutionContext(),
	);
}

export interface PageResult {
	status: number;
	html: string;
	text: string;
	headers: Headers;
}

/** A GET whose body we expect to read as HTML. */
export async function page(path: string, options: RequestOptions = {}): Promise<PageResult> {
	const response = await request(path, options);
	const html = await response.text();
	return { status: response.status, html, text: html, headers: response.headers };
}

/** A request whose body we expect to parse as JSON. */
export async function json<T = unknown>(
	path: string,
	options: RequestOptions = {},
): Promise<{ status: number; body: T; headers: Headers }> {
	const response = await request(path, options);
	const text = await response.text();
	let body: unknown = text;
	try {
		body = JSON.parse(text);
	} catch {
		// Not JSON — return the raw text so a failure reads as the actual body.
	}
	return { status: response.status, body: body as T, headers: response.headers };
}

export type ServiceName = "auth" | "zephyr" | "lumen" | "pulse";

/**
 * Chooses how a stubbed service binding answers for the rest of this test.
 *
 * `"fail"` → 503, `"error-500"` → 500, `"ok"`/nothing → the service's default,
 * any other string → that JSON body verbatim (so a suite can pin the exact
 * payload Heartwood or Zephyr would have returned).
 */
export async function setService(
	service: ServiceName,
	mode: "ok" | "fail" | "error-500" | Record<string, unknown> = "ok",
): Promise<void> {
	const key = service === "pulse" ? "pulse" : service;
	if (mode === "ok") {
		await env.STUB_CONTROL.delete(key);
		return;
	}
	await env.STUB_CONTROL.put(key, typeof mode === "string" ? mode : JSON.stringify(mode));
}
