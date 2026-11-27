/**
 * The built SvelteKit adapter artifact is a build product: it exists after
 * `pnpm build:test` and not before, so `svelte-check` (which runs before any
 * build) cannot resolve the import in `pool-entry.ts` and CI fails on a file
 * that is generated on purpose.
 *
 * A wildcard module declaration covers it in both states. The artifact is not
 * ours to type-check either — following SvelteKit's generated bundle into the
 * type graph produced a hundred unrelated errors.
 */
declare module "*/_worker.js" {
	const worker: {
		fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext): Promise<Response>;
	};
	export default worker;
}
