/**
 * Email Module Tests
 *
 * Tests email template generation and send function.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	sendEmail,
	generateResultsEmail,
	generateFollowupEmail,
	sendResultsEmail,
	sendFollowupEmail,
} from "./email";
import type { DomainResult, ResultsEmailData, FollowupEmailData } from "./types";

// =============================================================================
// generateResultsEmail
// =============================================================================

describe("generateResultsEmail", () => {
	const sampleDomains: DomainResult[] = [
		{
			domain: "sunrise.com",
			tld: "com",
			status: "available",
			score: 0.9,
			batch_num: 1,
			flags: [],
			price_cents: 977,
		},
		{
			domain: "bakery.io",
			tld: "io",
			status: "available",
			score: 0.8,
			batch_num: 1,
			flags: [],
			price_cents: 4499,
		},
		{
			domain: "premium.luxury",
			tld: "luxury",
			status: "available",
			score: 0.7,
			batch_num: 1,
			flags: [],
			price_cents: 50000,
		},
	];

	const emailData: ResultsEmailData = {
		client_email: "user@example.com",
		business_name: "Sunrise Bakery",
		domains: sampleDomains,
		results_url: "https://forage.grove.place/results/123",
		booking_url: "https://forage.grove.place/book",
	};

	it("should generate valid HTML", () => {
		const html = generateResultsEmail(emailData);
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("</html>");
	});

	it("should include business name", () => {
		const html = generateResultsEmail(emailData);
		expect(html).toContain("Sunrise Bakery");
	});

	it("should include domain count", () => {
		const html = generateResultsEmail(emailData);
		expect(html).toContain("3");
	});

	it("should include results URL", () => {
		const html = generateResultsEmail(emailData);
		expect(html).toContain("https://forage.grove.place/results/123");
	});

	it("should include booking URL", () => {
		const html = generateResultsEmail(emailData);
		expect(html).toContain("https://forage.grove.place/book");
	});

	it("should use terminal aesthetic styling", () => {
		const html = generateResultsEmail(emailData);
		expect(html).toContain("monospace");
		expect(html).toContain("#1a1b26"); // Dark background
	});

	it("should group domains by price category", () => {
		const html = generateResultsEmail(emailData);
		expect(html).toContain("TOP PICKS"); // bundled
		expect(html).toContain("RECOMMENDED");
		expect(html).toContain("PREMIUM");
	});

	it("should format prices as dollars per year", () => {
		const html = generateResultsEmail(emailData);
		expect(html).toContain("$10/yr"); // 977 cents rounds to $10
	});

	it("should handle domains without prices", () => {
		const noPriceDomains: DomainResult[] = [
			{
				domain: "test.com",
				tld: "com",
				status: "available",
				score: 0.9,
				batch_num: 1,
				flags: [],
			},
		];

		const html = generateResultsEmail({
			...emailData,
			domains: noPriceDomains,
		});
		expect(html).toContain("N/A");
	});
});

// =============================================================================
// generateFollowupEmail
// =============================================================================

describe("generateFollowupEmail", () => {
	const followupData: FollowupEmailData = {
		client_email: "user@example.com",
		business_name: "Sunrise Bakery",
		quiz_url: "https://forage.grove.place/followup/123",
		batches_completed: 3,
		domains_checked: 150,
	};

	it("should generate valid HTML", () => {
		const html = generateFollowupEmail(followupData);
		expect(html).toContain("<!DOCTYPE html>");
		expect(html).toContain("</html>");
	});

	it("should include business name", () => {
		const html = generateFollowupEmail(followupData);
		expect(html).toContain("Sunrise Bakery");
	});

	it("should include quiz URL", () => {
		const html = generateFollowupEmail(followupData);
		expect(html).toContain("https://forage.grove.place/followup/123");
	});

	it("should include batch and domain counts", () => {
		const html = generateFollowupEmail(followupData);
		expect(html).toContain("150");
		expect(html).toContain("3");
	});

	it("should use terminal aesthetic styling", () => {
		const html = generateFollowupEmail(followupData);
		expect(html).toContain("monospace");
		expect(html).toContain("#1a1b26");
	});
});

// =============================================================================
// sendEmail
// =============================================================================

describe("sendEmail", () => {
	function mockZephyr(ok = true, response: unknown = { success: true, messageId: "msg-1" }) {
		return {
			fetch: vi.fn(async () => ({
				ok,
				json: async () => response,
				text: async () => JSON.stringify(response),
			})),
		} as unknown as Fetcher;
	}

	it("should POST to Zephyr with correct payload", async () => {
		const zephyr = mockZephyr();
		await sendEmail(zephyr, "api-key", "to@example.com", "Subject", "<p>Body</p>");

		expect(zephyr.fetch).toHaveBeenCalledWith(
			"https://zephyr.internal/send",
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					"X-API-Key": "api-key",
				}),
			}),
		);

		const callBody = JSON.parse((zephyr.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
		expect(callBody.to).toBe("to@example.com");
		expect(callBody.subject).toBe("Subject");
		expect(callBody.html).toBe("<p>Body</p>");
		expect(callBody.source).toBe("forage");
	});

	it("should use default from address", async () => {
		const zephyr = mockZephyr();
		await sendEmail(zephyr, "key", "to@test.com", "Sub", "<p>Hi</p>");

		const callBody = JSON.parse((zephyr.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
		expect(callBody.from).toBe("domains@grove.place");
		expect(callBody.fromName).toBe("Grove Domain Search");
	});

	it("should return success response", async () => {
		const zephyr = mockZephyr(true, { success: true, messageId: "msg-42" });
		const result = await sendEmail(zephyr, "key", "to@test.com", "Sub", "<p>Hi</p>");

		expect(result).toEqual({ success: true, messageId: "msg-42" });
	});

	it("should throw on Zephyr error", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const zephyr = mockZephyr(false, "Bad Request");

		await expect(sendEmail(zephyr, "key", "to@test.com", "Sub", "<p>Hi</p>")).rejects.toThrow(
			"Zephyr send error",
		);
	});
});

// =============================================================================
// sendResultsEmail / sendFollowupEmail (integration wrappers)
// =============================================================================

describe("sendResultsEmail", () => {
	it("should send with correct subject", async () => {
		const zephyr = {
			fetch: vi.fn(async () => ({
				ok: true,
				json: async () => ({ success: true }),
			})),
		} as unknown as Fetcher;

		await sendResultsEmail(zephyr, "key", {
			client_email: "user@test.com",
			business_name: "My Biz",
			domains: [],
			results_url: "https://example.com",
			booking_url: "https://example.com",
		});

		const callBody = JSON.parse((zephyr.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
		expect(callBody.subject).toBe("Your domains are ready: My Biz");
		expect(callBody.to).toBe("user@test.com");
	});
});

describe("sendFollowupEmail", () => {
	it("should send with correct subject", async () => {
		const zephyr = {
			fetch: vi.fn(async () => ({
				ok: true,
				json: async () => ({ success: true }),
			})),
		} as unknown as Fetcher;

		await sendFollowupEmail(zephyr, "key", {
			client_email: "user@test.com",
			business_name: "My Biz",
			quiz_url: "https://example.com",
			batches_completed: 2,
			domains_checked: 100,
		});

		const callBody = JSON.parse((zephyr.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
		expect(callBody.subject).toBe("Quick question about your domain search: My Biz");
	});
});
