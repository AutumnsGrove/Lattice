import { describe, it, expect } from "vitest";
import {
	getWelcomeEmail,
	getDay1Email,
	getDay3Email,
	getDay7Email,
	getDay30Email,
	getPaymentFailedEmail,
	getPaymentReceivedEmail,
} from "./email-templates";

const baseParams = {
	name: "Autumn",
	username: "autumn",
	email: "autumn@grove.place",
};

describe("getWelcomeEmail", () => {
	it("includes name in subject", () => {
		const { subject } = getWelcomeEmail(baseParams);
		expect(subject).toContain("Autumn");
	});

	it("includes username subdomain in HTML", () => {
		const { html } = getWelcomeEmail(baseParams);
		expect(html).toContain("autumn.grove.place");
	});

	it("includes admin link in HTML", () => {
		const { html } = getWelcomeEmail(baseParams);
		expect(html).toContain("autumn.grove.place/admin");
	});

	it("returns text version with username", () => {
		const { text } = getWelcomeEmail(baseParams);
		expect(text).toContain("autumn.grove.place");
	});

	it("returns all three parts (subject, html, text)", () => {
		const result = getWelcomeEmail(baseParams);
		expect(result.subject).toBeDefined();
		expect(result.html).toBeDefined();
		expect(result.text).toBeDefined();
	});
});

describe("getDay1Email", () => {
	it("has appropriate subject for setup reminder", () => {
		const { subject } = getDay1Email(baseParams);
		expect(subject).toContain("setting up");
	});

	it("includes name in HTML", () => {
		const { html } = getDay1Email(baseParams);
		expect(html).toContain("Autumn");
	});

	it("includes admin link", () => {
		const { html } = getDay1Email(baseParams);
		expect(html).toContain("autumn.grove.place/admin");
	});
});

describe("getDay3Email", () => {
	it("includes name in subject", () => {
		const { subject } = getDay3Email(baseParams);
		expect(subject).toContain("Autumn");
	});

	it("shows post count when user has published", () => {
		const { html } = getDay3Email({ ...baseParams, postCount: 3 });
		expect(html).toContain("3 posts");
	});

	it("shows encouragement when user has not published", () => {
		const { html } = getDay3Email({ ...baseParams, postCount: 0 });
		expect(html).toContain("haven't written");
	});

	it("uses singular 'post' for count of 1", () => {
		const { html } = getDay3Email({ ...baseParams, postCount: 1 });
		expect(html).toContain("1 post!");
		expect(html).not.toContain("1 posts");
	});
});

describe("getDay7Email", () => {
	it("has 'One week' subject", () => {
		const { subject } = getDay7Email(baseParams);
		expect(subject).toContain("One week");
	});

	it("includes RSS feed URL", () => {
		const { html } = getDay7Email(baseParams);
		expect(html).toContain("autumn.grove.place/rss.xml");
	});

	it("mentions data export", () => {
		const { text } = getDay7Email(baseParams);
		expect(text).toContain("export");
	});
});

describe("getDay30Email", () => {
	it("has 'One month' subject", () => {
		const { subject } = getDay30Email(baseParams);
		expect(subject).toBe("One month!");
	});

	it("shows post count when published", () => {
		const { html } = getDay30Email({ ...baseParams, postCount: 10 });
		expect(html).toContain("10 posts");
	});

	it("omits post section when no posts", () => {
		const { html } = getDay30Email({ ...baseParams, postCount: 0 });
		expect(html).not.toContain("published");
	});
});

describe("getPaymentFailedEmail", () => {
	const failedParams = { name: "Autumn", subdomain: "autumn" };

	it("has correct subject", () => {
		const { subject } = getPaymentFailedEmail(failedParams);
		expect(subject).toContain("payment");
	});

	it("includes billing page link in HTML", () => {
		const { html } = getPaymentFailedEmail(failedParams);
		expect(html).toContain("plant.grove.place/billing");
	});

	it("reassures blog is still live", () => {
		const { html } = getPaymentFailedEmail(failedParams);
		expect(html).toContain("still live");
	});

	it("mentions 7-day grace period", () => {
		const { text } = getPaymentFailedEmail(failedParams);
		expect(text).toContain("7 days");
	});

	it("mentions cancellation option", () => {
		const { text } = getPaymentFailedEmail(failedParams);
		expect(text).toContain("cancel");
	});

	it("includes name in greeting", () => {
		const { html } = getPaymentFailedEmail(failedParams);
		expect(html).toContain("Hi Autumn");
	});
});

describe("getPaymentReceivedEmail", () => {
	const receiptParams = {
		name: "Autumn",
		subdomain: "autumn",
		amount: "8.00",
		paymentDate: "March 12, 2026",
		planName: "Seedling",
		interval: "month",
		nextPaymentDate: "April 12, 2026",
		invoiceId: "inv_test_123",
	};

	it("has receipt subject", () => {
		const { subject } = getPaymentReceivedEmail(receiptParams);
		expect(subject).toContain("Receipt");
	});

	it("includes amount with dollar sign", () => {
		const { html } = getPaymentReceivedEmail(receiptParams);
		expect(html).toContain("$8.00");
	});

	it("includes payment date", () => {
		const { html } = getPaymentReceivedEmail(receiptParams);
		expect(html).toContain("March 12, 2026");
	});

	it("includes plan name and interval", () => {
		const { html } = getPaymentReceivedEmail(receiptParams);
		expect(html).toContain("Seedling");
		expect(html).toContain("monthly");
	});

	it("includes next payment date", () => {
		const { html } = getPaymentReceivedEmail(receiptParams);
		expect(html).toContain("April 12, 2026");
	});

	it("includes invoice ID", () => {
		const { html } = getPaymentReceivedEmail(receiptParams);
		expect(html).toContain("inv_test_123");
	});

	it("includes blog link", () => {
		const { html } = getPaymentReceivedEmail(receiptParams);
		expect(html).toContain("autumn.grove.place");
	});

	it("includes billing page link for formal receipt", () => {
		const { text } = getPaymentReceivedEmail(receiptParams);
		expect(text).toContain("plant.grove.place/billing");
	});
});
