/**
 * Tests for Pulse Curio — Engine Module
 *
 * Tests utility functions, constants, and type exports.
 */

import { describe, it, expect } from "vitest";
import {
  getEventDisplayKey,
  formatRelativeTime,
  buildWebhookUrl,
  PULSE_EVENT_TYPES,
  EVENT_TYPE_CONFIG,
  DEFAULT_PULSE_CONFIG,
  PULSE_WEBHOOK_BASE,
} from "./index";

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

describe("PULSE_EVENT_TYPES", () => {
  it("contains all expected event types", () => {
    expect(PULSE_EVENT_TYPES).toContain("push");
    expect(PULSE_EVENT_TYPES).toContain("pull_request");
    expect(PULSE_EVENT_TYPES).toContain("issues");
    expect(PULSE_EVENT_TYPES).toContain("release");
    expect(PULSE_EVENT_TYPES).toContain("workflow_run");
    expect(PULSE_EVENT_TYPES).toContain("star");
    expect(PULSE_EVENT_TYPES).toContain("fork");
    expect(PULSE_EVENT_TYPES).toContain("create");
    expect(PULSE_EVENT_TYPES).toContain("delete");
  });

  it("has exactly 9 event types", () => {
    expect(PULSE_EVENT_TYPES).toHaveLength(9);
  });
});

describe("EVENT_TYPE_CONFIG", () => {
  it("has display config for each event type key", () => {
    const keys = Object.keys(EVENT_TYPE_CONFIG);
    expect(keys.length).toBeGreaterThan(0);

    for (const key of keys) {
      const config = EVENT_TYPE_CONFIG[key];
      expect(config).toHaveProperty("label");
      expect(config).toHaveProperty("color");
      expect(config).toHaveProperty("icon");
      expect(typeof config.label).toBe("string");
      expect(typeof config.color).toBe("string");
      expect(typeof config.icon).toBe("string");
    }
  });

  it("includes composite keys for PRs and workflow_run", () => {
    expect(EVENT_TYPE_CONFIG).toHaveProperty("pull_request_merged");
    expect(EVENT_TYPE_CONFIG).toHaveProperty("pull_request_opened");
    expect(EVENT_TYPE_CONFIG).toHaveProperty("pull_request_closed");
    expect(EVENT_TYPE_CONFIG).toHaveProperty("workflow_run_success");
    expect(EVENT_TYPE_CONFIG).toHaveProperty("workflow_run_failure");
  });
});

describe("DEFAULT_PULSE_CONFIG", () => {
  it("starts disabled", () => {
    expect(DEFAULT_PULSE_CONFIG.enabled).toBe(false);
  });

  it("enables all display sections by default", () => {
    expect(DEFAULT_PULSE_CONFIG.showHeatmap).toBe(true);
    expect(DEFAULT_PULSE_CONFIG.showFeed).toBe(true);
    expect(DEFAULT_PULSE_CONFIG.showStats).toBe(true);
    expect(DEFAULT_PULSE_CONFIG.showTrends).toBe(true);
    expect(DEFAULT_PULSE_CONFIG.showCi).toBe(true);
  });

  it("has no repo filters by default", () => {
    expect(DEFAULT_PULSE_CONFIG.reposInclude).toBeNull();
    expect(DEFAULT_PULSE_CONFIG.reposExclude).toBeNull();
  });

  it("has no webhook secret by default", () => {
    expect(DEFAULT_PULSE_CONFIG.hasWebhookSecret).toBe(false);
    expect(DEFAULT_PULSE_CONFIG.webhookUrl).toBe("");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// getEventDisplayKey
// ──────────────────────────────────────────────────────────────────────────────

describe("getEventDisplayKey", () => {
  it("returns pull_request_merged for merged PRs", () => {
    expect(getEventDisplayKey("pull_request", "closed", { merged: true })).toBe(
      "pull_request_merged",
    );
  });

  it("returns pull_request_opened for opened PRs", () => {
    expect(getEventDisplayKey("pull_request", "opened")).toBe(
      "pull_request_opened",
    );
  });

  it("returns pull_request_opened for reopened PRs", () => {
    expect(getEventDisplayKey("pull_request", "reopened")).toBe(
      "pull_request_opened",
    );
  });

  it("returns pull_request_closed for closed (not merged) PRs", () => {
    expect(
      getEventDisplayKey("pull_request", "closed", { merged: false }),
    ).toBe("pull_request_closed");
  });

  it("returns issues_opened for opened issues", () => {
    expect(getEventDisplayKey("issues", "opened")).toBe("issues_opened");
  });

  it("returns issues_closed for closed issues", () => {
    expect(getEventDisplayKey("issues", "closed")).toBe("issues_closed");
  });

  it("returns workflow_run_success for successful CI", () => {
    expect(
      getEventDisplayKey("workflow_run", "completed", {
        conclusion: "success",
      }),
    ).toBe("workflow_run_success");
  });

  it("returns workflow_run_failure for failed CI", () => {
    expect(
      getEventDisplayKey("workflow_run", "completed", {
        conclusion: "failure",
      }),
    ).toBe("workflow_run_failure");
  });

  it("returns raw event type for simple events", () => {
    expect(getEventDisplayKey("push", null)).toBe("push");
    expect(getEventDisplayKey("release", "published")).toBe("release");
    expect(getEventDisplayKey("star", "created")).toBe("star");
    expect(getEventDisplayKey("fork", "created")).toBe("fork");
    expect(getEventDisplayKey("create", null)).toBe("create");
    expect(getEventDisplayKey("delete", null)).toBe("delete");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// formatRelativeTime
// ──────────────────────────────────────────────────────────────────────────────

describe("formatRelativeTime", () => {
  it('returns "just now" for recent timestamps', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatRelativeTime(now)).toBe("just now");
    expect(formatRelativeTime(now - 30)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatRelativeTime(now - 120)).toBe("2m ago");
    expect(formatRelativeTime(now - 3540)).toBe("59m ago");
  });

  it("returns hours ago", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatRelativeTime(now - 3600)).toBe("1h ago");
    expect(formatRelativeTime(now - 7200)).toBe("2h ago");
  });

  it("returns days ago", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatRelativeTime(now - 86400)).toBe("1d ago");
    expect(formatRelativeTime(now - 259200)).toBe("3d ago");
  });

  it("returns formatted date for older timestamps", () => {
    const now = Math.floor(Date.now() / 1000);
    const result = formatRelativeTime(now - 604800 - 1);
    // Should be a date like "Jan 15" format
    expect(result).toMatch(/\w{3} \d{1,2}/);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// buildWebhookUrl
// ──────────────────────────────────────────────────────────────────────────────

describe("buildWebhookUrl", () => {
  it("builds correct webhook URL for a tenant", () => {
    expect(buildWebhookUrl("my-tenant")).toBe(
      `${PULSE_WEBHOOK_BASE}/my-tenant`,
    );
  });

  it("preserves tenant ID format", () => {
    expect(buildWebhookUrl("abc-123")).toContain("abc-123");
    expect(buildWebhookUrl("tenant_with_underscores")).toContain(
      "tenant_with_underscores",
    );
  });
});
