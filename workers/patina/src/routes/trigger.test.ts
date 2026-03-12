import { describe, it, expect, vi, beforeEach } from "vitest";
import { triggerHandler } from "./trigger";

vi.mock("../scheduled", () => ({
	handleScheduled: vi.fn().mockResolvedValue(undefined),
}));

function createMockContext(body?: any): any {
	return {
		req: {
			json: vi.fn().mockResolvedValue(body || {}),
		},
		env: {
			METADATA_DB: {
				prepare: vi.fn().mockReturnValue({
					bind: vi.fn().mockReturnThis(),
					run: vi.fn().mockResolvedValue({}),
				}),
			},
			BACKUPS: {},
			RETENTION_WEEKS: "12",
			ALERT_ON_SUCCESS: "false",
			ALERT_ON_FAILURE: "true",
		},
		executionCtx: {
			waitUntil: vi.fn(),
		},
		json: vi
			.fn()
			.mockImplementation(
				(body: any, status?: number) =>
					new Response(JSON.stringify(body), { status: status || 200 }),
			),
	};
}

describe("triggerHandler", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns started response for full backup (no databases specified)", async () => {
		const mockCtx = createMockContext({});
		const response = await triggerHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(response.status).toBe(200);
		expect(body.jobId).toBeDefined();
		expect(body.status).toBe("started");
		expect(body.databases).toBe(14); // Total number of databases
		expect(body.message).toContain("14 database");
	});

	it("returns 400 when specified databases don't match any valid names", async () => {
		const mockCtx = createMockContext({
			databases: ["invalid-db", "not-real"],
		});
		const response = await triggerHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(response.status).toBe(400);
		expect(body.error).toBe("No valid databases specified");
	});

	it("filters to matching databases when specific names given", async () => {
		const mockCtx = createMockContext({
			databases: ["groveauth", "scout-db"],
		});
		const response = await triggerHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(response.status).toBe(200);
		expect(body.status).toBe("started");
		expect(body.databases).toBe(2);
		expect(body.message).toContain("2 database");
	});

	it("filters to single matching database when specified", async () => {
		const mockCtx = createMockContext({
			databases: ["grove-engine-db"],
		});
		const response = await triggerHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(response.status).toBe(200);
		expect(body.status).toBe("started");
		expect(body.databases).toBe(1);
		expect(body.message).toContain("1 database");
	});

	it("calls waitUntil with handleScheduled", async () => {
		const mockCtx = createMockContext({});
		await triggerHandler(mockCtx);

		expect(mockCtx.executionCtx.waitUntil).toHaveBeenCalled();
	});

	it("handles JSON parse errors gracefully (defaults to empty object = full backup)", async () => {
		const mockCtx = {
			req: {
				json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
			},
			env: {
				METADATA_DB: {
					prepare: vi.fn().mockReturnValue({
						bind: vi.fn().mockReturnThis(),
						run: vi.fn().mockResolvedValue({}),
					}),
				},
				BACKUPS: {},
				RETENTION_WEEKS: "12",
				ALERT_ON_SUCCESS: "false",
				ALERT_ON_FAILURE: "true",
			},
			executionCtx: {
				waitUntil: vi.fn(),
			},
			json: vi
				.fn()
				.mockImplementation(
					(body: any, status?: number) =>
						new Response(JSON.stringify(body), { status: status || 200 }),
				),
		};

		const response = await triggerHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(response.status).toBe(200);
		expect(body.status).toBe("started");
		expect(body.databases).toBe(14); // All databases due to parsing error
	});

	it("returns jobId in response", async () => {
		const mockCtx = createMockContext({});
		const response = await triggerHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(body.jobId).toBeDefined();
		// Should be a valid UUID format
		expect(body.jobId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
	});

	it("handles partial match of database names", async () => {
		const mockCtx = createMockContext({
			databases: ["groveauth", "invalid-db"],
		});
		const response = await triggerHandler(mockCtx);
		const body = JSON.parse(await response.text());

		expect(response.status).toBe(200);
		expect(body.databases).toBe(1); // Only groveauth matches
	});
});
