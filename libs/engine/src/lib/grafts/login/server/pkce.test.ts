/**
 * PKCE Utilities Tests
 *
 * Tests for RFC 7636 PKCE implementation.
 * These are CRITICAL for auth security - if PKCE breaks, OAuth fails.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7636
 */

import { describe, it, expect } from "vitest";
import {
  generateRandomString,
  generateCodeChallenge,
  generatePKCE,
  generateState,
} from "./pkce.js";

describe("PKCE Utilities", () => {
  // ==========================================================================
  // generateRandomString
  // ==========================================================================

  describe("generateRandomString", () => {
    it("generates a string of the specified length", () => {
      const result = generateRandomString(64);
      expect(result).toHaveLength(64);
    });

    it("generates different strings on each call", () => {
      const a = generateRandomString(64);
      const b = generateRandomString(64);
      expect(a).not.toBe(b);
    });

    it("uses only URL-safe characters per RFC 7636", () => {
      // RFC 7636 Section 4.1: code_verifier uses unreserved characters
      // ALPHA / DIGIT / "-" / "." / "_" / "~"
      const result = generateRandomString(128);
      expect(result).toMatch(/^[A-Za-z0-9\-._~]+$/);
    });

    it("respects minimum length of 43 characters", () => {
      expect(() => generateRandomString(42)).toThrow(
        "Code verifier length must be between 43 and 128 characters",
      );
    });

    it("respects maximum length of 128 characters", () => {
      expect(() => generateRandomString(129)).toThrow(
        "Code verifier length must be between 43 and 128 characters",
      );
    });

    it("accepts minimum valid length of 43", () => {
      const result = generateRandomString(43);
      expect(result).toHaveLength(43);
    });

    it("accepts maximum valid length of 128", () => {
      const result = generateRandomString(128);
      expect(result).toHaveLength(128);
    });

    it("generates default length of 64 when no argument provided", () => {
      const result = generateRandomString();
      expect(result).toHaveLength(64);
    });

    it("has sufficient entropy (statistical test)", () => {
      // Generate multiple strings and check character distribution
      // If random is working, we should see variety
      const strings = Array.from({ length: 100 }, () =>
        generateRandomString(64),
      );
      const uniqueStrings = new Set(strings);

      // All 100 should be unique (collision probability is astronomically low)
      expect(uniqueStrings.size).toBe(100);
    });
  });

  // ==========================================================================
  // generateCodeChallenge
  // ==========================================================================

  describe("generateCodeChallenge", () => {
    it("generates a base64url-encoded challenge", async () => {
      const verifier =
        "test_verifier_with_sufficient_length_for_testing_purposes";
      const challenge = await generateCodeChallenge(verifier);

      // Base64url uses A-Z, a-z, 0-9, -, _ (no + or /)
      expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
    });

    it("does not include base64 padding characters", async () => {
      const verifier = "test_verifier_string_that_might_produce_padding";
      const challenge = await generateCodeChallenge(verifier);

      expect(challenge).not.toContain("=");
    });

    it("produces consistent output for same input", async () => {
      const verifier = "consistent_test_verifier_for_reproducibility";
      const challenge1 = await generateCodeChallenge(verifier);
      const challenge2 = await generateCodeChallenge(verifier);

      expect(challenge1).toBe(challenge2);
    });

    it("produces different output for different input", async () => {
      const challenge1 = await generateCodeChallenge(
        "verifier_one_for_testing",
      );
      const challenge2 = await generateCodeChallenge(
        "verifier_two_for_testing",
      );

      expect(challenge1).not.toBe(challenge2);
    });

    it("produces correct SHA-256 hash (known test vector)", async () => {
      // RFC 7636 Appendix B - Test Vector
      // verifier: dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
      // challenge: E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
      const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
      const expectedChallenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

      const challenge = await generateCodeChallenge(verifier);
      expect(challenge).toBe(expectedChallenge);
    });

    it("handles empty string input", async () => {
      // SHA-256 of empty string is a known value
      const challenge = await generateCodeChallenge("");
      expect(challenge).toBeDefined();
      expect(challenge.length).toBeGreaterThan(0);
    });

    it("handles unicode characters", async () => {
      const verifier = "test_with_émoji_🌲_and_üñíçödé";
      const challenge = await generateCodeChallenge(verifier);

      expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
    });
  });

  // ==========================================================================
  // generatePKCE
  // ==========================================================================

  describe("generatePKCE", () => {
    it("returns both codeVerifier and codeChallenge", async () => {
      const { codeVerifier, codeChallenge } = await generatePKCE();

      expect(codeVerifier).toBeDefined();
      expect(codeChallenge).toBeDefined();
    });

    it("codeVerifier has default length of 64", async () => {
      const { codeVerifier } = await generatePKCE();
      expect(codeVerifier).toHaveLength(64);
    });

    it("codeVerifier respects custom length", async () => {
      const { codeVerifier } = await generatePKCE(100);
      expect(codeVerifier).toHaveLength(100);
    });

    it("codeChallenge is correctly derived from codeVerifier", async () => {
      const { codeVerifier, codeChallenge } = await generatePKCE();

      // Manually compute the expected challenge
      const expectedChallenge = await generateCodeChallenge(codeVerifier);
      expect(codeChallenge).toBe(expectedChallenge);
    });

    it("generates unique PKCE pairs on each call", async () => {
      const pkce1 = await generatePKCE();
      const pkce2 = await generatePKCE();

      expect(pkce1.codeVerifier).not.toBe(pkce2.codeVerifier);
      expect(pkce1.codeChallenge).not.toBe(pkce2.codeChallenge);
    });

    it("codeVerifier uses only URL-safe characters", async () => {
      const { codeVerifier } = await generatePKCE();
      expect(codeVerifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
    });

    it("codeChallenge uses only base64url characters", async () => {
      const { codeChallenge } = await generatePKCE();
      expect(codeChallenge).toMatch(/^[A-Za-z0-9\-_]+$/);
    });
  });

  // ==========================================================================
  // generateState
  // ==========================================================================

  describe("generateState", () => {
    it("generates a UUID v4 string", () => {
      const state = generateState();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(state).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it("generates unique states on each call", () => {
      const states = Array.from({ length: 100 }, () => generateState());
      const uniqueStates = new Set(states);

      expect(uniqueStates.size).toBe(100);
    });

    it("returns a string (not undefined or null)", () => {
      const state = generateState();

      expect(typeof state).toBe("string");
      expect(state.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Integration: Full OAuth PKCE Flow Simulation
  // ==========================================================================

  describe("Integration: PKCE Flow Simulation", () => {
    it("simulates a complete PKCE authorization flow", async () => {
      // Step 1: Client generates PKCE pair and state
      const { codeVerifier, codeChallenge } = await generatePKCE();
      const state = generateState();

      // Store codeVerifier securely (would go in cookie)
      const storedVerifier = codeVerifier;

      // Step 2: Send codeChallenge with authorization request
      // (Auth server would receive: codeChallenge, state)
      expect(codeChallenge.length).toBeGreaterThan(0);
      expect(state.length).toBeGreaterThan(0);

      // Step 3: On callback, verify state matches
      const returnedState = state; // Would come from auth server
      expect(returnedState).toBe(state);

      // Step 4: Send codeVerifier with token request
      // Auth server computes challenge from verifier and compares
      const computedChallenge = await generateCodeChallenge(storedVerifier);
      expect(computedChallenge).toBe(codeChallenge);

      // If this assertion passes, the auth server would accept the token request
    });

    it("detects if codeVerifier was tampered with", async () => {
      const { codeVerifier, codeChallenge } = await generatePKCE();

      // Attacker tries to use a different verifier
      // Use a character guaranteed to be different from the last char
      const lastChar = codeVerifier.slice(-1);
      const replacementChar = lastChar === "X" ? "Y" : "X";
      const tamperedVerifier = codeVerifier.slice(0, -1) + replacementChar;
      const tamperedChallenge = await generateCodeChallenge(tamperedVerifier);

      // The challenges won't match - auth server would reject
      expect(tamperedChallenge).not.toBe(codeChallenge);
    });

    it("ensures challenge length is suitable for URL parameters", async () => {
      // Challenge goes in URL, so should be reasonable length
      const { codeChallenge } = await generatePKCE();

      // SHA-256 produces 32 bytes, base64url encodes to ~43 characters
      expect(codeChallenge.length).toBeLessThan(100);
      expect(codeChallenge.length).toBeGreaterThan(30);
    });
  });
});
