import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: "./libs/engine/src/lib/server/db/schema/curios.ts",
	out: "./libs/engine/curios-migrations",
	dialect: "sqlite",
});
