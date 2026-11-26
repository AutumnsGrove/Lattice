import { env } from "cloudflare:workers";
import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
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
	/**
	 * `"bypass"` (default) sends `Cache-Control: no-cache`, which the built
	 * worker treats as "do not read the edge cache". The edge cache is not
	 * rolled back between tests the way bindings are, so without this a page
	 * cached by one test is served to the next and a sad path passes for the
	 * wrong reason.
	 *
	 * `"default"` lets the request be cached and served from cache — only for
	 * tests whose subject is caching.
	 */
	cache?: "bypass" | "default";
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
	if (options.cache !== "default") headers.set("cache-control", "no-cache");
	if (tenant) headers.set("x-forwarded-host", `${tenant}.grove.place`);
	if (options.cookie) headers.set("cookie", options.cookie);

	// The URL carries the tenant too. The built worker answers through
	// `caches.default`, whose key is the URL alone — two tests hitting
	// `https://localhost/` for different tenants would serve each other's
	// cached HTML, and the suite would lie.
	const origin = `https://${tenant ?? "grove"}.grove.place`;

	const ctx = createExecutionContext();
	const response = await worker.fetch(
		new Request(`${origin}${path}`, {
			method: options.method ?? "GET",
			headers,
			body: options.body,
		}),
		env,
		ctx,
	);

	// Drain and wait for `waitUntil` work (KV cache writes, analytics) before
	// returning. Without this, a write queued by one test lands after the pool
	// has rolled its storage back and shows up in the next test — which is how a
	// drafted post kept coming back as a 200.
	const body = await response.arrayBuffer();
	await waitOnExecutionContext(ctx);

	return new Response(body, { status: response.status, headers: response.headers });
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

/**
 * The cache keys the reading pages use (see `routes/garden/**`).
 *
 * Reads never wait for a cache write — `cache.getOrSet` is fire-and-forget — so
 * a key written by one test can surface in the next one. A test that mutates a
 * post or its status clears the key first, which is also the state it would be
 * in once the TTL expired.
 */
export const CACHE_KEYS = {
	// The cache service prefixes every key with `grove:` (libs/engine cache.ts),
	// so the route's `garden:...` key lands here.
	post: (tenantId: string, slug: string) => `grove:garden:${tenantId}:${slug}`,
	list: (tenantId: string) => `grove:garden:list:${tenantId}`,
};

/** Waits for a fire-and-forget cache write to land. Returns false on timeout. */
export async function waitForCacheKey(key: string, attempts = 20): Promise<boolean> {
	for (let i = 0; i < attempts; i++) {
		if ((await env.CACHE_KV.get(key)) !== null) return true;
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	return false;
}

export async function clearGardenCache(tenantId: string, slug?: string): Promise<void> {
	await env.CACHE_KV.delete(CACHE_KEYS.list(tenantId));
	if (slug) await env.CACHE_KV.delete(CACHE_KEYS.post(tenantId, slug));
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
