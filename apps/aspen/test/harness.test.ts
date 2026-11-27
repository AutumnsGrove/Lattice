import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { TENANTS, page, request, setService } from "./harness";

/**
 * The harness must prove it is real before anything is converted, or every
 * later suite is building on a stub that answers what we hoped it would.
 */
describe("harness", () => {
	describe("happy", () => {
		it("renders a seeded tenant's home page through real routing and D1", async () => {
			const result = await page("/", { tenant: TENANTS.midnightBloom });

			expect(result.status).toBe(200);
			expect(result.html).toContain("The Midnight Bloom");
		});

		it("serves a page whose content comes from the seed SQL, not a fixture", async () => {
			const result = await page("/about", { tenant: TENANTS.midnightBloom });

			expect(result.status).toBe(200);
			expect(result.html.length).toBeGreaterThan(1000);
		});
	});

	describe("bad", () => {
		it("answers 404 for an unregistered tenant instead of a 200 page saying so", async () => {
			const result = await page("/", { tenant: "no-such-grove" });

			expect(result.status).toBe(404);
		});
	});

	describe("sad", () => {
		it("has a working TenantDO, so tenant config comes from a real Durable Object", async () => {
			const id = env.TENANTS.idFromName(`tenant:${TENANTS.midnightBloom}`);
			const response = await env.TENANTS.get(id).fetch("https://tenant.internal/config", {
				headers: { "X-Tenant-Subdomain": TENANTS.midnightBloom },
			});

			expect(response.status).toBe(200);
			expect(await response.json()).toMatchObject({
				subdomain: TENANTS.midnightBloom,
				id: expect.any(String),
			});
		});

		it("fails the stubbed AUTH binding without failing the request", async () => {
			await setService("auth", "fail");
			const healthy = await request("/", { tenant: TENANTS.midnightBloom });

			await setService("auth");
			const recovered = await request("/", { tenant: TENANTS.midnightBloom });

			expect(healthy.status).toBeLessThan(500);
			expect(recovered.status).toBe(200);
		});
	});
});
