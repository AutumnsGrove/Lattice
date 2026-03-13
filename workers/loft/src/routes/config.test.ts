import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import { configRoute } from "./config";
import type { Env, AppVariables } from "../types";

vi.mock("../lib/schema", () => ({
	initializeSchema: vi.fn().mockResolvedValue(undefined),
}));

function createTestApp() {
	const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();
	app.route("/config", configRoute);
	return app;
}

function createMockEnv(sshKeyValue: string | null = null): Env {
	const stmt = {
		bind: vi.fn().mockReturnThis(),
		first: vi.fn().mockResolvedValue(sshKeyValue ? { value: sshKeyValue } : null),
		run: vi.fn().mockResolvedValue({ success: true }),
	};

	return {
		DB: {
			prepare: vi.fn().mockReturnValue(stmt),
			batch: vi.fn().mockResolvedValue([]),
		} as any,
		LOFT_STATE: {} as any,
		WARDEN: { fetch: vi.fn() } as any,
		LOFT_API_KEY: "key",
		WARDEN_API_KEY: "key",
	};
}

describe("config routes", () => {
	describe("GET /config/ssh-key", () => {
		it("returns null when no key stored", async () => {
			const app = createTestApp();
			const env = createMockEnv(null);

			const res = await app.request("/config/ssh-key", { method: "GET" }, env);

			expect(res.status).toBe(200);
			const json = (await res.json()) as any;
			expect(json.success).toBe(true);
			expect(json.data.sshKey).toBeNull();
		});

		it("returns stored key value", async () => {
			const app = createTestApp();
			const storedKey = "ssh-rsa AAAAB3NzaC1yc2EA...";
			const env = createMockEnv(storedKey);

			const res = await app.request("/config/ssh-key", { method: "GET" }, env);

			expect(res.status).toBe(200);
			const json = (await res.json()) as any;
			expect(json.success).toBe(true);
			expect(json.data.sshKey).toBe(storedKey);
		});
	});

	describe("PUT /config/ssh-key", () => {
		it("stores valid ssh-rsa key → 200", async () => {
			const app = createTestApp();
			const env = createMockEnv(null);
			const sshKey = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC7...";

			const res = await app.request(
				"/config/ssh-key",
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ssh_key: sshKey }),
				},
				env,
			);

			expect(res.status).toBe(200);
			const json = (await res.json()) as any;
			expect(json.success).toBe(true);
			expect(json.data.stored).toBe(true);
		});

		it("stores valid ssh-ed25519 key → 200", async () => {
			const app = createTestApp();
			const env = createMockEnv(null);
			const sshKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG...";

			const res = await app.request(
				"/config/ssh-key",
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ssh_key: sshKey }),
				},
				env,
			);

			expect(res.status).toBe(200);
			const json = (await res.json()) as any;
			expect(json.success).toBe(true);
		});

		it("stores valid ecdsa-sha2 key → 200", async () => {
			const app = createTestApp();
			const env = createMockEnv(null);
			const sshKey = "ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTY...";

			const res = await app.request(
				"/config/ssh-key",
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ssh_key: sshKey }),
				},
				env,
			);

			expect(res.status).toBe(200);
			const json = (await res.json()) as any;
			expect(json.success).toBe(true);
		});

		it("rejects missing ssh_key → 400 INVALID_KEY", async () => {
			const app = createTestApp();
			const env = createMockEnv(null);

			const res = await app.request(
				"/config/ssh-key",
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({}),
				},
				env,
			);

			expect(res.status).toBe(400);
			const json = (await res.json()) as any;
			expect(json.success).toBe(false);
			expect(json.error.code).toBe("INVALID_KEY");
		});

		it("rejects non-string ssh_key → 400 INVALID_KEY", async () => {
			const app = createTestApp();
			const env = createMockEnv(null);

			const res = await app.request(
				"/config/ssh-key",
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ssh_key: 12345 }),
				},
				env,
			);

			expect(res.status).toBe(400);
			const json = (await res.json()) as any;
			expect(json.success).toBe(false);
			expect(json.error.code).toBe("INVALID_KEY");
		});

		it("rejects invalid format (doesn't start with ssh- or ecdsa-) → 400 INVALID_KEY_FORMAT", async () => {
			const app = createTestApp();
			const env = createMockEnv(null);

			const res = await app.request(
				"/config/ssh-key",
				{
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ ssh_key: "invalid-format-key" }),
				},
				env,
			);

			expect(res.status).toBe(400);
			const json = (await res.json()) as any;
			expect(json.success).toBe(false);
			expect(json.error.code).toBe("INVALID_KEY_FORMAT");
		});
	});
});
