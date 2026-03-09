import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./libs/engine/src/lib/server/db/schema/observability.ts",
	out: "./libs/engine/observability-migrations",
	dialect: "sqlite",
});
