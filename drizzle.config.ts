import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./libs/engine/src/lib/server/db/schema/engine.ts",
	out: "./libs/engine/migrations",
	dialect: "sqlite",
});
