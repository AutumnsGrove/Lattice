/**
 * Server Type Safety Utilities
 *
 * Rootwork — type safety at every boundary.
 *
 * @module server/utils
 */

export { isRedirect, isHttpError } from "./type-guards.js";
export { parseFormData, type FormDataResult } from "./form-data.js";
export { createTypedCacheReader, safeJsonParse } from "./typed-cache.js";
export {
	CLOUDFLARE_WORKER_CLIENT_IP,
	clientIpHeaders,
	isCloudflareWorkerIp,
	isValidIpAddress,
	requestWithClientIp,
	resolveClientIP,
	resolveClientIPorLog,
	type ClientIpSource,
	type ResolvedClientIp,
} from "./client-ip.js";
