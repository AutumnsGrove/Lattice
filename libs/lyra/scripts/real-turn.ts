/**
 * One real turn with a tool, through the adapter, the real Lumen worker, and
 * OpenRouter. Run once, by hand, against `wrangler dev` on 8788.
 *
 * It is deliberately not a test: it spends a Wanderer's own provider key and needs
 * a network, so it cannot live in CI. `pnpm exec tsx scripts/real-turn.ts`.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createLumenModelSlot } from "../src/lumen/slot.js";
import type { ModelRequest } from "@autumnsgrove/lyra";

const REPO = new URL("../../../", import.meta.url).pathname;
const devVars = readFileSync(join(REPO, "workers/lumen/.dev.vars"), "utf8");
const callerKey = /^LUMEN_API_KEY=(.+)$/m.exec(devVars)?.[1]?.trim();
if (!callerKey) throw new Error("no LUMEN_API_KEY in workers/lumen/.dev.vars");

const piAuth = JSON.parse(readFileSync(join(homedir(), ".pi/agent/auth.json"), "utf8")) as {
	openrouter?: { key?: string };
};
const tenantKey = piAuth.openrouter?.key;
if (!tenantKey) throw new Error("no OpenRouter key in ~/.pi/agent/auth.json");

// With USE_DEV_KEY=1 the Wanderer's key is not sent at all, so the worker resolves
// through `DEV_OPENROUTER_API_KEY` in its own `.dev.vars` — the local-only path the
// dev stack added. Two proofs from one script: BYOK, and the fallback behind it.
const useByok = process.env.USE_DEV_KEY !== "1";

const slot = createLumenModelSlot({
	baseUrl: "http://localhost:8788",
	apiKey: callerKey,
	tenantId: "real-turn",
	...(useByok ? { tenantApiKey: tenantKey } : {}),
	deadlineMs: 90_000,
});

const request: ModelRequest = {
	system:
		"You keep a daily record for a grove. When asked to record something, call add_line with it. Do not answer in prose.",
	messages: [{ role: "user", text: "Record that the tea shop opened late today." }],
	tools: [
		{
			name: "add_line",
			description: "Add one line to today's record",
			parameters: {
				type: "object",
				properties: { text: { type: "string", description: "The line to record" } },
				required: ["text"],
			},
		},
	],
	signal: new AbortController().signal,
};

const started = Date.now();
const reply = await slot.complete(request);

if (!reply.ok) {
	console.error("FAILED", reply.error);
	process.exit(1);
}

const { value } = reply;
console.log(
	JSON.stringify(
		{
			model: value.model,
			finishReason: value.finishReason,
			text: value.text,
			toolCalls: value.toolCalls,
			usage: value.usage,
			elapsedMs: Date.now() - started,
			contextWindow: slot.contextWindow,
			keyLeaked: JSON.stringify(value).includes(tenantKey),
		},
		null,
		2,
	),
);

const ok =
	value.toolCalls.length > 0 &&
	value.toolCalls[0].name === "add_line" &&
	value.finishReason === "tool_calls" &&
	value.usage.inputTokens > 0 &&
	!JSON.stringify(value).includes(tenantKey);

console.log(
	ok ? "\nOK: a real tool call came back through Lumen" : "\nNOT OK: see the reply above",
);
process.exit(ok ? 0 : 1);
