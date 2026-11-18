import { describe, it, expect } from "vitest";
import { buildRemovalEmail } from "./removal-email";
import { resolveRemovalPolicy } from "./removal-policy";

const abuse = {
	subdomain: "emmareed",
	reason: "18 posts to upsampler.com in one session, no personalisation",
	policy: resolveRemovalPolicy("aup-1.4"),
	identityDeleted: true,
	contact: "hello@grove.place",
};

describe("buildRemovalEmail", () => {
	it("says what we found, which rule, and where to read it", () => {
		const email = buildRemovalEmail(abuse);

		expect(email.subject).toBe("Your Grove account was removed");
		expect(email.text).toContain("What we found:");
		expect(email.text).toContain("§1.4 Spam and Malicious Content");
		expect(email.text).toContain("https://grove.place/legal/acceptable-use");
	});

	it("quotes the operator's note rather than paraphrasing it", () => {
		const email = buildRemovalEmail(abuse);
		expect(email.text).toContain(
			"In our words: 18 posts to upsampler.com in one session, no personalisation",
		);
	});

	it("names the blog the person knew, not table names", () => {
		const email = buildRemovalEmail(abuse);

		expect(email.text).toContain("emmareed.grove.place");
		expect(email.text).toContain("the images and files you uploaded");
		expect(email.text).not.toMatch(/tenant_id|platform_billing|site_settings/);
	});

	it("says the login went too, when it did", () => {
		expect(buildRemovalEmail(abuse).text).toContain("the login you used to sign in");

		// A person whose login survived needs to know it, or they will not try it.
		const kept = buildRemovalEmail({ ...abuse, identityDeleted: false });
		expect(kept.text).not.toContain("the login you used to sign in");
	});

	it("offers no export for an abuse removal, and offers a reply", () => {
		const email = buildRemovalEmail(abuse);

		expect(email.text).toContain("not offering an export");
		expect(email.text).toContain("reply to this email");
		// A person reading at 2am should be told a human is there.
		expect(email.text).toContain("we have reversed removals before");
	});

	it("reads like a deletion when the person asked for it", () => {
		const email = buildRemovalEmail({
			...abuse,
			policy: resolveRemovalPolicy("requested"),
		});

		expect(email.subject).toBe("Your Grove account has been deleted");
		expect(email.text).toContain("As you asked");
		expect(email.text).not.toContain("What we found:");
		expect(email.text).not.toContain("§");
		expect(email.text).toContain("If you didn't ask for this");
	});

	it("escapes the operator's note and the subdomain in the HTML", () => {
		const email = buildRemovalEmail({
			...abuse,
			subdomain: "x",
			reason: `<script>alert("hi")</script> & "quotes"`,
		});

		expect(email.html).not.toContain("<script>");
		expect(email.html).toContain("&lt;script&gt;");
		expect(email.html).toContain("&amp;");
	});

	it("includes both a text and an HTML part", () => {
		const email = buildRemovalEmail(abuse);

		expect(email.text.length).toBeGreaterThan(200);
		expect(email.html).toContain("<!DOCTYPE html>");
		expect(email.html).toContain("Grove");
	});
});
