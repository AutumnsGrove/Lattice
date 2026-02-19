import type { RequestHandler } from "./$types";

/**
 * OG Metadata Fetch Proxy
 *
 * Proxies requests to og.grove.place/fetch for fetching external OG metadata.
 * Used by the LinkPreview component to get title, description, and image
 * from external URLs.
 *
 * Query Parameters:
 *   - url: The external URL to fetch OG metadata from (required)
 *
 * Returns JSON with OG metadata (title, description, image, etc.)
 *
 * See packages/og-worker for the actual implementation.
 */
export const GET: RequestHandler = async ({ url, fetch }) => {
  const targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Missing url parameter",
        errorCode: "INVALID_URL",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Proxy to the OG worker
  const ogUrl = new URL("https://og.grove.place/fetch");
  ogUrl.searchParams.set("url", targetUrl);

  try {
    const response = await fetch(ogUrl.toString());
    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=3600",
        "X-Proxy-Status": "ok",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to fetch from OG service",
        errorCode: "FETCH_FAILED",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
