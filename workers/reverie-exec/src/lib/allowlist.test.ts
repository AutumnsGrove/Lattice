import { describe, it, expect } from "vitest";
import { isAllowed, validateBatch, WRITE_ALLOWLIST } from "./allowlist";

describe("WRITE_ALLOWLIST", () => {
	it("contains all 30 writable domains", () => {
		expect(Object.keys(WRITE_ALLOWLIST)).toHaveLength(30);
	});

	it("does not include read-only domains", () => {
		expect(WRITE_ALLOWLIST["infra.billing"]).toBeUndefined();
		expect(WRITE_ALLOWLIST["infra.flags"]).toBeUndefined();
	});

	it("does not include username in identity.profile", () => {
		const profileFields = WRITE_ALLOWLIST["identity.profile"];
		expect(profileFields).toBeDefined();
		expect(profileFields!.has("username")).toBe(false);
		expect(profileFields!.has("displayName")).toBe(true);
	});
});

describe("isAllowed", () => {
	it("allows known domain+field combinations", () => {
		expect(isAllowed("foliage.accent", "accentColor")).toBe(true);
		expect(isAllowed("curios.cursor", "cursorType")).toBe(true);
		expect(isAllowed("social.meadow", "meadowOptIn")).toBe(true);
		expect(isAllowed("curios.gallery", "enableLightbox")).toBe(true);
	});

	it("rejects unknown domains", () => {
		expect(isAllowed("evil.domain", "anything")).toBe(false);
		expect(isAllowed("infra.billing", "tier")).toBe(false);
	});

	it("rejects unknown fields on valid domains", () => {
		expect(isAllowed("foliage.accent", "hackTheSystem")).toBe(false);
		expect(isAllowed("curios.cursor", "__proto__")).toBe(false);
	});

	it("rejects identity.profile.username", () => {
		expect(isAllowed("identity.profile", "username")).toBe(false);
	});
});

describe("validateBatch", () => {
	it("returns null for all-valid changes", () => {
		const result = validateBatch([
			{ domain: "foliage.accent", field: "accentColor" },
			{ domain: "curios.cursor", field: "cursorType" },
			{ domain: "curios.cursor", field: "preset" },
		]);
		expect(result).toBeNull();
	});

	it("returns the first disallowed change", () => {
		const result = validateBatch([
			{ domain: "foliage.accent", field: "accentColor" },
			{ domain: "infra.billing", field: "tier" },
			{ domain: "curios.cursor", field: "cursorType" },
		]);
		expect(result).toEqual({ domain: "infra.billing", field: "tier" });
	});

	it("catches prototype pollution attempts", () => {
		const result = validateBatch([{ domain: "__proto__", field: "constructor" }]);
		expect(result).toEqual({ domain: "__proto__", field: "constructor" });
	});
});
