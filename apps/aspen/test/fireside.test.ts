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

/** The writer signed in for these tests: the tenant's owner, by email. */
const OWNER_EMAIL = "writer@example.test";

/** A grove, and the two hostnames it answers on. */
async function grove(options: { posts?: { slug: string; title: string }[] } = {}) {
	const subdomain = `fireside-${crypto.randomUUID().slice(0, 8)}`;
	const id = await createTenant({ subdomain, posts: options.posts, ownerEmail: OWNER_EMAIL });
	// Signed in as the owner: the save routes verify the caller owns the tenant,
	// which the Fireside routes never had to ask before.
	const cookie = await signIn(undefined, { email: OWNER_EMAIL });
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

/**
 * The acceptance rides on the save.
 *
 * This is the property the whole change exists for: a post that exists because a
 * conversation happened must not be able to exist without saying so. The old flow
 * saved the post and then asked `/accept`; a failed second call left a post whose
 * provenance was missing and nobody saw an error.
 */
describe("accepting a draft by saving the post", () => {
	async function saveBloom(who: Awaited<ReturnType<typeof grove>>, body: Record<string, unknown>) {
		return json<{ slug?: string; error?: string }>("/api/blooms", {
			tenant: who.beta,
			cookie: who.cookie,
			method: "POST",
			headers: who.write(),
			body: JSON.stringify(body),
		});
	}

	describe("happy", () => {
		it("writes the post and its attribution together", async () => {
			const who = await grove();
			const started = await start(who);

			const created = await saveBloom(who, {
				title: "The sign said eight",
				markdown_content: "Eight, and nobody believed it.",
				fireside: { sessionId: started.sessionId, transcriptPublic: false },
			});

			expect(created.status).toBe(200);
			expect(created.body.slug).toBe("the-sign-said-eight");

			const post = await env.DB.prepare(
				`SELECT fireside_assisted, fireside_session_id FROM posts
				 WHERE tenant_id = ? AND slug = ?`,
			)
				.bind(await tenantIdFor(who.subdomain), created.body.slug)
				.first<{ fireside_assisted: number; fireside_session_id: string }>();

			expect(post?.fireside_assisted).toBe(1);
			expect(post?.fireside_session_id).toBe(started.sessionId);

			const session = await env.DB.prepare(
				`SELECT status, transcript_public FROM fireside_sessions WHERE id = ?`,
			)
				.bind(started.sessionId)
				.first<{ status: string; transcript_public: number }>();

			expect(session?.status).toBe("accepted");
			// The writer said no, so the page carries the marker and nothing else.
			expect(session?.transcript_public).toBe(0);
		});

		it("publishes the transcript when the writer said yes in the same breath", async () => {
			const who = await grove();
			const started = await start(who);

			const created = await saveBloom(who, {
				title: "The sign said eight",
				markdown_content: "Eight, and nobody believed it.",
				status: "published",
				fireside: { sessionId: started.sessionId, transcriptPublic: true },
			});
			expect(created.status).toBe(200);

			const session = await env.DB.prepare(
				`SELECT transcript_public, transcript_published_at, expires_at
				   FROM fireside_sessions WHERE id = ?`,
			)
				.bind(started.sessionId)
				.first<{
					transcript_public: number;
					transcript_published_at: number;
					expires_at: number | null;
				}>();

			expect(session?.transcript_public).toBe(1);
			expect(session?.transcript_published_at).toBeGreaterThan(0);
			expect(session?.expires_at).toBeNull();

			const page = await request(`/garden/${created.body.slug}`, { tenant: who.beta });
			expect(await page.text()).toContain("Read how this was written");
		});
	});

	it("accepts into a post that already exists, on the same door", async () => {
		const who = await grove({ posts: [{ slug: "already-here", title: "Already here" }] });
		const started = await start(who);

		const updated = await json<{ slug?: string }>("/api/blooms/already-here", {
			tenant: who.beta,
			cookie: who.cookie,
			method: "PUT",
			headers: who.write(),
			body: JSON.stringify({
				title: "Already here",
				markdown_content: "Eight, and nobody believed it.",
				status: "published",
				fireside: { sessionId: started.sessionId, transcriptPublic: false },
			}),
		});
		expect(updated.status).toBe(200);

		const post = await env.DB.prepare(
			`SELECT fireside_assisted, fireside_session_id FROM posts
				 WHERE tenant_id = ? AND slug = ?`,
		)
			.bind(await tenantIdFor(who.subdomain), "already-here")
			.first<{ fireside_assisted: number; fireside_session_id: string }>();

		expect(post?.fireside_assisted).toBe(1);
		expect(post?.fireside_session_id).toBe(started.sessionId);
	});

	describe("bad", () => {
		it("refuses a fireside block with no session, before writing anything", async () => {
			const who = await grove();

			const created = await saveBloom(who, {
				title: "No session",
				markdown_content: "words",
				fireside: { transcriptPublic: true },
			});
			expect(created.status).toBe(400);

			const rows = await env.DB.prepare(
				`SELECT COUNT(*) AS n FROM posts WHERE tenant_id = ? AND slug = ?`,
			)
				.bind(await tenantIdFor(who.subdomain), "no-session")
				.first<{ n: number }>();
			expect(rows?.n).toBe(0);
		});
	});

	describe("sad", () => {
		it("writes nothing at all when the conversation belongs to another grove", async () => {
			const mine = await grove();
			const theirs = await grove();
			const started = await start(mine);

			const created = await saveBloom(theirs, {
				title: "Not mine",
				markdown_content: "words",
				fireside: { sessionId: started.sessionId, transcriptPublic: false },
			});
			expect(created.status).toBe(404);

			// The post must not exist half-made: the session was checked before the insert.
			const rows = await env.DB.prepare(
				`SELECT COUNT(*) AS n FROM posts WHERE tenant_id = ? AND slug = ?`,
			)
				.bind(await tenantIdFor(theirs.subdomain), "not-mine")
				.first<{ n: number }>();
			expect(rows?.n).toBe(0);
		});
	});
});

/**
 * The fire on a post that already exists.
 *
 * The spec's hardest case lives here: accepting into words the writer already has
 * is a merge, and the door has to exist on the page where the words are — not only
 * on a blank one.
 */
describe("the fire on an existing post", () => {
	it("is offered on beta, and nowhere else", async () => {
		const who = await grove({ posts: [{ slug: "already-here", title: "Already here" }] });

		const beta = await page("/arbor/garden/edit/already-here", {
			tenant: who.beta,
			cookie: who.cookie,
		});
		expect(beta.status).toBe(200);
		expect(beta.html).toContain("Fireside (⌘⇧F)");

		// The same page off beta: no door, no shortcut. A hidden button is not a gate,
		// so this is the gate — and the routes behind it are `404` here too.
		const plain = await page("/arbor/garden/edit/already-here", {
			tenant: who.subdomain,
			cookie: who.cookie,
		});
		expect(plain.status).toBe(200);
		expect(plain.html).not.toContain("Fireside (⌘⇧F)");
	});
});

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

		it("publishes through the same door when accept is the first yes", async () => {
			const who = await grove({ posts: [{ slug: "tea-shop", title: "The tea shop" }] });
			const started = await start(who);
			const tenantId = await tenantIdFor(who.subdomain);

			// The writer saved the post before accept called in, so the page is sitting
			// in the cache without a transcript — the state accept has to invalidate.
			await page("/garden/tea-shop", { tenant: who.beta });
			expect(await waitForCacheKey(CACHE_KEYS.post(tenantId, "tea-shop"))).toBe(true);

			const accepted = await json(`/api/fireside/${started.sessionId}/accept`, {
				tenant: who.beta,
				cookie: who.cookie,
				method: "POST",
				headers: who.write(),
				body: JSON.stringify({ slug: "tea-shop", transcriptPublic: true }),
			});
			expect(accepted.status).toBe(200);

			// Accept is the same door as the toggle: the cached payload cannot keep
			// serving a post that does not disclose what it now discloses.
			expect(await env.CACHE_KV.get(CACHE_KEYS.post(tenantId, "tea-shop"))).toBeNull();
		});

		it("puts the marker on a cached page even when the transcript stays private", async () => {
			const who = await grove({ posts: [{ slug: "tea-shop", title: "The tea shop" }] });
			const started = await start(who);
			const tenantId = await tenantIdFor(who.subdomain);

			// Cached before the accept, which is the state the purge has to fix: the
			// marker is derived from the flag, and the flag rides in that payload.
			await page("/garden/tea-shop", { tenant: who.beta });
			expect(await waitForCacheKey(CACHE_KEYS.post(tenantId, "tea-shop"))).toBe(true);

			const accepted = await json(`/api/fireside/${started.sessionId}/accept`, {
				tenant: who.beta,
				cookie: who.cookie,
				method: "POST",
				headers: who.write(),
				body: JSON.stringify({ slug: "tea-shop", transcriptPublic: false }),
			});
			expect(accepted.status).toBe(200);

			expect(await env.CACHE_KV.get(CACHE_KEYS.post(tenantId, "tea-shop"))).toBeNull();

			// And the page a visitor gets next says so, without the conversation.
			const after = await page("/garden/tea-shop", { tenant: who.beta });
			expect(after.html).toContain("written fireside with Wisp");
			expect(after.html).not.toContain("Read how this was written");
		});

		it("takes a published conversation off the page when the session is deleted", async () => {
			const who = await grove({ posts: [{ slug: "tea-shop", title: "The tea shop" }] });
			const started = await start(who);
			const tenantId = await tenantIdFor(who.subdomain);

			await json(`/api/fireside/${started.sessionId}/accept`, {
				tenant: who.beta,
				cookie: who.cookie,
				method: "POST",
				headers: who.write(),
				body: JSON.stringify({ slug: "tea-shop", transcriptPublic: true }),
			});

			await page("/garden/tea-shop", { tenant: who.beta });
			expect(await waitForCacheKey(CACHE_KEYS.post(tenantId, "tea-shop"))).toBe(true);

			const deleted = await json<{ deleted: boolean }>(`/api/fireside/${started.sessionId}`, {
				tenant: who.beta,
				cookie: who.cookie,
				method: "DELETE",
				headers: who.write(),
			});
			expect(deleted.status).toBe(200);

			// Deleting the conversation must not leave it readable from the cache until
			// the TTL runs out: the writer took it down.
			expect(await env.CACHE_KV.get(CACHE_KEYS.post(tenantId, "tea-shop"))).toBeNull();

			const after = await page("/garden/tea-shop", { tenant: who.beta });
			expect(after.html).toContain("written fireside with Wisp");
			expect(after.html).not.toContain("Read how this was written");
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
