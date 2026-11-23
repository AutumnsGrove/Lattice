/**
 * What a test can use: the script both fakes read, the standalone fake, and the
 * contract suite that runs them against each other.
 *
 * The other half of the contract — the real routes in process — lives beside the
 * routes in `workers/lumen`, because that is the only place the worker's own
 * modules can be imported from.
 */

export {
	SCRIPT_MODEL,
	envelopeFor,
	openRouterBody,
	type LumenScript,
	type ScriptFinishReason,
	type ScriptToolCall,
	type ScriptTurn,
} from "./script.js";

export {
	CONTRACT_KEY,
	fakeLumen,
	fakeLumenSubject,
	type FakeLumen,
	type FakeLumenOptions,
} from "./standalone.js";

export {
	lumenScriptedModel,
	scriptFor,
	toScriptTurn,
	type LumenScriptedModelOptions,
} from "./adapt.js";

export {
	agentRequest,
	lumenContract,
	type LumenAnswer,
	type LumenConnection,
	type LumenUnderTest,
} from "./contract.js";
