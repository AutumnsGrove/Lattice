/**
 * Grove Error System — Catalog Integrity Tests
 *
 * Meta-tests that verify error catalogs are well-formed:
 * - No duplicate error codes within or across catalogs
 * - All required fields present and non-empty
 * - Error codes follow the expected prefix pattern
 * - Categories are valid values
 *
 * As new error catalogs are added, import them here.
 */

import { describe, it, expect } from "vitest";
import type { GroveErrorDef } from "./types";

// Import all error catalogs
import { AUTH_ERRORS } from "../heartwood/errors";
import { API_ERRORS } from "./api-errors";
import { ARBOR_ERRORS } from "./arbor-errors";
import { SITE_ERRORS } from "./site-errors";
// Plant errors can't be imported here (different package), but we test the pattern

// =============================================================================
// HELPERS
// =============================================================================

type ErrorCatalog = Record<string, GroveErrorDef>;

function getAllCodes(catalog: ErrorCatalog): string[] {
  return Object.values(catalog).map((e) => e.code);
}

function validateCatalog(
  name: string,
  catalog: ErrorCatalog,
  expectedPrefix: string,
) {
  describe(`${name} catalog structure`, () => {
    const entries = Object.entries(catalog);

    it("should have at least one error defined", () => {
      expect(entries.length).toBeGreaterThan(0);
    });

    for (const [key, def] of entries) {
      describe(`${name}.${key}`, () => {
        it("should have a non-empty code", () => {
          expect(def.code).toBeTruthy();
          expect(typeof def.code).toBe("string");
        });

        it(`should have code starting with '${expectedPrefix}'`, () => {
          expect(def.code).toMatch(new RegExp(`^${expectedPrefix}`));
        });

        it("should have a valid category", () => {
          expect(["user", "admin", "bug"]).toContain(def.category);
        });

        it("should have a non-empty userMessage", () => {
          expect(def.userMessage).toBeTruthy();
          expect(typeof def.userMessage).toBe("string");
          expect(def.userMessage.length).toBeGreaterThan(5);
        });

        it("should have a non-empty adminMessage", () => {
          expect(def.adminMessage).toBeTruthy();
          expect(typeof def.adminMessage).toBe("string");
          expect(def.adminMessage.length).toBeGreaterThan(5);
        });

        it("should not leak admin details in userMessage", () => {
          // userMessage should never contain technical terms that belong in adminMessage
          const techTerms = [
            "D1",
            "KV",
            "R2",
            "binding",
            "SQL",
            "query",
            "platform.env",
            "OAuth",
            "CSRF",
            "token",
            "client_id",
            "client_secret",
          ];
          for (const term of techTerms) {
            expect(def.userMessage.toLowerCase()).not.toContain(
              term.toLowerCase(),
            );
          }
        });
      });
    }
  });
}

function validateNoDuplicateCodes(name: string, catalog: ErrorCatalog) {
  describe(`${name} code uniqueness`, () => {
    it("should have no duplicate error codes", () => {
      const codes = getAllCodes(catalog);
      const duplicates = codes.filter(
        (code, index) => codes.indexOf(code) !== index,
      );
      expect(duplicates).toEqual([]);
    });
  });
}

// =============================================================================
// CATALOG VALIDATIONS
// =============================================================================

describe("Error Catalog Integrity", () => {
  // Heartwood Auth Errors
  validateCatalog("AUTH_ERRORS", AUTH_ERRORS, "HW-AUTH-");
  validateNoDuplicateCodes("AUTH_ERRORS", AUTH_ERRORS);

  // Engine API Errors
  validateCatalog("API_ERRORS", API_ERRORS, "GROVE-API-");
  validateNoDuplicateCodes("API_ERRORS", API_ERRORS);

  // Engine Arbor Admin Errors
  validateCatalog("ARBOR_ERRORS", ARBOR_ERRORS, "GROVE-ARBOR-");
  validateNoDuplicateCodes("ARBOR_ERRORS", ARBOR_ERRORS);

  // Engine Site (Public Pages) Errors
  validateCatalog("SITE_ERRORS", SITE_ERRORS, "GROVE-SITE-");
  validateNoDuplicateCodes("SITE_ERRORS", SITE_ERRORS);

  // Cross-catalog uniqueness
  describe("Cross-catalog code uniqueness", () => {
    it("should have no duplicate codes across all catalogs", () => {
      const allCodes: string[] = [];
      allCodes.push(...getAllCodes(AUTH_ERRORS));
      allCodes.push(...getAllCodes(API_ERRORS));
      allCodes.push(...getAllCodes(ARBOR_ERRORS));
      allCodes.push(...getAllCodes(SITE_ERRORS));

      const duplicates = allCodes.filter(
        (code, index) => allCodes.indexOf(code) !== index,
      );
      expect(duplicates).toEqual([]);
    });
  });
});

// =============================================================================
// ERROR CODE FORMAT
// =============================================================================

describe("Error code format conventions", () => {
  it("AUTH_ERRORS codes should match HW-AUTH-NNN pattern", () => {
    for (const def of Object.values(AUTH_ERRORS)) {
      expect(def.code).toMatch(/^HW-AUTH-\d{3}$/);
    }
  });

  it("API_ERRORS codes should match GROVE-API-NNN pattern", () => {
    for (const def of Object.values(API_ERRORS)) {
      expect(def.code).toMatch(/^GROVE-API-\d{3}$/);
    }
  });

  it("ARBOR_ERRORS codes should match GROVE-ARBOR-NNN pattern", () => {
    for (const def of Object.values(ARBOR_ERRORS)) {
      expect(def.code).toMatch(/^GROVE-ARBOR-\d{3}$/);
    }
  });

  it("SITE_ERRORS codes should match GROVE-SITE-NNN pattern", () => {
    for (const def of Object.values(SITE_ERRORS)) {
      expect(def.code).toMatch(/^GROVE-SITE-\d{3}$/);
    }
  });
});

// =============================================================================
// TYPE COMPATIBILITY (backward compat)
// =============================================================================

describe("Backward compatibility", () => {
  it("AuthErrorDef should be assignable to GroveErrorDef", () => {
    // This is a compile-time check. If TypeScript accepts this, the alias works.
    const authError = AUTH_ERRORS.ACCESS_DENIED;
    const groveError: GroveErrorDef = authError;
    expect(groveError.code).toBe("HW-AUTH-001");
  });

  it("AUTH_ERRORS entries should satisfy GroveErrorDef shape", () => {
    for (const def of Object.values(AUTH_ERRORS)) {
      // Runtime structural check
      expect(def).toHaveProperty("code");
      expect(def).toHaveProperty("category");
      expect(def).toHaveProperty("userMessage");
      expect(def).toHaveProperty("adminMessage");
    }
  });
});
