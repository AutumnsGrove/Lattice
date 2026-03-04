/**
 * Client-side API utility with automatic CSRF token injection
 * Provides fetch wrapper with security headers and error handling
 */

/**
 * Get CSRF token from cookie or meta tag
 */
export function getCSRFToken(): string | null {
	if (typeof document === "undefined") return null; // SSR safety

	// Try cookie first
	const cookieToken = document.cookie
		.split("; ")
		.find((row) => row.startsWith("csrf_token="))
		?.split("=")[1];

	if (cookieToken) return cookieToken;

	// Fallback to meta tag
	const metaTag = document.querySelector('meta[name="csrf-token"]');
	return metaTag?.getAttribute("content") || null;
}

/**
 * Fetch wrapper with automatic CSRF token injection
 */

export async function apiRequest<T = any>(
	url: string,
	options: RequestInit = {},
): Promise<T | null> {
	const csrfToken = getCSRFToken();
	const method = options.method?.toUpperCase() || "GET";
	const isStateMutating = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

	// Debug logging
	if (typeof console !== "undefined" && import.meta.env?.MODE !== "production") {
		console.debug("[apiRequest]", {
			url,
			method,
			csrfToken: csrfToken ? "present" : "missing",
			isStateMutating,
		});
	}

	// Build headers - don't set Content-Type for FormData (browser sets it with boundary)
	const headers: Record<string, string> = {
		Accept: "application/json",
		...((options.headers as Record<string, string>) || {}),
	};

	// Only add Content-Type if not FormData
	if (!(options.body instanceof FormData)) {
		headers["Content-Type"] = "application/json";
	}

	// Add CSRF token for state-changing requests
	if (isStateMutating && csrfToken) {
		headers["X-CSRF-Token"] = csrfToken;
		headers["csrf-token"] = csrfToken; // fallback header
	}

	const response = await fetch(url, {
		...options,
		headers,
		credentials: "include", // Include cookies
	});

	if (!response.ok) {
		let errorMessage = "Request failed";
		let errorCode: string | undefined;
		try {
			const body = (await response.json()) as {
				message?: string;
				error?: string;
				error_description?: string;
				error_code?: string;
			};
			// Prefer error_description (buildErrorJson / OAuth), then message,
			// then error (Fireside / manual API responses).
			errorMessage = body.error_description || body.message || body.error || errorMessage;
			errorCode = body.error_code;
		} catch {
			errorMessage = `${response.status} ${response.statusText}`;
		}
		// Include CSRF debug info
		if (response.status === 403 && errorMessage.includes("CSRF")) {
			console.error("[apiRequest] CSRF token validation failed", {
				csrfToken: csrfToken ? "present" : "missing",
				url,
			});
		}
		// Append structured error code when present (Signpost convention)
		const fullMessage = errorCode ? `${errorMessage} (${errorCode})` : errorMessage;
		throw new Error(fullMessage);
	}

	// Handle empty responses (204 No Content)
	if (response.status === 204) {
		return null;
	}

	return response.json();
}

/**
 * Convenience methods for common HTTP verbs
 */

export const api = {
	/** GET request */
	get: <T = any>(url: string, options: RequestInit = {}) =>
		apiRequest<T>(url, { ...options, method: "GET" }),

	/** POST request */
	post: <T = any>(url: string, body: unknown, options: RequestInit = {}) =>
		apiRequest<T>(url, {
			...options,
			method: "POST",
			body: JSON.stringify(body),
		}),

	/** PUT request */
	put: <T = any>(url: string, body: unknown, options: RequestInit = {}) =>
		apiRequest<T>(url, {
			...options,
			method: "PUT",
			body: JSON.stringify(body),
		}),

	/** DELETE request */
	delete: <T = any>(url: string, options: RequestInit = {}) =>
		apiRequest<T>(url, { ...options, method: "DELETE" }),

	/** PATCH request */
	patch: <T = any>(url: string, body: unknown, options: RequestInit = {}) =>
		apiRequest<T>(url, {
			...options,
			method: "PATCH",
			body: JSON.stringify(body),
		}),
};
