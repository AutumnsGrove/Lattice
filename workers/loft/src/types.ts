/**
 * Grove Loft — Type Definitions
 *
 * Env bindings and Hono variables for the Loft worker.
 */

/** Cloudflare Worker environment bindings. */
export interface Env {
	/** Loft's own D1 database: firefly state + loft config/activity/events */
	DB: D1Database;
	/** R2 bucket for workspace state persistence between sessions */
	LOFT_STATE: R2Bucket;
	/** Service binding to Grove Warden for Fly.io credential resolution */
	WARDEN: {
		fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
	};
	/** Bearer token for authenticating CLI / API requests */
	LOFT_API_KEY: string;
	/** Warden agent key for Fly token resolution */
	WARDEN_API_KEY: string;
}

/** Hono context variables set by middleware. */
export type AppVariables = {
	authenticated: boolean;
};

/** Standard Loft API response envelope. */
export interface LoftResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
	};
}
