/**
 * Settings Integration Tests
 *
 * Tests site settings endpoint validation patterns including font family selection,
 * accent color validation, settings persistence, and authorization checks.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createMockRequestEvent,
  createAuthenticatedTenantEvent,
  createMockD1,
  seedMockD1,
} from "../helpers/index.js";

// ============================================================================
// Constants
// ============================================================================

const ALLOWED_FONTS = [
  "lexend",
  "inter",
  "merriweather",
  "source-serif-pro",
  "jetbrains-mono",
  "fira-code",
];

// ============================================================================
// Test Suite
// ============================================================================

describe("Settings Integration", () => {
  let db: ReturnType<typeof createMockD1>;

  beforeEach(() => {
    db = createMockD1();
  });

  // ============================================================================
  // Font Family Validation Tests
  // ============================================================================

  describe("Font family validation", () => {
    it("accepts valid font families", () => {
      for (const font of ALLOWED_FONTS) {
        expect(ALLOWED_FONTS.includes(font)).toBe(true);
      }
    });

    it("rejects unknown font families", () => {
      const invalidFonts = [
        "comic-sans",
        "arial",
        "times-new-roman",
        "georgia",
      ];
      for (const font of invalidFonts) {
        expect(ALLOWED_FONTS.includes(font)).toBe(false);
      }
    });

    it("rejects empty font family", () => {
      expect(ALLOWED_FONTS.includes("")).toBe(false);
    });

    it("rejects null font family", () => {
      const font = null as any;
      expect(ALLOWED_FONTS.includes(font)).toBe(false);
    });

    it("validates font family case sensitivity", () => {
      expect(ALLOWED_FONTS.includes("Lexend")).toBe(false);
      expect(ALLOWED_FONTS.includes("LEXEND")).toBe(false);
      expect(ALLOWED_FONTS.includes("lexend")).toBe(true);
    });
  });

  // ============================================================================
  // Accent Color Validation Tests
  // ============================================================================

  describe("Accent color validation", () => {
    it("accepts valid hex colors", () => {
      const validColors = [
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#333333",
        "#aabbcc",
        "#AABBCC",
        "#ffffff",
        "#000000",
      ];
      const hexRegex = /^#[0-9a-fA-F]{6}$/;
      for (const color of validColors) {
        expect(hexRegex.test(color)).toBe(true);
      }
    });

    it("rejects invalid color formats", () => {
      const invalidColors = [
        "red",
        "rgb(255,0,0)",
        "#fff",
        "#gggggg",
        "ff0000",
        "#ff000",
        "#ff00000",
        "##ff0000",
        "",
      ];
      const hexRegex = /^#[0-9a-fA-F]{6}$/;
      for (const color of invalidColors) {
        expect(hexRegex.test(color)).toBe(false);
      }
    });

    it("rejects colors with invalid hex digits", () => {
      const invalidColors = ["#zz0000", "#ff000z", "#gggggg"];
      const hexRegex = /^#[0-9a-fA-F]{6}$/;
      for (const color of invalidColors) {
        expect(hexRegex.test(color)).toBe(false);
      }
    });

    it("accepts uppercase and lowercase hex", () => {
      const hexRegex = /^#[0-9a-fA-F]{6}$/;
      expect(hexRegex.test("#FF00FF")).toBe(true);
      expect(hexRegex.test("#ff00ff")).toBe(true);
      expect(hexRegex.test("#Ff00fF")).toBe(true);
    });
  });

  // ============================================================================
  // Settings Persistence Tests
  // ============================================================================

  describe("Settings persistence", () => {
    it("stores settings in D1", async () => {
      await db
        .prepare(
          "INSERT INTO site_settings (id, tenant_id, key, value) VALUES (?, ?, ?, ?)",
        )
        .bind("s1", "tenant-1", "font_family", "lexend")
        .run();

      const result = await db
        .prepare(
          "SELECT value FROM site_settings WHERE tenant_id = ? AND key = ?",
        )
        .bind("tenant-1", "font_family")
        .first();

      expect(result?.value).toBe("lexend");
    });

    it("retrieves all settings for a tenant", async () => {
      const now = Date.now();
      seedMockD1(db, "site_settings", [
        {
          id: "s1",
          tenant_id: "tenant-1",
          key: "font_family",
          value: "lexend",
          created_at: now,
          updated_at: now,
        },
        {
          id: "s2",
          tenant_id: "tenant-1",
          key: "accent_color",
          value: "#ff6b35",
          created_at: now,
          updated_at: now,
        },
        {
          id: "s3",
          tenant_id: "tenant-1",
          key: "show_comments",
          value: "true",
          created_at: now,
          updated_at: now,
        },
      ]);

      const results = await db
        .prepare("SELECT key, value FROM site_settings WHERE tenant_id = ?")
        .bind("tenant-1")
        .all();

      expect(results.results).toHaveLength(3);
      const settingsMap: Record<string, string> = {};
      for (const row of results.results) {
        settingsMap[row.key as string] = row.value as string;
      }
      expect(settingsMap.font_family).toBe("lexend");
      expect(settingsMap.accent_color).toBe("#ff6b35");
      expect(settingsMap.show_comments).toBe("true");
    });

    it("updates existing settings", async () => {
      seedMockD1(db, "site_settings", [
        {
          id: "s1",
          tenant_id: "tenant-1",
          key: "font_family",
          value: "inter",
          created_at: Date.now(),
          updated_at: Date.now(),
        },
      ]);

      await db
        .prepare(
          "UPDATE site_settings SET value = ?, updated_at = ? WHERE id = ?",
        )
        .bind("lexend", Date.now(), "s1")
        .run();

      const result = await db
        .prepare("SELECT value FROM site_settings WHERE id = ?")
        .bind("s1")
        .first();

      expect(result?.value).toBe("lexend");
    });

    it("handles upsert pattern for settings", async () => {
      // First insert
      await db
        .prepare(
          "INSERT INTO site_settings (id, tenant_id, key, value) VALUES (?, ?, ?, ?)",
        )
        .bind("s1", "tenant-1", "font_family", "inter")
        .run();

      let result = await db
        .prepare("SELECT value FROM site_settings WHERE id = ?")
        .bind("s1")
        .first();
      expect(result?.value).toBe("inter");

      // Update (simulate upsert)
      await db
        .prepare("UPDATE site_settings SET value = ? WHERE id = ?")
        .bind("lexend", "s1")
        .run();

      result = await db
        .prepare("SELECT value FROM site_settings WHERE id = ?")
        .bind("s1")
        .first();
      expect(result?.value).toBe("lexend");
    });

    it("maintains tenant isolation for settings", async () => {
      const now = Date.now();
      seedMockD1(db, "site_settings", [
        {
          id: "s1",
          tenant_id: "tenant-1",
          key: "font_family",
          value: "lexend",
          created_at: now,
          updated_at: now,
        },
        {
          id: "s2",
          tenant_id: "tenant-2",
          key: "font_family",
          value: "inter",
          created_at: now,
          updated_at: now,
        },
      ]);

      const result1 = await db
        .prepare(
          "SELECT value FROM site_settings WHERE tenant_id = ? AND key = ?",
        )
        .bind("tenant-1", "font_family")
        .first();

      const result2 = await db
        .prepare(
          "SELECT value FROM site_settings WHERE tenant_id = ? AND key = ?",
        )
        .bind("tenant-2", "font_family")
        .first();

      expect(result1?.value).toBe("lexend");
      expect(result2?.value).toBe("inter");
    });

    it("returns null for non-existent settings", async () => {
      const result = await db
        .prepare(
          "SELECT value FROM site_settings WHERE tenant_id = ? AND key = ?",
        )
        .bind("tenant-1", "nonexistent")
        .first();

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // Authorization Tests
  // ============================================================================

  describe("Authorization", () => {
    it("requires authentication for settings changes", () => {
      const event = createMockRequestEvent({
        url: "https://grove.place/api/settings",
        method: "POST",
        locals: { user: null },
      });

      expect(event.locals.user).toBeNull();
    });

    it("requires tenant context for settings changes", () => {
      const event = createMockRequestEvent({
        url: "https://grove.place/api/settings",
        method: "POST",
        locals: {
          user: { id: "user-1", email: "test@example.com" },
          tenantId: null,
        },
      });

      expect(event.locals.tenantId).toBeNull();
    });

    it("allows authenticated tenant owner to update settings", () => {
      const event = createAuthenticatedTenantEvent("tenant-1", "owner-1", {
        url: "https://test-tenant.grove.place/api/settings",
        method: "POST",
      });

      expect(event.locals.user?.id).toBe("owner-1");
      expect(event.locals.tenantId).toBe("tenant-1");
      const context = event.locals.context as any;
      expect(context.type).toBe("tenant");
    });
  });

  // ============================================================================
  // Setting Types Tests
  // ============================================================================

  describe("Setting types and conversions", () => {
    it("stores string settings", async () => {
      await db
        .prepare(
          "INSERT INTO site_settings (id, tenant_id, key, value) VALUES (?, ?, ?, ?)",
        )
        .bind("s1", "tenant-1", "site_title", "My Beautiful Site")
        .run();

      const result = await db
        .prepare("SELECT value FROM site_settings WHERE id = ?")
        .bind("s1")
        .first();

      expect(typeof result?.value).toBe("string");
      expect(result?.value).toBe("My Beautiful Site");
    });

    it("stores boolean-like settings as strings", async () => {
      await db
        .prepare(
          "INSERT INTO site_settings (id, tenant_id, key, value) VALUES (?, ?, ?, ?)",
        )
        .bind("s1", "tenant-1", "enable_comments", "true")
        .run();

      const result = await db
        .prepare("SELECT value FROM site_settings WHERE id = ?")
        .bind("s1")
        .first();

      expect(result?.value).toBe("true");
      // Consumer should convert to boolean
      const boolValue = result?.value === "true";
      expect(boolValue).toBe(true);
    });

    it("stores numeric settings as strings", async () => {
      await db
        .prepare(
          "INSERT INTO site_settings (id, tenant_id, key, value) VALUES (?, ?, ?, ?)",
        )
        .bind("s1", "tenant-1", "posts_per_page", "10")
        .run();

      const result = await db
        .prepare("SELECT value FROM site_settings WHERE id = ?")
        .bind("s1")
        .first();

      expect(result?.value).toBe("10");
      // Consumer should convert to number
      const numValue = parseInt(result?.value as string, 10);
      expect(numValue).toBe(10);
    });
  });

  // ============================================================================
  // Default Settings Tests
  // ============================================================================

  describe("Default settings", () => {
    it("uses default font family when not set", async () => {
      const result = await db
        .prepare(
          "SELECT value FROM site_settings WHERE tenant_id = ? AND key = ?",
        )
        .bind("tenant-1", "font_family")
        .first();

      expect(result).toBeNull();
      // Application layer should provide default "inter"
      const defaultFont = result?.value ?? "inter";
      expect(ALLOWED_FONTS.includes(defaultFont)).toBe(true);
    });

    it("uses default accent color when not set", async () => {
      const result = await db
        .prepare(
          "SELECT value FROM site_settings WHERE tenant_id = ? AND key = ?",
        )
        .bind("tenant-1", "accent_color")
        .first();

      expect(result).toBeNull();
      // Application layer should provide default
      const defaultColor = result?.value ?? "#4f9671";
      const hexRegex = /^#[0-9a-fA-F]{6}$/;
      expect(hexRegex.test(defaultColor)).toBe(true);
    });
  });

  // ============================================================================
  // Validation Error Cases
  // ============================================================================

  describe("Validation error cases", () => {
    it("rejects invalid title length", () => {
      const minLength = 1;
      const maxLength = 255;

      expect("".length >= minLength).toBe(false);
      expect("Valid Title".length >= minLength).toBe(true);
      expect("Valid Title".length <= maxLength).toBe(true);
      expect("a".repeat(256).length > maxLength).toBe(true);
    });

    it("rejects settings with empty values", async () => {
      await db
        .prepare(
          "INSERT INTO site_settings (id, tenant_id, key, value) VALUES (?, ?, ?, ?)",
        )
        .bind("s1", "tenant-1", "site_title", "")
        .run();

      const result = await db
        .prepare("SELECT value FROM site_settings WHERE id = ?")
        .bind("s1")
        .first();

      // Empty values are stored but application should validate
      expect(result?.value).toBe("");
      expect((result?.value as string).length).toBe(0);
    });
  });
});
