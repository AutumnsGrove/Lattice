/**
 * Where the tenant's AI key lives — asked by the settings pages, not answered
 * anywhere else (#1801).
 *
 * Two pages need this: the AI page (to say "saved" or "not set") and the settings
 * hub (to say it on a card). Neither may read the key itself, so this asks for
 * presence only and the shared resolver decides the order.
 *
 * A failure here is not worth a 500. A settings page that cannot tell whether a
 * key exists should say "not set" and still render, which is why every error path
 * returns `undefined` after logging.
 */

import { ARBOR_ERRORS, logGroveError } from "@autumnsgrove/lattice/errors";
import { createSecretsManager } from "@autumnsgrove/lattice/server/secrets";
import { hasOpenRouterKey, type AiOpenRouterKeySource } from "@autumnsgrove/lyra-lumen/secrets";

type Env = App.Platform["env"];

export async function readAiKeySource(
	env: Env | undefined,
	tenantId: string | undefined,
): Promise<AiOpenRouterKeySource | undefined> {
	if (!env?.DB || !env.GROVE_KEK || !tenantId) return undefined;

	try {
		const secrets = await createSecretsManager(env);
		return await hasOpenRouterKey((name) => secrets.hasSecret(tenantId, name));
	} catch (err) {
		logGroveError("Arbor", ARBOR_ERRORS.DB_NOT_AVAILABLE, {
			detail: "AI key presence could not be read",
			cause: err,
		});
		return undefined;
	}
}
