/**
 * Arbor Types — Type-level and runtime behavior tests
 *
 * Verifies that the ArborNavEntry union type correctly discriminates
 * between items and dividers, and that defaults work as expected.
 */

import { describe, it, expect } from "vitest";
import type {
  ArborNavEntry,
  ArborNavItem,
  ArborNavDivider,
  ArborFooterLink,
  ArborDividerStyle,
} from "./types";
import { DEFAULT_ARBOR_FOOTER_LINKS } from "./defaults";

describe("Arbor Types", () => {
  describe("ArborNavItem", () => {
    it("should accept a minimal nav item (kind omitted)", () => {
      const item: ArborNavItem = {
        href: "/arbor",
        label: "Dashboard",
      };
      expect(item.href).toBe("/arbor");
      expect(item.kind).toBeUndefined();
    });

    it("should accept a fully specified nav item", () => {
      const item: ArborNavItem = {
        kind: "item",
        href: "/arbor/garden",
        label: "Garden",
        badge: 3,
        showActivity: true,
        termSlug: "your-garden",
        visible: true,
      };
      expect(item.badge).toBe(3);
      expect(item.visible).toBe(true);
    });

    it("should support visible: false for feature gating", () => {
      const item: ArborNavItem = {
        href: "/arbor/reeds",
        label: "Comments",
        visible: false,
      };
      expect(item.visible).toBe(false);
    });

    it("should accept requiredPermissions for CRUD permission gating", () => {
      const item: ArborNavItem = {
        href: "/arbor/settings",
        label: "Settings",
        requiredPermissions: ["admin", "settings:write"],
      };
      expect(item.requiredPermissions).toEqual(["admin", "settings:write"]);
    });

    it("should default requiredPermissions to undefined (visible to all)", () => {
      const item: ArborNavItem = {
        href: "/arbor/garden",
        label: "Garden",
      };
      expect(item.requiredPermissions).toBeUndefined();
    });
  });

  describe("ArborNavDivider", () => {
    it("should require kind: divider", () => {
      const divider: ArborNavDivider = {
        kind: "divider",
      };
      expect(divider.kind).toBe("divider");
    });

    it("should accept a label", () => {
      const divider: ArborNavDivider = {
        kind: "divider",
        label: "Wayfinder Tools",
      };
      expect(divider.label).toBe("Wayfinder Tools");
    });

    it("should accept different style types", () => {
      const styles: ArborDividerStyle[] = ["line", "grove", "·", "✦", "🌿"];
      styles.forEach((style) => {
        const divider: ArborNavDivider = { kind: "divider", style };
        expect(divider.style).toBe(style);
      });
    });
  });

  describe("ArborNavEntry union", () => {
    it("should discriminate between items and dividers", () => {
      const entries: ArborNavEntry[] = [
        { href: "/arbor", label: "Dashboard" },
        { kind: "divider", label: "Tools" },
        { kind: "item", href: "/arbor/garden", label: "Garden" },
      ];

      expect(entries).toHaveLength(3);
      // First item has no kind (defaults to item)
      expect(entries[0]).not.toHaveProperty("kind", "divider");
      // Second is a divider
      expect(entries[1]).toHaveProperty("kind", "divider");
      // Third is explicitly an item
      expect(entries[2]).toHaveProperty("kind", "item");
    });
  });

  describe("ArborFooterLink", () => {
    it("should accept a minimal footer link", () => {
      const link: ArborFooterLink = {
        href: "https://grove.place/help",
        label: "Help",
      };
      expect(link.external).toBeUndefined();
    });

    it("should support external links", () => {
      const link: ArborFooterLink = {
        href: "https://grove.place/help",
        label: "Help Center",
        external: true,
      };
      expect(link.external).toBe(true);
    });
  });

  describe("DEFAULT_ARBOR_FOOTER_LINKS", () => {
    it("should include Help Center and Get Support", () => {
      expect(DEFAULT_ARBOR_FOOTER_LINKS).toHaveLength(2);
      expect(DEFAULT_ARBOR_FOOTER_LINKS[0].label).toBe("Help Center");
      expect(DEFAULT_ARBOR_FOOTER_LINKS[1].label).toBe("Get Support");
    });

    it("should mark both as external", () => {
      DEFAULT_ARBOR_FOOTER_LINKS.forEach((link) => {
        expect(link.external).toBe(true);
      });
    });

    it("should point to grove.place URLs", () => {
      DEFAULT_ARBOR_FOOTER_LINKS.forEach((link) => {
        expect(link.href).toContain("grove.place");
      });
    });
  });
});
