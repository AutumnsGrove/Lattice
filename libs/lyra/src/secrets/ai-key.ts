/**
 * The one AI key.
 *
 * Every feature that spends a Wanderer's own provider key asks the same question
 * — "what is their OpenRouter key?" — and until this file there was no single
 * answer. The timeline saved it as `timeline_openrouter_key`, so the next feature
 * had two choices: copy that name and drift, or quietly spend Grove's money
 * instead. #1801 chose the first option once, properly.
 *
 * ## The order
 *
 * 1. `openrouter_api_key` — set once in Arbor → Settings → AI. Canonical.
 * 2. `timeline_openrouter_key` — where the key lived before there was a Settings
 *    page, and still what the timeline's own token screen writes. Answers second,
 *    so nobody has to rotate anything on the day this ships.
 *
 * This is deliberately the same two names, in the same order, that Warden's alias
 * chain carries (`workers/warden/src/lib/credentials.ts`). A key set once is
 * therefore found by a feature that calls Lumen through Warden *and* by a feature
 * that reads `tenant_secrets` directly — the timeline does the latter, which is
 * why fixing only Warden would have changed nothing for it.
 *
 * ## What this file is not
 *
 * It does not decrypt, store, or validate a key. Reading is someone else's job —
 * a `SecretsSlot`, a `SecretsManager`, whatever the caller already has — and this
 * only decides which name to ask for first. That is what keeps it testable
 * without a database, and what stops a second copy of the resolution order
 * growing in each worker.
 */

/**
 * The names an AI key can be stored under.
 *
 * Spelled once. A call site that needs the legacy name for a dual-write or a
 * cleanup should take it from here rather than typing the string again.
 */
export const AI_SECRETS = {
	/** Canonical: one key per tenant, set in Settings, used by every AI feature. */
	openRouterKey: "openrouter_api_key",
	/** Where the timeline kept it before #1801. Read-only fallback. */
	legacyOpenRouterKey: "timeline_openrouter_key",
} as const;

/** The one message every call site gives when there is no key at all. */
export const MISSING_AI_KEY_MESSAGE =
	"No AI key is set. Add one in Arbor → Settings → AI, then try again.";

/**
 * Asks for a secret by name.
 *
 * Deliberately the same shape as Lyra's `SecretsSlot.get`, so a slot can be passed
 * straight in, and a `SecretsManager` can be adapted in one line at a call site
 * that already holds one (the nightly timeline worker does).
 */
export type SecretReader = (name: string) => Promise<string | undefined>;

/** A key, and which name answered — so a log line can say where it came from. */
export interface AiOpenRouterKey {
	key: string;
	source: "settings" | "timeline";
}

/**
 * Resolve the Wanderer's OpenRouter key, canonical first.
 *
 * Returns `undefined` when neither name holds anything. An empty or whitespace-only
 * value counts as absent: `SecretsManager.setSecret` will happily store `""`, and a
 * key of one space should fail as "not set" rather than as a provider 401.
 */
export async function resolveOpenRouterKey(
	read: SecretReader,
): Promise<AiOpenRouterKey | undefined> {
	const canonical = clean(await read(AI_SECRETS.openRouterKey));
	if (canonical) return { key: canonical, source: "settings" };

	const legacy = clean(await read(AI_SECRETS.legacyOpenRouterKey));
	if (legacy) return { key: legacy, source: "timeline" };

	return undefined;
}

function clean(value: string | undefined | null): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed === "" ? undefined : trimmed;
}
