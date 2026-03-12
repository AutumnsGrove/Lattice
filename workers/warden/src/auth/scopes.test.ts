/**
 * Scope Validation Tests
 *
 * Tests the scope permission system: exact matches, wildcards,
 * invalid actions, and the getRequiredScope/isValidAction helpers.
 */

import { describe, it, expect } from "vitest";
import { validateScope, getRequiredScope, isValidAction } from "./scopes";

describe("validateScope", () => {
	// ── Exact match ───────────────────────────────────────────────────

	it("should allow exact scope match", () => {
		expect(validateScope(["github:read"], "github", "list_repos")).toBe(true);
	});

	it("should allow exact write scope", () => {
		expect(validateScope(["github:write"], "github", "create_issue")).toBe(true);
	});

	it("should reject when scope permission doesn't match", () => {
		expect(validateScope(["github:read"], "github", "create_issue")).toBe(false);
	});

	it("should reject when scope service doesn't match", () => {
		expect(validateScope(["tavily:read"], "github", "list_repos")).toBe(false);
	});

	// ── Wildcard match ────────────────────────────────────────────────

	it("should allow service wildcard (service:*)", () => {
		expect(validateScope(["github:*"], "github", "create_issue")).toBe(true);
		expect(validateScope(["github:*"], "github", "list_repos")).toBe(true);
		expect(validateScope(["github:*"], "github", "trigger_workflow")).toBe(true);
	});

	it("should not allow service wildcard for different service", () => {
		expect(validateScope(["github:*"], "tavily", "search")).toBe(false);
	});

	it("should allow global wildcard (*:*)", () => {
		expect(validateScope(["*:*"], "github", "create_issue")).toBe(true);
		expect(validateScope(["*:*"], "tavily", "search")).toBe(true);
		expect(validateScope(["*:*"], "stripe", "list_customers")).toBe(true);
	});

	// ── Multiple scopes ───────────────────────────────────────────────

	it("should check all scopes and match any", () => {
		const scopes = ["github:read", "tavily:read", "exa:search"];
		expect(validateScope(scopes, "github", "list_repos")).toBe(true);
		expect(validateScope(scopes, "tavily", "search")).toBe(true);
		expect(validateScope(scopes, "exa", "search")).toBe(true);
	});

	it("should reject when no scope matches", () => {
		const scopes = ["github:read", "tavily:read"];
		expect(validateScope(scopes, "stripe", "list_customers")).toBe(false);
	});

	// ── Edge cases ────────────────────────────────────────────────────

	it("should reject empty scopes array", () => {
		expect(validateScope([], "github", "list_repos")).toBe(false);
	});

	it("should reject unknown action for valid service", () => {
		expect(validateScope(["github:read"], "github", "nonexistent_action")).toBe(false);
	});

	it("should reject unknown service entirely", () => {
		expect(validateScope(["unknown:read"], "unknown" as any, "anything")).toBe(false);
	});

	// ── All services have correct mappings ────────────────────────────

	it("should validate github actions scopes", () => {
		expect(validateScope(["github:actions"], "github", "list_workflow_runs")).toBe(true);
		expect(validateScope(["github:actions"], "github", "trigger_workflow")).toBe(true);
		expect(validateScope(["github:actions"], "github", "list_repos")).toBe(false);
	});

	it("should validate cloudflare dns scope", () => {
		expect(validateScope(["cloudflare:dns"], "cloudflare", "list_dns_records")).toBe(true);
		expect(validateScope(["cloudflare:dns"], "cloudflare", "create_dns_record")).toBe(true);
		expect(validateScope(["cloudflare:dns"], "cloudflare", "purge_cache")).toBe(false);
	});

	it("should validate openrouter inference scope", () => {
		expect(validateScope(["openrouter:inference"], "openrouter", "chat_completion")).toBe(true);
		expect(validateScope(["openrouter:inference"], "openrouter", "list_models")).toBe(false);
	});

	it("should validate resend send scope", () => {
		expect(validateScope(["resend:send"], "resend", "send_email")).toBe(true);
	});

	it("should validate exa scopes are distinct", () => {
		expect(validateScope(["exa:search"], "exa", "search")).toBe(true);
		expect(validateScope(["exa:search"], "exa", "find_similar")).toBe(false);
		expect(validateScope(["exa:similar"], "exa", "find_similar")).toBe(true);
		expect(validateScope(["exa:contents"], "exa", "get_contents")).toBe(true);
	});
});

describe("getRequiredScope", () => {
	it("should return the required scope string", () => {
		expect(getRequiredScope("github", "list_repos")).toBe("github:read");
		expect(getRequiredScope("github", "create_issue")).toBe("github:write");
		expect(getRequiredScope("tavily", "search")).toBe("tavily:read");
	});

	it("should return null for unknown action", () => {
		expect(getRequiredScope("github", "nonexistent")).toBeNull();
	});

	it("should return null for unknown service", () => {
		expect(getRequiredScope("unknown" as any, "anything")).toBeNull();
	});
});

describe("isValidAction", () => {
	it("should return true for valid service+action pairs", () => {
		expect(isValidAction("github", "list_repos")).toBe(true);
		expect(isValidAction("tavily", "search")).toBe(true);
		expect(isValidAction("stripe", "list_customers")).toBe(true);
		expect(isValidAction("openrouter", "chat_completion")).toBe(true);
	});

	it("should return false for invalid actions", () => {
		expect(isValidAction("github", "delete_everything")).toBe(false);
	});

	it("should return false for invalid services", () => {
		expect(isValidAction("nonexistent", "read")).toBe(false);
	});
});
