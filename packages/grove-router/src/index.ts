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
  heartwood: "groveauth-frontend.pages.dev",

  // Grove internal Pages projects
  amber: "amber-4x2.pages.dev", // Amber
  ivy: "ivy-3uv.pages.dev", // Ivy mail client
  autumn: "autumn-website.pages.dev", // Autumn's Grove
  example: "grove-example-site.pages.dev", // GroveEngine example
  plant: "grove-plant.pages.dev", // Grove Plant
  cdn: "grove-landing.pages.dev", // R2 assets

  // Domain management
  domains: "grove-domains.pages.dev",
  forage: "grove-domains.pages.dev",

  // Music
  music: "grovemusic.pages.dev",
  aria: "grovemusic.pages.dev",

  // Workers - proxy to their workers.dev URLs
  scout: "scout.m7jv4v7npb.workers.dev",
  "auth-api": "groveauth.m7jv4v7npb.workers.dev",
  "mc-control": "mc-control.m7jv4v7npb.workers.dev",

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

    // Handle unknown subdomains - proxy to groveengine for tenant lookup
    // (null routes were removed - all special subdomains now have explicit targets)

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
