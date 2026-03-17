/**
 * Vite plugin for Showroom dynamic component mounting.
 *
 * Exposes middleware endpoints that the showcase page uses:
 * - GET /api/showroom/mount?component=path  — set the active component
 * - GET /api/showroom/status               — check current state
 * - GET /api/showroom/component.js         — dynamic module that exports the active component
 * - GET /api/showroom/fixture              — fixture data for the active component
 *
 * When the component path changes, the plugin triggers a full reload so
 * Vite re-resolves the component module with full HMR support for subsequent edits.
 */

import type { Plugin, ViteDevServer } from "vite";
import path from "node:path";
import fs from "node:fs";

/**
 * Resolve a component path relative to the grove root.
 */
function resolveComponentPath(componentPath: string, groveRoot: string): string | null {
	if (path.isAbsolute(componentPath)) {
		return fs.existsSync(componentPath) ? componentPath : null;
	}
	const resolved = path.resolve(groveRoot, componentPath);
	return fs.existsSync(resolved) ? resolved : null;
}

/**
 * Given a component path, find its fixture file under tools/showroom/fixtures/.
 *
 * e.g. libs/engine/src/lib/ui/components/Button.svelte
 *   -> tools/showroom/fixtures/engine/Button.showroom.ts
 */
function resolveFixturePath(componentPath: string, groveRoot: string): string | null {
	// Extract library name from path: libs/{name}/... or apps/{name}/...
	const relative = path.relative(groveRoot, componentPath);
	const parts = relative.split(path.sep);

	let library = "app";
	if (parts[0] === "libs" && parts.length > 1) {
		library = parts[1];
	} else if (parts[0] === "apps" && parts.length > 1) {
		library = parts[1];
	}

	// Component name without extension
	const componentName = path.basename(componentPath, ".svelte");

	const fixturePath = path.join(
		groveRoot,
		"tools",
		"showroom",
		"fixtures",
		library,
		`${componentName}.showroom.ts`,
	);

	return fs.existsSync(fixturePath) ? fixturePath : null;
}

export function showroomPlugin(): Plugin {
	let groveRoot = "";
	let currentComponent = "";
	let currentResolved = "";
	let server: ViteDevServer | null = null;

	return {
		name: "grove-showroom",
		enforce: "pre",

		configResolved(config) {
			groveRoot = path.resolve(config.root, "../..");
		},

		configureServer(viteServer) {
			server = viteServer;

			// --- /api/showroom/mount ---
			viteServer.middlewares.use((req, res, next) => {
				const url = new URL(req.url || "/", "http://localhost");

				if (url.pathname === "/api/showroom/mount" && req.method === "GET") {
					const componentPath = url.searchParams.get("component") || "";

					if (!componentPath) {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ error: "Missing ?component= parameter" }));
						return;
					}

					const resolved = resolveComponentPath(componentPath, groveRoot);
					if (!resolved) {
						res.writeHead(404, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ error: `Component not found: ${componentPath}` }));
						return;
					}

					const changed = currentResolved !== resolved;
					currentComponent = componentPath;
					currentResolved = resolved;

					if (changed) {
						// Trigger full reload so the dynamic import picks up the new component
						viteServer.ws.send({ type: "full-reload" });
					}

					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ mounted: componentPath, resolved }));
					return;
				}

				if (url.pathname === "/api/showroom/status") {
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({
							status: "ready",
							component: currentComponent || null,
							groveRoot,
						}),
					);
					return;
				}

				if (url.pathname === "/api/showroom/component.js") {
					if (!currentResolved) {
						res.writeHead(200, { "Content-Type": "application/javascript" });
						res.end("export default null; export const componentPath = null;");
						return;
					}

					// Serve a JS module that re-exports the target component.
					// Vite transforms this on the fly, handling .svelte compilation and HMR.
					const code = [
						`import Component from ${JSON.stringify(currentResolved)};`,
						`export default Component;`,
						`export const componentPath = ${JSON.stringify(currentComponent)};`,
					].join("\n");

					// Transform the module through Vite's pipeline
					viteServer
						.transformRequest(`/@showroom-component-proxy.js`, { ssr: false })
						.catch(() => null);

					res.writeHead(200, {
						"Content-Type": "application/javascript",
						"Cache-Control": "no-cache, no-store, must-revalidate",
					});
					res.end(code);
					return;
				}

				if (url.pathname === "/api/showroom/fixture") {
					const queryComponent = url.searchParams.get("component") || currentComponent;
					if (!queryComponent) {
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ scenarios: {} }));
						return;
					}

					const resolved = resolveComponentPath(queryComponent, groveRoot);
					if (!resolved) {
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ scenarios: {} }));
						return;
					}

					const fixturePath = resolveFixturePath(resolved, groveRoot);
					if (!fixturePath) {
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ scenarios: {} }));
						return;
					}

					// Load fixture via Vite's module runner so TypeScript is handled
					viteServer
						.ssrLoadModule(fixturePath)
						.then((mod: any) => {
							const fixture = mod.default || mod;
							res.writeHead(200, { "Content-Type": "application/json" });
							res.end(JSON.stringify(fixture));
						})
						.catch((err: Error) => {
							res.writeHead(500, { "Content-Type": "application/json" });
							res.end(
								JSON.stringify({
									error: `Failed to load fixture: ${err.message}`,
								}),
							);
						});
					return;
				}

				next();
			});
		},

		// Handle the proxy module that imports the real component
		resolveId(id) {
			if (id === "/@showroom-component-proxy.js") {
				return id;
			}
		},

		load(id) {
			if (id === "/@showroom-component-proxy.js") {
				if (!currentResolved) {
					return "export default null; export const componentPath = null;";
				}
				return [
					`import Component from ${JSON.stringify(currentResolved)};`,
					`export default Component;`,
					`export const componentPath = ${JSON.stringify(currentComponent)};`,
				].join("\n");
			}
		},
	};
}
