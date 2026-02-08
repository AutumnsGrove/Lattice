/**
 * Grove Router Worker
 *
 * Proxies wildcard subdomain requests (*.grove.place) to the groveengine Pages project.
 * This is needed because Cloudflare Pages doesn't support wildcard custom domains.
 *
 * The Worker:
 * 1. Catches all *.grove.place requests
 * 2. Excludes subdomains that have their own Pages/Workers
 * 3. Proxies to grove-lattice.pages.dev with X-Forwarded-Host header
 */

export interface Env {
  CDN: R2Bucket;
  // Service Bindings for direct Worker-to-Worker communication
  SCOUT?: Fetcher;
  AUTH_API?: Fetcher;
  MC_CONTROL?: Fetcher;
  MYCELIUM?: Fetcher;
  OG?: Fetcher;
}

/**
 * Route target configuration.
 * - `origin`: Public hostname (used as fallback for local dev where bindings aren't available)
 * - `binding`: Optional key into Env for a Service Binding Fetcher
 */
interface RouteTarget {
  origin: string;
  binding?: keyof Env;
}

/**
 * Subdomain routing map.
 * Maps subdomains to their target Pages/Workers.
 * string = simple proxy to that hostname (Pages projects, special handlers)
 * RouteTarget = proxy with optional Service Binding (Workers)
 */
const SUBDOMAIN_ROUTES: Record<string, string | RouteTarget> = {
  // Auth subdomains → groveauth-frontend Pages
  auth: "groveauth-frontend.pages.dev",
  admin: "groveauth-frontend.pages.dev",
  login: "groveauth-frontend.pages.dev",
  heartwood: "groveauth-frontend.pages.dev",

  // Grove internal Pages projects
  amber: "amber-4x2.pages.dev", // Amber storage
  ivy: "ivy-3uv.pages.dev", // Ivy mail client
  // autumn subdomain now routes to groveengine (tenant in D1) — legacy autumn-website.pages.dev removed
  plant: "grove-plant.pages.dev", // Grove Plant (onboarding)
  terrarium: "grove-terrarium.pages.dev", // Terrarium visual composer
  vineyard: "vineyard-grove-place.pages.dev", // Vineyard showcase
  cdn: "R2", // Handled by R2 custom domain - skip Worker proxy

  // Domain management
  domains: "grove-domains.pages.dev",
  forage: "grove-domains.pages.dev",

  // Social feed
  meadow: "grove-meadow.pages.dev",

  // Music
  music: "grovemusic.pages.dev",
  aria: "grovemusic.pages.dev",

  // Workers - use Service Bindings when available, fall back to public URLs
  scout: { origin: "scout.m7jv4v7npb.workers.dev", binding: "SCOUT" },
  "auth-api": {
    origin: "groveauth.m7jv4v7npb.workers.dev",
    binding: "AUTH_API",
  },
  "mc-control": {
    origin: "mc-control.m7jv4v7npb.workers.dev",
    binding: "MC_CONTROL",
  },
  mycelium: { origin: "mycelium.m7jv4v7npb.workers.dev", binding: "MYCELIUM" },
  og: { origin: "grove-og.m7jv4v7npb.workers.dev", binding: "OG" },

  // Reserved subdomains - route to landing until services are built
  // These are claimed to prevent user registration conflicts
  pantry: "grove-landing.pages.dev", // Pantry shop (coming soon)
  nook: "grove-landing.pages.dev", // Nook video sharing (coming soon)
  trove: "grove-landing.pages.dev", // Trove library finder (coming soon)
  bloom: "grove-landing.pages.dev", // Bloom remote coding (coming soon)
  vista: "grove-landing.pages.dev", // Vista monitoring (coming soon)
  foliage: "grove-landing.pages.dev", // Foliage theming (coming soon)
  status: "grove-clearing.pages.dev", // Clearing status page
  clearing: "grove-clearing.pages.dev", // Clearing alias
  mc: "grove-landing.pages.dev", // Outpost Minecraft (coming soon)
  search: "grove-landing.pages.dev", // Search (coming soon)
  porch: "grove-landing.pages.dev", // Porch conversations (coming soon)
  canopy: "grove-landing.pages.dev", // Canopy directory (route-based at grove.place/canopy)

  // Special handling
  www: "REDIRECT", // Redirect to root
};

/**
 * Validate and return the appropriate CORS origin.
 * Restricts access to grove.place domain and its subdomains.
 */
function validateOrigin(origin: string | null): string {
  if (!origin) return "https://grove.place";

  // Allow grove.place and all subdomains
  if (
    origin === "https://grove.place" ||
    origin === "https://www.grove.place" ||
    /^https:\/\/[\w-]+\.grove\.place$/.test(origin)
  ) {
    return origin;
  }

  return "https://grove.place";
}

/**
 * Get content type based on file extension
 */
function getContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const types: Record<string, string> = {
    html: "text/html; charset=utf-8",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    ico: "image/x-icon",
    ttf: "font/ttf",
    otf: "font/otf",
    woff: "font/woff",
    woff2: "font/woff2",
    pdf: "application/pdf",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    webm: "video/webm",
  };
  return types[ext || ""] || "application/octet-stream";
}

/**
 * Determine if a file should be downloaded (forced attachment) or displayed inline
 * based on its content type. Prevents XSS from content-type sniffing.
 */
function shouldForceDownload(contentType: string): boolean {
  const dangerousTypes = [
    "application/javascript",
    "text/html",
    "application/xhtml+xml",
    "text/xml",
    "application/xml",
  ];
  return dangerousTypes.some((type) => contentType.includes(type));
}

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

    // Handle R2 CDN - serve directly from R2 bucket
    if (routeTarget === "R2") {
      // Get the object key (strip leading slash)
      let key = url.pathname.slice(1);

      // Serve index.html for root
      if (!key || key === "") {
        key = "index.html";
      }

      const object = await env.CDN.get(key);

      if (!object) {
        return new Response("Not Found", { status: 404 });
      }

      // Set appropriate content type and content disposition
      const contentType = getContentType(key);
      const headers = new Headers();
      headers.set("Content-Type", contentType);
      headers.set("Cache-Control", "public, max-age=31536000"); // 1 year for immutable assets

      // Set Content-Disposition to prevent XSS from content-type sniffing
      // Force download for dangerous types, allow inline display for safe types
      if (shouldForceDownload(contentType)) {
        headers.set("Content-Disposition", "attachment");
      } else {
        headers.set("Content-Disposition", "inline");
      }

      const origin = request.headers.get("Origin");
      const validatedOrigin = validateOrigin(origin);
      headers.set("Access-Control-Allow-Origin", validatedOrigin);
      headers.set("Vary", "Origin");

      return new Response(object.body, { headers });
    }

    // Resolve route target to hostname and optional Service Binding
    const target = typeof routeTarget === "object" ? routeTarget : null;
    const targetHostname =
      (typeof routeTarget === "string" ? routeTarget : target?.origin) ||
      "grove-lattice.pages.dev";

    // Check if a Service Binding is available for this target
    const fetcher = target?.binding
      ? (env[target.binding] as Fetcher | undefined)
      : undefined;

    // Create new headers, preserving original headers
    const headers = new Headers(request.headers);

    // Add X-Forwarded-Host so the Pages app knows the original hostname
    headers.set("X-Forwarded-Host", host);

    // Build the proxy request
    const targetUrl = new URL(request.url);
    targetUrl.hostname = targetHostname;

    const proxyRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: "manual", // Don't follow redirects, pass them through
    });

    try {
      // Use Service Binding when available (direct internal routing),
      // fall back to public fetch (for local dev or Pages targets)
      const response = fetcher
        ? await fetcher.fetch(proxyRequest)
        : await fetch(proxyRequest);

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
