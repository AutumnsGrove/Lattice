/**
 * Shared test helpers for domains API route tests.
 *
 * Provides mock RequestEvent factories and common platform/env mocks
 * for testing SvelteKit +server.ts handlers.
 */

import { vi } from "vitest";

/** Mock D1 statement — chainable .bind().first()/.run() pattern */
export function createMockStatement(firstResult: unknown = null) {
	return {
		bind: vi.fn().mockReturnThis(),
		first: vi.fn().mockResolvedValue(firstResult),
		run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 0 } }),
	};
}

/** Mock D1Database with prepare/batch support */
export function createMockD1() {
	const stmt = createMockStatement();
	return {
		prepare: vi.fn().mockReturnValue(stmt),
		batch: vi.fn().mockResolvedValue([]),
		_stmt: stmt,
	} as any;
}

/** Mock platform.env matching App.Platform['env'] */
export function createMockEnv(overrides: Record<string, unknown> = {}) {
	return {
		DB: createMockD1(),
		AUTH: { fetch: vi.fn().mockResolvedValue(new Response("ok")) },
		SITE_NAME: "Grove Domains",
		SITE_URL: "https://domains.grove.place",
		RESEND_API_KEY: "re_test_key",
		ADMIN_EMAILS: "admin@grove.place",
		DOMAIN_WORKER_URL: "https://forage.grove.place",
		...overrides,
	};
}

/** Build a minimal mock of SvelteKit's RequestEvent */
export function createMockEvent(
	options: {
		method?: string;
		url?: string;
		body?: unknown;
		user?: { id: string; email: string; is_admin: boolean } | null;
		env?: Record<string, unknown>;
		cookies?: Record<string, string>;
	} = {},
) {
	const urlObj = new URL(options.url ?? "http://localhost:5174/api/test");
	const env = createMockEnv(options.env ?? {});

	const cookieStore: Record<string, string> = { ...options.cookies };

	return {
		url: urlObj,
		request: new Request(urlObj, {
			method: options.method ?? "GET",
			headers: { "Content-Type": "application/json" },
			...(options.body ? { body: JSON.stringify(options.body) } : {}),
		}),
		locals: {
			user: options.user ?? { id: "admin-1", email: "admin@grove.place", is_admin: true },
		},
		platform: {
			env,
			context: { waitUntil: vi.fn() },
		},
		params: {},
		route: { id: "/api/test" },
		cookies: {
			get: vi.fn((name: string) => cookieStore[name] ?? undefined),
			set: vi.fn((name: string, value: string) => {
				cookieStore[name] = value;
			}),
			delete: vi.fn((name: string) => {
				delete cookieStore[name];
			}),
			getAll: vi.fn(() => Object.entries(cookieStore).map(([name, value]) => ({ name, value }))),
			serialize: vi.fn(),
		},
		fetch: vi.fn(),
		getClientAddress: () => "127.0.0.1",
		isDataRequest: false,
		isSubRequest: false,
		setHeaders: vi.fn(),
	} as any;
}

/** Create event for an admin user (default) */
export function adminEvent(options: Omit<Parameters<typeof createMockEvent>[0], "user"> = {}) {
	return createMockEvent({
		...options,
		user: { id: "admin-1", email: "admin@grove.place", is_admin: true },
	});
}

/** Create event for a non-admin user */
export function nonAdminEvent(options: Omit<Parameters<typeof createMockEvent>[0], "user"> = {}) {
	return createMockEvent({
		...options,
		user: { id: "user-1", email: "user@example.com", is_admin: false },
	});
}

/** Create event for an unauthenticated request */
export function unauthEvent(options: Omit<Parameters<typeof createMockEvent>[0], "user"> = {}) {
	return createMockEvent({
		...options,
		user: null,
	});
}
