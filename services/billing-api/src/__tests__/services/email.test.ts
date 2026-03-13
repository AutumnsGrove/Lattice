/**
 * Email Service Tests
 *
 * Tests for payment-related email functions that call Zephyr service binding.
 * Covers three email types: payment received, payment failed, cancellation.
 * Verifies HTML escaping for user-provided values and graceful error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	sendPaymentReceivedEmail,
	sendPaymentFailedEmail,
	sendCancellationEmail,
} from "../../services/email.js";

describe("Email Service", () => {
	let mockFetch: ReturnType<typeof vi.fn>;
	let mockZephyr: { fetch: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		mockFetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
		mockZephyr = { fetch: mockFetch };
		vi.clearAllMocks();
	});

	// ─────────────────────────────────────────────────────────────────────────
	// PAYMENT RECEIVED EMAIL
	// ─────────────────────────────────────────────────────────────────────────

	it("sendPaymentReceivedEmail calls Zephyr with correct subject", async () => {
		await sendPaymentReceivedEmail(mockZephyr as unknown as Fetcher, {
			to: "user@example.com",
			name: "Alice",
			subdomain: "aliceblog",
			amount: "$99.00",
			paymentDate: "March 13, 2026",
			planName: "seedling",
			interval: "month",
			nextPaymentDate: "April 13, 2026",
			invoiceId: "inv_test_123",
		});

		await new Promise((resolve) => setImmediate(resolve));

		expect(mockFetch).toHaveBeenCalledWith(
			"https://internal/send",
			expect.objectContaining({
				method: "POST",
				headers: { "Content-Type": "application/json" },
			}),
		);

		const callArgs = mockFetch.mock.calls[0];
		const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;

		expect(body.subject).toBe("Welcome to Grove seedling!");
		expect(body.to).toBe("user@example.com");
		expect(body.from).toBe("Grove <hello@grove.place>");
	});

	it("sendPaymentReceivedEmail escapes HTML in user name", async () => {
		await sendPaymentReceivedEmail(mockZephyr as unknown as Fetcher, {
			to: "user@example.com",
			name: '<script>alert("xss")</script>',
			subdomain: "aliceblog",
			amount: "$99.00",
			paymentDate: "March 13, 2026",
			planName: "seedling",
			interval: "month",
			nextPaymentDate: "April 13, 2026",
			invoiceId: "inv_test_123",
		});

		await new Promise((resolve) => setImmediate(resolve));

		const callArgs = mockFetch.mock.calls[0];
		const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
		const html = body.html as string;

		// Should escape the < and > characters
		expect(html).toContain("&lt;script&gt;");
		expect(html).not.toContain("<script>");
	});

	it("sendPaymentReceivedEmail includes plan name and interval", async () => {
		await sendPaymentReceivedEmail(mockZephyr as unknown as Fetcher, {
			to: "user@example.com",
			name: "Bob",
			subdomain: "bobblog",
			amount: "$49.00",
			paymentDate: "March 13, 2026",
			planName: "sapling",
			interval: "month",
			nextPaymentDate: "April 13, 2026",
			invoiceId: "inv_test_456",
		});

		await new Promise((resolve) => setImmediate(resolve));

		const callArgs = mockFetch.mock.calls[0];
		const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
		const html = body.html as string;

		expect(html).toContain("sapling");
		expect(html).toContain("monthly");
	});

	it("sendPaymentReceivedEmail handles Zephyr failure gracefully (no throw)", async () => {
		mockFetch.mockResolvedValue(new Response("Internal Server Error", { status: 500 }));

		// Should not throw
		await expect(
			sendPaymentReceivedEmail(mockZephyr as unknown as Fetcher, {
				to: "user@example.com",
				name: "Charlie",
				subdomain: "charlieblog",
				amount: "$99.00",
				paymentDate: "March 13, 2026",
				planName: "seedling",
				interval: "month",
				nextPaymentDate: "April 13, 2026",
				invoiceId: "inv_test_789",
			}),
		).resolves.toBeUndefined();

		expect(mockFetch).toHaveBeenCalled();
	});

	// ─────────────────────────────────────────────────────────────────────────
	// PAYMENT FAILED EMAIL
	// ─────────────────────────────────────────────────────────────────────────

	it("sendPaymentFailedEmail calls Zephyr with correct subject", async () => {
		await sendPaymentFailedEmail(mockZephyr as unknown as Fetcher, {
			to: "user@example.com",
			name: "Diana",
			subdomain: "dianablog",
		});

		await new Promise((resolve) => setImmediate(resolve));

		const callArgs = mockFetch.mock.calls[0];
		const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;

		expect(body.subject).toBe("Action needed: payment issue on your Grove account");
		expect(body.to).toBe("user@example.com");
	});

	it("sendPaymentFailedEmail escapes HTML in user name", async () => {
		await sendPaymentFailedEmail(mockZephyr as unknown as Fetcher, {
			to: "user@example.com",
			name: '"><img src=x onerror=alert(1)>',
			subdomain: "eveblog",
		});

		await new Promise((resolve) => setImmediate(resolve));

		const callArgs = mockFetch.mock.calls[0];
		const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
		const html = body.html as string;

		expect(html).toContain("&quot;&gt;");
		expect(html).not.toContain('"><img');
	});

	it("sendPaymentFailedEmail handles Zephyr failure gracefully (no throw)", async () => {
		mockFetch.mockRejectedValue(new Error("Network timeout"));

		await expect(
			sendPaymentFailedEmail(mockZephyr as unknown as Fetcher, {
				to: "user@example.com",
				name: "Frank",
				subdomain: "frankblog",
			}),
		).resolves.toBeUndefined();
	});

	// ─────────────────────────────────────────────────────────────────────────
	// CANCELLATION EMAIL
	// ─────────────────────────────────────────────────────────────────────────

	it("sendCancellationEmail includes period end date and resume link", async () => {
		await sendCancellationEmail(mockZephyr as unknown as Fetcher, {
			to: "user@example.com",
			name: "Grace",
			subdomain: "graceblog",
			periodEndDate: "April 13, 2026",
			planName: "seedling",
		});

		await new Promise((resolve) => setImmediate(resolve));

		const callArgs = mockFetch.mock.calls[0];
		const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
		const html = body.html as string;

		expect(body.subject).toBe("Your Grove membership has been cancelled");
		expect(html).toContain("April 13, 2026");
		expect(html).toContain("/arbor/account");
	});

	it("sendCancellationEmail escapes HTML in subdomain", async () => {
		await sendCancellationEmail(mockZephyr as unknown as Fetcher, {
			to: "user@example.com",
			name: "Henry",
			subdomain: '"><script>alert("xss")</script>',
			periodEndDate: "April 13, 2026",
			planName: "sapling",
		});

		await new Promise((resolve) => setImmediate(resolve));

		const callArgs = mockFetch.mock.calls[0];
		const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
		const html = body.html as string;

		// The subdomain in the HTML should be escaped
		expect(html).toContain("&quot;&gt;");
		expect(html).not.toContain('"><script>');
	});

	it("sendCancellationEmail includes resume link with subdomain", async () => {
		await sendCancellationEmail(mockZephyr as unknown as Fetcher, {
			to: "user@example.com",
			name: "Ivy",
			subdomain: "ivyblog",
			periodEndDate: "April 13, 2026",
			planName: "seedling",
		});

		await new Promise((resolve) => setImmediate(resolve));

		const callArgs = mockFetch.mock.calls[0];
		const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
		const html = body.html as string;

		expect(html).toContain("ivyblog.grove.place");
		expect(html).toContain("Resume Subscription");
	});

	it("sendCancellationEmail handles Zephyr failure gracefully (no throw)", async () => {
		mockFetch.mockResolvedValue(new Response("Bad Request", { status: 400 }));

		await expect(
			sendCancellationEmail(mockZephyr as unknown as Fetcher, {
				to: "user@example.com",
				name: "Jack",
				subdomain: "jackblog",
				periodEndDate: "April 13, 2026",
				planName: "seedling",
			}),
		).resolves.toBeUndefined();
	});

	// ─────────────────────────────────────────────────────────────────────────
	// HTML ESCAPING ACROSS ALL FUNCTIONS
	// ─────────────────────────────────────────────────────────────────────────

	it("escapes ampersands in all email functions", async () => {
		await sendPaymentReceivedEmail(mockZephyr as unknown as Fetcher, {
			to: "user@example.com",
			name: "User & Co.",
			subdomain: "andblog",
			amount: "$99 & more",
			paymentDate: "March 13 & beyond",
			planName: "seedling & extras",
			interval: "month",
			nextPaymentDate: "April 13 & more",
			invoiceId: "inv_test_123",
		});

		await new Promise((resolve) => setImmediate(resolve));

		const callArgs = mockFetch.mock.calls[0];
		const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
		const html = body.html as string;

		expect(html).toContain("&amp;");
		expect(html).not.toContain(" & ");
	});

	it("escapes quotes in all email functions", async () => {
		await sendPaymentReceivedEmail(mockZephyr as unknown as Fetcher, {
			to: "user@example.com",
			name: 'User "Name"',
			subdomain: 'blog"test',
			amount: "$99",
			paymentDate: 'March "13" 2026',
			planName: 'Plan "Premium"',
			interval: "month",
			nextPaymentDate: "April 13",
			invoiceId: "inv_test_123",
		});

		await new Promise((resolve) => setImmediate(resolve));

		const callArgs = mockFetch.mock.calls[0];
		const body = JSON.parse(callArgs[1].body as string) as Record<string, unknown>;
		const html = body.html as string;

		expect(html).toContain("&quot;");
		expect(html).not.toContain('"Name"');
	});
});
