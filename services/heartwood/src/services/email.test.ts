/**
 * Tests for the sign-in code email sender.
 *
 * The sender must go through Zephyr (never Resend directly), tag the message
 * as a "verification" email, and report delivery failure as `false` instead
 * of throwing — the caller decides how to surface it.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockEnv } from "../test-helpers.js";
import { sendLoginCodeEmail } from "./email.js";

function envWithZephyr(response: Response | Error) {
	const fetchMock =
		response instanceof Error
			? vi.fn().mockRejectedValue(response)
			: vi.fn().mockResolvedValue(response);
	return {
		fetchMock,
		env: createMockEnv({ ZEPHYR: { fetch: fetchMock } }),
	};
}

describe("sendLoginCodeEmail", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	it("sends a raw verification email through the ZEPHYR binding", async () => {
		const { env, fetchMock } = envWithZephyr(
			new Response(JSON.stringify({ success: true, messageId: "m1" }), { status: 200 }),
		);

		const ok = await sendLoginCodeEmail(env, "wanderer@example.com", "123456");

		expect(ok).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [, init] = fetchMock.mock.calls[0];
		const body = JSON.parse(init.body as string);
		expect(body.type).toBe("verification");
		expect(body.template).toBe("raw");
		expect(body.to).toBe("wanderer@example.com");
		expect(body.subject).toContain("123456");
		expect(body.html).toContain("123456");
		expect(body.text).toContain("123456");
	});

	it("returns false when Zephyr reports a failure", async () => {
		const { env } = envWithZephyr(
			new Response(
				JSON.stringify({ success: false, errorCode: "RATE_LIMITED", errorMessage: "slow down" }),
				{ status: 429 },
			),
		);

		expect(await sendLoginCodeEmail(env, "wanderer@example.com", "123456")).toBe(false);
	});

	it("returns false (does not throw) when the binding call rejects", async () => {
		const { env } = envWithZephyr(new Error("binding down"));

		await expect(sendLoginCodeEmail(env, "wanderer@example.com", "123456")).resolves.toBe(false);
	});

	it("never logs the code itself on failure", async () => {
		const { env } = envWithZephyr(new Error("binding down"));
		await sendLoginCodeEmail(env, "wanderer@example.com", "654321");

		const logged = JSON.stringify(
			(console.error as unknown as { mock: { calls: unknown[] } }).mock.calls,
		);
		expect(logged).not.toContain("654321");
	});
});
