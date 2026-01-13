/**
 * Vitest Setup File
 *
 * Configures global mocks and test environment for GroveEngine tests.
 *
 * Note: We export the mock environment directly rather than using vi.mock()
 * because vi.mock() doesn't work with dynamic require() calls. The test helpers
 * import `mockEnv` directly from this file.
 */

import { vi } from "vitest";

// ============================================================================
// Type Definitions for Mock Data
// ============================================================================

/** Shape of tenant init/config data */
interface TenantData {
  subdomain?: string;
  displayName?: string;
  ownerId?: string;
  tier?: string;
  [key: string]: unknown;
}

/** Shape of draft data */
interface DraftData {
  deviceId?: string;
  [key: string]: unknown;
}

/** Shape of post meta init data */
interface PostMetaInitData {
  tenantId?: string;
  slug?: string;
  tier?: string;
}

/** Shape of view tracking data */
interface ViewData {
  sessionId?: string;
}

/** Shape of reaction data */
interface ReactionData {
  type?: string;
  userId?: string;
}

/** Shape of post content data */
interface ContentData {
  [key: string]: unknown;
}

/** Mock DurableObjectId with equals method */
interface MockDurableObjectId {
  name: string;
  toString: () => string;
  equals: (other: MockDurableObjectId) => boolean;
}

// ============================================================================
// Mock Factories
// ============================================================================

/**
 * Create a mock DurableObjectId
 */
function createMockId(name: string): MockDurableObjectId {
  return {
    name,
    toString: () => name,
    equals: (other: MockDurableObjectId) => other.name === name,
  };
}

/**
 * Create a mock Durable Object namespace
 */
function createMockDONamespace() {
  const stubs = new Map<string, MockDurableObjectStub>();

  return {
    idFromName: (name: string) => createMockId(name),
    get: (id: MockDurableObjectId) => {
      if (!stubs.has(id.name)) {
        stubs.set(id.name, new MockDurableObjectStub(id.name));
      }
      return stubs.get(id.name)!;
    },
    _reset: () => stubs.clear(),
  };
}

/**
 * Mock Durable Object Stub
 *
 * Implements the DurableObjectStub interface for testing purposes.
 * The connect() method is stubbed since we don't use WebSocket connections in tests.
 */
class MockDurableObjectStub {
  private storage = new Map<string, unknown>();

  // Required by DurableObjectStub interface
  readonly id: MockDurableObjectId;
  readonly name: string;

  constructor(name: string) {
    this.name = name;
    this.id = createMockId(name);
  }

  /**
   * Stub for Socket connections (not used in tests)
   */
  connect(): never {
    throw new Error("connect() not implemented in mock - use fetch() instead");
  }

  async fetch(request: Request | string): Promise<Response> {
    const req = typeof request === "string" ? new Request(request) : request;
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // Handle different DO endpoints based on the stub type
    if (this.name.startsWith("tenant:")) {
      return this.handleTenantRequest(path, method, req);
    } else if (this.name.startsWith("post:")) {
      return this.handlePostMetaRequest(path, method, req);
    } else if (this.name.startsWith("content:")) {
      return this.handlePostContentRequest(path, method, req);
    }

    return new Response("Not found", { status: 404 });
  }

  private async handleTenantRequest(
    path: string,
    method: string,
    req: Request,
  ): Promise<Response> {
    if (path === "/init" && method === "POST") {
      const data = (await req.json()) as TenantData;
      // Validate required fields
      if (!data.subdomain || !data.displayName || !data.ownerId || !data.tier) {
        return new Response("Missing required fields", { status: 400 });
      }
      // Add tier limits based on tier
      const limits = getTierLimits(data.tier);
      this.storage.set("config", { ...data, limits });
      return Response.json({ success: true });
    }

    if (path === "/config" && method === "GET") {
      const config = this.storage.get("config") as
        | Record<string, unknown>
        | undefined;
      if (!config) return new Response("Not found", { status: 404 });
      // Ensure limits are included
      if (!config.limits && config.tier) {
        config.limits = getTierLimits(config.tier as string);
      }
      return Response.json(config);
    }

    if (path === "/config" && method === "PUT") {
      const updates = (await req.json()) as TenantData;
      const current =
        (this.storage.get("config") as Record<string, unknown>) || {};
      this.storage.set("config", { ...current, ...updates });
      return Response.json({ success: true });
    }

    if (path === "/drafts" && method === "GET") {
      const drafts = this.storage.get("drafts") || [];
      return Response.json(drafts);
    }

    if (path.startsWith("/drafts/")) {
      const slug = path.replace("/drafts/", "");
      const draftsMap = (this.storage.get("draftsMap") || {}) as Record<
        string,
        DraftData
      >;

      if (method === "GET") {
        const draft = draftsMap[slug];
        if (!draft) return new Response("Not found", { status: 404 });
        return Response.json(draft);
      }

      if (method === "PUT") {
        const data = (await req.json()) as DraftData;
        draftsMap[slug] = {
          ...data,
          lastSaved: Date.now(),
          lastDevice: data.deviceId,
        };
        this.storage.set("draftsMap", draftsMap);

        // Update drafts list
        const drafts = Object.entries(draftsMap).map(([s, d]) => ({
          slug: s,
          ...d,
        }));
        this.storage.set("drafts", drafts);

        return Response.json({ lastSaved: Date.now() });
      }

      if (method === "DELETE") {
        delete draftsMap[slug];
        this.storage.set("draftsMap", draftsMap);
        return Response.json({ success: true });
      }
    }

    return new Response("Not found", { status: 404 });
  }

  private async handlePostMetaRequest(
    path: string,
    method: string,
    req: Request,
  ): Promise<Response> {
    if (path === "/meta/init" && method === "POST") {
      const data = (await req.json()) as PostMetaInitData;
      // Validate required fields
      if (!data.tenantId || !data.slug) {
        return new Response("Missing required fields: tenantId and slug", {
          status: 400,
        });
      }
      let meta = this.storage.get("meta") as
        | Record<string, unknown>
        | undefined;

      if (!meta) {
        meta = {
          tenantId: data.tenantId,
          slug: data.slug,
          tier: data.tier,
          viewCount: 0,
          reactions: { likes: 0, bookmarks: 0 },
          lastViewed: Date.now(),
          isPopular: false,
        };
        this.storage.set("meta", meta);
      } else if (data.tier && meta.tier !== data.tier) {
        meta.tier = data.tier;
        // Recalculate popular status
        const threshold = getPopularThreshold(data.tier);
        meta.isPopular = (meta.viewCount as number) >= threshold;
        this.storage.set("meta", meta);
      }

      return Response.json({ success: true, meta });
    }

    if (path === "/meta" && method === "GET") {
      const meta = this.storage.get("meta");
      if (!meta) return new Response("Post not initialized", { status: 404 });
      return Response.json(meta);
    }

    if (path === "/view" && method === "POST") {
      const meta = this.storage.get("meta") as
        | Record<string, unknown>
        | undefined;
      if (!meta) return new Response("Post not initialized", { status: 400 });

      const data = (await req.json()) as ViewData;
      const sessionKey = data.sessionId || "anonymous";
      const sessions = (this.storage.get("sessions") || {}) as Record<
        string,
        number
      >;
      const lastView = sessions[sessionKey] || 0;
      const now = Date.now();

      // Rate limit: 5 minutes per session
      if (now - lastView > 5 * 60 * 1000) {
        meta.viewCount = (meta.viewCount as number) + 1;
        meta.lastViewed = now;
        sessions[sessionKey] = now;
        this.storage.set("sessions", sessions);

        // Update popular status
        const threshold = getPopularThreshold(meta.tier as string);
        meta.isPopular = (meta.viewCount as number) >= threshold;
        this.storage.set("meta", meta);
      }

      return Response.json({ success: true, viewCount: meta.viewCount });
    }

    if (path === "/reactions" && method === "GET") {
      const meta = this.storage.get("meta") as
        | Record<string, unknown>
        | undefined;
      if (!meta) return new Response("Post not initialized", { status: 404 });
      return Response.json(meta.reactions);
    }

    if (path === "/reactions" && method === "POST") {
      const meta = this.storage.get("meta") as
        | Record<string, unknown>
        | undefined;
      if (!meta) return new Response("Post not initialized", { status: 400 });

      const data = (await req.json()) as ReactionData;
      if (!data.type || !["like", "bookmark"].includes(data.type)) {
        return new Response("Invalid reaction type", { status: 400 });
      }

      const userId = data.userId || "anonymous";
      const reactionsKey = `reactions:${userId}:${data.type}`;

      if (this.storage.get(reactionsKey)) {
        return Response.json({
          success: false,
          message: "Already reacted",
          reactions: meta.reactions,
        });
      }

      this.storage.set(reactionsKey, true);
      const reactions = meta.reactions as { likes: number; bookmarks: number };

      if (data.type === "like") {
        reactions.likes++;
      } else {
        reactions.bookmarks++;
      }

      this.storage.set("meta", meta);
      return Response.json({ success: true, reactions });
    }

    if (path === "/reactions" && method === "DELETE") {
      const meta = this.storage.get("meta") as
        | Record<string, unknown>
        | undefined;
      if (!meta) return new Response("Post not initialized", { status: 400 });

      const data = (await req.json()) as ReactionData;
      if (!data.type || !["like", "bookmark"].includes(data.type)) {
        return new Response("Invalid reaction type", { status: 400 });
      }

      const userId = data.userId || "anonymous";
      const reactionsKey = `reactions:${userId}:${data.type}`;
      this.storage.delete(reactionsKey);

      const reactions = meta.reactions as { likes: number; bookmarks: number };
      if (data.type === "like") {
        reactions.likes = Math.max(0, reactions.likes - 1);
      } else {
        reactions.bookmarks = Math.max(0, reactions.bookmarks - 1);
      }

      this.storage.set("meta", meta);
      return Response.json({ success: true, reactions });
    }

    if (path === "/presence" && method === "GET") {
      const sessions = (this.storage.get("sessions") || {}) as Record<
        string,
        number
      >;
      const cutoff = Date.now() - 5 * 60 * 1000;
      const activeReaders = Object.values(sessions).filter(
        (t) => t > cutoff,
      ).length;
      return Response.json({ activeReaders, lastActivity: Date.now() });
    }

    return new Response("Not found", { status: 404 });
  }

  private async handlePostContentRequest(
    path: string,
    method: string,
    req: Request,
  ): Promise<Response> {
    if (path === "/content" && method === "GET") {
      const content = this.storage.get("content");
      if (!content) return new Response("Not found", { status: 404 });
      return Response.json(content);
    }

    if (path === "/content" && method === "PUT") {
      const data = (await req.json()) as ContentData;
      this.storage.set("content", data);
      return Response.json({ success: true });
    }

    return new Response("Not found", { status: 404 });
  }
}

/**
 * Get popular post threshold for tier
 */
function getPopularThreshold(tier: string | undefined): number {
  const thresholds: Record<string, number> = {
    free: 150,
    seedling: 100,
    sapling: 75,
    oak: 50,
    evergreen: 25,
  };
  return thresholds[tier || "seedling"] ?? 100;
}

/**
 * Get tier limits for a given tier
 */
function getTierLimits(tier: string): {
  postsPerMonth: number;
  storageBytes: number;
} {
  const GB = 1024 * 1024 * 1024;
  const limits: Record<
    string,
    { postsPerMonth: number; storageBytes: number }
  > = {
    free: { postsPerMonth: 10, storageBytes: 100 * 1024 * 1024 }, // 100 MB
    seedling: { postsPerMonth: 50, storageBytes: 1 * GB }, // 1 GB
    sapling: { postsPerMonth: 100, storageBytes: 5 * GB }, // 5 GB
    oak: { postsPerMonth: 500, storageBytes: 25 * GB }, // 25 GB
    evergreen: { postsPerMonth: -1, storageBytes: 100 * GB }, // Unlimited posts, 100 GB
  };
  return limits[tier] ?? limits.seedling;
}

/**
 * Create a mock D1 database
 */
function createMockD1() {
  const tables = new Map<string, unknown[]>();

  return {
    prepare: (sql: string) => ({
      bind: (...params: unknown[]) => ({
        run: async () => ({ success: true }),
        first: async () => null,
        all: async () => ({ results: [] }),
      }),
    }),
    exec: async (sql: string) => ({ success: true }),
    _tables: tables,
  };
}

/**
 * Create a mock KV namespace
 */
function createMockKV() {
  const store = new Map<string, string>();

  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
    delete: async (key: string) => {
      store.delete(key);
    },
    list: async () => ({
      keys: Array.from(store.keys()).map((name) => ({ name })),
    }),
    _store: store,
  };
}

// ============================================================================
// Exported Mock Environment
// ============================================================================

/**
 * The mock environment for testing Durable Objects.
 * Import this in test files instead of trying to require cloudflare:test.
 */
export const mockEnv = {
  TENANTS: createMockDONamespace(),
  POST_META: createMockDONamespace(),
  POST_CONTENT: createMockDONamespace(),
  DB: createMockD1(),
  CACHE_KV: createMockKV(),
};
