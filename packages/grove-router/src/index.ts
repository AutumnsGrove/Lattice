/**
 * Grove Router Worker
 *
 * Proxies wildcard subdomain requests (*.grove.place) to the groveengine Pages project.
 * This is needed because Cloudflare Pages doesn't support wildcard custom domains.
 *
 * The Worker:
 * 1. Catches all *.grove.place requests
 * 2. Excludes subdomains that have their own Pages/Workers
 * 3. Proxies to groveengine.pages.dev with X-Forwarded-Host header
 */

export interface Env {
  // No bindings needed - pure proxy worker
}

/**
 * Subdomain routing map.
 * Maps subdomains to their target Pages/Workers hostnames.
 * null = use default groveengine.pages.dev
 * string = proxy to that hostname
 */
const SUBDOMAIN_ROUTES: Record<string, string | null> = {
  // Auth subdomains → groveauth-frontend Pages
  auth: "groveauth-frontend.pages.dev",
  admin: "groveauth-frontend.pages.dev",
  login: "groveauth-frontend.pages.dev",

  // Other Pages projects
  domains: "grove-domains.pages.dev",
  cdn: "grove-landing.pages.dev", // R2 assets
  music: "grovemusic.pages.dev",

  // Workers - these have their own routes but fallback here
  scout: null, // Should be handled by scout Worker route
  "auth-api": null, // Should be handled by groveauth Worker route

  // Special handling
  www: "REDIRECT", // Redirect to root
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const host = url.hostname;

    // Extract subdomain from hostname
    const parts = host.split(".");

    // Check if this is a *.grove.place request
    if (!host.endsWith(".grove.place") || parts.length < 3) {
      // Not a subdomain request or wrong domain - this shouldn't happen
      // if routes are configured correctly
      return new Response("Invalid request", { status: 400 });
    }

    const subdomain = parts[0];

    // Check if this subdomain has special routing
    const routeTarget = SUBDOMAIN_ROUTES[subdomain];

    // Handle www redirect
    if (routeTarget === "REDIRECT") {
      const redirectUrl = new URL(request.url);
      redirectUrl.hostname = "grove.place";
      return Response.redirect(redirectUrl.toString(), 301);
    }

    // Handle Workers that should have their own routes
    if (routeTarget === null) {
      return new Response("Service route not configured", { status: 503 });
    }

    // Determine target hostname
    // Note: groveengine project uses grove-example-site.pages.dev domain
    const targetHostname = routeTarget || "grove-example-site.pages.dev";

    // Proxy to target
    const targetUrl = new URL(request.url);
    targetUrl.hostname = targetHostname;

    // Create new headers, preserving original headers
    const headers = new Headers(request.headers);

    // Add X-Forwarded-Host so the Pages app knows the original hostname
    headers.set("X-Forwarded-Host", host);

    // Create the proxy request
    const proxyRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: "manual", // Don't follow redirects, pass them through
    });

    try {
      const response = await fetch(proxyRequest);

      // Return response as-is (preserving headers, status, etc.)
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      console.error("Proxy error:", error);
      return new Response("Proxy error", { status: 502 });
    }
  },
};
