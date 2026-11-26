/**
 * AI Settings — the one key every AI feature uses (#1801).
 *
 * Before this page, each feature that spent a Wanderer's own provider key kept
 * its own place to keep it: the timeline wrote `timeline_openrouter_key` and
 * read it by name, and the next feature would have added a third name. This page
 * writes the canonical one, `openrouter_api_key`, and `resolveOpenRouterKey()`
 * makes every call site ask for it (with the timeline's name as the fallback, so
 * nothing has to be rotated on the day this ships).
 *
 * Two rules that do not move:
 *
 * - **The plaintext key never leaves the server once saved.** No GET returns it,
 *   the page says *set* or *replace*, never *view*, and `load` only asks whether
 *   a name holds a secret — never what it holds.
 * - **Removing means removing.** Because there is one key, `remove` deletes both
 *   names; leaving the legacy one behind would mean "Remove" did nothing for
 *   anyone who had saved it in the timeline's own screen.
 */

import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "@autumnsgrove/lattice/errors";
import { createSecretsManager } from "@autumnsgrove/lattice/server/secrets";
import { AI_SECRETS } from "@autumnsgrove/lyra-lumen/secrets";
import { readAiKeySource } from "$lib/server/ai-key";
import type { Actions, PageServerLoad } from "./$types";

/** Lumen refuses a longer key at its own boundary; refuse it here first. */
const MAX_KEY_LENGTH = 500;

export const load: PageServerLoad = async ({ locals, platform }) => {
	return {
		keySource: await readAiKeySource(platform?.env, locals.tenantId),
		kekConfigured: Boolean(platform?.env?.GROVE_KEK),
	};
};

export const actions: Actions = {
	save: async ({ request, locals, platform }) => {
		const env = platform?.env;

		if (!locals.user || !locals.tenantId) {
			return fail(403, {
				error: ARBOR_ERRORS.UNAUTHORIZED.userMessage,
				error_code: ARBOR_ERRORS.UNAUTHORIZED.code,
			});
		}

		if (!env?.DB || !env.GROVE_KEK) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const key = String(formData.get("openrouterKey") ?? "").trim();

		if (key === "") {
			return fail(400, { error: "Paste a key first — the field was empty." });
		}

		if (key.length > MAX_KEY_LENGTH) {
			return fail(400, { error: "That is longer than any OpenRouter key. Try pasting it again." });
		}

		// OpenRouter keys start with `sk-or-`. This is a local sanity check, not
		// validation: the commonest mistake is pasting a different token here, and
		// catching it now is the difference between a saved key and a 401 the next
		// time an AI feature runs.
		if (!key.startsWith("sk-or-")) {
			return fail(400, {
				error: "OpenRouter keys start with sk-or-. That looks like a different token.",
			});
		}

		try {
			const secrets = await createSecretsManager(env);
			await secrets.setSecret(locals.tenantId, AI_SECRETS.openRouterKey, key);

			return {
				success: "Saved. Every AI feature in your grove will use this key.",
			};
		} catch (err) {
			logGroveError("Arbor", ARBOR_ERRORS.DB_NOT_AVAILABLE, {
				detail: "AI key could not be stored",
				cause: err,
			});
			return fail(500, {
				error: "The key could not be saved. Nothing was changed — try again.",
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}
	},

	remove: async ({ locals, platform }) => {
		const env = platform?.env;

		if (!locals.user || !locals.tenantId) {
			return fail(403, {
				error: ARBOR_ERRORS.UNAUTHORIZED.userMessage,
				error_code: ARBOR_ERRORS.UNAUTHORIZED.code,
			});
		}

		if (!env?.DB || !env.GROVE_KEK) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		try {
			const secrets = await createSecretsManager(env);

			// Both names, because "there is one key" has to be true on the way out too.
			await secrets.deleteSecret(locals.tenantId, AI_SECRETS.openRouterKey);
			await secrets.deleteSecret(locals.tenantId, AI_SECRETS.legacyOpenRouterKey);

			return {
				success: "Removed. AI features will ask you to add a key before they run again.",
			};
		} catch (err) {
			logGroveError("Arbor", ARBOR_ERRORS.DB_NOT_AVAILABLE, {
				detail: "AI key could not be removed",
				cause: err,
			});
			return fail(500, {
				error: "The key could not be removed. Try again.",
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}
	},
};
