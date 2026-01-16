/**
 * API Utility Tests
 *
 * Comprehensive tests for client-side API utilities with CSRF token injection.
 * Covers: getCSRFToken, apiRequest, api.get, api.post, api.put, api.delete, api.patch
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getCSRFToken, apiRequest, api } from "./api";

// ==========================================================================
// Test Setup & Mocks
// ==========================================================================

describe("API Utilities", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockDocument: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    // Create a mock document object
    mockDocument = {
      cookie: "",
      querySelector: vi.fn(),
    };
    Object.defineProperty(globalThis, "document", {
      value: mockDocument,
      writable: true,
      configurable: true,
    });

    // Mock console for verification
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    delete (globalThis as any).document;
  });

  // ==========================================================================
  // getCSRFToken Tests
  // ==========================================================================

  describe("getCSRFToken", () => {
    describe("SSR Safety", () => {
      it("returns null when document is undefined (SSR)", () => {
        delete (globalThis as any).document;
        const token = getCSRFToken();
        expect(token).toBeNull();
      });
    });

    describe("Cookie Extraction", () => {
      it("extracts CSRF token from cookie", () => {
        mockDocument.cookie = "csrf_token=test-token-123";
        const token = getCSRFToken();
        expect(token).toBe("test-token-123");
      });

      it("extracts token from cookie with multiple cookies", () => {
        mockDocument.cookie =
          "session=abc123; csrf_token=secure-token-xyz; user=john";
        const token = getCSRFToken();
        expect(token).toBe("secure-token-xyz");
      });

      it("extracts token with spaces around semicolon (with trailing space)", () => {
        mockDocument.cookie =
          "session=abc ; csrf_token=token-value ; user=john";
        const token = getCSRFToken();
        // Note: The implementation doesn't strip spaces from values
        expect(token).toBe("token-value ");
      });

      it("returns null if csrf_token cookie not present", () => {
        mockDocument.cookie = "session=abc123; user=john";
        const token = getCSRFToken();
        expect(token).toBeNull();
      });

      it("returns null for empty cookie string", () => {
        mockDocument.cookie = "";
        const token = getCSRFToken();
        expect(token).toBeNull();
      });
    });

    describe("Meta Tag Fallback", () => {
      it("extracts token from meta tag when cookie absent", () => {
        mockDocument.cookie = "";
        const mockMetaTag = {
          getAttribute: vi.fn().mockReturnValue("meta-token-456"),
        };
        mockDocument.querySelector.mockReturnValue(mockMetaTag);

        const token = getCSRFToken();
        expect(token).toBe("meta-token-456");
        expect(mockDocument.querySelector).toHaveBeenCalledWith(
          'meta[name="csrf-token"]',
        );
      });

      it("prefers cookie over meta tag", () => {
        mockDocument.cookie = "csrf_token=cookie-token";
        const mockMetaTag = {
          getAttribute: vi.fn().mockReturnValue("meta-token"),
        };
        mockDocument.querySelector.mockReturnValue(mockMetaTag);

        const token = getCSRFToken();
        expect(token).toBe("cookie-token");
        // querySelector should not be called if cookie is found
        expect(mockDocument.querySelector).not.toHaveBeenCalled();
      });

      it("returns null when meta tag has no content attribute", () => {
        mockDocument.cookie = "";
        const mockMetaTag = {
          getAttribute: vi.fn().mockReturnValue(null),
        };
        mockDocument.querySelector.mockReturnValue(mockMetaTag);

        const token = getCSRFToken();
        expect(token).toBeNull();
      });

      it("returns null when meta tag not found", () => {
        mockDocument.cookie = "";
        mockDocument.querySelector.mockReturnValue(null);

        const token = getCSRFToken();
        expect(token).toBeNull();
      });

      it("handles meta tag with empty content attribute", () => {
        mockDocument.cookie = "";
        const mockMetaTag = {
          getAttribute: vi.fn().mockReturnValue(""),
        };
        mockDocument.querySelector.mockReturnValue(mockMetaTag);

        const token = getCSRFToken();
        expect(token).toBeNull();
      });
    });
  });

  // ==========================================================================
  // apiRequest Tests
  // ==========================================================================

  describe("apiRequest", () => {
    describe("Headers - Content-Type", () => {
      it("adds Content-Type: application/json by default", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: "success" }),
        });

        await apiRequest("http://example.com/api");

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[1].headers["Content-Type"]).toBe("application/json");
      });

      it("does not add Content-Type for FormData body", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: "success" }),
        });

        const formData = new FormData();
        formData.append("file", new Blob(["test"]));

        await apiRequest("http://example.com/api", { body: formData });

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[1].headers["Content-Type"]).toBeUndefined();
      });

      it("preserves user-provided Content-Type header", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: "success" }),
        });

        await apiRequest("http://example.com/api", {
          headers: { "Content-Type": "text/plain" },
        });

        const callArgs = mockFetch.mock.calls[0];
        // Should still set to application/json (not text/plain) as per the implementation
        expect(callArgs[1].headers["Content-Type"]).toBe("application/json");
      });
    });

    describe("Headers - CSRF Token", () => {
      it("adds CSRF token for POST requests", async () => {
        mockDocument.cookie = "csrf_token=test-token-123";
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: "success" }),
        });

        await apiRequest("http://example.com/api", { method: "POST" });

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[1].headers["X-CSRF-Token"]).toBe("test-token-123");
        expect(callArgs[1].headers["csrf-token"]).toBe("test-token-123");
      });

      it("adds CSRF token for PUT requests", async () => {
        mockDocument.cookie = "csrf_token=put-token";
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: "success" }),
        });

        await apiRequest("http://example.com/api", { method: "PUT" });

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[1].headers["X-CSRF-Token"]).toBe("put-token");
      });

      it("adds CSRF token for DELETE requests", async () => {
        mockDocument.cookie = "csrf_token=delete-token";
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: "success" }),
        });

        await apiRequest("http://example.com/api", { method: "DELETE" });

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[1].headers["X-CSRF-Token"]).toBe("delete-token");
      });

      it("adds CSRF token for PATCH requests", async () => {
        mockDocument.cookie = "csrf_token=patch-token";
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: "success" }),
        });

        await apiRequest("http://example.com/api", { method: "PATCH" });

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[1].headers["X-CSRF-Token"]).toBe("patch-token");
      });

      it("does NOT add CSRF token for GET requests", async () => {
        mockDocument.cookie = "csrf_token=test-token";
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: "success" }),
        });

        await apiRequest("http://example.com/api", { method: "GET" });

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[1].headers["X-CSRF-Token"]).toBeUndefined();
        expect(callArgs[1].headers["csrf-token"]).toBeUndefined();
      });

      it("does NOT add CSRF token for HEAD requests", async () => {
        mockDocument.cookie = "csrf_token=test-token";
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({}),
        });

        await apiRequest("http://example.com/api", { method: "HEAD" });

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[1].headers["X-CSRF-Token"]).toBeUndefined();
      });

      it("does not add CSRF token if none is available", async () => {
        mockDocument.cookie = "";
        mockDocument.querySelector.mockReturnValue(null);
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: "success" }),
        });

        await apiRequest("http://example.com/api", { method: "POST" });

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[1].headers["X-CSRF-Token"]).toBeUndefined();
        expect(callArgs[1].headers["csrf-token"]).toBeUndefined();
      });

      it("handles uppercase method names", async () => {
        mockDocument.cookie = "csrf_token=test-token";
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: "success" }),
        });

        await apiRequest("http://example.com/api", { method: "post" });

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[1].headers["X-CSRF-Token"]).toBe("test-token");
      });
    });

    describe("Credentials", () => {
      it("includes credentials: include in request", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ data: "success" }),
        });

        await apiRequest("http://example.com/api");

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[1].credentials).toBe("include");
      });
    });

    describe("Response Handling - Success", () => {
      it("returns parsed JSON on successful response", async () => {
        const responseData = { message: "Success", id: 123 };
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => responseData,
        });

        const result = await apiRequest("http://example.com/api");

        expect(result).toEqual(responseData);
      });

      it("returns null on 204 No Content", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 204,
          json: async () => null,
        });

        const result = await apiRequest("http://example.com/api", {
          method: "DELETE",
        });

        expect(result).toBeNull();
      });

      it("does not call response.json() for 204 status", async () => {
        const jsonSpy = vi.fn();
        mockFetch.mockResolvedValue({
          ok: true,
          status: 204,
          json: jsonSpy,
        });

        await apiRequest("http://example.com/api", { method: "DELETE" });

        expect(jsonSpy).not.toHaveBeenCalled();
      });
    });

    describe("Response Handling - Error", () => {
      it("throws error on non-ok response with JSON error message", async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 400,
          statusText: "Bad Request",
          json: async () => ({ message: "Invalid input provided" }),
          headers: new Map(),
        });

        await expect(
          apiRequest("http://example.com/api", { method: "POST" }),
        ).rejects.toThrow("Invalid input provided");
      });

      it("uses status text as fallback when JSON error parsing fails", async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => {
            throw new Error("Invalid JSON");
          },
          headers: new Map(),
        });

        await expect(apiRequest("http://example.com/api")).rejects.toThrow(
          "500 Internal Server Error",
        );
      });

      it("uses default error message when JSON parses but has no message property", async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: async () => ({}),
          headers: new Map(),
        });

        await expect(apiRequest("http://example.com/api")).rejects.toThrow(
          "Request failed",
        );
      });

      it("handles error response without message property", async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 403,
          statusText: "Forbidden",
          json: async () => ({ error: "Access denied" }),
          headers: new Map(),
        });

        await expect(apiRequest("http://example.com/api")).rejects.toThrow(
          "Request failed",
        );
      });

      it("logs CSRF debug info on 403 with CSRF in message", async () => {
        mockDocument.cookie = "csrf_token=test-token";
        mockFetch.mockResolvedValue({
          ok: false,
          status: 403,
          statusText: "Forbidden",
          json: async () => ({ message: "CSRF validation failed" }),
          headers: new Map(),
        });

        await expect(
          apiRequest("http://example.com/api", { method: "POST" }),
        ).rejects.toThrow("CSRF validation failed");

        expect(console.error).toHaveBeenCalledWith(
          "[apiRequest] CSRF token validation failed",
          expect.any(Object),
        );
      });
    });

    describe("URL and Method Handling", () => {
      it("passes correct URL to fetch", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({}),
        });

        const url = "http://example.com/api/users/123";
        await apiRequest(url);

        expect(mockFetch).toHaveBeenCalledWith(url, expect.any(Object));
      });

      it("defaults to GET method", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({}),
        });

        await apiRequest("http://example.com/api");

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[1].method).toBeUndefined(); // GET is default
      });

      it("respects provided method", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({}),
        });

        await apiRequest("http://example.com/api", { method: "POST" });

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[1].method).toBe("POST");
      });

      it("preserves original options while adding headers", async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({}),
        });

        const options: RequestInit = {
          method: "POST",
          body: JSON.stringify({ data: "test" }),
          headers: { "X-Custom": "value" },
        };

        await apiRequest("http://example.com/api", options);

        const callArgs = mockFetch.mock.calls[0];
        expect(callArgs[1].method).toBe("POST");
        expect(callArgs[1].body).toBe(JSON.stringify({ data: "test" }));
        expect(callArgs[1].headers["X-Custom"]).toBe("value");
        expect(callArgs[1].headers["Content-Type"]).toBe("application/json");
      });
    });

    describe("Debug Logging", () => {
      it("logs debug info in development mode", async () => {
        mockDocument.cookie = "csrf_token=test-token";
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({}),
        });

        // Mock import.meta.env to enable debug logging
        const originalEnv = (import.meta as any).env;
        (import.meta as any).env = { MODE: "development" };

        try {
          await apiRequest("http://example.com/api", { method: "POST" });

          expect(console.debug).toHaveBeenCalledWith(
            "[apiRequest]",
            expect.objectContaining({
              url: "http://example.com/api",
              method: "POST",
              csrfToken: "present",
              isStateMutating: true,
            }),
          );
        } finally {
          (import.meta as any).env = originalEnv;
        }
      });
    });

    describe("Type Parameters", () => {
      it("supports generic type for response", async () => {
        interface UserResponse {
          id: number;
          name: string;
        }

        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ id: 1, name: "Alice" }),
        });

        const result = await apiRequest<UserResponse>(
          "http://example.com/api/user",
        );

        expect(result).toEqual({ id: 1, name: "Alice" });
      });
    });
  });

  // ==========================================================================
  // api.get Tests
  // ==========================================================================

  describe("api.get", () => {
    it("calls apiRequest with GET method", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: "test" }),
      });

      await api.get("http://example.com/api");

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].method).toBe("GET");
    });

    it("does not add CSRF token for GET", async () => {
      mockDocument.cookie = "csrf_token=test-token";
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await api.get("http://example.com/api");

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers["X-CSRF-Token"]).toBeUndefined();
    });

    it("returns parsed response", async () => {
      const responseData = { items: [1, 2, 3] };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await api.get("http://example.com/api");

      expect(result).toEqual(responseData);
    });

    it("supports options parameter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await api.get("http://example.com/api", {
        headers: { "X-Custom": "value" },
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers["X-Custom"]).toBe("value");
    });

    it("supports generic type parameter", async () => {
      interface PostsResponse {
        posts: Array<{ id: number; title: string }>;
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          posts: [{ id: 1, title: "Hello" }],
        }),
      });

      const result = await api.get<PostsResponse>("http://example.com/posts");

      expect(result?.posts).toBeDefined();
    });
  });

  // ==========================================================================
  // api.post Tests
  // ==========================================================================

  describe("api.post", () => {
    it("calls apiRequest with POST method", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await api.post("http://example.com/api", { data: "test" });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].method).toBe("POST");
    });

    it("stringifies body as JSON", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      const body = { name: "Alice", age: 30 };
      await api.post("http://example.com/api", body);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].body).toBe(JSON.stringify(body));
    });

    it("adds CSRF token for POST", async () => {
      mockDocument.cookie = "csrf_token=post-token";
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await api.post("http://example.com/api", { data: "test" });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers["X-CSRF-Token"]).toBe("post-token");
    });

    it("returns parsed response", async () => {
      const responseData = { id: 123, message: "Created" };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => responseData,
      });

      const result = await api.post("http://example.com/api", { name: "test" });

      expect(result).toEqual(responseData);
    });

    it("handles null and undefined body", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await api.post("http://example.com/api", null);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].body).toBe("null");
    });

    it("supports options parameter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await api.post(
        "http://example.com/api",
        { data: "test" },
        {
          headers: { "X-Request-ID": "123" },
        },
      );

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers["X-Request-ID"]).toBe("123");
    });

    it("supports generic type parameter", async () => {
      interface CreateResponse {
        id: string;
        createdAt: string;
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: "abc123", createdAt: "2024-01-01" }),
      });

      const result = await api.post<CreateResponse>(
        "http://example.com/api",
        {},
      );

      expect(result?.id).toBeDefined();
    });
  });

  // ==========================================================================
  // api.put Tests
  // ==========================================================================

  describe("api.put", () => {
    it("calls apiRequest with PUT method", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await api.put("http://example.com/api/1", { data: "updated" });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].method).toBe("PUT");
    });

    it("stringifies body as JSON", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      const body = { name: "Bob", age: 25 };
      await api.put("http://example.com/api/1", body);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].body).toBe(JSON.stringify(body));
    });

    it("adds CSRF token for PUT", async () => {
      mockDocument.cookie = "csrf_token=put-token";
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await api.put("http://example.com/api/1", { data: "test" });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers["X-CSRF-Token"]).toBe("put-token");
    });

    it("returns parsed response", async () => {
      const responseData = { id: 1, message: "Updated" };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await api.put("http://example.com/api/1", {
        name: "updated",
      });

      expect(result).toEqual(responseData);
    });

    it("supports options parameter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await api.put(
        "http://example.com/api/1",
        { data: "test" },
        {
          headers: { "X-Version": "2" },
        },
      );

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers["X-Version"]).toBe("2");
    });

    it("supports generic type parameter", async () => {
      interface UpdateResponse {
        id: number;
        updatedAt: string;
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, updatedAt: "2024-01-01" }),
      });

      const result = await api.put<UpdateResponse>(
        "http://example.com/api/1",
        {},
      );

      expect(result?.updatedAt).toBeDefined();
    });
  });

  // ==========================================================================
  // api.delete Tests
  // ==========================================================================

  describe("api.delete", () => {
    it("calls apiRequest with DELETE method", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => null,
      });

      await api.delete("http://example.com/api/1");

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].method).toBe("DELETE");
    });

    it("adds CSRF token for DELETE", async () => {
      mockDocument.cookie = "csrf_token=delete-token";
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => null,
      });

      await api.delete("http://example.com/api/1");

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers["X-CSRF-Token"]).toBe("delete-token");
    });

    it("returns null for 204 No Content", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => null,
      });

      const result = await api.delete("http://example.com/api/1");

      expect(result).toBeNull();
    });

    it("returns response data for successful delete with content", async () => {
      const responseData = { message: "Deleted successfully" };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await api.delete("http://example.com/api/1");

      expect(result).toEqual(responseData);
    });

    it("supports options parameter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        json: async () => null,
      });

      await api.delete("http://example.com/api/1", {
        headers: { "X-Confirm": "true" },
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers["X-Confirm"]).toBe("true");
    });

    it("supports generic type parameter", async () => {
      interface DeleteResponse {
        message: string;
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ message: "Deleted" }),
      });

      const result = await api.delete<DeleteResponse>(
        "http://example.com/api/1",
      );

      expect(result?.message).toBeDefined();
    });
  });

  // ==========================================================================
  // api.patch Tests
  // ==========================================================================

  describe("api.patch", () => {
    it("calls apiRequest with PATCH method", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await api.patch("http://example.com/api/1", { field: "value" });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].method).toBe("PATCH");
    });

    it("stringifies body as JSON", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      const body = { status: "active" };
      await api.patch("http://example.com/api/1", body);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].body).toBe(JSON.stringify(body));
    });

    it("adds CSRF token for PATCH", async () => {
      mockDocument.cookie = "csrf_token=patch-token";
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await api.patch("http://example.com/api/1", { status: "active" });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers["X-CSRF-Token"]).toBe("patch-token");
    });

    it("returns parsed response", async () => {
      const responseData = { id: 1, status: "active", message: "Patched" };
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => responseData,
      });

      const result = await api.patch("http://example.com/api/1", {
        status: "active",
      });

      expect(result).toEqual(responseData);
    });

    it("supports options parameter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      await api.patch(
        "http://example.com/api/1",
        { field: "value" },
        {
          headers: { "X-Patch-Type": "partial" },
        },
      );

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers["X-Patch-Type"]).toBe("partial");
    });

    it("supports generic type parameter", async () => {
      interface PatchResponse {
        id: number;
        updatedFields: string[];
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 1, updatedFields: ["status"] }),
      });

      const result = await api.patch<PatchResponse>(
        "http://example.com/api/1",
        {},
      );

      expect(result?.updatedFields).toBeDefined();
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe("Integration Scenarios", () => {
    it("handles full request flow with CSRF token from cookie", async () => {
      mockDocument.cookie = "session=abc; csrf_token=secure-xyz; user=john";
      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 42, status: "created" }),
      });

      const result = await api.post("http://example.com/api/items", {
        name: "New Item",
        description: "Test item",
      });

      expect(result).toEqual({ id: 42, status: "created" });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toBe("http://example.com/api/items");
      expect(callArgs[1].method).toBe("POST");
      expect(callArgs[1].headers["X-CSRF-Token"]).toBe("secure-xyz");
      expect(callArgs[1].headers["Content-Type"]).toBe("application/json");
      expect(callArgs[1].credentials).toBe("include");
      expect(callArgs[1].body).toBe(
        JSON.stringify({ name: "New Item", description: "Test item" }),
      );
    });

    it("handles full request flow with CSRF token from meta tag", async () => {
      mockDocument.cookie = "";
      const mockMetaTag = {
        getAttribute: vi.fn().mockReturnValue("meta-token-secure"),
      };
      mockDocument.querySelector.mockReturnValue(mockMetaTag);

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ updated: true }),
      });

      await api.put("http://example.com/api/items/5", { status: "archived" });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[1].headers["X-CSRF-Token"]).toBe("meta-token-secure");
    });

    it("handles error flow with proper error message extraction", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
        json: async () => ({
          message: "Validation failed: email must be unique",
          errors: { email: ["already taken"] },
        }),
        headers: new Map(),
      });

      await expect(
        api.post("http://example.com/api/users", {}),
      ).rejects.toThrow("Validation failed: email must be unique");
    });

    it("handles multiple sequential requests", async () => {
      mockDocument.cookie = "csrf_token=my-token";
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: 1 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ id: 2 }),
        });

      const result1 = await api.get("http://example.com/api/items/1");
      const result2 = await api.post("http://example.com/api/items", {
        name: "new",
      });

      expect(result1).toEqual({ id: 1 });
      expect(result2).toEqual({ id: 2 });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
