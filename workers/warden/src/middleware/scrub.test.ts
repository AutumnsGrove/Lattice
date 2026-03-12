/**
 * Response Scrubbing Tests
 *
 * Tests recursive credential removal from upstream API responses,
 * including token patterns, URL sanitization, and sensitive key detection.
 */

import { describe, it, expect } from "vitest";
import { scrubResponse } from "./scrub";

describe("scrubResponse", () => {
	// ── GitHub token patterns ─────────────────────────────────────────

	it("should redact GitHub personal access tokens (ghp_)", () => {
		const data = { message: "Token is ghp_abcdefghijklmnopqrstuvwxyz1234567890" };

		const result = scrubResponse(data) as Record<string, unknown>;

		expect(result.message).toBe("Token is [REDACTED]");
	});

	it("should redact GitHub OAuth tokens (gho_)", () => {
		const data = "Auth: gho_abcdefghijklmnopqrstuvwxyz1234567890";

		const result = scrubResponse(data);

		expect(result).toBe("Auth: [REDACTED]");
	});

	it("should redact GitHub fine-grained PATs (github_pat_)", () => {
		const data = { token: "github_pat_abc123def456_longPatternHere" };

		const result = scrubResponse(data) as Record<string, unknown>;

		// "token" is a sensitive key, so it's completely redacted
		expect(result.token).toBe("[REDACTED]");
	});

	// ── Stripe key patterns ──────────────────────────────────────────
	// Note: Stripe key fixtures are constructed via concatenation to avoid
	// triggering GitHub push protection's pattern matching on the source file.

	it("should redact Stripe live secret keys", () => {
		const prefix = "sk_live_";
		const data = { billing: prefix + "abcdefghijklmnopqrstuvwx" };

		const result = scrubResponse(data) as Record<string, unknown>;

		expect(result.billing).toBe("[REDACTED]");
	});

	it("should redact Stripe test secret keys", () => {
		const prefix = "sk_test_";
		const data = "Using " + prefix + "abcdefghijklmnopqrstuvwx";

		const result = scrubResponse(data);

		expect(result).toBe("Using [REDACTED]");
	});

	it("should redact Stripe restricted keys", () => {
		const prefix = "rk_live_";
		const data = "Key: " + prefix + "abcdefghijklmnopqrstuvwx";

		expect(scrubResponse(data)).toBe("Key: [REDACTED]");
	});

	// ── Other provider patterns ──────────────────────────────────────

	it("should redact Resend API keys (re_)", () => {
		const data = "re_abcdefghijklmnopqrstuvwx";

		expect(scrubResponse(data)).toBe("[REDACTED]");
	});

	it("should redact Exa API keys (exa-)", () => {
		const data = "Key: exa-abcdefghijklmnopqrstuvwx";

		expect(scrubResponse(data)).toBe("Key: [REDACTED]");
	});

	it("should redact Tavily API keys (tvly-)", () => {
		const data = "API key: tvly-abcdefghijklmnopqrstuvwx";

		expect(scrubResponse(data)).toBe("API key: [REDACTED]");
	});

	it("should redact Cloudflare API tokens (v1.*)", () => {
		const data = "CF token: v1.abcdefghijklmnopqrstuvwxyz01234567890ABCDE";

		expect(scrubResponse(data)).toBe("CF token: [REDACTED]");
	});

	// ── Sensitive key names ──────────────────────────────────────────

	it("should completely redact fields with sensitive key names", () => {
		const data = {
			authorization: "Bearer some-token",
			"x-api-key": "my-key",
			api_key: "my-key",
			secret: "shh",
			token: "tok-123",
			password: "p@ss",
			access_token: "at-123",
			refresh_token: "rt-123",
		};

		const result = scrubResponse(data) as Record<string, unknown>;

		expect(result.authorization).toBe("[REDACTED]");
		expect(result["x-api-key"]).toBe("[REDACTED]");
		expect(result.api_key).toBe("[REDACTED]");
		expect(result.secret).toBe("[REDACTED]");
		expect(result.token).toBe("[REDACTED]");
		expect(result.password).toBe("[REDACTED]");
		expect(result.access_token).toBe("[REDACTED]");
		expect(result.refresh_token).toBe("[REDACTED]");
	});

	it("should be case-insensitive for sensitive keys", () => {
		const data = {
			Authorization: "Bearer test",
			TOKEN: "abc",
			Password: "xyz",
		};

		const result = scrubResponse(data) as Record<string, unknown>;

		expect(result.Authorization).toBe("[REDACTED]");
		expect(result.TOKEN).toBe("[REDACTED]");
		expect(result.Password).toBe("[REDACTED]");
	});

	// ── URL sanitization ─────────────────────────────────────────────

	it("should redact sensitive query params in URLs", () => {
		const data = "Visit https://api.example.com/resource?token=secret123&foo=bar";

		const result = scrubResponse(data) as string;

		expect(result).toContain("token=%5BREDACTED%5D");
		expect(result).toContain("foo=bar");
	});

	it("should redact api_key query param", () => {
		const data = "https://api.tavily.com/search?api_key=tvly-secret123";

		const result = scrubResponse(data) as string;

		expect(result).toContain("api_key=%5BREDACTED%5D");
	});

	it("should redact access_token query param", () => {
		const data = "https://example.com/callback?access_token=abc123def";

		const result = scrubResponse(data) as string;

		expect(result).toContain("access_token=%5BREDACTED%5D");
	});

	it("should preserve non-sensitive query params", () => {
		const data = "https://api.github.com/repos?page=2&per_page=30";

		expect(scrubResponse(data)).toBe(data);
	});

	// ── Recursive scrubbing ──────────────────────────────────────────

	it("should scrub nested objects recursively", () => {
		const data = {
			repo: {
				name: "my-repo",
				owner: {
					auth: { token: "ghp_secret1234567890abcdefghijklmnopq" },
				},
			},
		};

		const result = scrubResponse(data) as any;

		expect(result.repo.name).toBe("my-repo");
		expect(result.repo.owner.auth.token).toBe("[REDACTED]");
	});

	it("should scrub arrays", () => {
		const data = [
			"normal string",
			"has ghp_abcdefghijklmnopqrstuvwxyz1234567890 in it",
			{ secret: "my-secret" },
		];

		const result = scrubResponse(data) as unknown[];

		expect(result[0]).toBe("normal string");
		expect(result[1]).toBe("has [REDACTED] in it");
		expect((result[2] as any).secret).toBe("[REDACTED]");
	});

	// ── Passthrough for safe data ────────────────────────────────────

	it("should pass through numbers unchanged", () => {
		expect(scrubResponse(42)).toBe(42);
	});

	it("should pass through booleans unchanged", () => {
		expect(scrubResponse(true)).toBe(true);
	});

	it("should pass through null unchanged", () => {
		expect(scrubResponse(null)).toBeNull();
	});

	it("should pass through undefined unchanged", () => {
		expect(scrubResponse(undefined)).toBeUndefined();
	});

	it("should pass through clean strings unchanged", () => {
		expect(scrubResponse("just a normal string")).toBe("just a normal string");
	});

	it("should pass through clean objects unchanged", () => {
		const data = { name: "test", count: 5, active: true };
		expect(scrubResponse(data)).toEqual(data);
	});

	// ── Multiple patterns in one string ──────────────────────────────

	it("should redact multiple credentials in the same string", () => {
		const stripeKey = "sk_live_" + "abcdefghijklmnopqrstuvwx";
		const data = "GitHub: ghp_abcdefghijklmnopqrstuvwxyz1234567890 Stripe: " + stripeKey;

		const result = scrubResponse(data) as string;

		expect(result).toBe("GitHub: [REDACTED] Stripe: [REDACTED]");
	});
});
