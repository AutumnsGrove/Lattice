import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { TENANTS, createTenant, json, page, request, setService, signIn } from "./harness";

/**
 * Signing in and staying signed in: session validation, the session list,
 * revocation, logout, and the `hooks.server.ts` path that turns a cookie into
 * `locals.user`.
 *
 * Heartwood is stubbed at the service boundary. Everything else — routing,
 * hooks, CSRF, D1, the tenant's Durable Object — is the real thing.
 */

const OWNER_EMAIL = "example@grove.place";

/** The owner-only control on the garden page. */
const OWNER_ONLY = "/arbor/garden/new";

describe("sessions", () => {
	describe("happy", () => {
		it("turns a valid session cookie into a signed-in owner", async () => {
			const cookie = await signIn(undefined, { email: OWNER_EMAIL });

			const result = await page("/garden", { tenant: TENANTS.midnightBloom, cookie });

			expect(result.status).toBe(200);
			expect(result.html).toContain(OWNER_ONLY);
		});

		it("lists the current session for a signed-in user", async () => {
			const cookie = await signIn(undefined, { email: OWNER_EMAIL });
			await setService("auth", {
				"/session/validate": {
					body: {
						valid: true,
						user: {
							id: "user-example-owner",
							email: OWNER_EMAIL,
							name: "Example Owner",
							isAdmin: false,
						},
					},
				},
				"/session/list": {
					body: {
						sessions: [
							{
								id: "0b8f3f9e-3c0a-4a2c-9d6f-1f2a3b4c5d6e",
								createdAt: "2026-01-01T00:00:00Z",
								current: true,
								userAgent: "vitest",
							},
						],
					},
				},
			});

			const result = await json<{ sessions: { id: string; current: boolean }[] }>(
				"/api/auth/sessions",
				{ tenant: TENANTS.midnightBloom, cookie },
			);

			expect(result.status).toBe(200);
			expect(result.body.sessions).toHaveLength(1);
			expect(result.body.sessions[0].current).toBe(true);
		});

		it("revokes another session and keeps the current one alive", async () => {
			const cookie = await signIn(undefined, { email: OWNER_EMAIL });
			await setService("auth", {
				"/session/validate": {
					body: {
						valid: true,
						user: { id: "user-example-owner", email: OWNER_EMAIL, name: "Owner", isAdmin: false },
					},
				},
				"/session/": { status: 200, body: { ok: true } },
			});

			const revoked = await json("/api/auth/sessions/0b8f3f9e-3c0a-4a2c-9d6f-1f2a3b4c5d6e", {
				tenant: TENANTS.midnightBloom,
				cookie,
				method: "DELETE",
				headers: { origin: `https://${TENANTS.midnightBloom}.grove.place` },
			});
			const stillSignedIn = await page("/garden", { tenant: TENANTS.midnightBloom, cookie });

			expect(revoked.status).toBe(200);
			expect(stillSignedIn.html).toContain(OWNER_ONLY);
		});

		it("revokes every other session in one call", async () => {
			const cookie = await signIn(undefined, { email: OWNER_EMAIL });
			await setService("auth", {
				"/session/validate": {
					body: {
						valid: true,
						user: { id: "user-owner", email: OWNER_EMAIL, name: "Owner", isAdmin: false },
					},
				},
				"/session/revoke-all": { body: { revokedCount: 2 } },
			});

			const result = await json<{ revokedCount: number }>("/api/auth/sessions/revoke-all", {
				tenant: TENANTS.midnightBloom,
				cookie,
				method: "POST",
				headers: { origin: `https://${TENANTS.midnightBloom}.grove.place` },
			});

			expect(result.status).toBe(200);
			expect(result.body.revokedCount).toBe(2);
		});

		it("logs out: the session is revoked and the cookies are cleared", async () => {
			const cookie = await signIn(undefined, { email: OWNER_EMAIL });

			const result = await request("/auth/logout", {
				tenant: TENANTS.midnightBloom,
				cookie,
				method: "POST",
				headers: { origin: `https://${TENANTS.midnightBloom}.grove.place` },
			});

			expect(result.status).toBe(302);
			const cookies = result.headers.getSetCookie?.() ?? [];
			expect(cookies.some((c) => c.startsWith("grove_session="))).toBe(true);
			expect(result.headers.get("location")).toBe("/");
		});
	});

	describe("bad", () => {
		it("answers 401 for the session list with no cookie", async () => {
			const result = await json("/api/auth/sessions", { tenant: TENANTS.midnightBloom });

			expect(result.status).toBe(401);
		});

		it("refuses revoke-all without a session", async () => {
			const result = await json("/api/auth/sessions/revoke-all", {
				tenant: TENANTS.midnightBloom,
				method: "POST",
				headers: { origin: `https://${TENANTS.midnightBloom}.grove.place` },
			});

			expect(result.status).toBe(401);
		});

		it("passes Heartwood's rate limit through instead of swallowing it", async () => {
			const cookie = await signIn(undefined, { email: OWNER_EMAIL });
			await setService("auth", {
				"/session/validate": {
					body: {
						valid: true,
						user: { id: "user-owner", email: OWNER_EMAIL, name: "Owner", isAdmin: false },
					},
				},
				"/session/list": { status: 429, body: { error: "rate_limited" } },
			});

			const result = await json("/api/auth/sessions", {
				tenant: TENANTS.midnightBloom,
				cookie,
			});

			expect(result.status).toBe(429);
		});

		it("passes a garbage cookie through as 401, not 500", async () => {
			await setService("auth", {
				"/session/validate": { body: { valid: false } },
				"/session/list": { status: 401, body: { error: "unauthorized" } },
			});

			const result = await json("/api/auth/sessions", {
				tenant: TENANTS.midnightBloom,
				cookie: "grove_session=not-a-real-session",
			});

			expect(result.status).toBe(401);
		});

		it("rejects a malformed session id with 400 before calling Heartwood", async () => {
			const cookie = await signIn(undefined, { email: OWNER_EMAIL });

			const result = await json("/api/auth/sessions/not-a-uuid", {
				tenant: TENANTS.midnightBloom,
				cookie,
				method: "DELETE",
				headers: { origin: `https://${TENANTS.midnightBloom}.grove.place` },
			});

			expect(result.status).toBe(400);
		});

		it("passes through 404 for a session that is not yours", async () => {
			const cookie = await signIn(undefined, { email: OWNER_EMAIL });
			await setService("auth", {
				"/session/validate": {
					body: {
						valid: true,
						user: { id: "user-example-owner", email: OWNER_EMAIL, name: "Owner", isAdmin: false },
					},
				},
				"/session/": { status: 404, body: { error: "not_found" } },
			});

			const result = await json("/api/auth/sessions/0b8f3f9e-3c0a-4a2c-9d6f-1f2a3b4c5d6e", {
				tenant: TENANTS.midnightBloom,
				cookie,
				method: "DELETE",
				headers: { origin: `https://${TENANTS.midnightBloom}.grove.place` },
			});

			expect(result.status).toBe(404);
		});
	});

	describe("sad", () => {
		it("browses anonymously when Heartwood is unreachable, without a 500", async () => {
			const cookie = await signIn(undefined, { email: OWNER_EMAIL });
			await setService("auth", "fail");

			const pageResult = await page("/garden", { tenant: TENANTS.midnightBloom, cookie });
			const apiResult = await json("/api/auth/sessions", {
				tenant: TENANTS.midnightBloom,
				cookie,
			});

			expect(pageResult.status).toBe(200);
			expect(pageResult.html).not.toContain(OWNER_ONLY);
			// The proxy surfaces the binding's own status rather than inventing one.
			expect(apiResult.status).toBe(503);
		});

		it("treats an expired session as signed out, and leaves the cookie alone", async () => {
			const cookie = await signIn(undefined, { email: OWNER_EMAIL });
			await setService("auth", {
				"/session/validate": { body: { valid: false } },
			});

			const result = await page("/garden", { tenant: TENANTS.midnightBloom, cookie });

			expect(result.status).toBe(200);
			expect(result.html).not.toContain(OWNER_ONLY);
			// Current behaviour: nothing clears a stale cookie. Asserted so that
			// adding a clear is a deliberate change with a test to update, not a
			// silent one.
			const cleared = (result.headers.getSetCookie?.() ?? []).some((c) =>
				c.startsWith("grove_session=;"),
			);
			expect(cleared).toBe(false);
		});

		it("ignores a malformed validation payload instead of crashing", async () => {
			const cookie = await signIn(undefined, { email: OWNER_EMAIL });
			await setService("auth", {
				"/session/validate": { body: { valid: true } },
			});

			const result = await page("/garden", { tenant: TENANTS.midnightBloom, cookie });

			expect(result.status).toBe(200);
			expect(result.html).not.toContain(OWNER_ONLY);
		});

		it("answers 404 for a suspended tenant even with a valid session", async () => {
			const cookie = await signIn(undefined, { email: OWNER_EMAIL, isAdmin: true });
			const tenant = await createTenant({
				displayName: "Suspended Grove",
				active: 0,
				posts: [{ slug: "should-not-appear", title: "Should Not Appear" }],
			});

			const result = await page("/", { tenant, cookie });

			expect(result.status).toBe(404);
			expect(result.html).not.toContain(OWNER_ONLY);
			expect(result.html).not.toContain("Should Not Appear");
		});

		it("keeps a user signed in across tenants, but ownership is per tenant", async () => {
			// Sessions are user-scoped, not tenant-scoped: one sign-in works on
			// every grove. What the tenant boundary governs is ownership, so the
			// owner controls appear only where this user owns the grove.
			const cookie = await signIn(undefined, { email: OWNER_EMAIL });

			const own = await page("/garden", { tenant: TENANTS.midnightBloom, cookie });
			const other = await page("/garden", { tenant: TENANTS.driftwoodInk, cookie });

			expect(own.status).toBe(200);
			expect(own.html).toContain(OWNER_ONLY);
			expect(other.status).toBe(200);
			expect(other.html).not.toContain(OWNER_ONLY);
		});
	});
});
