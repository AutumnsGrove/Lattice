/**
 * Lyra on Grove: the model slot over Lumen, and the secrets slot over a tenant's
 * own encrypted secrets.
 *
 * Nothing in Lyra's core knows this package exists (docs/adapters.md). Every
 * Lumen-shaped idea — the `agent` task, the quota skip, the privacy scrubber,
 * the Wanderer's provider key — lives in here, and stops in here.
 */

export {
	createLumenModelSlot,
	DEFAULT_DEADLINE_MS,
	type LumenModelSlotConfig,
} from "./lumen/slot.js";
export {
	errorForResponse,
	providerError,
	readEnvelope,
	redact,
	stoppedError,
	type LumenErrorCode,
} from "./lumen/errors.js";
export {
	fromLumenReply,
	toLumenMessages,
	toLumenTool,
	toLumenToolCall,
	type LumenReplyData,
} from "./lumen/wire.js";
export {
	createTenantSecretsSlot,
	TIMELINE_SECRETS,
	type TenantSecretsSlotConfig,
} from "./secrets/slot.js";
