import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { afterEach, beforeAll, inject } from "vitest";
import { splitSqlStatements } from "./sql";

/**
 * Applies the real schema and the real seed data to the in-pool databases.
 * Every test file gets a fresh, isolated set — no warm machine required.
 */
beforeAll(async () => {
	const curio = env.CURIO_DB;
	if (!curio) throw new Error("CURIO_DB is not bound in the test pool");

	await applyD1Migrations(env.DB, inject("engineMigrations"));
	await applyD1Migrations(curio, inject("curioMigrations"));

	for (const file of inject("seedSql")) {
		for (const statement of splitSqlStatements(file)) {
			await env.DB.prepare(statement).run();
		}
	}
}, 120_000);

/**
 * Stub state is shared by every test in the run, so a test that made Heartwood
 * unreachable would leave it that way for the next file. Each test starts from
 * the stubs' honest defaults.
 */
afterEach(async () => {
	for (const service of ["auth", "zephyr", "lumen", "pulse"]) {
		await env.STUB_CONTROL.delete(service);
	}
});
