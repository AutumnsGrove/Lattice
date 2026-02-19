/**
 * Userinfo Proxy — Heartwood Service Binding
 *
 * Proxies /userinfo requests to Heartwood for JWT-based user info lookups.
 *
 * Security hardening is centralized in $lib/proxy.ts (HAWK-005/006/007).
 */

import type { RequestHandler } from "./$types";
import { proxyToHeartwood } from "$lib/proxy";

export const GET: RequestHandler = async (event) => {
  return proxyToHeartwood(event, "/userinfo");
};
