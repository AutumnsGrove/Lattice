import { describe, it, expect } from "vitest";
import { matchRoute, buildRequestContext } from "./router.js";
import type { LoomRoute } from "./types.js";

const mockHandler = async () => new Response("ok");

const routes: LoomRoute[] = [
  { method: "GET", path: "/content", handler: mockHandler },
  { method: "PUT", path: "/content", handler: mockHandler },
  { method: "GET", path: "/drafts/:slug", handler: mockHandler },
  { method: "GET", path: "/users/:id/posts/:postId", handler: mockHandler },
  { method: "POST", path: "/content/invalidate", handler: mockHandler },
];

describe("matchRoute", () => {
  it("matches exact static paths", () => {
    const match = matchRoute("GET", "/content", routes);
    expect(match).not.toBeNull();
    expect(match!.route.path).toBe("/content");
    expect(match!.params).toEqual({});
  });

  it("matches method + path combination", () => {
    const get = matchRoute("GET", "/content", routes);
    const put = matchRoute("PUT", "/content", routes);
    expect(get!.route.method).toBe("GET");
    expect(put!.route.method).toBe("PUT");
  });

  it("returns null for unmatched method", () => {
    const match = matchRoute("DELETE", "/content", routes);
    expect(match).toBeNull();
  });

  it("returns null for unmatched path", () => {
    const match = matchRoute("GET", "/nonexistent", routes);
    expect(match).toBeNull();
  });

  it("extracts single :param", () => {
    const match = matchRoute("GET", "/drafts/hello-world", routes);
    expect(match).not.toBeNull();
    expect(match!.params).toEqual({ slug: "hello-world" });
  });

  it("extracts multiple :params", () => {
    const match = matchRoute("GET", "/users/42/posts/abc", routes);
    expect(match).not.toBeNull();
    expect(match!.params).toEqual({ id: "42", postId: "abc" });
  });

  it("decodes percent-encoded params", () => {
    const match = matchRoute("GET", "/drafts/hello%20world", routes);
    expect(match).not.toBeNull();
    expect(match!.params.slug).toBe("hello world");
  });

  it("returns null for malformed percent-encoding", () => {
    const match = matchRoute("GET", "/drafts/%ZZ", routes);
    expect(match).toBeNull();
  });

  it("rejects path with extra segments", () => {
    const match = matchRoute("GET", "/content/extra", routes);
    expect(match).toBeNull();
  });

  it("rejects path with fewer segments", () => {
    const match = matchRoute("GET", "/users/42/posts", routes);
    expect(match).toBeNull();
  });

  it("matches multi-segment static paths", () => {
    const match = matchRoute("POST", "/content/invalidate", routes);
    expect(match).not.toBeNull();
    expect(match!.route.path).toBe("/content/invalidate");
  });

  it("handles trailing slashes by ignoring them", () => {
    // split("/").filter(Boolean) strips trailing slashes
    const match = matchRoute("GET", "/content/", routes);
    expect(match).not.toBeNull();
  });
});

describe("buildRequestContext", () => {
  it("builds context from a Request", () => {
    const request = new Request("https://do-internal/content?foo=bar", {
      method: "GET",
    });
    const ctx = buildRequestContext(request, { slug: "test" });

    expect(ctx.method).toBe("GET");
    expect(ctx.path).toBe("/content");
    expect(ctx.params).toEqual({ slug: "test" });
    expect(ctx.query.get("foo")).toBe("bar");
    expect(ctx.url).toBeInstanceOf(URL);
    expect(ctx.request).toBe(request);
  });

  it("uppercases method", () => {
    const request = new Request("https://do-internal/test", {
      method: "post",
    });
    const ctx = buildRequestContext(request);
    expect(ctx.method).toBe("POST");
  });

  it("defaults params to empty object", () => {
    const request = new Request("https://do-internal/test");
    const ctx = buildRequestContext(request);
    expect(ctx.params).toEqual({});
  });
});
