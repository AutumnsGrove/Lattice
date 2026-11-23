/**
 * How Lumen's failure becomes a `ModelError`.
 *
 * `retryable` is the load-bearing flag: Lumen's router skips its fallback chain
 * whenever tools are present, so Lyra's retries are the only protection an agent
 * call has (decision 58). A transient outage is tried again and then parks the
 * run for a person; a request Lumen will never accept fails it at once.
 *
 * The HTTP rules themselves are not restated here. `@autumnsgrove/lyra/openai`
 * already owns "which statuses are worth another try" and "how long a
 * `Retry-After` may ask for" (OAI20, OAI21), and two copies of that list would
 * drift. This file only adds the part that is Lumen's: its own error envelope.
 */

import type { ModelError } from "@autumnsgrove/lyra";
import {
	MAX_MESSAGE_CHARS,
	codeForStatus,
	errorForStatus,
	isRetryableStatus,
	retryAfterMs,
	truncateMessage,
} from "@autumnsgrove/lyra/openai";
import type { ErrorCode } from "@autumnsgrove/lyra";

/** The codes Lumen's worker can return in its `error` envelope. */
export type LumenErrorCode =
	| "AUTH_REQUIRED"
	| "INVALID_REQUEST"
	| "INVALID_PARAMS"
	| "QUOTA_EXCEEDED"
	| "PROVIDER_ERROR"
	| "ALL_PROVIDERS_FAILED"
	| "SONGBIRD_REJECTED"
	| "RATE_LIMITED"
	| "UPSTREAM_ERROR"
	| "INTERNAL_ERROR";

interface EnvelopeCodeRule {
	code: ErrorCode;
	retryable: boolean;
}

/**
 * What each of Lumen's codes means to a loop.
 *
 * `RATE_LIMITED` is the one worth trying again: Threshold refused this request
 * because too many arrived at once, and the next attempt is a second later. The
 * rest are the caller's problem — a bad key, a body Lumen will refuse again, a
 * quota that a retry cannot create, or content the scrubber stopped. A provider
 * failure is retryable because the provider is what failed; Lyra's own run then
 * decides how many times is enough.
 */
const ENVELOPE_RULES: Record<LumenErrorCode, EnvelopeCodeRule> = {
	AUTH_REQUIRED: { code: "permission_denied", retryable: false },
	INVALID_REQUEST: { code: "bad_request", retryable: false },
	INVALID_PARAMS: { code: "bad_request", retryable: false },
	QUOTA_EXCEEDED: { code: "permission_denied", retryable: false },
	PROVIDER_ERROR: { code: "provider_error", retryable: true },
	ALL_PROVIDERS_FAILED: { code: "provider_error", retryable: true },
	UPSTREAM_ERROR: { code: "provider_error", retryable: true },
	SONGBIRD_REJECTED: { code: "permission_denied", retryable: false },
	RATE_LIMITED: { code: "busy", retryable: true },
	INTERNAL_ERROR: { code: "internal", retryable: true },
};

/**
 * Keep a caller's key out of anything that can be written down.
 *
 * A message travels into the run's record, and the record is the one place a key
 * must never reach. Every message this module builds goes through here first.
 */
export function redact(text: string, secret: string | undefined): string {
	if (!secret || secret === "") {
		return text;
	}
	return text.split(secret).join("[redacted]");
}

/** A stop is not a failure: the loop reads this code and parks the run `stopped`. */
export function stoppedError(secret?: string): ModelError {
	return {
		code: "timeout",
		message: redact("the model call was stopped", secret),
		retryable: false,
	};
}

/** A tool-carrying call that Lumen could not complete, whatever the reason was. */
export function providerError(message: string, secret?: string, retryable = true): ModelError {
	return {
		code: "provider_error",
		message: truncateMessage(redact(message, secret)),
		retryable,
	};
}

/**
 * A response Lumen refused, in whichever way it said so.
 *
 * A body carrying Lumen's own envelope is read for its code, because the code is
 * more specific than the status: a 403 from the scrubber and a 403 from a bad key
 * deserve different words. Anything else falls back to the HTTP rules.
 */
export function errorForResponse(
	status: number,
	body: string,
	options: { retryAfter?: string | null; now: number; secret?: string },
): ModelError {
	const envelope = readEnvelope(body);

	if (envelope !== undefined) {
		const rule = ENVELOPE_RULES[envelope.code] ?? {
			code: codeForStatus(status),
			retryable: isRetryableStatus(status),
		};
		const error: ModelError = {
			code: rule.code,
			message: truncateMessage(
				redact(`${envelope.code}: ${envelope.message}`, options.secret).slice(0, MAX_MESSAGE_CHARS),
			),
			retryable: rule.retryable,
		};

		// A 429 that says `Retry-After` still says it, envelope or not. Dropping the
		// header here would make the adapter's wait a guess against a refusal that
		// already knows how long it means.
		const wait = retryAfterMs(options.retryAfter ?? null, options.now);
		if (wait !== undefined) {
			error.retryAfterMs = wait;
		}

		return error;
	}

	return errorForStatus(status, body, {
		retryAfter: options.retryAfter ?? null,
		now: options.now,
	});
}

/** Lumen's `{ success: false, error: { code, message } }`, when the body is one. */
export function readEnvelope(body: string): { code: LumenErrorCode; message: string } | undefined {
	if (body.trim() === "") {
		return undefined;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(body);
	} catch {
		return undefined;
	}

	if (typeof parsed !== "object" || parsed === null) {
		return undefined;
	}

	const error = (parsed as { error?: unknown }).error;
	if (typeof error !== "object" || error === null) {
		return undefined;
	}

	const { code, message } = error as { code?: unknown; message?: unknown };
	if (typeof code !== "string") {
		return undefined;
	}

	return {
		code: code as LumenErrorCode,
		message: typeof message === "string" ? message : "Lumen did not say why",
	};
}
