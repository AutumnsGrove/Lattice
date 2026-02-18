import { describe, it, expect } from "vitest";
import {
  getUserDisplayName,
  hasPersonalizedName,
  normalizeEmail,
  emailsMatch,
} from "./user";

describe("getUserDisplayName", () => {
  it("returns name when available", () => {
    expect(
      getUserDisplayName({ name: "Jordan", email: "jordan@example.com" }),
    ).toBe("Jordan");
  });

  it("returns email username when name is not set", () => {
    expect(getUserDisplayName({ email: "wanderer@grove.place" })).toBe(
      "wanderer",
    );
  });

  it("returns email username when name is null", () => {
    expect(
      getUserDisplayName({ name: null, email: "autumn@grove.place" }),
    ).toBe("autumn");
  });

  it("returns email username when name is empty string", () => {
    expect(getUserDisplayName({ name: "", email: "reader@grove.place" })).toBe(
      "reader",
    );
  });

  it('returns "Wanderer" when user is undefined', () => {
    expect(getUserDisplayName(undefined)).toBe("Wanderer");
  });

  it('returns "Wanderer" when user is null', () => {
    expect(getUserDisplayName(null)).toBe("Wanderer");
  });

  it('returns "Wanderer" when both name and email are missing', () => {
    expect(getUserDisplayName({})).toBe("Wanderer");
  });

  it('returns "Wanderer" when both name and email are null', () => {
    expect(getUserDisplayName({ name: null, email: null })).toBe("Wanderer");
  });
});

describe("hasPersonalizedName", () => {
  it("returns true when name is set", () => {
    expect(hasPersonalizedName({ name: "Jordan" })).toBe(true);
  });

  it("returns true when only email is set", () => {
    expect(hasPersonalizedName({ email: "wanderer@grove.place" })).toBe(true);
  });

  it("returns false when user is undefined", () => {
    expect(hasPersonalizedName(undefined)).toBe(false);
  });

  it("returns false when user is null", () => {
    expect(hasPersonalizedName(null)).toBe(false);
  });

  it("returns false when both name and email are missing", () => {
    expect(hasPersonalizedName({})).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("lowercases and trims email", () => {
    expect(normalizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });

  it("handles already normalized email", () => {
    expect(normalizeEmail("user@example.com")).toBe("user@example.com");
  });

  it("returns null for null input", () => {
    expect(normalizeEmail(null)).toBe(null);
  });

  it("returns null for undefined input", () => {
    expect(normalizeEmail(undefined)).toBe(null);
  });

  it("returns null for empty string", () => {
    expect(normalizeEmail("")).toBe(null);
  });

  it("trims whitespace only strings to null", () => {
    expect(normalizeEmail("   ")).toBe(null);
  });
});

describe("emailsMatch", () => {
  it("returns true for matching emails (case-insensitive)", () => {
    expect(emailsMatch("user@example.com", "USER@example.com")).toBe(true);
  });

  it("returns true for matching emails with whitespace", () => {
    expect(emailsMatch("  user@example.com", "user@example.com  ")).toBe(true);
  });

  it("returns false for different emails", () => {
    expect(emailsMatch("user1@example.com", "user2@example.com")).toBe(false);
  });

  it("returns false when first email is null", () => {
    expect(emailsMatch(null, "user@example.com")).toBe(false);
  });

  it("returns false when second email is null", () => {
    expect(emailsMatch("user@example.com", null)).toBe(false);
  });

  it("returns false when both emails are null", () => {
    expect(emailsMatch(null, null)).toBe(false);
  });

  it("returns false when first email is undefined", () => {
    expect(emailsMatch(undefined, "user@example.com")).toBe(false);
  });

  it("returns false when second email is undefined", () => {
    expect(emailsMatch("user@example.com", undefined)).toBe(false);
  });

  it("returns false for empty strings", () => {
    expect(emailsMatch("", "user@example.com")).toBe(false);
    expect(emailsMatch("user@example.com", "")).toBe(false);
  });
});
