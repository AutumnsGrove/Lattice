import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeAll, inject } from "vitest";
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
