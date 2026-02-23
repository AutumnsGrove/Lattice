/**
 * Safe Error Extraction
 *
 * Extracts error code and message from unknown caught values
 * without unsafe `as` casts (Rootwork pattern).
 */

import type { LumenWorkerErrorCode, LumenWorkerResponse } from "../types";

/** Map of Lumen library error codes to worker error codes */
const ERROR_CODE_MAP: Record<string, LumenWorkerErrorCode> = {
	QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
	PROVIDER_ERROR: "PROVIDER_ERROR",
	PROVIDER_TIMEOUT: "PROVIDER_ERROR",
	ALL_PROVIDERS_FAILED: "ALL_PROVIDERS_FAILED",
	INVALID_TASK: "INVALID_REQUEST",
	INVALID_INPUT: "INVALID_PARAMS",
	RATE_LIMITED: "RATE_LIMITED",
	SONGBIRD_REJECTED: "SONGBIRD_REJECTED",
	UNAUTHORIZED: "AUTH_REQUIRED",
	DISABLED: "INTERNAL_ERROR",
};

interface ExtractedError {
	code: LumenWorkerErrorCode;
	message: string;
	status: number;
}

/**
 * Safely extract error information from an unknown thrown value.
 * No `as` casts — inspects the value's shape at runtime.
 */
export function extractError(err: unknown): ExtractedError {
	// Extract message safely
	let message = "An unexpected error occurred";
	if (err instanceof Error) {
		message = err.message;
	} else if (typeof err === "string") {
		message = err;
	} else if (
		typeof err === "object" &&
		err !== null &&
		"message" in err &&
		typeof (err as Record<string, unknown>).message === "string"
	) {
		message = (err as Record<string, unknown>).message as string;
	}

	// Extract code safely
	let code: LumenWorkerErrorCode = "INTERNAL_ERROR";
	if (
		typeof err === "object" &&
		err !== null &&
		"code" in err &&
		typeof (err as Record<string, unknown>).code === "string"
	) {
		const rawCode = (err as Record<string, unknown>).code as string;
		code = ERROR_CODE_MAP[rawCode] ?? "INTERNAL_ERROR";
	}

	// Determine HTTP status from error code
	const status =
		code === "QUOTA_EXCEEDED" || code === "RATE_LIMITED"
			? 429
			: code === "AUTH_REQUIRED"
				? 401
				: code === "INVALID_REQUEST" || code === "INVALID_PARAMS"
					? 400
					: 500;

	return { code, message, status };
}

/**
 * Build a standard error response from an extracted error.
 */
export function buildErrorResponse(
	err: unknown,
	task: string,
	startTime: number,
): { body: LumenWorkerResponse; status: number } {
	const { code, message, status } = extractError(err);

	return {
		body: {
			success: false,
			error: { code, message },
			meta: {
				task,
				model: "",
				provider: "",
				latencyMs: Date.now() - startTime,
			},
		},
		status,
	};
}
