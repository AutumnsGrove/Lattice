/**
 * The Worker the test pool boots.
 *
 * Aspen's SvelteKit app is only whole after a build, so the pool runs the
 * adapter's artifact rather than trying to import route modules. The import is
 * relative on purpose: Vite inlines SvelteKit's generated bundle, which is what
 * makes the artifact runnable inside the pool. The Durable Object classes ride along as
 * named exports so they are defined *in the runner worker* — that is what lets
 * tests evict them, fire their alarms, and inspect their storage with
 * `cloudflare:test` (`runInDurableObject`, `evictDurableObject`).
 *
 * The canonical DO implementation lives in `services/durable-objects` (the
 * deployed `grove-durable-objects` worker). `libs/engine` still carries an older
 * twin; tests must never be the thing that keeps it alive.
 */
export { default } from "../.svelte-kit/cloudflare/_worker.js";

export { TenantDO } from "../../../services/durable-objects/src/TenantDO";
export { PostMetaDO } from "../../../services/durable-objects/src/PostMetaDO";
export { PostContentDO } from "../../../services/durable-objects/src/PostContentDO";
export { SentinelDO } from "../../../services/durable-objects/src/sentinel/SentinelDO";
export { ExportDO } from "../../../services/durable-objects/src/ExportDO";
export { ThresholdDO } from "../../../services/durable-objects/src/ThresholdDO";
