# Beaver Build — Test Templates Reference

## Test File Location Convention

Keep tests close to the code they test:

```
src/
└── lib/
    └── features/
        └── auth/
            ├── login.ts
            ├── login.test.ts      ← Right next to the code
            └── register.ts
```

## SvelteKit Service Unit Test

```typescript
// src/lib/services/password-reset.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createResetToken, validateResetToken } from "./password-reset";

describe("password-reset service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("createResetToken", () => {
		it("should generate a token for a valid user", async () => {
			// Arrange
			const userId = "user-123";

			// Act
			const token = await createResetToken(userId);

			// Assert
			expect(token).toBeTruthy();
			expect(typeof token).toBe("string");
			expect(token.length).toBeGreaterThan(20);
		});

		it("should store the token with expiry", async () => {
			// Arrange
			const userId = "user-123";

			// Act
			await createResetToken(userId);

			// Assert — verify DB was written (use a test DB or mock at boundary)
			const stored = await getStoredToken(userId);
			expect(stored).not.toBeNull();
			expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
		});
	});

	describe("validateResetToken", () => {
		it("should return userId for a valid token", async () => {
			const userId = "user-456";
			const token = await createResetToken(userId);

			const result = await validateResetToken(token);

			expect(result).toBe(userId);
		});

		it("should return null for an expired token", async () => {
			// Use a token that was created with a past expiry
			const expiredToken = await createExpiredToken("user-789");

			const result = await validateResetToken(expiredToken);

			expect(result).toBeNull();
		});

		it("should return null for an unknown token", async () => {
			const result = await validateResetToken("nonexistent-token");

			expect(result).toBeNull();
		});
	});
});
```

## SvelteKit API Route Test

```typescript
// src/routes/api/auth/reset-request/+server.test.ts
import { describe, it, expect, vi } from "vitest";
import { POST } from "./+server";
import { createMockRequest, createMockLocals } from "$lib/test-utils";

// Mock only external boundary (email sending)
vi.mock("$lib/services/email", () => ({
	sendResetEmail: vi.fn().mockResolvedValue(undefined),
}));

describe("POST /api/auth/reset-request", () => {
	it("should return success for a valid email", async () => {
		// Arrange
		const request = createMockRequest("POST", { email: "user@example.com" });
		const locals = createMockLocals({ user: null });

		// Act
		const response = await POST({ request, locals } as any);
		const data = await response.json();

		// Assert
		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});

	it("should return success even for unknown email (prevents enumeration)", async () => {
		// Arrange
		const request = createMockRequest("POST", { email: "nobody@example.com" });

		// Act
		const response = await POST({ request, locals: {} } as any);
		const data = await response.json();

		// Assert — same response regardless of whether email exists
		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
	});

	it("should return Signpost error for invalid input", async () => {
		// Arrange
		const request = createMockRequest("POST", { email: "not-an-email" });

		// Act
		const response = await POST({ request, locals: {} } as any);
		const data = await response.json();

		// Assert — verify Signpost error format
		expect(response.status).toBe(400);
		expect(data.error_code).toMatch(/^GROVE-API-\d{3}$/);
		expect(data.error).toBeDefined();
		expect(data.error_description).toBeDefined();
	});
});
```

## SvelteKit Component Test (Testing Library)

```typescript
// src/routes/reset-password/ResetForm.test.ts
import { render, fireEvent, waitFor, screen } from "@testing-library/svelte";
import { describe, it, expect, vi } from "vitest";
import ResetForm from "./ResetForm.svelte";

// Mock the fetch at the network boundary
global.fetch = vi.fn();

describe("ResetForm", () => {
	it("should show loading state while submitting", async () => {
		// Arrange
		(fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves
		render(ResetForm);

		// Act
		await fireEvent.input(screen.getByLabelText("Email"), {
			target: { value: "user@example.com" },
		});
		await fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

		// Assert
		expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();
	});

	it("should show success message after submission", async () => {
		// Arrange
		(fetch as any).mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
		render(ResetForm);

		// Act
		await fireEvent.input(screen.getByLabelText("Email"), {
			target: { value: "user@example.com" },
		});
		await fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

		// Assert
		await waitFor(() => {
			expect(screen.getByText(/check your email/i)).toBeInTheDocument();
		});
	});

	it("should validate email format before submitting", async () => {
		// Arrange
		render(ResetForm);

		// Act
		await fireEvent.input(screen.getByLabelText("Email"), {
			target: { value: "not-an-email" },
		});
		await fireEvent.click(screen.getByRole("button", { name: /send/i }));

		// Assert — fetch not called, inline error shown
		expect(fetch).not.toHaveBeenCalled();
		expect(screen.getByText(/valid email/i)).toBeInTheDocument();
	});
});
```

## Integration Test (Full Flow)

```typescript
// src/lib/services/password-reset.integration.test.ts
import { describe, it, expect } from "vitest";

describe("password reset flow", () => {
	it("should complete the full reset flow", async () => {
		// Arrange
		const email = "test@example.com";
		await createTestUser(email);

		// 1. Request reset
		const requestResponse = await fetch("/api/auth/reset-request", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		});
		expect(requestResponse.ok).toBe(true);

		// 2. Get token from test database
		const token = await getLatestResetToken(email);
		expect(token).toBeTruthy();

		// 3. Confirm reset
		const confirmResponse = await fetch("/api/auth/reset-confirm", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token, newPassword: "newSecurePass123" }),
		});
		expect(confirmResponse.ok).toBe(true);

		// 4. Verify new password works
		const loginResult = await loginWith(email, "newSecurePass123");
		expect(loginResult.success).toBe(true);

		// 5. Verify token is consumed (single-use)
		const reuse = await fetch("/api/auth/reset-confirm", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token, newPassword: "anotherPassword" }),
		});
		expect(reuse.ok).toBe(false);
	});
});
```

## Testing Rootwork Boundaries

Rootwork (`@autumnsgrove/lattice/server`) provides type-safe parsing at trust boundaries. Test that both valid and invalid data flow correctly:

```typescript
import {
	parseFormData,
	safeJsonParse,
	createTypedCacheReader,
	isRedirect,
	isHttpError,
} from "@autumnsgrove/lattice/server";

// Test parseFormData validation
it("rejects missing required fields", async () => {
	const formData = new FormData(); // missing required "email"
	const result = parseFormData(formData, EmailSchema);
	expect(result.success).toBe(false);
	expect(result.errors.email).toBeDefined();
});

// Test parseFormData with wrong types
it("returns validation errors for wrong field types", async () => {
	const formData = new FormData();
	formData.append("age", "not-a-number");
	const result = parseFormData(formData, UserSchema);
	expect(result.success).toBe(false);
	expect(result.errors.age).toBeDefined();
});

// Test safeJsonParse validation
it("returns null for invalid JSON shape", () => {
	const result = safeJsonParse('{"wrong": "shape"}', ExpectedSchema);
	expect(result).toBeNull();
});

// Test safeJsonParse with fallback
it("uses fallback when KV returns corrupted data", async () => {
	const mockKV = { get: vi.fn().mockResolvedValue("invalid json") };
	const cache = createTypedCacheReader(mockKV, CacheSchema, { default: {} });
	const data = await cache.read("key");
	expect(data).toEqual({}); // Falls back to default
});

// Test isRedirect/isHttpError type guards
it("re-throws redirects in catch blocks", async () => {
	try {
		throw new Response(null, { status: 302, statusText: "Found" });
	} catch (err) {
		if (isRedirect(err)) {
			// Properly typed as redirect
			expect(err.status).toBe(302);
		}
	}
});

it("catches HTTP errors but not redirects", async () => {
	const httpError = new Response(null, { status: 500 });
	const redirect = new Response(null, { status: 302 });

	expect(isHttpError(httpError)).toBe(true);
	expect(isHttpError(redirect)).toBe(false);
});
```

## Test Self-Review Checklist

Before considering tests "done":

```
[ ] Tests describe user behavior, not implementation
[ ] Each test has one clear reason to fail
[ ] Tests use accessible queries (getByRole, getByLabelText)
[ ] Mocks are limited to external boundaries
[ ] Test names explain what breaks when they fail
[ ] No snapshot tests for volatile content
[ ] Bug fixes include regression tests
[ ] Tests run fast (seconds, not minutes)
[ ] Signpost error codes verified in API error tests
[ ] Rootwork boundaries tested (valid and invalid data)
```

## Quick Decision Guide

| Situation          | Layer       | Approach                                            |
| ------------------ | ----------- | --------------------------------------------------- |
| New feature        | Integration | Test user-facing behavior                           |
| Bug fix            | Integration | Write test that reproduces bug first                |
| Refactoring        | All         | Run existing tests; bad tests break on safe changes |
| "More coverage"    | Integration | Add tests for uncovered **behavior**, not lines     |
| Pure function      | Unit        | Test inputs → outputs directly                      |
| API endpoint       | Integration | Mock only external services                         |
| UI component       | Component   | Testing Library with accessible queries             |
| Critical user flow | E2E         | Playwright, but only for truly critical paths       |
