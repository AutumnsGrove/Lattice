/**
 * The Lumen half: the model slot, its error mapping, and the wire between them.
 */

export { createLumenModelSlot, DEFAULT_DEADLINE_MS, type LumenModelSlotConfig } from "./slot.js";
export {
	errorForResponse,
	providerError,
	readEnvelope,
	redact,
	stoppedError,
	type LumenErrorCode,
} from "./errors.js";
export {
	fromLumenReply,
	toLumenMessages,
	toLumenTool,
	toLumenToolCall,
	type LumenReplyData,
} from "./wire.js";
