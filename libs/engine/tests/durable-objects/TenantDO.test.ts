/**
 * TenantDO Tests
 *
 * Tests for the per-tenant Durable Object that handles:
 * - Config caching (reduces D1 reads)
 * - Cross-device draft synchronization
 * - Theme and settings management
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createJsonRequest,
  resetTestCounters,
  getTenantDOStub,
} from "../utils/test-helpers.js";

// ============================================================================
// Test Setup
// ============================================================================

function getTenantStub(subdomain: string) {
  return getTenantDOStub(subdomain);
}

beforeEach(() => {
  resetTestCounters();
});

// ============================================================================
// Config Tests
// ============================================================================

describe("TenantDO Config", () => {
  it("should initialize with config data", async () => {
    const stub = getTenantStub("config-test");

    const initResponse = await stub.fetch(
      createJsonRequest("https://tenant.internal/init", "POST", {
        subdomain: "config-test",
        displayName: "Config Test Blog",
        ownerId: "user-123",
        tier: "seedling",
      }),
    );

    expect(initResponse.ok).toBe(true);
    const data = await initResponse.json();
    expect(data.success).toBe(true);
  });

  it("should return cached config on GET /config", async () => {
    const stub = getTenantStub("get-config");

    // Initialize
    await stub.fetch(
      createJsonRequest("https://tenant.internal/init", "POST", {
        subdomain: "get-config",
        displayName: "Get Config Blog",
        ownerId: "user-456",
        tier: "oak",
      }),
    );

    // Get config
    const configResponse = await stub.fetch(
      new Request("https://tenant.internal/config"),
    );

    expect(configResponse.ok).toBe(true);
    const config = await configResponse.json();

    expect(config).toMatchObject({
      subdomain: "get-config",
      displayName: "Get Config Blog",
      tier: "oak",
    });
  });

  it("should update config on PUT /config", async () => {
    const stub = getTenantStub("update-config");

    // Initialize
    await stub.fetch(
      createJsonRequest("https://tenant.internal/init", "POST", {
        subdomain: "update-config",
        displayName: "Original Name",
        ownerId: "user-789",
        tier: "seedling",
      }),
    );

    // Update config
    const updateResponse = await stub.fetch(
      createJsonRequest("https://tenant.internal/config", "PUT", {
        displayName: "Updated Name",
        tier: "sapling",
      }),
    );

    expect(updateResponse.ok).toBe(true);

    // Verify update
    const configResponse = await stub.fetch(
      new Request("https://tenant.internal/config"),
    );
    const config = await configResponse.json();

    expect(config.displayName).toBe("Updated Name");
    expect(config.tier).toBe("sapling");
  });

  it("should return 404 for uninitialized tenant", async () => {
    const stub = getTenantStub("never-initialized");

    const response = await stub.fetch(
      new Request("https://tenant.internal/config"),
    );

    expect(response.status).toBe(404);
  });
});

// ============================================================================
// Draft Sync Tests
// ============================================================================

describe("TenantDO Draft Sync", () => {
  it("should create a new draft", async () => {
    const stub = getTenantStub("draft-create");

    // Initialize tenant
    await stub.fetch(
      createJsonRequest("https://tenant.internal/init", "POST", {
        subdomain: "draft-create",
        displayName: "Draft Test",
        ownerId: "user-draft",
        tier: "seedling",
      }),
    );

    // Create draft
    const draftResponse = await stub.fetch(
      createJsonRequest("https://tenant.internal/drafts/my-draft", "PUT", {
        content: "# My Draft\n\nThis is draft content.",
        metadata: {
          title: "My Draft",
          description: "A test draft",
          tags: ["test"],
        },
        deviceId: "device-1",
      }),
    );

    expect(draftResponse.ok).toBe(true);
    const data = await draftResponse.json();
    expect(data.lastSaved).toBeDefined();
  });

  it("should retrieve an existing draft", async () => {
    const stub = getTenantStub("draft-get");

    // Initialize
    await stub.fetch(
      createJsonRequest("https://tenant.internal/init", "POST", {
        subdomain: "draft-get",
        displayName: "Draft Get Test",
        ownerId: "user-get",
        tier: "seedling",
      }),
    );

    // Create draft
    await stub.fetch(
      createJsonRequest("https://tenant.internal/drafts/get-test", "PUT", {
        content: "# Get Test Draft",
        metadata: { title: "Get Test" },
        deviceId: "device-2",
      }),
    );

    // Retrieve draft
    const getResponse = await stub.fetch(
      new Request("https://tenant.internal/drafts/get-test"),
    );

    expect(getResponse.ok).toBe(true);
    const draft = await getResponse.json();

    expect(draft.content).toBe("# Get Test Draft");
    expect(draft.metadata.title).toBe("Get Test");
  });

  it("should list all drafts", async () => {
    const stub = getTenantStub("draft-list");

    // Initialize
    await stub.fetch(
      createJsonRequest("https://tenant.internal/init", "POST", {
        subdomain: "draft-list",
        displayName: "Draft List Test",
        ownerId: "user-list",
        tier: "seedling",
      }),
    );

    // Create multiple drafts
    await stub.fetch(
      createJsonRequest("https://tenant.internal/drafts/draft-a", "PUT", {
        content: "Draft A content",
        metadata: { title: "Draft A" },
        deviceId: "device-3",
      }),
    );

    await stub.fetch(
      createJsonRequest("https://tenant.internal/drafts/draft-b", "PUT", {
        content: "Draft B content",
        metadata: { title: "Draft B" },
        deviceId: "device-3",
      }),
    );

    // List drafts
    const listResponse = await stub.fetch(
      new Request("https://tenant.internal/drafts"),
    );

    expect(listResponse.ok).toBe(true);
    const drafts = await listResponse.json();

    expect(Array.isArray(drafts)).toBe(true);
    expect(drafts.length).toBe(2);
  });

  it("should delete a draft", async () => {
    const stub = getTenantStub("draft-delete");

    // Initialize
    await stub.fetch(
      createJsonRequest("https://tenant.internal/init", "POST", {
        subdomain: "draft-delete",
        displayName: "Draft Delete Test",
        ownerId: "user-delete",
        tier: "seedling",
      }),
    );

    // Create draft
    await stub.fetch(
      createJsonRequest("https://tenant.internal/drafts/to-delete", "PUT", {
        content: "Will be deleted",
        metadata: { title: "To Delete" },
        deviceId: "device-4",
      }),
    );

    // Delete draft
    const deleteResponse = await stub.fetch(
      createJsonRequest("https://tenant.internal/drafts/to-delete", "DELETE"),
    );

    expect(deleteResponse.ok).toBe(true);

    // Verify deletion
    const getResponse = await stub.fetch(
      new Request("https://tenant.internal/drafts/to-delete"),
    );

    expect(getResponse.status).toBe(404);
  });

  it("should update existing draft from different device", async () => {
    const stub = getTenantStub("draft-multi-device");

    // Initialize
    await stub.fetch(
      createJsonRequest("https://tenant.internal/init", "POST", {
        subdomain: "draft-multi-device",
        displayName: "Multi Device Test",
        ownerId: "user-multi",
        tier: "seedling",
      }),
    );

    // Create from device 1
    await stub.fetch(
      createJsonRequest("https://tenant.internal/drafts/shared-draft", "PUT", {
        content: "Initial content from device 1",
        metadata: { title: "Shared Draft" },
        deviceId: "phone",
      }),
    );

    // Update from device 2
    const updateResponse = await stub.fetch(
      createJsonRequest("https://tenant.internal/drafts/shared-draft", "PUT", {
        content: "Updated content from device 2",
        metadata: { title: "Shared Draft (updated)" },
        deviceId: "laptop",
      }),
    );

    expect(updateResponse.ok).toBe(true);

    // Verify update
    const getResponse = await stub.fetch(
      new Request("https://tenant.internal/drafts/shared-draft"),
    );
    const draft = await getResponse.json();

    expect(draft.content).toBe("Updated content from device 2");
    expect(draft.metadata.title).toBe("Shared Draft (updated)");
    expect(draft.lastDevice).toBe("laptop");
  });

  it("should return 404 for non-existent draft", async () => {
    const stub = getTenantStub("draft-404");

    // Initialize
    await stub.fetch(
      createJsonRequest("https://tenant.internal/init", "POST", {
        subdomain: "draft-404",
        displayName: "Draft 404 Test",
        ownerId: "user-404",
        tier: "seedling",
      }),
    );

    const response = await stub.fetch(
      new Request("https://tenant.internal/drafts/does-not-exist"),
    );

    expect(response.status).toBe(404);
  });
});

// ============================================================================
// Theme Tests
// ============================================================================

describe("TenantDO Theme", () => {
  it("should store and retrieve theme settings", async () => {
    const stub = getTenantStub("theme-test");

    // Initialize with theme
    await stub.fetch(
      createJsonRequest("https://tenant.internal/init", "POST", {
        subdomain: "theme-test",
        displayName: "Theme Test",
        ownerId: "user-theme",
        tier: "oak",
        theme: {
          primaryColor: "#7c3aed",
          fontFamily: "serif",
          darkMode: true,
        },
      }),
    );

    // Get config with theme
    const configResponse = await stub.fetch(
      new Request("https://tenant.internal/config"),
    );
    const config = await configResponse.json();

    expect(config.theme).toMatchObject({
      primaryColor: "#7c3aed",
      fontFamily: "serif",
      darkMode: true,
    });
  });

  it("should update theme without affecting other config", async () => {
    const stub = getTenantStub("theme-update");

    // Initialize
    await stub.fetch(
      createJsonRequest("https://tenant.internal/init", "POST", {
        subdomain: "theme-update",
        displayName: "Theme Update Test",
        ownerId: "user-theme-update",
        tier: "sapling",
      }),
    );

    // Update just theme
    await stub.fetch(
      createJsonRequest("https://tenant.internal/config", "PUT", {
        theme: {
          primaryColor: "#10b981",
          darkMode: false,
        },
      }),
    );

    // Verify
    const configResponse = await stub.fetch(
      new Request("https://tenant.internal/config"),
    );
    const config = await configResponse.json();

    expect(config.displayName).toBe("Theme Update Test"); // Unchanged
    expect(config.tier).toBe("sapling"); // Unchanged
    expect(config.theme.primaryColor).toBe("#10b981"); // Updated
  });
});

// ============================================================================
// Limits Tests
// ============================================================================

describe("TenantDO Limits", () => {
  it("should return tier-appropriate limits", async () => {
    const stub = getTenantStub("limits-test");

    await stub.fetch(
      createJsonRequest("https://tenant.internal/init", "POST", {
        subdomain: "limits-test",
        displayName: "Limits Test",
        ownerId: "user-limits",
        tier: "seedling",
      }),
    );

    const configResponse = await stub.fetch(
      new Request("https://tenant.internal/config"),
    );
    const config = await configResponse.json();

    // Seedling tier limits from tiers.ts
    expect(config.limits).toBeDefined();
    expect(config.limits.postsPerMonth).toBe(50);
    expect(config.limits.storageBytes).toBe(1 * 1024 * 1024 * 1024); // 1 GB
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe("TenantDO Error Handling", () => {
  it("should handle missing required fields on init", async () => {
    const stub = getTenantStub("error-init");

    const response = await stub.fetch(
      createJsonRequest("https://tenant.internal/init", "POST", {
        // Missing required fields
        subdomain: "error-init",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("should return 404 for unknown routes", async () => {
    const stub = getTenantStub("error-route");

    const response = await stub.fetch(
      new Request("https://tenant.internal/unknown-endpoint"),
    );

    expect(response.status).toBe(404);
  });
});
