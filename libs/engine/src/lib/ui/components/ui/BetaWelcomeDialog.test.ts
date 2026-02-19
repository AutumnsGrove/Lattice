/**
 * BetaWelcomeDialog Component Tests
 *
 * Tests the beta welcome dialog's localStorage persistence logic,
 * rendered content, and accessibility attributes.
 *
 * The dialog uses bits-ui Dialog for focus trap and ARIA, so we test
 * our own behavior (localStorage, content, feedback link) rather than
 * re-testing bits-ui internals.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import BetaWelcomeDialog from "./BetaWelcomeDialog.svelte";

const STORAGE_KEY = "grove-beta-welcome-seen";

describe("BetaWelcomeDialog", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // =========================================================================
  // autoShow + localStorage persistence logic
  // =========================================================================

  describe("autoShow behavior", () => {
    it("should auto-open when autoShow is true and localStorage key is absent", async () => {
      render(BetaWelcomeDialog, {
        props: {
          autoShow: true,
          userName: "Autumn",
        },
      });

      // Wait for $effect to run
      await tick();
      await new Promise((r) => setTimeout(r, 0));

      expect(
        screen.getByText(/welcome to the beta, autumn/i),
      ).toBeInTheDocument();
    });

    it("should NOT auto-open when localStorage key is already set", async () => {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());

      render(BetaWelcomeDialog, {
        props: {
          autoShow: true,
          userName: "Autumn",
        },
      });

      await tick();
      await new Promise((r) => setTimeout(r, 0));

      expect(
        screen.queryByText(/welcome to the beta/i),
      ).not.toBeInTheDocument();
    });

    it("should NOT auto-open when autoShow is false", async () => {
      render(BetaWelcomeDialog, {
        props: {
          autoShow: false,
          userName: "Autumn",
        },
      });

      await tick();

      expect(
        screen.queryByText(/welcome to the beta/i),
      ).not.toBeInTheDocument();
    });

    it("should store an ISO timestamp when dismissed", async () => {
      render(BetaWelcomeDialog, {
        props: {
          open: true,
          userName: "Autumn",
        },
      });

      await tick();

      // Find and click the dismiss button
      const dismissBtn = screen.getByRole("button", { name: /let's go/i });
      dismissBtn.click();
      await tick();

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      // Verify it's a valid ISO date
      expect(new Date(stored!).toISOString()).toBe(stored);
    });
  });

  // =========================================================================
  // Rendered content
  // =========================================================================

  describe("Content", () => {
    it("should greet the user by name", async () => {
      render(BetaWelcomeDialog, {
        props: {
          open: true,
          userName: "Autumn",
        },
      });

      await tick();

      expect(
        screen.getByText(/welcome to the beta, autumn/i),
      ).toBeInTheDocument();
    });

    it("should use default name when userName is not provided", async () => {
      render(BetaWelcomeDialog, {
        props: { open: true },
      });

      await tick();

      expect(
        screen.getByText(/welcome to the beta, wanderer/i),
      ).toBeInTheDocument();
    });

    it("should show the default beta message when no children", async () => {
      render(BetaWelcomeDialog, {
        props: {
          open: true,
          userName: "Friend",
        },
      });

      await tick();

      // Check for key phrases from the default message
      expect(
        screen.getByText(/first wanderers to explore grove/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/rough around the edges/i)).toBeInTheDocument();
    });

    it("should render feedback link with correct URL", async () => {
      render(BetaWelcomeDialog, {
        props: {
          open: true,
          feedbackUrl: "https://grove.place/feedback",
        },
      });

      await tick();

      const feedbackLink = screen.getByRole("link", {
        name: /share feedback/i,
      });
      expect(feedbackLink).toBeInTheDocument();
      expect(feedbackLink).toHaveAttribute(
        "href",
        "https://grove.place/feedback",
      );
      expect(feedbackLink).toHaveAttribute("target", "_blank");
      expect(feedbackLink).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("should accept a custom feedback URL", async () => {
      render(BetaWelcomeDialog, {
        props: {
          open: true,
          feedbackUrl: "https://custom.example.com/feedback",
        },
      });

      await tick();

      const feedbackLink = screen.getByRole("link", {
        name: /share feedback/i,
      });
      expect(feedbackLink).toHaveAttribute(
        "href",
        "https://custom.example.com/feedback",
      );
    });

    it("should have a dismiss button", async () => {
      render(BetaWelcomeDialog, {
        props: { open: true },
      });

      await tick();

      const dismissBtn = screen.getByRole("button", { name: /let's go/i });
      expect(dismissBtn).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Accessibility
  // =========================================================================

  describe("Accessibility", () => {
    it("should have an accessible dialog title", async () => {
      render(BetaWelcomeDialog, {
        props: {
          open: true,
          userName: "Autumn",
        },
      });

      await tick();

      const title = screen.getByText(/welcome to the beta, autumn/i);
      expect(title).toHaveAttribute("id", "beta-welcome-title");
    });

    it("should not render dialog content when closed", () => {
      render(BetaWelcomeDialog, {
        props: { open: false },
      });

      expect(
        screen.queryByText(/welcome to the beta/i),
      ).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Dismiss behavior
  // =========================================================================

  describe("Dismiss", () => {
    it("should call ondismiss callback when dismissed", async () => {
      const ondismiss = vi.fn();

      render(BetaWelcomeDialog, {
        props: {
          open: true,
          ondismiss,
        },
      });

      await tick();

      const dismissBtn = screen.getByRole("button", { name: /let's go/i });
      dismissBtn.click();
      await tick();

      expect(ondismiss).toHaveBeenCalledOnce();
    });

    it("should set localStorage on dismiss so dialog does not reappear", async () => {
      render(BetaWelcomeDialog, {
        props: { open: true },
      });

      await tick();

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

      const dismissBtn = screen.getByRole("button", { name: /let's go/i });
      dismissBtn.click();
      await tick();

      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    });
  });
});
