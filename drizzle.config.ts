import { defineConfig } from "drizzle-kit";

export default defineConfig({
	// Engine DB is the primary migration target.
	// Curios and Observability have their own config files if needed.
	schema: "./libs/engine/src/lib/server/db/schema/engine.ts",
	out: "./libs/engine/migrations",
	dialect: "sqlite",
});
