/**
 * BetaBadge Component Tests
 *
 * Tests rendering, accessibility, and link behavior for the beta
 * program badge. BetaBadge can render as a <span> (default) or
 * <a> (when href is provided).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import BetaBadge from "./BetaBadge.svelte";

describe("BetaBadge", () => {
  describe("Rendering", () => {
    it("should render with default 'Beta' text", () => {
      render(BetaBadge);

      expect(screen.getByText("Beta")).toBeInTheDocument();
    });

    it("should render as a span by default (no href)", () => {
      render(BetaBadge);

      const badge = screen.getByRole("status");
      expect(badge.tagName).toBe("SPAN");
    });

    it("should render as a link when href is provided", () => {
      render(BetaBadge, {
        props: { href: "/knowledge/beta" },
      });

      const link = screen.getByRole("link");
      expect(link.tagName).toBe("A");
      expect(link).toHaveAttribute("href", "/knowledge/beta");
    });

    it("should render the flask icon", () => {
      const { container } = render(BetaBadge);

      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("should apply custom class", () => {
      const { container } = render(BetaBadge, {
        props: { class: "my-custom-class" },
      });

      const badge = container.querySelector(".beta-badge");
      expect(badge).toHaveClass("my-custom-class");
    });
  });

  describe("Link behavior", () => {
    it("should add target=_blank for external URLs", () => {
      render(BetaBadge, {
        props: { href: "https://grove.place/knowledge/beta" },
      });

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("should not add target=_blank for internal paths", () => {
      render(BetaBadge, {
        props: { href: "/knowledge/beta" },
      });

      const link = screen.getByRole("link");
      expect(link).not.toHaveAttribute("target");
      expect(link).not.toHaveAttribute("rel");
    });
  });

  describe("Accessibility", () => {
    it("should have role='status' when rendered as span", () => {
      render(BetaBadge);

      const badge = screen.getByRole("status");
      expect(badge).toBeInTheDocument();
    });

    it("should have a descriptive title attribute", () => {
      render(BetaBadge);

      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("title", "You're part of the Grove beta");
    });

    it("should support custom title text", () => {
      render(BetaBadge, {
        props: { title: "Early access member" },
      });

      const badge = screen.getByRole("status");
      expect(badge).toHaveAttribute("title", "Early access member");
    });

    it("should support aria-label on links", () => {
      render(BetaBadge, {
        props: {
          href: "/beta-info",
          "aria-label": "Learn about the beta program",
        },
      });

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute(
        "aria-label",
        "Learn about the beta program",
      );
    });
  });
});
