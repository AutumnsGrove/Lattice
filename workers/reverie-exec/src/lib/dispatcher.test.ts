import { describe, it, expect, vi } from "vitest";
import { dispatch } from "./dispatcher";
import type { GroveAppClient } from "./client";
import type { ExecRequest } from "../types";

/** Create a mock client that records calls and returns configurable results */
function mockClient(responseOverride?: Partial<Awaited<ReturnType<GroveAppClient["send"]>>>) {
	const calls: Array<{ path: string; method: string; payload: unknown }> = [];
	const client = {
		send: vi.fn(async (call: { path: string; method: string; payload: unknown }) => {
			calls.push(call);
			return { success: true, status: 200, body: {}, ...responseOverride };
		}),
	} as unknown as GroveAppClient;
	return { client, calls };
}

describe("dispatcher", () => {
	it("rejects batch with disallowed field", async () => {
		const { client } = mockClient();
		const request: ExecRequest = {
			request_id: "test-1",
			tenant_id: "tenant-abc",
			changes: [
				{ domain: "foliage.accent", field: "accentColor", value: "#ff0000" },
				{ domain: "infra.billing", field: "tier", value: "oak" },
			],
		};

		const result = await dispatch(request, client);

		expect(result.appliedCount).toBe(0);
		expect(result.failedCount).toBe(2);
		expect(result.steps[1].error).toContain("not in the write allowlist");
	});

	it("dispatches settings-kv fields as individual calls", async () => {
		const { client, calls } = mockClient();
		const request: ExecRequest = {
			request_id: "test-2",
			tenant_id: "tenant-abc",
			changes: [
				{ domain: "foliage.accent", field: "accentColor", value: "#a78bfa" },
				{ domain: "foliage.typography", field: "fontFamily", value: "caveat" },
			],
		};

		const result = await dispatch(request, client);

		expect(result.appliedCount).toBe(2);
		expect(result.failedCount).toBe(0);
		// Each settings-kv field → separate call
		expect(calls).toHaveLength(2);
		expect(calls[0].payload).toEqual({
			setting_key: "accent_color",
			setting_value: "#a78bfa",
		});
		expect(calls[1].payload).toEqual({
			setting_key: "font_family",
			setting_value: "caveat",
		});
	});

	it("merges object-merge fields into a single call", async () => {
		const { client, calls } = mockClient();
		const request: ExecRequest = {
			request_id: "test-3",
			tenant_id: "tenant-abc",
			changes: [
				{ domain: "curios.cursor", field: "cursorType", value: "custom" },
				{ domain: "curios.cursor", field: "preset", value: "leaf" },
				{ domain: "curios.cursor", field: "trailEnabled", value: true },
			],
		};

		const result = await dispatch(request, client);

		expect(result.appliedCount).toBe(3);
		expect(calls).toHaveLength(1);
		expect(calls[0].path).toBe("/api/curios/cursor");
		expect(calls[0].method).toBe("PUT");
		expect(calls[0].payload).toEqual({
			cursorType: "custom",
			preset: "leaf",
			trailEnabled: true,
		});
	});

	it("handles mixed domains in parallel", async () => {
		const { client, calls } = mockClient();
		const request: ExecRequest = {
			request_id: "test-4",
			tenant_id: "tenant-abc",
			changes: [
				{ domain: "foliage.accent", field: "accentColor", value: "#ff0000" },
				{ domain: "curios.cursor", field: "cursorType", value: "custom" },
				{ domain: "social.meadow", field: "meadowOptIn", value: true },
			],
		};

		const result = await dispatch(request, client);

		expect(result.appliedCount).toBe(3);
		expect(result.failedCount).toBe(0);
		// 3 different domains → 3 calls (settings-kv: 1, object-merge: 2)
		expect(calls).toHaveLength(3);
	});

	it("reports per-step failures from API errors", async () => {
		const { client } = mockClient({
			success: false,
			status: 500,
			error: "API returned 500",
		});
		const request: ExecRequest = {
			request_id: "test-5",
			tenant_id: "tenant-abc",
			changes: [{ domain: "foliage.accent", field: "accentColor", value: "#bad" }],
		};

		const result = await dispatch(request, client);

		expect(result.appliedCount).toBe(0);
		expect(result.failedCount).toBe(1);
		expect(result.steps[0].success).toBe(false);
		expect(result.steps[0].error).toBe("API returned 500");
	});

	it("serializes non-string values for settings-kv", async () => {
		const { client, calls } = mockClient();
		const request: ExecRequest = {
			request_id: "test-6",
			tenant_id: "tenant-abc",
			changes: [
				{
					domain: "social.canopy",
					field: "canopyCategories",
					value: ["writing", "queer"],
				},
			],
		};

		const result = await dispatch(request, client);

		expect(result.appliedCount).toBe(1);
		expect(calls[0].payload).toEqual({
			setting_key: "canopy_categories",
			setting_value: '["writing","queer"]',
		});
	});

	it("rejects unknown domains at the allowlist gate", async () => {
		const { client, calls } = mockClient();
		const request: ExecRequest = {
			request_id: "test-7",
			tenant_id: "tenant-abc",
			changes: [{ domain: "nonexistent.domain", field: "anything", value: "test" }],
		};

		// "nonexistent.domain" isn't in the allowlist, so the batch is rejected
		// at step 1 (allowlist) before reaching the endpoint-map (step 2).
		const result = await dispatch(request, client);

		expect(result.failedCount).toBe(1);
		expect(result.appliedCount).toBe(0);
		expect(result.steps[0].error).toContain("not in the write allowlist");
		expect(calls).toHaveLength(0);
	});
});
