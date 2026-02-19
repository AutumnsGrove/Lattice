/**
 * Loom — Route Matching
 *
 * Declarative path+method → handler matching.
 * Supports `:param` segments for dynamic path extraction.
 * ~30 lines of matching logic, no external deps.
 *
 * Replaces if/else chains and switch statements across all 7 DOs.
 */

import type { LoomRoute, LoomMethod, LoomRequestContext } from "./types.js";

/** Result of matching a request against registered routes. */
export interface RouteMatch {
  route: LoomRoute;
  params: Record<string, string>;
}

/**
 * Match a request against a list of routes.
 * Returns the first matching route with extracted params, or null.
 */
export function matchRoute(
  method: LoomMethod,
  path: string,
  routes: LoomRoute[],
): RouteMatch | null {
  for (const route of routes) {
    if (route.method !== method) continue;

    const params = matchPath(route.path, path);
    if (params !== null) {
      return { route, params };
    }
  }
  return null;
}

/**
 * Match a path pattern against an actual path.
 * Returns extracted params or null if no match.
 *
 * Supports `:param` segments:
 *   "/drafts/:slug" matches "/drafts/hello-world" → { slug: "hello-world" }
 */
function matchPath(
  pattern: string,
  actual: string,
): Record<string, string> | null {
  const patternParts = pattern.split("/").filter(Boolean);
  const actualParts = actual.split("/").filter(Boolean);

  if (patternParts.length !== actualParts.length) return null;

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const pat = patternParts[i];
    const act = actualParts[i];

    if (pat.startsWith(":")) {
      // Wrap decodeURIComponent — malformed percent-encoding (e.g. %ZZ) throws
      try {
        params[pat.slice(1)] = decodeURIComponent(act);
      } catch {
        return null; // Malformed path segment → no match
      }
    } else if (pat !== act) {
      return null;
    }
  }

  return params;
}

/**
 * Build a LoomRequestContext from a raw Request.
 * Used by the base class to create context before routing.
 */
export function buildRequestContext(
  request: Request,
  params: Record<string, string> = {},
): LoomRequestContext {
  const url = new URL(request.url);
  return {
    request,
    url,
    method: request.method.toUpperCase() as LoomMethod,
    path: url.pathname,
    params,
    query: url.searchParams,
  };
}
