import { describe, it, expect, vi } from "vitest";
import { healthHandler } from "./health";

function createMockContext(options?: { dbOk?: boolean; r2Ok?: boolean }): any {
	const dbOk = options?.dbOk ?? true;
	const r2Ok = options?.r2Ok ?? true;

	const boundStatement = {
		first: vi.fn().mockResolvedValue(dbOk ? { ok: 1 } : null),
		all: vi.fn(),
		run: vi.fn(),
		bind: vi.fn().mockReturnThis(),
	};

	return {
		env: {
			METADATA_DB: {
				prepare: vi.fn().mockReturnValue(boundStatement),
			},
			BACKUPS: {
				list: r2Ok
					? vi.fn().mockResolvedValue({ objects: [] })
					: vi.fn().mockRejectedValue(new Error("R2 error")),
			},
		},
		json: vi.fn().mockImplementation((body: any, status?: number) => {
			return new Response(JSON.stringify(body), { status: status || 200 });
		}),
	};
}

describe("healthHandler", () => {
	it("returns 'healthy' when DB and R2 are both ok", async () => {
		const ctx = createMockContext({ dbOk: true, r2Ok: true });
		const response = await healthHandler(ctx);
		const data = JSON.parse(await response.text());

		expect(data.status).toBe("healthy");
		expect(response.status).toBe(200);
		expect(data.checks.worker).toBe(true);
		expect(data.checks.metadataDb).toBe(true);
		expect(data.checks.r2Bucket).toBe(true);
	});

	it("returns 'degraded' when DB fails but R2 works", async () => {
		const ctx = createMockContext({ dbOk: false, r2Ok: true });
		const response = await healthHandler(ctx);
		const data = JSON.parse(await response.text());

		expect(data.status).toBe("degraded");
		expect(response.status).toBe(200);
		expect(data.checks.metadataDb).toBe(false);
		expect(data.checks.r2Bucket).toBe(true);
	});

	it("returns 'degraded' when R2 fails but DB works", async () => {
		const ctx = createMockContext({ dbOk: true, r2Ok: false });
		const response = await healthHandler(ctx);
		const data = JSON.parse(await response.text());

		expect(data.status).toBe("degraded");
		expect(response.status).toBe(200);
		expect(data.checks.metadataDb).toBe(true);
		expect(data.checks.r2Bucket).toBe(false);
	});

	it("returns 'degraded' when both DB and R2 fail (worker always true)", async () => {
		const ctx = createMockContext({ dbOk: false, r2Ok: false });
		const response = await healthHandler(ctx);
		const data = JSON.parse(await response.text());

		// worker check is always true, so anyHealthy is true → "degraded" not "unhealthy"
		expect(data.status).toBe("degraded");
		expect(response.status).toBe(200);
		expect(data.checks.metadataDb).toBe(false);
		expect(data.checks.r2Bucket).toBe(false);
	});

	it("response includes timestamp, version, and checks object", async () => {
		const ctx = createMockContext({ dbOk: true, r2Ok: true });
		const response = await healthHandler(ctx);
		const data = JSON.parse(await response.text());

		expect(data).toHaveProperty("timestamp");
		expect(data).toHaveProperty("version");
		expect(data).toHaveProperty("checks");
		expect(typeof data.timestamp).toBe("string");
		expect(typeof data.version).toBe("string");
	});

	it("checks object always has worker: true", async () => {
		const ctx1 = createMockContext({ dbOk: true, r2Ok: true });
		const response1 = await healthHandler(ctx1);
		const data1 = JSON.parse(await response1.text());

		expect(data1.checks.worker).toBe(true);

		const ctx2 = createMockContext({ dbOk: false, r2Ok: false });
		const response2 = await healthHandler(ctx2);
		const data2 = JSON.parse(await response2.text());

		expect(data2.checks.worker).toBe(true);
	});
});
