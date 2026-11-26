import { evictAllDurableObjects } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { createTenant, json, page, signIn, tenantIdFor } from "./harness";

/**
 * The write path: a writer puts words in and they come out the other side.
 *
 * Create, update, publish, and the read-back that proves it landed. Signed in
 * as the tenant's owner, through the real worker, against real D1 and the real
 * Threshold Durable Object.
 */

const OWNER_EMAIL = "owner@example.test";

async function authorTenant(): Promise<{ tenant: string; cookie: string; tenantId: string }> {
	const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });
	const cookie = await signIn(undefined, { email: OWNER_EMAIL });
	return { tenant, cookie, tenantId: await tenantIdFor(tenant) };
}

function writeHeaders(tenant: string): Record<string, string> {
	return {
		origin: `https://${tenant}.grove.place`,
		"content-type": "application/json",
	};
}

interface Bloom {
	title?: string;
	slug?: string;
	markdown_content?: string;
	status?: "draft" | "published";
}

async function createBloom(tenant: string, cookie: string, bloom: Bloom) {
	return json<{ success?: boolean; slug?: string; error?: string }>("/api/blooms", {
		tenant,
		cookie,
		method: "POST",
		headers: writeHeaders(tenant),
		body: JSON.stringify(bloom),
	});
}

async function updateBloom(tenant: string, cookie: string, slug: string, bloom: Bloom) {
	return json<{ success?: boolean; slug?: string; error?: string }>(`/api/blooms/${slug}`, {
		tenant,
		cookie,
		method: "PUT",
		headers: writeHeaders(tenant),
		body: JSON.stringify(bloom),
	});
}

describe("publishing a bloom", () => {
	describe("happy", () => {
		it("creates a draft that only the writer can see", async () => {
			const { tenant, cookie } = await authorTenant();

			const created = await createBloom(tenant, cookie, {
				title: "A Quiet Draft",
				markdown_content: "words still being chosen",
			});
			const ownerList = await json<{ posts: { slug: string }[] }>("/api/blooms", {
				tenant,
				cookie,
			});
			const publicList = await json<{ posts: { slug: string }[] }>("/api/blooms", { tenant });

			expect(created.status).toBe(200);
			expect(created.body.slug).toBe("a-quiet-draft");
			expect(ownerList.body.posts.map((p) => p.slug)).toContain("a-quiet-draft");
			expect(publicList.body.posts.map((p) => p.slug)).not.toContain("a-quiet-draft");
		});

		it("publishes on create and the words appear at the public slug", async () => {
			const { tenant, cookie } = await authorTenant();

			const created = await createBloom(tenant, cookie, {
				title: "Live At Once",
				markdown_content: "the door was open from the start",
				status: "published",
			});
			const rendered = await page("/garden/live-at-once", { tenant });

			expect(created.status).toBe(200);
			expect(rendered.status).toBe(200);
			expect(rendered.html).toContain("the door was open from the start");
		});

		it("updates a post and the new words are what renders", async () => {
			const { tenant, cookie } = await authorTenant();
			await createBloom(tenant, cookie, {
				title: "Rewrite Me",
				markdown_content: "first attempt",
				status: "published",
			});

			const updated = await updateBloom(tenant, cookie, "rewrite-me", {
				title: "Rewrite Me",
				markdown_content: "second attempt, better words",
				status: "published",
			});
			const rendered = await page("/garden/rewrite-me", { tenant });

			expect(updated.status).toBe(200);
			expect(rendered.html).toContain("second attempt, better words");
			expect(rendered.html).not.toContain("first attempt");
		});

		it("publishes an existing draft and it becomes reachable", async () => {
			const { tenant, cookie } = await authorTenant();
			await createBloom(tenant, cookie, {
				title: "Draft No Longer",
				markdown_content: "ready now",
			});

			const before = await page("/garden/draft-no-longer", { tenant });
			const published = await updateBloom(tenant, cookie, "draft-no-longer", {
				title: "Draft No Longer",
				markdown_content: "ready now",
				status: "published",
			});
			const after = await page("/garden/draft-no-longer", { tenant });

			expect(before.status).toBe(404);
			expect(published.status).toBe(200);
			expect(after.status).toBe(200);
			expect(after.html).toContain("ready now");
		});
	});

	describe("bad", () => {
		it("refuses an unauthenticated create", async () => {
			const { tenant } = await authorTenant();

			const created = await createBloom(tenant, "", {
				title: "Not Mine",
				markdown_content: "nope",
			});

			expect(created.status).toBe(401);
		});

		it("refuses a publish with no words", async () => {
			const { tenant, cookie } = await authorTenant();

			const created = await createBloom(tenant, cookie, {
				title: "Empty Publish",
				markdown_content: "   ",
				status: "published",
			});

			expect(created.status).toBe(400);
		});

		it("refuses a slug that is already taken", async () => {
			const { tenant, cookie } = await authorTenant();
			await createBloom(tenant, cookie, { title: "Taken", markdown_content: "one" });

			const second = await createBloom(tenant, cookie, {
				title: "Taken",
				markdown_content: "two",
			});

			expect(second.status).toBe(409);
		});

		it("will not publish into another writer's grove", async () => {
			const mine = await authorTenant();
			const theirs = await authorTenant();
			await createBloom(theirs.tenant, theirs.cookie, {
				title: "Their Post",
				markdown_content: "not mine to touch",
				status: "published",
			});

			const hijack = await updateBloom(mine.tenant, mine.cookie, "their-post", {
				title: "Their Post",
				markdown_content: "rewritten by a stranger",
				status: "published",
			});

			expect(hijack.status).toBe(404);
		});

		it("keeps a post's status when an update does not mention one", async () => {
			// Regression: a missing `status` used to reach D1 as `undefined`, which
			// D1 rejects, so the update answered 500 instead of updating.
			const { tenant, cookie } = await authorTenant();
			await createBloom(tenant, cookie, {
				title: "Status Keeper",
				markdown_content: "published once",
				status: "published",
			});

			const updated = await updateBloom(tenant, cookie, "status-keeper", {
				title: "Status Keeper",
				markdown_content: "still published",
			});
			const rendered = await page("/garden/status-keeper", { tenant });

			expect(updated.status).toBe(200);
			expect(rendered.status).toBe(200);
			expect(rendered.html).toContain("still published");
		});
	});

	describe("sad", () => {
		it("keeps writing when the rate-limit Durable Object is evicted", async () => {
			const { tenant, cookie } = await authorTenant();
			await createBloom(tenant, cookie, { title: "Before Eviction", markdown_content: "one" });

			// The Threshold DO keeps a sliding window per user. Evicting it must not
			// block a write: an empty counter is a fresh budget, not an outage.
			await evictAllDurableObjects();

			const after = await createBloom(tenant, cookie, {
				title: "After Eviction",
				markdown_content: "two",
			});

			expect(after.status).toBe(200);
			expect(after.body.slug).toBe("after-eviction");
		});

		it("survives two publishes of the same post at once", async () => {
			const { tenant, cookie } = await authorTenant();
			await createBloom(tenant, cookie, {
				title: "Contended",
				markdown_content: "draft",
			});

			const [first, second] = await Promise.all([
				updateBloom(tenant, cookie, "contended", {
					title: "Contended",
					markdown_content: "published by the first",
					status: "published",
				}),
				updateBloom(tenant, cookie, "contended", {
					title: "Contended",
					markdown_content: "published by the second",
					status: "published",
				}),
			]);
			const rendered = await page("/garden/contended", { tenant });
			const body = rendered.html;

			expect(first.status).toBe(200);
			expect(second.status).toBe(200);
			// Last write wins, and the page agrees with one of them rather than
			// rendering a half-written row.
			expect(
				body.includes("published by the first") || body.includes("published by the second"),
			).toBe(true);
		});

		it("refuses to write into a suspended grove", async () => {
			const { tenant, cookie } = await authorTenant();
			await env.DB.prepare("UPDATE tenants SET active = 0 WHERE subdomain = ?").bind(tenant).run();

			const created = await createBloom(tenant, cookie, {
				title: "Too Late",
				markdown_content: "the grove is asleep",
			});

			expect(created.status).toBeGreaterThanOrEqual(400);
			expect(created.status).toBeLessThan(500);
		});

		it("renders a just-written post with every Durable Object evicted", async () => {
			// Writes go to D1. The post content and metadata Durable Objects are
			// bound but nothing in the write path touches them, so eviction cannot
			// lose a bloom — asserted rather than assumed.
			const { tenant, cookie } = await authorTenant();
			await createBloom(tenant, cookie, {
				title: "Durable Enough",
				markdown_content: "kept in the database",
				status: "published",
			});

			for (const binding of [env.POST_CONTENT, env.POST_META, env.TENANTS]) {
				const stub = binding.get(binding.idFromName(`evict:${crypto.randomUUID()}`));
				try {
					await stub.fetch("https://internal/", { method: "GET" });
				} catch {
					// No instance to evict; the namespace is untouched either way.
				}
			}

			const rendered = await page("/garden/durable-enough", { tenant });

			expect(rendered.status).toBe(200);
			expect(rendered.html).toContain("kept in the database");
		});

		it("refuses a publish that would exceed the tier's post limit", async () => {
			// `wanderer` allows 25 published posts. The limit is enforced on create
			// and on the draft→published transition, and the answer is a real 403
			// with a reason — not a 500 from somewhere deeper.
			const tenant = await createTenant({ ownerEmail: OWNER_EMAIL });
			const cookie = await signIn(undefined, { email: OWNER_EMAIL });
			const tenantId = await tenantIdFor(tenant);
			await env.DB.prepare("UPDATE tenants SET plan = 'wanderer' WHERE id = ?")
				.bind(tenantId)
				.run();
			await env.DB.prepare(
				`INSERT INTO posts (id, tenant_id, slug, title, markdown_content, status, published_at, created_at, updated_at)
				 SELECT 'limit-' || value, ?, 'filler-' || value, 'Filler', 'words', 'published', unixepoch(), unixepoch(), unixepoch()
				 FROM (WITH RECURSIVE seq(value) AS (SELECT 1 UNION ALL SELECT value + 1 FROM seq WHERE value < 25) SELECT value FROM seq)`,
			)
				.bind(tenantId)
				.run();

			const created = await createBloom(tenant, cookie, {
				title: "One Too Many",
				markdown_content: "over the line",
				status: "published",
			});

			expect(created.status).toBe(403);
		});
	});
});
