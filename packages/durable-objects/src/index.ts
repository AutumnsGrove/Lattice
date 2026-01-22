/**
 * Grove Durable Objects Worker
 *
 * This worker hosts all Durable Objects for the Grove Platform.
 * Other services (GroveEngine Pages, post-migrator) reference these
 * via service bindings with script_name: "grove-durable-objects".
 *
 * Part of the Loom pattern - Grove's coordination layer.
 */

// Export DO classes for Cloudflare to instantiate
export { TenantDO } from "./TenantDO.js";
export { PostMetaDO } from "./PostMetaDO.js";
export { PostContentDO } from "./PostContentDO.js";
export { SentinelDO } from "./sentinel/SentinelDO.js";

// Minimal fetch handler for health checks
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        service: "grove-durable-objects",
        classes: ["TenantDO", "PostMetaDO", "PostContentDO", "SentinelDO"],
      });
    }

    return new Response("Grove Durable Objects Worker", {
      headers: { "Content-Type": "text/plain" },
    });
  },
};
