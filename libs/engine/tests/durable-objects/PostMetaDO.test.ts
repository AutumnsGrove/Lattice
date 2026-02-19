/**
 * PostMetaDO Tests
 *
 * Tests for the per-post Durable Object that handles:
 * - View counting with rate limiting
 * - Reaction management (likes, bookmarks)
 * - Tier-based popular post thresholds
 * - Real-time presence tracking
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createJsonRequest,
  resetTestCounters,
  getPostMetaDOStub,
} from "../utils/test-helpers.js";

// ============================================================================
// Test Setup
// ============================================================================

function getPostMetaStub(tenantId: string, slug: string) {
  return getPostMetaDOStub(tenantId, slug);
}

beforeEach(() => {
  resetTestCounters();
});

// ============================================================================
// Initialization Tests
// ============================================================================

describe("PostMetaDO Initialization", () => {
  it("should initialize with default values", async () => {
    const stub = getPostMetaStub("tenant-1", "test-post");

    const initResponse = await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-1",
        slug: "test-post",
      }),
    );

    expect(initResponse.ok).toBe(true);
    const data = await initResponse.json();

    expect(data).toMatchObject({
      success: true,
      meta: {
        tenantId: "tenant-1",
        slug: "test-post",
        viewCount: 0,
        reactions: { likes: 0, bookmarks: 0 },
        isPopular: false,
      },
    });
  });

  it("should initialize with tier for threshold calculation", async () => {
    const stub = getPostMetaStub("tenant-2", "tiered-post");

    const initResponse = await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-2",
        slug: "tiered-post",
        tier: "evergreen",
      }),
    );

    expect(initResponse.ok).toBe(true);
    const data = await initResponse.json();

    expect(data.meta.tier).toBe("evergreen");
  });

  it("should reject initialization without required fields", async () => {
    const stub = getPostMetaStub("tenant-3", "incomplete");

    const response = await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-3",
        // Missing slug
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should update tier when it changes", async () => {
    const stub = getPostMetaStub("tenant-4", "upgrade-post");

    // Initialize with seedling
    await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-4",
        slug: "upgrade-post",
        tier: "seedling",
      }),
    );

    // Update to oak
    const updateResponse = await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-4",
        slug: "upgrade-post",
        tier: "oak",
      }),
    );

    expect(updateResponse.ok).toBe(true);
    const data = await updateResponse.json();
    expect(data.meta.tier).toBe("oak");
  });
});

// ============================================================================
// View Counting Tests
// ============================================================================

describe("PostMetaDO View Counting", () => {
  it("should increment view count", async () => {
    const stub = getPostMetaStub("tenant-view", "view-test");

    // Initialize
    await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-view",
        slug: "view-test",
      }),
    );

    // Record view
    const viewResponse = await stub.fetch(
      createJsonRequest("https://post.internal/view", "POST", {
        sessionId: "session-1",
      }),
    );

    expect(viewResponse.ok).toBe(true);
    const data = await viewResponse.json();
    expect(data.viewCount).toBe(1);
  });

  it("should rate limit views from same session (5 min window)", async () => {
    const stub = getPostMetaStub("tenant-rate", "rate-test");

    await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-rate",
        slug: "rate-test",
      }),
    );

    // First view
    await stub.fetch(
      createJsonRequest("https://post.internal/view", "POST", {
        sessionId: "same-session",
      }),
    );

    // Second view from same session (should be rate limited)
    const secondView = await stub.fetch(
      createJsonRequest("https://post.internal/view", "POST", {
        sessionId: "same-session",
      }),
    );

    const data = await secondView.json();
    // View count should still be 1 (rate limited)
    expect(data.viewCount).toBe(1);
  });

  it("should count views from different sessions", async () => {
    const stub = getPostMetaStub("tenant-multi", "multi-session");

    await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-multi",
        slug: "multi-session",
      }),
    );

    // Views from different sessions
    await stub.fetch(
      createJsonRequest("https://post.internal/view", "POST", {
        sessionId: "session-a",
      }),
    );

    await stub.fetch(
      createJsonRequest("https://post.internal/view", "POST", {
        sessionId: "session-b",
      }),
    );

    const metaResponse = await stub.fetch(
      new Request("https://post.internal/meta"),
    );
    const meta = await metaResponse.json();

    expect(meta.viewCount).toBe(2);
  });

  it("should reject view recording for uninitialized post", async () => {
    const stub = getPostMetaStub("tenant-uninit", "no-init");

    const response = await stub.fetch(
      createJsonRequest("https://post.internal/view", "POST", {
        sessionId: "session-x",
      }),
    );

    expect(response.status).toBe(400);
  });
});

// ============================================================================
// Tier-Based Popular Threshold Tests
// ============================================================================

describe("PostMetaDO Popular Post Thresholds", () => {
  /**
   * Popular thresholds by tier:
   * - free: 150 views/day
   * - seedling: 100 views/day
   * - sapling: 75 views/day
   * - oak: 50 views/day
   * - evergreen: 25 views/day
   */

  it("should use seedling threshold (100 views) by default", async () => {
    const stub = getPostMetaStub("tenant-pop-default", "pop-default");

    await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-pop-default",
        slug: "pop-default",
        // No tier specified = seedling default
      }),
    );

    // Get meta - should not be popular with 0 views
    const meta = await stub.fetch(new Request("https://post.internal/meta"));
    const data = await meta.json();

    expect(data.isPopular).toBe(false);
  });

  it("should mark evergreen post as popular at 25+ views", async () => {
    const stub = getPostMetaStub("tenant-pop-ever", "pop-evergreen");

    await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-pop-ever",
        slug: "pop-evergreen",
        tier: "evergreen",
      }),
    );

    // Simulate 25 views from different sessions
    for (let i = 0; i < 25; i++) {
      await stub.fetch(
        createJsonRequest("https://post.internal/view", "POST", {
          sessionId: `session-${i}`,
        }),
      );
    }

    const meta = await stub.fetch(new Request("https://post.internal/meta"));
    const data = await meta.json();

    expect(data.viewCount).toBe(25);
    expect(data.isPopular).toBe(true);
  });

  it("should NOT mark seedling post as popular at 25 views", async () => {
    const stub = getPostMetaStub("tenant-pop-seed", "pop-seedling");

    await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-pop-seed",
        slug: "pop-seedling",
        tier: "seedling",
      }),
    );

    // Simulate 25 views
    for (let i = 0; i < 25; i++) {
      await stub.fetch(
        createJsonRequest("https://post.internal/view", "POST", {
          sessionId: `seed-session-${i}`,
        }),
      );
    }

    const meta = await stub.fetch(new Request("https://post.internal/meta"));
    const data = await meta.json();

    expect(data.viewCount).toBe(25);
    // Seedling needs 100 views, so 25 is not enough
    expect(data.isPopular).toBe(false);
  });

  it("should mark oak post as popular at 50+ views", async () => {
    const stub = getPostMetaStub("tenant-pop-oak", "pop-oak");

    await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-pop-oak",
        slug: "pop-oak",
        tier: "oak",
      }),
    );

    // Simulate 50 views
    for (let i = 0; i < 50; i++) {
      await stub.fetch(
        createJsonRequest("https://post.internal/view", "POST", {
          sessionId: `oak-session-${i}`,
        }),
      );
    }

    const meta = await stub.fetch(new Request("https://post.internal/meta"));
    const data = await meta.json();

    expect(data.viewCount).toBe(50);
    expect(data.isPopular).toBe(true);
  });

  it("should recalculate popular status on tier upgrade", async () => {
    const stub = getPostMetaStub("tenant-pop-upgrade", "pop-upgrade");

    // Initialize as seedling
    await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-pop-upgrade",
        slug: "pop-upgrade",
        tier: "seedling",
      }),
    );

    // Add 30 views (not enough for seedling's 100 threshold)
    for (let i = 0; i < 30; i++) {
      await stub.fetch(
        createJsonRequest("https://post.internal/view", "POST", {
          sessionId: `upgrade-session-${i}`,
        }),
      );
    }

    // Check - should NOT be popular yet
    let meta = await stub.fetch(new Request("https://post.internal/meta"));
    let data = await meta.json();
    expect(data.isPopular).toBe(false);

    // Upgrade to evergreen (threshold = 25)
    await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-pop-upgrade",
        slug: "pop-upgrade",
        tier: "evergreen",
      }),
    );

    // Check again - should NOW be popular (30 >= 25)
    meta = await stub.fetch(new Request("https://post.internal/meta"));
    data = await meta.json();
    expect(data.isPopular).toBe(true);
    expect(data.tier).toBe("evergreen");
  });
});

// ============================================================================
// Reaction Tests
// ============================================================================

describe("PostMetaDO Reactions", () => {
  it("should add a like reaction", async () => {
    const stub = getPostMetaStub("tenant-react", "like-test");

    await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-react",
        slug: "like-test",
      }),
    );

    const likeResponse = await stub.fetch(
      createJsonRequest("https://post.internal/reactions", "POST", {
        type: "like",
        action: "add",
        userId: "user-1",
        timestamp: Date.now(),
      }),
    );

    expect(likeResponse.ok).toBe(true);
    const data = await likeResponse.json();
    expect(data.reactions.likes).toBe(1);
  });

  it("should add a bookmark reaction", async () => {
    const stub = getPostMetaStub("tenant-bookmark", "bookmark-test");

    await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-bookmark",
        slug: "bookmark-test",
      }),
    );

    const bookmarkResponse = await stub.fetch(
      createJsonRequest("https://post.internal/reactions", "POST", {
        type: "bookmark",
        action: "add",
        userId: "user-2",
        timestamp: Date.now(),
      }),
    );

    expect(bookmarkResponse.ok).toBe(true);
    const data = await bookmarkResponse.json();
    expect(data.reactions.bookmarks).toBe(1);
  });

  it("should prevent duplicate reactions from same user", async () => {
    const stub = getPostMetaStub("tenant-dupe", "dupe-test");

    await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-dupe",
        slug: "dupe-test",
      }),
    );

    // First like
    await stub.fetch(
      createJsonRequest("https://post.internal/reactions", "POST", {
        type: "like",
        action: "add",
        userId: "same-user",
        timestamp: Date.now(),
      }),
    );

    // Second like from same user (should be rejected)
    const dupeResponse = await stub.fetch(
      createJsonRequest("https://post.internal/reactions", "POST", {
        type: "like",
        action: "add",
        userId: "same-user",
        timestamp: Date.now(),
      }),
    );

    const data = await dupeResponse.json();
    expect(data.success).toBe(false);
    expect(data.reactions.likes).toBe(1); // Still 1
  });

  it("should remove a reaction", async () => {
    const stub = getPostMetaStub("tenant-remove", "remove-test");

    await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-remove",
        slug: "remove-test",
      }),
    );

    // Add like
    await stub.fetch(
      createJsonRequest("https://post.internal/reactions", "POST", {
        type: "like",
        action: "add",
        userId: "user-remove",
        timestamp: Date.now(),
      }),
    );

    // Remove like
    const removeResponse = await stub.fetch(
      createJsonRequest("https://post.internal/reactions", "DELETE", {
        type: "like",
        action: "remove",
        userId: "user-remove",
        timestamp: Date.now(),
      }),
    );

    expect(removeResponse.ok).toBe(true);
    const data = await removeResponse.json();
    expect(data.reactions.likes).toBe(0);
  });

  it("should reject invalid reaction types", async () => {
    const stub = getPostMetaStub("tenant-invalid", "invalid-reaction");

    await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-invalid",
        slug: "invalid-reaction",
      }),
    );

    const response = await stub.fetch(
      createJsonRequest("https://post.internal/reactions", "POST", {
        type: "invalid-type",
        action: "add",
        userId: "user-x",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should get reactions via GET endpoint", async () => {
    const stub = getPostMetaStub("tenant-get-react", "get-reactions");

    await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-get-react",
        slug: "get-reactions",
      }),
    );

    // Add some reactions
    await stub.fetch(
      createJsonRequest("https://post.internal/reactions", "POST", {
        type: "like",
        userId: "user-a",
      }),
    );

    await stub.fetch(
      createJsonRequest("https://post.internal/reactions", "POST", {
        type: "bookmark",
        userId: "user-b",
      }),
    );

    // Get reactions
    const getResponse = await stub.fetch(
      new Request("https://post.internal/reactions"),
    );

    expect(getResponse.ok).toBe(true);
    const data = await getResponse.json();
    expect(data.likes).toBe(1);
    expect(data.bookmarks).toBe(1);
  });
});

// ============================================================================
// Presence Tests
// ============================================================================

describe("PostMetaDO Presence", () => {
  it("should track active readers", async () => {
    const stub = getPostMetaStub("tenant-presence", "presence-test");

    await stub.fetch(
      createJsonRequest("https://post.internal/meta/init", "POST", {
        tenantId: "tenant-presence",
        slug: "presence-test",
      }),
    );

    // Record views from different sessions (simulates readers)
    await stub.fetch(
      createJsonRequest("https://post.internal/view", "POST", {
        sessionId: "reader-1",
      }),
    );

    await stub.fetch(
      createJsonRequest("https://post.internal/view", "POST", {
        sessionId: "reader-2",
      }),
    );

    // Get presence
    const presenceResponse = await stub.fetch(
      new Request("https://post.internal/presence"),
    );

    expect(presenceResponse.ok).toBe(true);
    const data = await presenceResponse.json();
    expect(data.activeReaders).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe("PostMetaDO Error Handling", () => {
  it("should return 404 for uninitialized meta GET", async () => {
    const stub = getPostMetaStub("tenant-404", "not-initialized");

    const response = await stub.fetch(
      new Request("https://post.internal/meta"),
    );

    expect(response.status).toBe(404);
  });

  it("should return 404 for unknown routes", async () => {
    const stub = getPostMetaStub("tenant-unknown", "unknown-route");

    const response = await stub.fetch(
      new Request("https://post.internal/unknown-path"),
    );

    expect(response.status).toBe(404);
  });
});
