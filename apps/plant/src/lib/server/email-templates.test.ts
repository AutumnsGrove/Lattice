import { describe, it, expect } from "vitest";
import {
	getWelcomeEmail,
	getDay1Email,
	getDay3Email,
	getDay7Email,
	getDay30Email,
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
