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

export interface TestPost {
	slug: string;
	title: string;
	body?: string;
	status?: "published" | "draft";
}

export interface TestTenantOptions {
	/** Defaults to a unique `test-...` subdomain. */
	subdomain?: string;
	displayName?: string;
	ownerEmail?: string;
	active?: 0 | 1;
	posts?: TestPost[];
}

/**
 * Creates a tenant of this test's own.
 *
 * The pool has no per-test storage isolation: a row written by one test is still
 * there in the next one. So a test that needs a *modified* tenant — suspended,
 * empty, one post, a draft — makes one instead of editing a seeded row, and the
 * seeded tenants stay exactly as `scripts/db/seed-*.sql` left them.
 *
 * Returns the subdomain to pass as `tenant:`.
 */
export async function createTenant(options: TestTenantOptions = {}): Promise<string> {
	const id = `test-tenant-${crypto.randomUUID().slice(0, 8)}`;
	const subdomain = options.subdomain ?? `test-${crypto.randomUUID().slice(0, 8)}`;
	const now = Math.floor(Date.now() / 1000);

	await env.DB.prepare(
		`INSERT INTO tenants (id, subdomain, display_name, email, plan, theme, active, created_at, updated_at)
		 VALUES (?, ?, ?, ?, 'seedling', 'default', ?, ?, ?)`,
	)
		.bind(
			id,
			subdomain,
			options.displayName ?? "Test Grove",
			options.ownerEmail ?? "owner@example.test",
			options.active ?? 1,
			now,
			now,
		)
		.run();

	for (const post of options.posts ?? []) {
		await env.DB.prepare(
			`INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, status, published_at, created_at, updated_at)
			 VALUES (?, ?, ?, ?, '', ?, ?, ?, ?, ?)`,
		)
			.bind(
				`${id}-${post.slug}`,
				id,
				post.slug,
				post.title,
				post.body ?? `Body of ${post.title}.`,
				post.status ?? "published",
				now,
				now,
				now,
			)
			.run();
	}

	return subdomain;
}

/**
 * The tenant id for a subdomain, for tests that write through `env.DB`.
 */
export async function tenantIdFor(subdomain: string): Promise<string> {
	const row = await env.DB.prepare("SELECT id FROM tenants WHERE subdomain = ?")
		.bind(subdomain)
		.first<{ id: string }>();
	if (!row) throw new Error(`No tenant seeded for ${subdomain}`);
	return row.id;
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

export interface StubRoute {
	status?: number;
	body?: unknown;
}

/**
 * Chooses how a stubbed service binding answers for the rest of this test.
 *
 * - `"ok"` (default) → clear the control value, so the service answers its
 *   realistic default (an unauthenticated session, an accepted email, …)
 * - `"fail"` → `503` from every call, as if the deployment were unreachable
 * - `"error-500"` → `500` from every call
 * - a map of path substring → `{ status?, body? }`, for pinning the exact
 *   payload a specific endpoint should return. Longest match wins.
 */
export async function setService(
	service: ServiceName,
	mode: "ok" | "fail" | "error-500" | Record<string, StubRoute> = "ok",
): Promise<void> {
	if (mode === "ok") {
		await env.STUB_CONTROL.delete(service);
		return;
	}
	await env.STUB_CONTROL.put(service, typeof mode === "string" ? mode : JSON.stringify(mode));
}

/** The shape Heartwood's `/session/validate` returns for a signed-in user. */
export function sessionPayload(
	overrides: Partial<{
		id: string;
		email: string;
		name: string;
		isAdmin: boolean;
		valid: boolean;
	}> = {},
): Record<string, unknown> {
	const { valid = true, ...user } = overrides;
	return {
		valid,
		user: {
			id: user.id ?? "user-example-owner",
			email: user.email ?? "example@grove.place",
			name: user.name ?? "Example Owner",
			isAdmin: user.isAdmin ?? false,
			avatarUrl: null,
		},
	};
}

/**
 * Signs a test in: `AUTH` validates the cookie into this user.
 *
 * The session check is cached in the edge cache for 5 seconds keyed by the
 * cookie's hash, so the same cookie in two tests would otherwise reuse the first
 * answer. `sessionCookie()` makes a fresh one each time for that reason.
 */
export async function signIn(
	cookie = sessionCookie(),
	user: Parameters<typeof sessionPayload>[0] = {},
): Promise<string> {
	await setService("auth", {
		"/session/validate": { body: sessionPayload(user) },
	});
	return `grove_session=${cookie}`;
}

/** A unique session cookie value, so no two tests share a cached validation. */
export function sessionCookie(): string {
	return `sess_${crypto.randomUUID().replace(/-/g, "")}`;
}
