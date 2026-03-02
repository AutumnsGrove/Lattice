/**
 * POST /query — Read-Only Domain Query
 *
 * Queries current values from a domain without using the LLM.
 * This is for "what's my current theme?" type requests.
 *
 * Note: This is a stub — actual reads will query D1 via GroveContext.
 */

import { Hono } from "hono";
import { SCHEMA_REGISTRY } from "@autumnsgrove/lattice/reverie";
import type { DomainId } from "@autumnsgrove/lattice/reverie";
import type { Env, ReverieVariables, ReverieResponse } from "../types";
import { QueryRequestSchema } from "../types";
import { REVERIE_ERRORS, buildReverieError } from "../errors";

const query = new Hono<{ Bindings: Env; Variables: ReverieVariables }>();

query.post("/", async (c) => {
	const startTime = Date.now();

	// --- Trust boundary ---
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		const { body: errBody, status } = buildReverieError(REVERIE_ERRORS.INVALID_REQUEST);
		return c.json(errBody, status as 400);
	}

	const parsed = QueryRequestSchema.safeParse(body);
	if (!parsed.success) {
		const fields = parsed.error.issues.map((i) => i.path.join(".")).filter(Boolean);
		const detail = fields.length > 0 ? `Invalid fields: ${fields.join(", ")}` : undefined;
		const { body: errBody, status } = buildReverieError(REVERIE_ERRORS.INVALID_REQUEST, detail);
		return c.json(errBody, status as 400);
	}

	const { domain, fields } = parsed.data;
	const schema = SCHEMA_REGISTRY[domain as DomainId];

	if (!schema) {
		const { body: errBody, status } = buildReverieError(
			REVERIE_ERRORS.NO_DOMAINS_MATCHED,
			`Unknown domain: ${domain}`,
		);
		return c.json(errBody, status as 400);
	}

	// TODO: Query actual values from D1 via GroveContext
	// For now, return field definitions with defaults
	const fieldDefs = fields
		? Object.entries(schema.fields).filter(([name]) => fields.includes(name))
		: Object.entries(schema.fields);

	const values: Record<string, unknown> = {};
	for (const [name, def] of fieldDefs) {
		values[name] = {
			type: def.type,
			description: def.description,
			default: def.default ?? null,
			readonly: def.readonly ?? false,
			currentValue: null, // TODO: read from DB
		};
	}

	const response: ReverieResponse = {
		success: true,
		data: {
			domain: schema.id,
			name: schema.name,
			fields: values,
		},
		meta: {
			latencyMs: Date.now() - startTime,
		},
	};

	return c.json(response);
});

export { query };
