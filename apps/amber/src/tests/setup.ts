import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock SvelteKit modules
vi.mock("$app/navigation", () => ({
	goto: vi.fn(),
	invalidate: vi.fn(),
	invalidateAll: vi.fn(),
	preloadData: vi.fn(),
	preloadCode: vi.fn(),
}));

vi.mock("$app/stores", () => {
	const { readable } = require("svelte/store");
	return {
		page: readable({
			url: new URL("http://localhost"),
			params: {},
			route: { id: "/" },
			status: 200,
			error: null,
			data: {},
			form: null,
		}),
		navigating: readable(null),
		updated: {
			subscribe: vi.fn(),
			check: vi.fn(),
		},
	};
});

vi.mock("$app/environment", () => ({
	browser: true,
	dev: true,
	building: false,
	version: "test",
}));

// Mock environment variables
vi.mock("$env/dynamic/private", () => ({
	env: {
		HEARTWOOD_API_KEY: "test-heartwood-key",
		STRIPE_SECRET_KEY: "test-stripe-key",
	},
}));

vi.mock("$env/static/private", () => ({
	HEARTWOOD_API_KEY: "test-heartwood-key",
	STRIPE_SECRET_KEY: "test-stripe-key",
}));

// Global fetch mock helper
export function mockFetch(response: unknown, status = 200) {
	return vi.fn().mockResolvedValue({
		ok: status >= 200 && status < 300,
		status,
		json: () => Promise.resolve(response),
		text: () => Promise.resolve(JSON.stringify(response)),
	});
}

// D1 mock helper
export function createMockD1() {
	return {
		prepare: vi.fn().mockReturnValue({
			bind: vi.fn().mockReturnThis(),
			run: vi.fn().mockResolvedValue({ success: true }),
			first: vi.fn().mockResolvedValue(null),
			all: vi.fn().mockResolvedValue({ results: [] }),
		}),
		batch: vi.fn().mockResolvedValue([]),
		exec: vi.fn().mockResolvedValue({ success: true }),
	};
}

// R2 mock helper
export function createMockR2() {
	return {
		get: vi.fn().mockResolvedValue(null),
		put: vi.fn().mockResolvedValue({}),
		delete: vi.fn().mockResolvedValue(undefined),
		list: vi.fn().mockResolvedValue({ objects: [], truncated: false }),
		head: vi.fn().mockResolvedValue(null),
	};
}
