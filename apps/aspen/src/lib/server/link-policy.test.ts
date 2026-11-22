import { describe, it, expect } from "vitest";
import { linkPolicyFromContext } from "./link-policy";

const NOW = Date.UTC(2026, 10, 18, 12, 0, 0);
const DAY = 24 * 60 * 60 * 1000;
const secondsAgo = (days: number) => Math.floor((NOW - days * DAY) / 1000);

describe("linkPolicyFromContext", () => {
	it("returns the standard policy outside a tenant", () => {
		for (const context of [undefined, null, {}, { type: "root" }]) {
			const result = linkPolicyFromContext(context, NOW);
			expect(result.policy).toBe("standard");
			expect(result.noindex).toBe(false);
			expect(result.reason).toBe("no-tenant");
		}
	});

	it("marks a free-tier tenant nofollow, even when it is old", () => {
		const result = linkPolicyFromContext(
			{ type: "tenant", tenant: { plan: "wanderer", createdAt: secondsAgo(400) } },
			NOW,
		);
		expect(result.policy).toBe("nofollow-ugc");
		expect(result.reason).toBe("free-tier");
		// A free-tier writer's pages stay findable; only the links are devalued.
		expect(result.noindex).toBe(false);
	});

	it("marks a young paid tenant nofollow and noindex", () => {
		const result = linkPolicyFromContext(
			{ type: "tenant", tenant: { plan: "seedling", createdAt: secondsAgo(2) } },
			NOW,
		);
		expect(result.policy).toBe("nofollow-ugc");
		expect(result.noindex).toBe(true);
		expect(result.reason).toBe("young-account");
	});

	it("leaves an established paid tenant completely unchanged", () => {
		const result = linkPolicyFromContext(
			{ type: "tenant", tenant: { plan: "oak", createdAt: secondsAgo(200) } },
			NOW,
		);
		expect(result.policy).toBe("standard");
		expect(result.noindex).toBe(false);
	});

	it("treats a tenant with no createdAt as young rather than trusting it", () => {
		const result = linkPolicyFromContext({ type: "tenant", tenant: { plan: "evergreen" } }, NOW);
		expect(result.policy).toBe("nofollow-ugc");
		expect(result.noindex).toBe(true);
		expect(result.reason).toBe("unknown-age");
	});
});
