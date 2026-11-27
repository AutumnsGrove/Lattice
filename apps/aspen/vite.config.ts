import { execSync } from "node:child_process";
import { createGroveViteConfig } from "@autumnsgrove/infra/vite";

// Baked in at build time — workerd can't shell out to git at request time
// (no real process spawning in that sandbox), so this has to happen here,
// in the Node context Vite's config file runs in. Only meaningful for local
// dev builds; CI builds for real deployments read the branch they actually
// checked out (main/beta), which is harmless since the beta chip this drives
// only shows on localhost — see +layout.server.ts.
function getGitBranch(): string {
	try {
		return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
	} catch {
		return "";
	}
}

export default createGroveViteConfig({
	// Two peer-variant copies of @sveltejs/kit can land in node_modules; SvelteKit's
	// request store then comes from a different copy than `sequence()`, which fails
	// every request with "Could not get the request store". Dedupe forces one copy
	// for the dev server. (TEMP, dev-stack only — revert if it doesn't help.)
	resolve: {
		dedupe: ["@sveltejs/kit"],
	},
	define: {
		__GIT_BRANCH__: JSON.stringify(getGitBranch()),
	},
});
