import { execSync } from "node:child_process";
import { createGroveViteConfig } from "@autumnsgrove/infra/vite";

// Baked in at build time — same as apps/aspen/vite.config.ts. Only meaningful
// for local dev builds; drives the beta chip in arbor/+layout.svelte, which
// only shows on localhost — see arbor/+layout.server.ts.
function getGitBranch(): string {
	try {
		return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
	} catch {
		return "";
	}
}

export default createGroveViteConfig({
	define: {
		__GIT_BRANCH__: JSON.stringify(getGitBranch()),
	},
	optimizeDeps: {
		exclude: ["workers-og", "@autumnsgrove/gossamer"],
	},
	build: {
		rollupOptions: {
			external: ["workers-og"],
		},
	},
	ssr: {
		// These packages ship .svelte files that need processing during SSR
		noExternal: ["lucide-svelte", "@autumnsgrove/gossamer"],
	},
});
