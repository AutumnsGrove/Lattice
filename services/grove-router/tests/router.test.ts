/**
 * Grove Router Tests
 *
 * Tests the Worker that proxies wildcard subdomain requests (*.grove.place)
 * to their correct Pages/Workers targets.
 *
 * Strategy: Import the handler directly, provide mock Request + Env.
 * No miniflare needed — the router is pure routing logic + R2 reads.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import router, { type Env } from "../src/index.js";

// ============================================================================
// Mock R2 Bucket
// ============================================================================

interface MockR2Entry {
	body: ReadableStream;
	httpMetadata?: { contentType?: string };
	customMetadata?: Record<string, string>;
	size: number;
}

function createMockR2(): Env["CDN"] & {
	_seedObject: (key: string, content: string, contentType?: string) => void;
} {
	const objects = new Map<string, MockR2Entry>();

	return {
		head: vi.fn(async (key: string) => (objects.has(key) ? {} : null)),
		get: vi.fn(async (key: string) => {
			const entry = objects.get(key);
			if (!entry) return null;
			return {
				body: entry.body,
				httpMetadata: entry.httpMetadata,
				customMetadata: entry.customMetadata,
				size: entry.size,
				writeHttpMetadata: vi.fn(),
			};
		}),
		put: vi.fn(),
		delete: vi.fn(),
		list: vi.fn(),
		createMultipartUpload: vi.fn(),
		resumeMultipartUpload: vi.fn(),
		_seedObject(key: string, content: string, contentType?: string) {
			const encoder = new TextEncoder();
			const bytes = encoder.encode(content);
			objects.set(key, {
				body: new ReadableStream({
					start(controller) {
						controller.enqueue(bytes);
						controller.close();
					},
				}),
				httpMetadata: contentType ? { contentType } : undefined,
				size: bytes.length,
			});
		},
	} as unknown as Env["CDN"] & {
		_seedObject: (key: string, content: string, contentType?: string) => void;
	};
}

// ============================================================================
// Helpers
// ============================================================================

function createRequest(subdomain: string, path = "/", options: RequestInit = {}): Request {
	const url = `https://${subdomain}.grove.place${path}`;
	return new Request(url, {
		method: "GET",
		...options,
	});
}

type MockR2 = ReturnType<typeof createMockR2>;

function createEnv(overrides: Partial<Env> = {}): Env & { CDN: MockR2; MEDIA: MockR2 } {
	return {
		CDN: createMockR2(),
		MEDIA: createMockR2(),
		...overrides,
	} as Env & { CDN: MockR2; MEDIA: MockR2 };
}

// ============================================================================
// Tests
// ============================================================================

describe("Grove Router", () => {
	let env: Env & { CDN: MockR2; MEDIA: MockR2 };
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		env = createEnv();
		mockFetch = vi.fn(async () => new Response("OK", { status: 200, headers: {} }));
		globalThis.fetch = mockFetch;
	});

	// ==========================================================================
	// Subdomain Routing — Auth Redirects
	// ==========================================================================

	describe("Auth subdomain redirects", () => {
		it("redirects auth subdomain to login hub", async () => {
			const request = createRequest("auth", "/login");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(301);
			expect(response.headers.get("Location")).toBe("https://login.grove.place/login");
		});

		it("redirects admin subdomain to login hub", async () => {
			const request = createRequest("admin", "/dashboard");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(301);
			expect(response.headers.get("Location")).toBe("https://login.grove.place/dashboard");
		});

		it("redirects heartwood subdomain to login hub", async () => {
			const request = createRequest("heartwood", "/settings");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(301);
			expect(response.headers.get("Location")).toBe("https://login.grove.place/settings");
		});

		it("routes login subdomain to grove-login Pages project", async () => {
			const request = createRequest("login", "/");
			await router.fetch(request, env);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("grove-login.pages.dev"),
				}),
			);
		});
	});

	// ==========================================================================
	// Subdomain Routing — Pages Projects
	// ==========================================================================

	describe("Pages project routing", () => {
		it("routes ivy subdomain to ivy Pages", async () => {
			const request = createRequest("ivy", "/inbox");
			await router.fetch(request, env);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("ivy-3uv.pages.dev/inbox"),
				}),
			);
		});

		it("routes meadow subdomain to grove-meadow", async () => {
			const request = createRequest("meadow", "/feed");
			await router.fetch(request, env);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("grove-meadow.pages.dev/feed"),
				}),
			);
		});

		it("routes amber subdomain to amber Pages", async () => {
			const request = createRequest("amber", "/files");
			await router.fetch(request, env);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("amber-4x2.pages.dev/files"),
				}),
			);
		});

		it("routes plant subdomain to grove-plant Pages", async () => {
			const request = createRequest("plant", "/onboard");
			await router.fetch(request, env);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("grove-plant.pages.dev/onboard"),
				}),
			);
		});

		it("routes terrarium subdomain to terrarium Pages", async () => {
			const request = createRequest("terrarium", "/editor");
			await router.fetch(request, env);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("grove-terrarium.pages.dev/editor"),
				}),
			);
		});

		it("routes vineyard subdomain to vineyard Pages", async () => {
			const request = createRequest("vineyard", "/showcase");
			await router.fetch(request, env);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("vineyard-grove-place.pages.dev/showcase"),
				}),
			);
		});

		it("routes domains subdomain to grove-domains Pages", async () => {
			const request = createRequest("domains", "/manage");
			await router.fetch(request, env);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("grove-domains.pages.dev/manage"),
				}),
			);
		});

		it("routes forage subdomain to same target as domains", async () => {
			const request = createRequest("forage", "/search");
			await router.fetch(request, env);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("grove-domains.pages.dev/search"),
				}),
			);
		});

		it("routes music subdomain to grovemusic Pages", async () => {
			const request = createRequest("music", "/player");
			await router.fetch(request, env);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("grovemusic.pages.dev/player"),
				}),
			);
		});

		it("routes aria subdomain to same target as music", async () => {
			const request = createRequest("aria", "/library");
			await router.fetch(request, env);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("grovemusic.pages.dev/library"),
				}),
			);
		});

		it("routes status subdomain to grove-clearing Pages", async () => {
			const request = createRequest("status", "/");
			await router.fetch(request, env);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("grove-clearing.pages.dev"),
				}),
			);
		});

		it("routes clearing subdomain to same target as status", async () => {
			const request = createRequest("clearing", "/incidents");
			await router.fetch(request, env);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("grove-clearing.pages.dev/incidents"),
				}),
			);
		});
	});

	// ==========================================================================
	// Subdomain Routing — Workers with Service Bindings
	// ==========================================================================

	describe("Worker routing (Service Bindings)", () => {
		it("routes scout subdomain to scout Worker via public URL when no binding", async () => {
			const request = createRequest("scout", "/api/data");
			await router.fetch(request, env);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("scout.m7jv4v7npb.workers.dev/api/data"),
				}),
			);
		});

		it("routes scout subdomain via Service Binding when available", async () => {
			const mockScoutFetcher = { fetch: vi.fn(async () => new Response("scout-ok")) };
			env.SCOUT = mockScoutFetcher as unknown as Fetcher;

			const request = createRequest("scout", "/api/data");
			const response = await router.fetch(request, env);

			expect(mockScoutFetcher.fetch).toHaveBeenCalled();
			expect(mockFetch).not.toHaveBeenCalled();
			expect(response.status).toBe(200);
		});

		it("routes warden subdomain via Service Binding when available", async () => {
			const mockWardenFetcher = { fetch: vi.fn(async () => new Response("warden-ok")) };
			env.WARDEN = mockWardenFetcher as unknown as Fetcher;

			const request = createRequest("warden", "/api/keys");
			await router.fetch(request, env);

			expect(mockWardenFetcher.fetch).toHaveBeenCalled();
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("routes mycelium subdomain via Service Binding when available", async () => {
			const mockMyceliumFetcher = { fetch: vi.fn(async () => new Response("mycelium-ok")) };
			env.MYCELIUM = mockMyceliumFetcher as unknown as Fetcher;

			const request = createRequest("mycelium", "/events");
			await router.fetch(request, env);

			expect(mockMyceliumFetcher.fetch).toHaveBeenCalled();
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("routes og subdomain via Service Binding when available", async () => {
			const mockOGFetcher = { fetch: vi.fn(async () => new Response("og-ok")) };
			env.OG = mockOGFetcher as unknown as Fetcher;

			const request = createRequest("og", "/embed");
			await router.fetch(request, env);

			expect(mockOGFetcher.fetch).toHaveBeenCalled();
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("routes mc-control subdomain via Service Binding when available", async () => {
			const mockMCFetcher = { fetch: vi.fn(async () => new Response("mc-ok")) };
			env.MC_CONTROL = mockMCFetcher as unknown as Fetcher;

			const request = createRequest("mc-control", "/status");
			await router.fetch(request, env);

			expect(mockMCFetcher.fetch).toHaveBeenCalled();
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("falls back to public fetch when Service Binding is undefined", async () => {
			// Explicitly set binding to undefined (the default)
			env.SCOUT = undefined;

			const request = createRequest("scout", "/api/data");
			await router.fetch(request, env);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("scout.m7jv4v7npb.workers.dev"),
				}),
			);
		});

		it("preserves X-Forwarded-Host when using Service Binding", async () => {
			const mockScoutFetcher = { fetch: vi.fn(async () => new Response("ok")) };
			env.SCOUT = mockScoutFetcher as unknown as Fetcher;

			const request = createRequest("scout", "/api");
			await router.fetch(request, env);

			const proxiedRequest = mockScoutFetcher.fetch.mock.calls[0][0] as Request;
			expect(proxiedRequest.headers.get("x-forwarded-host")).toBe("scout.grove.place");
		});
	});

	// ==========================================================================
	// auth-api Browser vs API Split
	// ==========================================================================

	describe("auth-api routing", () => {
		it("redirects browser requests (Accept: text/html) to login hub", async () => {
			const request = createRequest("auth-api", "/login", {
				headers: { Accept: "text/html,application/xhtml+xml" },
			});
			const response = await router.fetch(request, env);

			expect(response.status).toBe(301);
			expect(response.headers.get("Location")).toBe("https://login.grove.place/login");
		});

		it("proxies API requests (no text/html Accept) to Heartwood", async () => {
			const request = createRequest("auth-api", "/api/token", {
				headers: { Accept: "application/json" },
			});
			await router.fetch(request, env);

			// Should proxy, not redirect
			expect(mockFetch).toHaveBeenCalled();
			const proxiedUrl = (mockFetch.mock.calls[0][0] as Request).url;
			expect(proxiedUrl).toContain("groveauth.m7jv4v7npb.workers.dev/api/token");
		});

		it("proxies API requests via Service Binding when available", async () => {
			const mockAuthFetcher = { fetch: vi.fn(async () => new Response("auth-ok")) };
			env.AUTH_API = mockAuthFetcher as unknown as Fetcher;

			const request = createRequest("auth-api", "/api/verify", {
				headers: { Accept: "application/json" },
			});
			await router.fetch(request, env);

			expect(mockAuthFetcher.fetch).toHaveBeenCalled();
			expect(mockFetch).not.toHaveBeenCalled();
		});

		it("proxies requests with no Accept header (defaults to API behavior)", async () => {
			const request = createRequest("auth-api", "/api/magic-link", {
				method: "POST",
			});
			await router.fetch(request, env);

			// No text/html in Accept → proxy, not redirect
			expect(mockFetch).toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// Reserved Subdomains
	// ==========================================================================

	describe("Reserved subdomains", () => {
		const reservedSubdomains = [
			"pantry",
			"nook",
			"trove",
			"bloom",
			"vista",
			"foliage",
			"mc",
			"search",
			"porch",
			"canopy",
			"chirp",
		];

		for (const sub of reservedSubdomains) {
			it(`routes ${sub} to grove-landing (reserved)`, async () => {
				const request = createRequest(sub, "/");
				await router.fetch(request, env);

				expect(mockFetch).toHaveBeenCalledWith(
					expect.objectContaining({
						url: expect.stringContaining("grove-landing.m7jv4v7npb.workers.dev"),
					}),
				);
			});
		}
	});

	// ==========================================================================
	// Unknown Subdomains → Lattice Engine
	// ==========================================================================

	describe("Unknown subdomain fallback", () => {
		it("routes unknown subdomain to grove-lattice (main engine)", async () => {
			const request = createRequest("autumn", "/blog/hello");
			await router.fetch(request, env);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("grove-lattice.pages.dev/blog/hello"),
				}),
			);
		});

		it("routes arbitrary tenant subdomain to grove-lattice", async () => {
			const request = createRequest("my-cool-blog", "/posts/first");
			await router.fetch(request, env);

			expect(mockFetch).toHaveBeenCalledWith(
				expect.objectContaining({
					url: expect.stringContaining("grove-lattice.pages.dev/posts/first"),
				}),
			);
		});

		it("sets X-Forwarded-Host for tenant subdomain", async () => {
			const request = createRequest("alice", "/");
			await router.fetch(request, env);

			const proxiedRequest = mockFetch.mock.calls[0][0] as Request;
			expect(proxiedRequest.headers.get("x-forwarded-host")).toBe("alice.grove.place");
		});
	});

	// ==========================================================================
	// X-Forwarded-Host Header
	// ==========================================================================

	describe("X-Forwarded-Host", () => {
		it("sets X-Forwarded-Host to original hostname on proxied requests", async () => {
			const request = createRequest("autumn", "/");
			await router.fetch(request, env);

			const proxiedRequest = mockFetch.mock.calls[0][0] as Request;
			expect(proxiedRequest.headers.get("x-forwarded-host")).toBe("autumn.grove.place");
		});

		it("preserves original request headers", async () => {
			const request = createRequest("autumn", "/", {
				headers: { "Accept-Language": "en-US" },
			});
			await router.fetch(request, env);

			const proxiedRequest = mockFetch.mock.calls[0][0] as Request;
			expect(proxiedRequest.headers.get("accept-language")).toBe("en-US");
		});

		it("preserves multiple custom headers", async () => {
			const request = createRequest("autumn", "/", {
				headers: {
					"X-Custom-Header": "custom-value",
					Authorization: "Bearer token123",
					Cookie: "session=abc",
				},
			});
			await router.fetch(request, env);

			const proxiedRequest = mockFetch.mock.calls[0][0] as Request;
			expect(proxiedRequest.headers.get("x-custom-header")).toBe("custom-value");
			expect(proxiedRequest.headers.get("authorization")).toBe("Bearer token123");
			expect(proxiedRequest.headers.get("cookie")).toBe("session=abc");
		});
	});

	// ==========================================================================
	// WWW Redirect
	// ==========================================================================

	describe("www redirect", () => {
		it("redirects www.grove.place to grove.place with 301", async () => {
			const request = createRequest("www", "/about");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(301);
			const location = response.headers.get("location");
			expect(location).toContain("grove.place/about");
			expect(location).not.toContain("www.");
		});

		it("preserves path and query on redirect", async () => {
			const request = new Request("https://www.grove.place/page?key=value#anchor");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(301);
			const location = response.headers.get("location");
			expect(location).toContain("/page");
			expect(location).toContain("key=value");
		});

		it("does not proxy www requests — only redirects", async () => {
			const request = createRequest("www", "/any/path");
			await router.fetch(request, env);

			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// CDN (R2) — Static Assets via CDN Bucket
	// ==========================================================================

	describe("CDN (R2 bucket)", () => {
		it("serves R2 object with correct content-type for images", async () => {
			env.CDN._seedObject("images/photo.jpg", "fake-jpeg-data", "image/jpeg");
			const request = createRequest("cdn", "/images/photo.jpg");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toBe("image/jpeg");
		});

		it("returns 404 for missing R2 key", async () => {
			const request = createRequest("cdn", "/missing/file.png");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(404);
		});

		it("sets Cache-Control to 1 year for immutable assets", async () => {
			env.CDN._seedObject("assets/style.css", "body{}");
			const request = createRequest("cdn", "/assets/style.css");
			const response = await router.fetch(request, env);

			expect(response.headers.get("cache-control")).toBe("public, max-age=31536000");
		});

		it("serves index.html for root path", async () => {
			env.CDN._seedObject("index.html", "<html>Root</html>");
			const request = createRequest("cdn", "/");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(200);
		});

		it("serves index.html for empty path", async () => {
			env.CDN._seedObject("index.html", "<html>Root</html>");
			// Construct URL that results in empty path after stripping /
			const request = new Request("https://cdn.grove.place");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(200);
		});

		it("does NOT proxy CDN requests — serves directly from R2", async () => {
			env.CDN._seedObject("file.txt", "content");
			const request = createRequest("cdn", "/file.txt");
			await router.fetch(request, env);

			expect(mockFetch).not.toHaveBeenCalled();
		});
	});

	// ==========================================================================
	// CDN — Dual Bucket Routing (CDN vs MEDIA)
	// ==========================================================================

	describe("CDN dual bucket routing", () => {
		it("routes user photos to MEDIA bucket", async () => {
			env.MEDIA._seedObject("autumn-primary/photos/avatar.jpg", "jpeg-data");
			const request = createRequest("cdn", "/autumn-primary/photos/avatar.jpg");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(200);
			expect(env.MEDIA.get).toHaveBeenCalledWith("autumn-primary/photos/avatar.jpg");
		});

		it("routes user profile images to MEDIA bucket", async () => {
			env.MEDIA._seedObject("tenant-123/profile/banner.png", "png-data");
			const request = createRequest("cdn", "/tenant-123/profile/banner.png");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(200);
			expect(env.MEDIA.get).toHaveBeenCalledWith("tenant-123/profile/banner.png");
		});

		it("routes UUID tenant photos to MEDIA bucket", async () => {
			env.MEDIA._seedObject("550e8400-e29b-41d4-a716-446655440000/photos/pic.webp", "webp-data");
			const request = createRequest("cdn", "/550e8400-e29b-41d4-a716-446655440000/photos/pic.webp");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(200);
			expect(env.MEDIA.get).toHaveBeenCalled();
		});

		it("routes static assets (fonts) to CDN bucket", async () => {
			env.CDN._seedObject("fonts/inter.woff2", "font-data");
			const request = createRequest("cdn", "/fonts/inter.woff2");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(200);
			expect(env.CDN.get).toHaveBeenCalledWith("fonts/inter.woff2");
		});

		it("routes admin uploads to CDN bucket (no /photos/ or /profile/ segment)", async () => {
			env.CDN._seedObject("admin/logo.png", "png-data");
			const request = createRequest("cdn", "/admin/logo.png");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(200);
			expect(env.CDN.get).toHaveBeenCalledWith("admin/logo.png");
		});

		it("routes top-level files to CDN bucket", async () => {
			env.CDN._seedObject("favicon.ico", "icon-data");
			const request = createRequest("cdn", "/favicon.ico");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(200);
			expect(env.CDN.get).toHaveBeenCalledWith("favicon.ico");
		});
	});

	// ==========================================================================
	// Content-Disposition (XSS Prevention)
	// ==========================================================================

	describe("Content-Disposition", () => {
		it("forces download for JavaScript files", async () => {
			env.CDN._seedObject("script.js", "alert(1)");
			const request = createRequest("cdn", "/script.js");
			const response = await router.fetch(request, env);

			expect(response.headers.get("content-disposition")).toBe("attachment");
		});

		it("forces download for HTML files", async () => {
			env.CDN._seedObject("page.html", "<script>xss</script>");
			const request = createRequest("cdn", "/page.html");
			const response = await router.fetch(request, env);

			expect(response.headers.get("content-disposition")).toBe("attachment");
		});

		it("allows inline display for images", async () => {
			env.CDN._seedObject("photo.jpg", "jpeg-data");
			const request = createRequest("cdn", "/photo.jpg");
			const response = await router.fetch(request, env);

			expect(response.headers.get("content-disposition")).toBe("inline");
		});

		it("allows inline display for PDFs", async () => {
			env.CDN._seedObject("doc.pdf", "pdf-data");
			const request = createRequest("cdn", "/doc.pdf");
			const response = await router.fetch(request, env);

			expect(response.headers.get("content-disposition")).toBe("inline");
		});

		it("allows inline display for WebP images", async () => {
			env.CDN._seedObject("photo.webp", "webp-data");
			const request = createRequest("cdn", "/photo.webp");
			const response = await router.fetch(request, env);

			expect(response.headers.get("content-disposition")).toBe("inline");
		});

		it("allows inline display for GIF images", async () => {
			env.CDN._seedObject("anim.gif", "gif-data");
			const request = createRequest("cdn", "/anim.gif");
			const response = await router.fetch(request, env);

			expect(response.headers.get("content-disposition")).toBe("inline");
		});

		it("allows inline display for PNG images", async () => {
			env.CDN._seedObject("icon.png", "png-data");
			const request = createRequest("cdn", "/icon.png");
			const response = await router.fetch(request, env);

			expect(response.headers.get("content-disposition")).toBe("inline");
		});

		it("allows inline display for fonts", async () => {
			env.CDN._seedObject("font.woff2", "font-data");
			const request = createRequest("cdn", "/font.woff2");
			const response = await router.fetch(request, env);

			expect(response.headers.get("content-disposition")).toBe("inline");
		});

		it("allows inline display for audio", async () => {
			env.CDN._seedObject("song.mp3", "audio-data");
			const request = createRequest("cdn", "/song.mp3");
			const response = await router.fetch(request, env);

			expect(response.headers.get("content-disposition")).toBe("inline");
		});

		it("allows inline display for video", async () => {
			env.CDN._seedObject("clip.mp4", "video-data");
			const request = createRequest("cdn", "/clip.mp4");
			const response = await router.fetch(request, env);

			expect(response.headers.get("content-disposition")).toBe("inline");
		});

		it("allows inline display for SVG (mapped type)", async () => {
			// SVG is in the content-type map as image/svg+xml
			// image/svg+xml is NOT in dangerousTypes, so it gets inline
			env.CDN._seedObject("graphic.svg", "<svg></svg>");
			const request = createRequest("cdn", "/graphic.svg");
			const response = await router.fetch(request, env);

			expect(response.headers.get("content-type")).toBe("image/svg+xml");
			expect(response.headers.get("content-disposition")).toBe("inline");
		});

		it("serves unknown extensions as octet-stream with inline", async () => {
			env.CDN._seedObject("data.xyz", "binary");
			const request = createRequest("cdn", "/data.xyz");
			const response = await router.fetch(request, env);

			expect(response.headers.get("content-type")).toBe("application/octet-stream");
			expect(response.headers.get("content-disposition")).toBe("inline");
		});
	});

	// ==========================================================================
	// Content-Type Detection
	// ==========================================================================

	describe("Content-type detection", () => {
		const contentTypeTests: [string, string][] = [
			["photo.png", "image/png"],
			["photo.jpg", "image/jpeg"],
			["photo.jpeg", "image/jpeg"],
			["photo.gif", "image/gif"],
			["photo.webp", "image/webp"],
			["graphic.svg", "image/svg+xml"],
			["favicon.ico", "image/x-icon"],
			["style.css", "text/css"],
			["app.js", "application/javascript"],
			["data.json", "application/json"],
			["page.html", "text/html; charset=utf-8"],
			["font.ttf", "font/ttf"],
			["font.otf", "font/otf"],
			["font.woff", "font/woff"],
			["font.woff2", "font/woff2"],
			["doc.pdf", "application/pdf"],
			["song.mp3", "audio/mpeg"],
			["clip.mp4", "video/mp4"],
			["clip.webm", "video/webm"],
			["unknown.xyz", "application/octet-stream"],
		];

		for (const [filename, expectedType] of contentTypeTests) {
			it(`detects ${expectedType} for .${filename.split(".").pop()}`, async () => {
				env.CDN._seedObject(filename, "data");
				const request = createRequest("cdn", `/${filename}`);
				const response = await router.fetch(request, env);

				expect(response.headers.get("content-type")).toBe(expectedType);
			});
		}
	});

	// ==========================================================================
	// CORS Validation
	// ==========================================================================

	describe("CORS (validateOrigin)", () => {
		it("accepts grove.place origin on CDN requests", async () => {
			env.CDN._seedObject("file.png", "data");
			const request = createRequest("cdn", "/file.png", {
				headers: { Origin: "https://grove.place" },
			});
			const response = await router.fetch(request, env);

			expect(response.headers.get("access-control-allow-origin")).toBe("https://grove.place");
		});

		it("accepts www.grove.place origin", async () => {
			env.CDN._seedObject("file.png", "data");
			const request = createRequest("cdn", "/file.png", {
				headers: { Origin: "https://www.grove.place" },
			});
			const response = await router.fetch(request, env);

			expect(response.headers.get("access-control-allow-origin")).toBe("https://www.grove.place");
		});

		it("accepts subdomain origins (*.grove.place)", async () => {
			env.CDN._seedObject("file.png", "data");
			const request = createRequest("cdn", "/file.png", {
				headers: { Origin: "https://autumn.grove.place" },
			});
			const response = await router.fetch(request, env);

			expect(response.headers.get("access-control-allow-origin")).toBe(
				"https://autumn.grove.place",
			);
		});

		it("accepts hyphenated subdomain origins", async () => {
			env.CDN._seedObject("file.png", "data");
			const request = createRequest("cdn", "/file.png", {
				headers: { Origin: "https://my-cool-blog.grove.place" },
			});
			const response = await router.fetch(request, env);

			expect(response.headers.get("access-control-allow-origin")).toBe(
				"https://my-cool-blog.grove.place",
			);
		});

		it("rejects non-grove.place origins (falls back to default)", async () => {
			env.CDN._seedObject("file.png", "data");
			const request = createRequest("cdn", "/file.png", {
				headers: { Origin: "https://evil.com" },
			});
			const response = await router.fetch(request, env);

			expect(response.headers.get("access-control-allow-origin")).toBe("https://grove.place");
		});

		it("rejects subdomain-mimicking origins", async () => {
			env.CDN._seedObject("file.png", "data");
			const request = createRequest("cdn", "/file.png", {
				headers: { Origin: "https://evil-grove.place" },
			});
			const response = await router.fetch(request, env);

			// "evil-grove.place" doesn't match *.grove.place pattern
			expect(response.headers.get("access-control-allow-origin")).toBe("https://grove.place");
		});

		it("rejects HTTP origins (only HTTPS allowed)", async () => {
			env.CDN._seedObject("file.png", "data");
			const request = createRequest("cdn", "/file.png", {
				headers: { Origin: "http://autumn.grove.place" },
			});
			const response = await router.fetch(request, env);

			// http:// doesn't match https:// pattern
			expect(response.headers.get("access-control-allow-origin")).toBe("https://grove.place");
		});

		it("falls back to default when no Origin header", async () => {
			env.CDN._seedObject("file.png", "data");
			const request = createRequest("cdn", "/file.png");
			const response = await router.fetch(request, env);

			expect(response.headers.get("access-control-allow-origin")).toBe("https://grove.place");
		});

		it("sets Vary: Origin header", async () => {
			env.CDN._seedObject("file.png", "data");
			const request = createRequest("cdn", "/file.png", {
				headers: { Origin: "https://grove.place" },
			});
			const response = await router.fetch(request, env);

			expect(response.headers.get("vary")).toBe("Origin");
		});
	});

	// ==========================================================================
	// Error Handling
	// ==========================================================================

	describe("Error handling", () => {
		it("returns 400 for non-grove.place domain", async () => {
			const request = new Request("https://evil.com/path");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(400);
		});

		it("returns 400 for bare grove.place (no subdomain, < 3 parts)", async () => {
			const request = new Request("https://grove.place/path");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(400);
		});

		it("returns 502 when proxy fetch fails", async () => {
			mockFetch.mockRejectedValueOnce(new Error("Connection refused"));
			const request = createRequest("autumn", "/");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(502);
		});

		it("returns 502 when Service Binding fetch throws", async () => {
			const mockScoutFetcher = {
				fetch: vi.fn().mockRejectedValueOnce(new Error("Binding error")),
			};
			env.SCOUT = mockScoutFetcher as unknown as Fetcher;

			const request = createRequest("scout", "/api");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(502);
		});
	});

	// ==========================================================================
	// Path Preservation
	// ==========================================================================

	describe("Path preservation", () => {
		it("forwards full path to target", async () => {
			const request = createRequest("autumn", "/blog/my-post/comments");
			await router.fetch(request, env);

			const proxiedUrl = (mockFetch.mock.calls[0][0] as Request).url;
			expect(proxiedUrl).toContain("/blog/my-post/comments");
		});

		it("forwards query parameters", async () => {
			const request = new Request("https://autumn.grove.place/search?q=hello&page=2");
			await router.fetch(request, env);

			const proxiedUrl = (mockFetch.mock.calls[0][0] as Request).url;
			expect(proxiedUrl).toContain("q=hello");
			expect(proxiedUrl).toContain("page=2");
		});

		it("forwards request method", async () => {
			const request = createRequest("autumn", "/api/posts", { method: "POST" });
			await router.fetch(request, env);

			const proxiedRequest = mockFetch.mock.calls[0][0] as Request;
			expect(proxiedRequest.method).toBe("POST");
		});

		it("forwards PUT method", async () => {
			const request = createRequest("autumn", "/api/settings", {
				method: "PUT",
			});
			await router.fetch(request, env);

			const proxiedRequest = mockFetch.mock.calls[0][0] as Request;
			expect(proxiedRequest.method).toBe("PUT");
		});

		it("forwards DELETE method", async () => {
			const request = createRequest("autumn", "/api/posts/1", {
				method: "DELETE",
			});
			await router.fetch(request, env);

			const proxiedRequest = mockFetch.mock.calls[0][0] as Request;
			expect(proxiedRequest.method).toBe("DELETE");
		});

		it("forwards request body reference on POST", async () => {
			// Note: In Node.js (vitest), streaming bodies require duplex: "half" on
			// new Request(). In Cloudflare Workers this isn't needed. We verify the
			// router passes body through by checking the proxy request is constructed
			// with a body-bearing method and the correct content-type header.
			const request = createRequest("autumn", "/api/posts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});
			await router.fetch(request, env);

			const proxiedRequest = mockFetch.mock.calls[0][0] as Request;
			expect(proxiedRequest.method).toBe("POST");
			expect(proxiedRequest.headers.get("content-type")).toBe("application/json");
		});
	});

	// ==========================================================================
	// Redirect Passthrough (manual mode)
	// ==========================================================================

	describe("Redirect passthrough", () => {
		it("passes through redirect responses from upstream without following", async () => {
			mockFetch.mockResolvedValueOnce(
				new Response(null, {
					status: 302,
					headers: { Location: "https://grove.place/redirected" },
				}),
			);

			const request = createRequest("autumn", "/old-page");
			const response = await router.fetch(request, env);

			// The router should return the 302 as-is, not follow it
			expect(response.status).toBe(302);
			expect(response.headers.get("location")).toBe("https://grove.place/redirected");
		});

		it("preserves upstream response headers in proxied response", async () => {
			mockFetch.mockResolvedValueOnce(
				new Response("Cached", {
					status: 200,
					headers: {
						"X-Custom-Response": "custom-value",
						"Cache-Control": "no-cache",
					},
				}),
			);

			const request = createRequest("autumn", "/api/data");
			const response = await router.fetch(request, env);

			expect(response.headers.get("x-custom-response")).toBe("custom-value");
			expect(response.headers.get("cache-control")).toBe("no-cache");
		});

		it("preserves upstream status code", async () => {
			mockFetch.mockResolvedValueOnce(new Response("Not Found", { status: 404 }));

			const request = createRequest("autumn", "/nonexistent");
			const response = await router.fetch(request, env);

			expect(response.status).toBe(404);
		});
	});

	// ==========================================================================
	// Scheduled Handler (Keepalive Cron)
	// ==========================================================================

	describe("Scheduled handler", () => {
		it("logs keepalive message without throwing", async () => {
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			const controller = {} as ScheduledController;
			const ctx = { waitUntil: vi.fn() } as unknown as ExecutionContext;

			await router.scheduled(controller, env, ctx);

			expect(consoleSpy).toHaveBeenCalledWith("[Keepalive] grove-router warm");
			consoleSpy.mockRestore();
		});
	});
});
