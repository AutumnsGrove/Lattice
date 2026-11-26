import { readD1Migrations } from "@cloudflare/vitest-plugin";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { TestProject } from "vitest/node";

/**
 * Reads migrations and seed SQL in Node, where `fs` exists, so the in-workerd
 * setup file can apply them.
 *
 * Both come from the same files the real thing uses: migrations from the
 * directories Aspen's wrangler config points at, seeds from `scripts/db` in the
 * order `dev-stack.sh seed blog` applies them. A test that asserts against its
 * own private fixtures proves the fixtures work, not the product.
 */
const SEED_FILES = [
	"seed-midnight-bloom.sql",
	"add-midnight-bloom-pages.sql",
	"fix-midnight-bloom-content.sql",
	"seed-tenant-002.sql",
	"seed-tenant-003.sql",
	"seed-upload-unsuspend.sql",
	"seed-empty-grove.sql",
];

export default async function setup(project: TestProject) {
	const repo = path.resolve(__dirname, "../../..");

	project.provide(
		"engineMigrations",
		await readD1Migrations({
			projectPath: path.join(repo, "libs/engine/migrations"),
			migrationsDir: ".",
			migrationsPattern: "*.sql",
		}),
	);
	project.provide(
		"curioMigrations",
		await readD1Migrations({
			projectPath: path.join(repo, "libs/engine/migrations/curios"),
			migrationsDir: ".",
			migrationsPattern: "*.sql",
		}),
	);

	const seeds = await Promise.all(
		SEED_FILES.map((name) => readFile(path.join(repo, "scripts/db", name), "utf-8")),
	);
	project.provide("seedSql", seeds);
}

declare module "vitest" {
	export interface ProvidedContext {
		engineMigrations: { name: string; queries: string[] }[];
		curioMigrations: { name: string; queries: string[] }[];
		seedSql: string[];
	}
}
