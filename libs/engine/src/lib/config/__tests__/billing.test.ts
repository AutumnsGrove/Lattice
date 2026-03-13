import { describe, it, expect } from "vitest";
import {
	BILLING_HUB_URL,
	billingPath,
	buildCheckoutUrl,
	buildPortalUrl,
	buildCancelUrl,
	buildResumeUrl,
} from "../billing.js";

// In the test environment VITE_BILLING_URL is not set, so the module
// falls back to the default: "https://billing.grove.place"
const DEFAULT_HUB = "https://billing.grove.place";

describe("BILLING_HUB_URL", () => {
	it("defaults to https://billing.grove.place when no env var is set", () => {
		expect(BILLING_HUB_URL).toBe(DEFAULT_HUB);
	});
});

describe("billingPath()", () => {
	it("appends a path to the billing hub URL", () => {
		expect(billingPath("/checkout")).toBe(`${DEFAULT_HUB}/checkout`);
	});

	it("appends a deeper path", () => {
		expect(billingPath("/portal/manage")).toBe(`${DEFAULT_HUB}/portal/manage`);
	});

	it("handles empty string path", () => {
		expect(billingPath("")).toBe(DEFAULT_HUB);
	});
});

describe("buildCheckoutUrl()", () => {
	const redirect = "https://plant.grove.place/success";

	it("includes action=checkout", () => {
		const url = new URL(buildCheckoutUrl({ tier: "sapling", billingCycle: "monthly", redirect }));
		expect(url.searchParams.get("action")).toBe("checkout");
	});

	it("includes tier param", () => {
		const url = new URL(buildCheckoutUrl({ tier: "sapling", billingCycle: "monthly", redirect }));
		expect(url.searchParams.get("tier")).toBe("sapling");
	});

	it("includes billing cycle as cycle param", () => {
		const url = new URL(buildCheckoutUrl({ tier: "sapling", billingCycle: "monthly", redirect }));
		expect(url.searchParams.get("cycle")).toBe("monthly");
	});

	it("includes redirect param", () => {
		const url = new URL(buildCheckoutUrl({ tier: "sapling", billingCycle: "monthly", redirect }));
		expect(url.searchParams.get("redirect")).toBe(redirect);
	});

	it("includes tenantId when provided", () => {
		const url = new URL(
			buildCheckoutUrl({ tenantId: "t-123", tier: "sapling", billingCycle: "monthly", redirect }),
		);
		expect(url.searchParams.get("tenant")).toBe("t-123");
	});

	it("omits tenant param when tenantId is not provided", () => {
		const url = new URL(buildCheckoutUrl({ tier: "sapling", billingCycle: "monthly", redirect }));
		expect(url.searchParams.get("tenant")).toBeNull();
	});

	it("includes onboardingId when provided", () => {
		const url = new URL(
			buildCheckoutUrl({
				onboardingId: "onb-456",
				tier: "seedling",
				billingCycle: "yearly",
				redirect,
			}),
		);
		expect(url.searchParams.get("onboarding")).toBe("onb-456");
	});

	it("omits onboarding param when onboardingId is not provided", () => {
		const url = new URL(buildCheckoutUrl({ tier: "seedling", billingCycle: "yearly", redirect }));
		expect(url.searchParams.get("onboarding")).toBeNull();
	});

	it("builds correct URL for tenant checkout", () => {
		const result = buildCheckoutUrl({
			tenantId: "t-123",
			tier: "sapling",
			billingCycle: "monthly",
			redirect,
		});
		const url = new URL(result);
		expect(url.origin).toBe(DEFAULT_HUB);
		expect(url.searchParams.get("action")).toBe("checkout");
		expect(url.searchParams.get("tenant")).toBe("t-123");
		expect(url.searchParams.get("tier")).toBe("sapling");
		expect(url.searchParams.get("cycle")).toBe("monthly");
		expect(url.searchParams.get("redirect")).toBe(redirect);
	});

	it("builds correct URL for onboarding checkout", () => {
		const result = buildCheckoutUrl({
			onboardingId: "onb-456",
			tier: "seedling",
			billingCycle: "yearly",
			redirect,
		});
		const url = new URL(result);
		expect(url.searchParams.get("onboarding")).toBe("onb-456");
		expect(url.searchParams.get("tier")).toBe("seedling");
		expect(url.searchParams.get("cycle")).toBe("yearly");
	});

	it("properly encodes special characters in the redirect URL", () => {
		const complexRedirect = "https://plant.grove.place/success?flow=onboarding&step=done";
		const url = new URL(
			buildCheckoutUrl({ tier: "oak", billingCycle: "yearly", redirect: complexRedirect }),
		);
		// The decoded redirect param should equal the original
		expect(url.searchParams.get("redirect")).toBe(complexRedirect);
	});
});

describe("buildPortalUrl()", () => {
	const redirect = "https://mysite.grove.place/arbor";

	it("uses the /portal path on the hub", () => {
		const url = new URL(buildPortalUrl(redirect));
		expect(url.pathname).toBe("/portal");
	});

	it("includes the redirect param", () => {
		const url = new URL(buildPortalUrl(redirect));
		expect(url.searchParams.get("redirect")).toBe(redirect);
	});

	it("has the correct host", () => {
		const url = new URL(buildPortalUrl(redirect));
		expect(url.origin).toBe(DEFAULT_HUB);
	});

	it("properly encodes special characters in the redirect URL", () => {
		const complexRedirect = "https://mysite.grove.place/arbor?tab=billing&highlight=plan";
		const url = new URL(buildPortalUrl(complexRedirect));
		expect(url.searchParams.get("redirect")).toBe(complexRedirect);
	});
});

describe("buildCancelUrl()", () => {
	const redirect = "https://plant.grove.place/arbor";

	it("uses the /cancel path on the hub", () => {
		const url = new URL(buildCancelUrl(redirect));
		expect(url.pathname).toBe("/cancel");
	});

	it("includes the redirect param", () => {
		const url = new URL(buildCancelUrl(redirect));
		expect(url.searchParams.get("redirect")).toBe(redirect);
	});

	it("has the correct host", () => {
		const url = new URL(buildCancelUrl(redirect));
		expect(url.origin).toBe(DEFAULT_HUB);
	});
});

describe("buildResumeUrl()", () => {
	const redirect = "https://plant.grove.place/arbor";

	it("uses the /resume path on the hub", () => {
		const url = new URL(buildResumeUrl(redirect));
		expect(url.pathname).toBe("/resume");
	});

	it("includes the redirect param", () => {
		const url = new URL(buildResumeUrl(redirect));
		expect(url.searchParams.get("redirect")).toBe(redirect);
	});

	it("has the correct host", () => {
		const url = new URL(buildResumeUrl(redirect));
		expect(url.origin).toBe(DEFAULT_HUB);
	});

	it("properly encodes special characters in the redirect URL", () => {
		const complexRedirect = "https://plant.grove.place/arbor?resumed=true&plan=sapling";
		const url = new URL(buildResumeUrl(complexRedirect));
		expect(url.searchParams.get("redirect")).toBe(complexRedirect);
	});
});
