import { evictDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { CACHE_KEYS, TENANTS, createTenant, page, tenantIdFor, waitForCacheKey } from "./harness";

/**
 * The pages a stranger sees: home, the listing, a post, about, and a 404.
 *
 * These carry no auth and no writes, which is why they come first — if they
 * fail, the harness is wrong, not the page.
 */

/** A Midnight Bloom post and words that exist only in its body. */
const POST = {
	slug: "the-art-of-brewing-patience",
	title: "The Art of Brewing Patience",
	body: "we've chosen to go slow",
};

const OTHER_POSTS = ["our-favorite-midnight-regulars", "the-night-i-finally-sat-still"];

describe("reading pages", () => {
	describe("happy", () => {
		it("renders the seeded tenant's home page", async () => {
			const result = await page("/", { tenant: TENANTS.midnightBloom });

			expect(result.status).toBe(200);
			expect(result.html).toContain("The Midnight Bloom");
			// The home page body comes from `pages.markdown_content` in D1.
			expect(result.html).toContain("night owls");
		});

		it("lists the posts the seed created, by title", async () => {
			const result = await page("/garden", { tenant: TENANTS.midnightBloom });

			expect(result.status).toBe(200);
			expect(result.html).toContain(POST.title);
			for (const slug of OTHER_POSTS) {
				expect(result.html).toContain(`/garden/${slug}`);
			}
		});

		it("renders a post's own words at its public slug", async () => {
			const result = await page(`/garden/${POST.slug}`, {
				tenant: TENANTS.midnightBloom,
			});

			expect(result.status).toBe(200);
			expect(result.html).toContain(POST.title);
			expect(result.html).toContain(POST.body);
		});

		it("renders the about page the seed created", async () => {
			const result = await page("/about", { tenant: TENANTS.midnightBloom });

			expect(result.status).toBe(200);
			expect(result.html).toContain("About");
		});

		it("answers 404 for a path that does not exist", async () => {
			const result = await page("/no-such-page-at-all", {
				tenant: TENANTS.midnightBloom,
			});

			expect(result.status).toBe(404);
		});
	});

	describe("bad", () => {
		it("does not crash or leak when the host resolves to no tenant", async () => {
			// `grove.place` itself is the landing app's host, never Aspen's — but
			// if a request reaches Aspen with no tenant, the answer must be a
			// page, not a stack trace and not somebody else's content.
			const result = await page("/garden", { tenant: null });

			expect(result.status).toBeLessThan(500);
			expect(result.html).not.toContain(POST.title);
			expect(result.html).not.toContain("stack");
		});

		it("does not leak another tenant's posts to an unknown subdomain", async () => {
			const result = await page("/garden", { tenant: "not-a-real-grove" });

			expect(result.status).toBe(404);
			expect(result.html).not.toContain(POST.title);
			expect(result.html).not.toContain("Midnight Bloom");
		});

		it("does not serve someone else's post under a different tenant", async () => {
			const result = await page(`/garden/${POST.slug}`, { tenant: TENANTS.driftwoodInk });

			expect(result.status).toBe(404);
			expect(result.html).not.toContain(POST.body);
		});
	});

	describe("sad", () => {
		it("renders an empty state for a tenant with no posts", async () => {
			const result = await page("/garden", { tenant: TENANTS.emptyGrove });

			expect(result.status).toBe(200);
			expect(result.html).toContain("yet");
			// An empty state, not a blank page.
			expect(result.html.length).toBeGreaterThan(2000);
		});

		it("still renders the home page for a tenant with no posts", async () => {
			const result = await page("/", { tenant: TENANTS.emptyGrove });

			expect(result.status).toBe(200);
			expect(result.html).toContain("Empty Grove");
		});

		it("renders a one-post listing without breaking", async () => {
			const tenant = await createTenant({
				posts: [{ slug: "only-post", title: "The Only Post" }],
			});

			const result = await page("/garden", { tenant });

			expect(result.status).toBe(200);
			expect(result.html).toContain("/garden/only-post");
			expect(result.html).not.toContain("yet");
		});

		it("renders a post after its tenant's Durable Object is evicted", async () => {
			// Reads are served from D1; the DOs are caches, not the source. Warm
			// the tenant's DO, evict it, and the page still renders — if a read
			// ever starts depending on a live instance, this is where it shows.
			await page("/", { tenant: TENANTS.midnightBloom });
			await evictDurableObject(
				env.TENANTS.get(env.TENANTS.idFromName(`tenant:${TENANTS.midnightBloom}`)),
			);

			const result = await page(`/garden/${POST.slug}`, {
				tenant: TENANTS.midnightBloom,
			});

			expect(result.status).toBe(200);
			expect(result.html).toContain(POST.body);
		});

		it("renders a post whose author has no account left to disable", async () => {
			// There is no author user row in the read path: the byline is the
			// tenant's display name. That is why disabling a user cannot blank a
			// post, and this asserts the byline really does come from the tenant.
			const result = await page(`/garden/${POST.slug}`, {
				tenant: TENANTS.midnightBloom,
			});

			expect(result.status).toBe(200);
			expect(result.html).toContain("The Midnight Bloom");
			expect(result.html).toContain(POST.body);
		});

		it("serves a cached post after the row changes behind the cache", async () => {
			// The cache is only as fresh as its TTL: a row changed without going
			// through the API is served as it was until the 15 minutes are up.
			// The API paths do purge — `invalidatePostCaches` runs on update and
			// delete — so this documents the cache, not a gap in publishing.
			const tenant = await createTenant({
				posts: [{ slug: "cache-me", title: "Read Me Once", body: "cached words" }],
			});
			const tenantId = await tenantIdFor(tenant);

			const published = await page("/garden/cache-me", { tenant });
			expect(published.status).toBe(200);
			expect(await waitForCacheKey(CACHE_KEYS.post(tenantId, "cache-me"))).toBe(true);

			await env.DB.prepare("UPDATE posts SET status = 'draft' WHERE tenant_id = ? AND slug = ?")
				.bind(tenantId, "cache-me")
				.run();

			const cached = await page("/garden/cache-me", { tenant });

			expect(cached.status).toBe(200);
			expect(cached.html).toContain("cached words");
		});

		it("does not serve a draft at its public slug", async () => {
			const tenant = await createTenant({
				posts: [
					{
						slug: "hidden-draft",
						title: "Hidden Draft",
						body: "words nobody should see yet",
						status: "draft",
					},
				],
			});

			const post = await page("/garden/hidden-draft", { tenant });
			const listing = await page("/garden", { tenant });

			expect(post.status).toBe(404);
			expect(post.html).not.toContain("words nobody should see yet");
			expect(listing.html).not.toContain("/garden/hidden-draft");
		});
	});

	/**
	 * The disclosure: a marker always, a conversation only when the writer shared it.
	 *
	 * This is the one surface where Fireside's promises become visible to someone who
	 * did not agree to anything — so it is the surface where a mistake is not a bug
	 * report but a broken trust. Both halves are checked from outside the process.
	 */
	describe("the fireside disclosure", () => {
		const SLUG = "the-sign-said-eight";
		const PROPOSAL = JSON.stringify({
			title: "The sign said eight",
			body: "Eight, and nobody believed it.",
			vines: [{ anchor: "paragraph:1", text: "a vine nobody should read twice" }],
		});

		async function firesidePost(transcriptPublic: boolean) {
			const tenant = await createTenant({
				posts: [
					{
						slug: SLUG,
						title: "The sign said eight",
						body: "Nobody believed it.",
					},
				],
			});
			const tenantId = await tenantIdFor(tenant);
			const sessionId = crypto.randomUUID();

			await env.DB.prepare(
				`INSERT INTO fireside_sessions
				   (id, tenant_id, user_id, status, transcript_public, transcript_published_at)
				 VALUES (?, ?, 'writer-1', 'accepted', ?, ?)`,
			)
				.bind(
					sessionId,
					tenantId,
					transcriptPublic ? 1 : 0,
					transcriptPublic ? Math.floor(Date.now() / 1000) : null,
				)
				.run();

			for (const [index, message] of [
				{ role: "wisp", kind: "turn", content: "What did you notice first?" },
				{ role: "user", kind: "turn", content: "The sign said eight, and nobody believed it." },
				{ role: "wisp", kind: "draft", content: PROPOSAL },
			].entries()) {
				await env.DB.prepare(
					`INSERT INTO fireside_messages
					   (id, session_id, tenant_id, role, kind, content, seq)
					 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				)
					.bind(
						crypto.randomUUID(),
						sessionId,
						tenantId,
						message.role,
						message.kind,
						message.content,
						index + 1,
					)
					.run();
			}

			await env.DB.prepare(
				`UPDATE posts SET fireside_assisted = 1, fireside_session_id = ?
				  WHERE tenant_id = ? AND slug = ?`,
			)
				.bind(sessionId, tenantId, SLUG)
				.run();

			return { tenant, tenantId, sessionId };
		}

		describe("happy", () => {
			it("says a post was written fireside, and shows the conversation when it is public", async () => {
				const { tenant } = await firesidePost(true);

				const result = await page(`/garden/${SLUG}`, { tenant });

				expect(result.status).toBe(200);
				expect(result.html).toContain("written fireside with Wisp");
				expect(result.html).toContain("Read how this was written");
				// Both sides, verbatim — including the writer's own sentence.
				expect(result.html).toContain("What did you notice first?");
				expect(result.html).toContain("The sign said eight, and nobody believed it.");
			});

			it("counts a proposal rather than reprinting it", async () => {
				const { tenant } = await firesidePost(true);

				const result = await page(`/garden/${SLUG}`, { tenant });

				expect(result.html).toContain("Wisp proposed a draft");
				expect(result.html).toContain("5 words");
				expect(result.html).toContain("The writer accepted this one.");
				// The stored payload is not a thing a reader may ever be shown.
				expect(result.html).not.toContain("paragraph:1");
				expect(result.html).not.toContain("nobody should read twice");
			});
		});

		describe("bad", () => {
			it("keeps the conversation off the page when the writer left it private", async () => {
				const { tenant } = await firesidePost(false);

				const result = await page(`/garden/${SLUG}`, { tenant });

				expect(result.status).toBe(200);
				// The attribution is not a reward for sharing; it is a fact about the post.
				expect(result.html).toContain("written fireside with Wisp");
				expect(result.html).not.toContain("Read how this was written");
				expect(result.html).not.toContain("What did you notice first?");
			});

			it("leaves a post that never went near the fire entirely alone", async () => {
				const tenant = await createTenant({
					posts: [{ slug: "by-hand", title: "Written by hand", body: "Every word mine." }],
				});

				const result = await page("/garden/by-hand", { tenant });

				expect(result.status).toBe(200);
				expect(result.html).not.toContain("written fireside");
			});
		});

		describe("sad", () => {
			it("shows the marker without a conversation when the session is gone", async () => {
				const { tenant, sessionId } = await firesidePost(true);

				// A session that expires or is deleted leaves the post its attribution and
				// nothing to disclose — `posts.fireside_session_id` is `ON DELETE SET NULL`.
				await env.DB.prepare(`DELETE FROM fireside_sessions WHERE id = ?`).bind(sessionId).run();

				const result = await page(`/garden/${SLUG}`, { tenant });

				expect(result.status).toBe(200);
				expect(result.html).toContain("written fireside with Wisp");
				expect(result.html).not.toContain("Read how this was written");
			});
		});
	});
});
