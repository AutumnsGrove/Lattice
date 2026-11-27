/**
 * Fireside's routes, through the real worker.
 *
 * Three suites, in the house shape: **happy** (a writer lights a fire and it
 * works), **bad** (the caller was wrong — off-beta, unsigned, empty or enormous
 * messages, a missing slug), and **sad** (the caller was right and the world was
 * not — another grove's session, another grove's post, no AI key yet).
 *
 * Beta is reached the way production reaches it: a `<tenant>-beta.grove.place`
 * host. `hooks.server.ts` strips the suffix and sets `locals.isBeta`, so these
 * tests exercise the same code the beta deployment does rather than a bypass. A
 * plain host must `404` on every route — a hidden button is not a gate.
 *
 * The model is never called here. The turn and draft happy paths live in the
 * recipe tests, where a scripted model slot answers without a network; what the
 * routes owe is the gates, the tenant boundary, validation and what they write.
 */

import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import {
	CACHE_KEYS,
	createTenant,
	json,
	page,
	request,
	signIn,
	tenantIdFor,
	waitForCacheKey,
} from "./harness";

interface StartBody {
	sessionId: string;
	opening: string;
}

interface ResumeBody {
	session: { id: string; status: string; turns: number; transcriptPublic: boolean };
	messages: { role: string; kind: string; content: string }[];
	canDraft: boolean;
	acceptance: { accepted: boolean; slug?: string };
}

/** A grove, and the two hostnames it answers on. */
async function grove(options: { posts?: { slug: string; title: string }[] } = {}) {
	const subdomain = `fireside-${crypto.randomUUID().slice(0, 8)}`;
	const id = await createTenant({ subdomain, posts: options.posts });
	const cookie = await signIn();
	const beta = `${subdomain}-beta`;
	return {
		id,
		subdomain,
		beta,
		cookie,
		/** The headers a state-changing request needs: a matching origin, for CSRF. */
		write: () => ({ origin: `https://${beta}.grove.place` }),
	};
}

async function start(who: Awaited<ReturnType<typeof grove>>): Promise<StartBody> {
	const result = await json<StartBody>("/api/fireside", {
		tenant: who.beta,
		cookie: who.cookie,
		method: "POST",
		headers: who.write(),
		body: JSON.stringify({}),
	});
	expect(result.status).toBe(200);
	return result.body;
}

const ROUTES = ["/api/fireside", "/api/fireside/anything", "/api/fireside/anything/turn"];

describe("fireside", () => {
	describe("happy", () => {
		it("lights a fire, and writes the opening line", async () => {
			const who = await grove();
			const started = await start(who);

			expect(started.sessionId).toMatch(/^[0-9a-f-]{36}$/);
			expect(started.opening.length).toBeGreaterThan(0);

			const session = await env.DB.prepare(
				`SELECT tenant_id, user_id, status FROM fireside_sessions WHERE id = ?`,
			)
				.bind(started.sessionId)
				.first<{ tenant_id: string; user_id: string; status: string }>();

			expect(session?.tenant_id).toBe(await tenantIdFor(who.subdomain));
			expect(session?.status).toBe("open");

			const messages = await env.DB.prepare(
				`SELECT role, seq FROM fireside_messages WHERE session_id = ? ORDER BY seq`,
			)
				.bind(started.sessionId)
				.all<{ role: string; seq: number }>();

			expect(messages.results).toEqual([{ role: "wisp", seq: 1 }]);
		});

		it("resumes with the conversation, and says there is nothing to draft yet", async () => {
			const who = await grove();
			const started = await start(who);

			const resumed = await json<ResumeBody>(`/api/fireside/${started.sessionId}`, {
				tenant: who.beta,
				cookie: who.cookie,
			});

			expect(resumed.status).toBe(200);
			expect(resumed.body.messages).toHaveLength(1);
			expect(resumed.body.messages[0]?.role).toBe("wisp");
			// Wisp talking to itself is not substance.
			expect(resumed.body.canDraft).toBe(false);
			expect(resumed.body.acceptance.accepted).toBe(false);
		});

		it("records acceptance: the flag, the link and the transcript opt-in", async () => {
			const who = await grove({ posts: [{ slug: "tea-shop", title: "The tea shop" }] });
			const started = await start(who);

			const accepted = await json<{ accepted: boolean; transcriptPublic: boolean }>(
				`/api/fireside/${started.sessionId}/accept`,
				{
					tenant: who.beta,
					cookie: who.cookie,
					method: "POST",
					headers: who.write(),
					body: JSON.stringify({ slug: "tea-shop", transcriptPublic: true }),
				},
			);

			expect(accepted.status).toBe(200);
			expect(accepted.body.accepted).toBe(true);
			expect(accepted.body.transcriptPublic).toBe(true);

			const post = await env.DB.prepare(
				`SELECT fireside_assisted, fireside_session_id FROM posts WHERE slug = 'tea-shop'`,
			).first<{ fireside_assisted: number; fireside_session_id: string }>();

			expect(post?.fireside_assisted).toBe(1);
			expect(post?.fireside_session_id).toBe(started.sessionId);

			const session = await env.DB.prepare(
				`SELECT status, transcript_public, transcript_published_at, expires_at
				   FROM fireside_sessions WHERE id = ?`,
			)
				.bind(started.sessionId)
				.first<{
					status: string;
					transcript_public: number;
					transcript_published_at: number;
					expires_at: number | null;
				}>();

			expect(session?.status).toBe("accepted");
			expect(session?.transcript_public).toBe(1);
			expect(session?.transcript_published_at).toBeGreaterThan(0);
			// A published transcript is exempt from the sweep.
			expect(session?.expires_at).toBeNull();
		});

		it("publishes the conversation later, and purges the page that showed it private", async () => {
			const who = await grove({ posts: [{ slug: "tea-shop", title: "The tea shop" }] });
			const started = await start(who);
			const tenantId = await tenantIdFor(who.subdomain);

			// Accepted privately: the marker, and nothing else.
			await json(`/api/fireside/${started.sessionId}/accept`, {
				tenant: who.beta,
				cookie: who.cookie,
				method: "POST",
				headers: who.write(),
				body: JSON.stringify({ slug: "tea-shop", transcriptPublic: false }),
			});

			// One thing the writer said, so the transcript has both sides in it.
			await env.DB.prepare(
				`INSERT INTO fireside_messages (id, session_id, tenant_id, role, kind, content, seq)
				 VALUES (?, ?, ?, 'user', 'turn', ?, 2)`,
			)
				.bind("msg-the-sign", started.sessionId, tenantId, "The sign says eight.")
				.run();

			// Warm the cache with the private page — the state a purged key has to fix.
			await page("/garden/tea-shop", { tenant: who.beta });
			expect(await waitForCacheKey(CACHE_KEYS.post(tenantId, "tea-shop"))).toBe(true);

			const published = await json<{
				transcriptPublic: boolean;
				slug: string;
				transcript: { entries: { role: string; kind: string; content?: string }[] } | null;
			}>(`/api/fireside/${started.sessionId}/transcript`, {
				tenant: who.beta,
				cookie: who.cookie,
				method: "POST",
				headers: who.write(),
				body: JSON.stringify({ public: true }),
			});

			expect(published.status).toBe(200);
			expect(published.body.transcriptPublic).toBe(true);
			expect(published.body.slug).toBe("tea-shop");
			// Both sides, oldest first, and the writer's own words exactly.
			expect(published.body.transcript?.entries.map((entry) => entry.role)).toEqual([
				"wisp",
				"user",
			]);
			expect(published.body.transcript?.entries[1]?.content).toBe("The sign says eight.");

			// A disclosure that stays cached is a disclosure that stays wrong.
			expect(await env.CACHE_KV.get(CACHE_KEYS.post(tenantId, "tea-shop"))).toBeNull();

			const live = await env.DB.prepare(
				`SELECT transcript_public, transcript_published_at, expires_at
				   FROM fireside_sessions WHERE id = ?`,
			)
				.bind(started.sessionId)
				.first<{
					transcript_public: number;
					transcript_published_at: number;
					expires_at: number | null;
				}>();

			expect(live?.transcript_public).toBe(1);
			expect(live?.transcript_published_at).toBeGreaterThan(0);
			expect(live?.expires_at).toBeNull();

			// And back down again: the page stops showing it, the date it first went
			// public does not move.
			const hidden = await json<{ transcriptPublic: boolean; transcript: unknown }>(
				`/api/fireside/${started.sessionId}/transcript`,
				{
					tenant: who.beta,
					cookie: who.cookie,
					method: "POST",
					headers: who.write(),
					body: JSON.stringify({ public: false }),
				},
			);

			expect(hidden.status).toBe(200);
			expect(hidden.body.transcriptPublic).toBe(false);
			expect(hidden.body.transcript).toBeNull();

			const after = await env.DB.prepare(
				`SELECT transcript_public, transcript_published_at FROM fireside_sessions WHERE id = ?`,
			)
				.bind(started.sessionId)
				.first<{ transcript_public: number; transcript_published_at: number }>();

			expect(after?.transcript_public).toBe(0);
			expect(after?.transcript_published_at).toBe(live?.transcript_published_at);
		});

		it("lets a session go, and takes its messages with it", async () => {
			const who = await grove();
			const started = await start(who);

			const deleted = await json<{ deleted: boolean }>(`/api/fireside/${started.sessionId}`, {
				tenant: who.beta,
				cookie: who.cookie,
				method: "DELETE",
				headers: who.write(),
			});
			expect(deleted.status).toBe(200);

			const left = await env.DB.prepare(
				`SELECT COUNT(*) AS n FROM fireside_messages WHERE session_id = ?`,
			)
				.bind(started.sessionId)
				.first<{ n: number }>();
			expect(left?.n).toBe(0);
		});

		it("says there is not enough yet, without spending the writer's key", async () => {
			const who = await grove();
			const started = await start(who);

			const drafted = await json<{ drafted: boolean; message?: string }>(
				`/api/fireside/${started.sessionId}/draft`,
				{
					tenant: who.beta,
					cookie: who.cookie,
					method: "POST",
					headers: who.write(),
					body: JSON.stringify({}),
				},
			);

			// The gate runs before the key lookup: no key is set in this grove, and the
			// answer is still "not yet" rather than a configuration error.
			expect(drafted.status).toBe(200);
			expect(drafted.body.drafted).toBe(false);
			expect(drafted.body.message).toContain("Tell me a bit more");
		});
	});

	describe("bad", () => {
		it("is a 404 off beta, on every route", async () => {
			const who = await grove();
			const started = await start(who);

			// Each route's real method: a POST to a GET-only path is 405 from the
			// router, which never reaches the gate and would prove nothing.
			for (const [route, method] of [
				["/api/fireside", "POST"],
				[`/api/fireside/${started.sessionId}`, "GET"],
				[`/api/fireside/${started.sessionId}`, "DELETE"],
				[`/api/fireside/${started.sessionId}/turn`, "POST"],
				[`/api/fireside/${started.sessionId}/draft`, "POST"],
				[`/api/fireside/${started.sessionId}/accept`, "POST"],
				[`/api/fireside/${started.sessionId}/transcript`, "POST"],
			] as const) {
				const result = await json(route, {
					tenant: who.subdomain, // no -beta
					cookie: who.cookie,
					method,
					headers: { origin: `https://${who.subdomain}.grove.place` },
					body: method === "GET" ? undefined : JSON.stringify({}),
				});
				expect(result.status, `${method} ${route} should be hidden off beta`).toBe(404);
			}
		});

		it("is a 401 without a session", async () => {
			const who = await grove();
			const result = await json("/api/fireside", {
				tenant: who.beta,
				method: "POST",
				headers: who.write(),
				body: JSON.stringify({}),
			});
			expect(result.status).toBe(401);
		});

		it("refuses an empty message without spending anything", async () => {
			const who = await grove();
			const started = await start(who);

			const result = await json(`/api/fireside/${started.sessionId}/turn`, {
				tenant: who.beta,
				cookie: who.cookie,
				method: "POST",
				headers: who.write(),
				body: JSON.stringify({ message: "   " }),
			});
			expect(result.status).toBe(400);

			const saved = await env.DB.prepare(
				`SELECT COUNT(*) AS n FROM fireside_messages WHERE session_id = ? AND role = 'user'`,
			)
				.bind(started.sessionId)
				.first<{ n: number }>();
			expect(saved?.n).toBe(0);
		});

		it("refuses a message past the 2,000 character ceiling", async () => {
			const who = await grove();
			const started = await start(who);

			const result = await json(`/api/fireside/${started.sessionId}/turn`, {
				tenant: who.beta,
				cookie: who.cookie,
				method: "POST",
				headers: who.write(),
				body: JSON.stringify({ message: "a".repeat(2_001) }),
			});
			expect(result.status).toBe(400);

			const saved = await env.DB.prepare(
				`SELECT COUNT(*) AS n FROM fireside_messages WHERE session_id = ? AND role = 'user'`,
			)
				.bind(started.sessionId)
				.first<{ n: number }>();
			expect(saved?.n).toBe(0);
		});

		it("refuses an accept with no slug", async () => {
			const who = await grove();
			const started = await start(who);

			const result = await json(`/api/fireside/${started.sessionId}/accept`, {
				tenant: who.beta,
				cookie: who.cookie,
				method: "POST",
				headers: who.write(),
				body: JSON.stringify({}),
			});
			expect(result.status).toBe(400);
		});

		it("refuses a transcript toggle that is neither yes nor no", async () => {
			const who = await grove({ posts: [{ slug: "tea-shop", title: "The tea shop" }] });
			const started = await start(who);

			await json(`/api/fireside/${started.sessionId}/accept`, {
				tenant: who.beta,
				cookie: who.cookie,
				method: "POST",
				headers: who.write(),
				body: JSON.stringify({ slug: "tea-shop" }),
			});

			// "on" is not a yes: a string that reads like one would let a client
			// publish a conversation by accident.
			const result = await json(`/api/fireside/${started.sessionId}/transcript`, {
				tenant: who.beta,
				cookie: who.cookie,
				method: "POST",
				headers: who.write(),
				body: JSON.stringify({ public: "on" }),
			});
			expect(result.status).toBe(400);
		});
	});

	describe("sad", () => {
		it("is a 404 for another grove's session, not a 403", async () => {
			const mine = await grove();
			const theirs = await grove();
			const started = await start(mine);

			// Same signed-in person, same cookie, different grove.
			for (const [route, method] of [
				[`/api/fireside/${started.sessionId}`, "GET"],
				[`/api/fireside/${started.sessionId}`, "DELETE"],
				[`/api/fireside/${started.sessionId}/turn`, "POST"],
				[`/api/fireside/${started.sessionId}/draft`, "POST"],
				[`/api/fireside/${started.sessionId}/accept`, "POST"],
				[`/api/fireside/${started.sessionId}/transcript`, "POST"],
			] as const) {
				const result = await json(route, {
					tenant: theirs.beta,
					cookie: theirs.cookie,
					method,
					headers: theirs.write(),
					// A GET cannot carry a body; the POSTs get one.
					body:
						method === "GET" ? undefined : JSON.stringify({ message: "hello", slug: "tea-shop" }),
				});
				expect(result.status, `${method} ${route}`).toBe(404);
			}
		});

		it("is a 404 accepting a post that belongs to another grove", async () => {
			const mine = await grove();
			const theirs = await grove({ posts: [{ slug: "their-post", title: "Not mine" }] });
			const started = await start(mine);

			const result = await json(`/api/fireside/${started.sessionId}/accept`, {
				tenant: mine.beta,
				cookie: mine.cookie,
				method: "POST",
				headers: mine.write(),
				body: JSON.stringify({ slug: "their-post" }),
			});
			expect(result.status).toBe(404);

			const post = await env.DB.prepare(
				`SELECT fireside_assisted FROM posts WHERE tenant_id = ? AND slug = 'their-post'`,
			)
				.bind(await tenantIdFor(theirs.subdomain))
				.first<{ fireside_assisted: number }>();
			expect(post?.fireside_assisted).toBe(0);
		});

		it("keeps the writer's message when no AI key is set, and says why", async () => {
			const who = await grove();
			const started = await start(who);

			const response = await request(`/api/fireside/${started.sessionId}/turn`, {
				tenant: who.beta,
				cookie: who.cookie,
				method: "POST",
				headers: who.write(),
				body: JSON.stringify({ message: "The sign says eight." }),
			});

			expect(response.status).toBe(400);
			expect(await response.text()).toMatch(/Settings|AI key/i);

			// They did say it. The turn failing must not erase their words.
			const saved = await env.DB.prepare(
				`SELECT content FROM fireside_messages WHERE session_id = ? AND role = 'user'`,
			)
				.bind(started.sessionId)
				.first<{ content: string }>();
			expect(saved?.content).toBe("The sign says eight.");
		});

		it("is a 404 for a session that never became a post", async () => {
			const who = await grove();
			const started = await start(who);

			// Nothing was accepted, so there is no page to disclose a conversation on —
			// a toggle here would promise a reader something that does not exist.
			const result = await json(`/api/fireside/${started.sessionId}/transcript`, {
				tenant: who.beta,
				cookie: who.cookie,
				method: "POST",
				headers: who.write(),
				body: JSON.stringify({ public: true }),
			});
			expect(result.status).toBe(404);
		});

		it("hides every route from an unsigned caller just as it hides them off beta", async () => {
			const who = await grove();
			for (const route of ROUTES) {
				const result = await json(route, { tenant: who.beta, method: "GET" });
				expect(result.status).toBeGreaterThanOrEqual(400);
				expect(result.status).not.toBe(200);
			}
		});
	});
});
