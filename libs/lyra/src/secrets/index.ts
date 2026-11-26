/**
 * The secrets half: where a tool's token comes from, and how little it is told.
 */

export { createTenantSecretsSlot, TIMELINE_SECRETS, type TenantSecretsSlotConfig } from "./slot.js";
export {
	AI_SECRETS,
	hasOpenRouterKey,
	MISSING_AI_KEY_MESSAGE,
	resolveOpenRouterKey,
	type AiOpenRouterKey,
	type AiOpenRouterKeySource,
	type SecretPresenceReader,
	type SecretReader,
} from "./ai-key.js";
