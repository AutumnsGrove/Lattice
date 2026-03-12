import { describe, it, expect, vi } from "vitest";
import { downloadHandler } from "./download";

function createMockContext(date?: string, db?: string, r2Object?: any): any {
	return {
		req: {
			param: vi.fn().mockImplementation((name: string) => {
				if (name === "date") return date;
				if (name === "db") return db;
				return undefined;
			}),
		},
		env: {
			BACKUPS: {
				get: vi.fn().mockResolvedValue(r2Object || null),
			},
		},
		json: vi.fn().mockImplementation((body: any, status?: number) => {
			return new Response(JSON.stringify(body), { status: status || 200 });
		}),
	};
}

describe("downloadHandler", () => {
	it("returns 400 when date is missing", async () => {
		const ctx = createMockContext(undefined, "groveauth");
		const response = await downloadHandler(ctx);
		const data = JSON.parse(await response.text());

		expect(response.status).toBe(400);
		expect(data.error).toContain("Missing");
	});

	it("returns 400 when db is missing", async () => {
		const ctx = createMockContext("2026-03-12", undefined);
		const response = await downloadHandler(ctx);
		const data = JSON.parse(await response.text());

		expect(response.status).toBe(400);
		expect(data.error).toContain("Missing");
	});

	it("returns 404 when backup not found in R2", async () => {
		const ctx = createMockContext("2026-03-12", "groveauth", null);
		const response = await downloadHandler(ctx);
		const data = JSON.parse(await response.text());

		expect(response.status).toBe(404);
		expect(data.error).toContain("not found");
	});

	it("returns SQL file with correct content-type and content-disposition headers", async () => {
		const mockR2Object = {
			body: "CREATE TABLE test (id INT);",
			size: 28,
		};
		const ctx = createMockContext("2026-03-12", "groveauth", mockR2Object);
		const response = await downloadHandler(ctx);

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toBe("application/sql");
		expect(response.headers.get("Content-Disposition")).toContain("attachment");
		expect(response.headers.get("Content-Disposition")).toContain("groveauth-2026-03-12.sql");
		expect(response.headers.get("Content-Length")).toBe("28");
	});

	it("constructs correct R2 key from date and db params", async () => {
		const mockR2Object = {
			body: "SELECT 1;",
			size: 9,
		};
		const ctx = createMockContext("2026-03-12", "test-db", mockR2Object);
		await downloadHandler(ctx);

		expect(ctx.env.BACKUPS.get).toHaveBeenCalledWith("2026-03-12/test-db.sql");
	});

	it("returns file body in response", async () => {
		const testContent = "CREATE TABLE users (id INT PRIMARY KEY);";
		const mockR2Object = {
			body: testContent,
			size: testContent.length,
		};
		const ctx = createMockContext("2026-03-12", "groveauth", mockR2Object);
		const response = await downloadHandler(ctx);
		const bodyText = await response.text();

		expect(bodyText).toBe(testContent);
	});
});
