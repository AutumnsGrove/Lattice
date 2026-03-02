/**
 * POST /configure — Natural Language Configuration
 *
 * The main Reverie endpoint. Takes natural language input and returns
 * a preview of changes to be applied.
 *
 * Pipeline: router → loader → converter → composer → validator → preview
 */

import { Hono } from "hono";
import type { Env, ReverieVariables, ReverieResponse, ConfigureResponseData } from "../types";
import { ConfigureRequestSchema } from "../types";
import { REVERIE_ERRORS, buildReverieError } from "../errors";
import { routeInput } from "../lib/router";
import { loadSchemas } from "../lib/loader";
import { schemasToTools } from "../lib/converter";
import { compose } from "../lib/composer";
import { validateToolCalls } from "../lib/validator";

const configure = new Hono<{ Bindings: Env; Variables: ReverieVariables }>();

configure.post("/", async (c) => {
	const startTime = Date.now();

	// --- Trust boundary: validate request body ---
	let body: unknown;
	try {
		body = await c.req.json();
	} catch {
		const { body: errBody, status } = buildReverieError(REVERIE_ERRORS.INVALID_REQUEST);
		return c.json(errBody, status as 400);
	}

	const parsed = ConfigureRequestSchema.safeParse(body);
	if (!parsed.success) {
		// Report field names without internal schema detail
		const fields = parsed.error.issues.map((i) => i.path.join(".")).filter(Boolean);
		const detail = fields.length > 0 ? `Invalid fields: ${fields.join(", ")}` : undefined;
		const { body: errBody, status } = buildReverieError(REVERIE_ERRORS.INVALID_REQUEST, detail);
		return c.json(errBody, status as 400);
	}

	const { input, session_id } = parsed.data;
	const tenantId = c.get("tenantId");
	const tier = c.get("tier");

	try {
		// 1. Route — detect intent and domains from keywords
		const routeResult = routeInput(input);

		if (routeResult.action === "no-match") {
			const { body: errBody, status } = buildReverieError(REVERIE_ERRORS.NO_DOMAINS_MATCHED);
			return c.json(errBody, status as 400);
		}

		// 2. Load — fetch schemas with tier limits
		const { schemas, trimmed } = loadSchemas(routeResult.domains, tier);

		if (schemas.length === 0) {
			const { body: errBody, status } = buildReverieError(REVERIE_ERRORS.NO_DOMAINS_MATCHED);
			return c.json(errBody, status as 400);
		}

		// 3. Convert — schemas to tool definitions
		const tools = schemasToTools(schemas);

		// 4. Compose — call Lumen with tools
		const composerResult = await compose(input, tools, c.env, {
			tenantId,
			tier,
			atmosphere: routeResult.atmosphere,
			domainCount: schemas.length,
		});

		if (composerResult.toolCalls.length === 0) {
			const { body: errBody, status } = buildReverieError(REVERIE_ERRORS.NO_DOMAINS_MATCHED);
			return c.json(errBody, status as 400);
		}

		// 5. Validate — check tool call arguments against schemas
		const validation = validateToolCalls(composerResult.toolCalls);

		// Generate a tenant-scoped request ID for the execute step.
		// Prefix with tenant ID so /execute can verify ownership.
		const requestId = `${tenantId}:${crypto.randomUUID()}`;

		const response: ReverieResponse<ConfigureResponseData> = {
			success: true,
			data: {
				requestId,
				action: routeResult.action === "atmosphere" ? "atmosphere" : "configure",
				changes: validation.changes,
				domainsMatched: routeResult.domains,
				atmosphereUsed: routeResult.atmosphere?.keyword,
				message: validation.valid
					? `Found ${validation.changes.length} change${validation.changes.length === 1 ? "" : "s"} across ${routeResult.domains.length} domain${routeResult.domains.length === 1 ? "" : "s"}`
					: `Found changes but ${validation.errors.length} validation error${validation.errors.length === 1 ? "" : "s"}`,
			},
			meta: {
				latencyMs: Date.now() - startTime,
				domainsMatched: routeResult.domains,
				atmosphereUsed: routeResult.atmosphere?.keyword,
				lumenModel: composerResult.model,
			},
		};

		return c.json(response);
	} catch (err) {
		// Log error class and code only — never log full error which may contain user input
		const errMsg = err instanceof Error ? err.message : "Unknown";
		const errCode =
			err instanceof Error && "code" in err ? (err as { code: string }).code : undefined;
		console.error("[Reverie] Configure error:", { code: errCode, message: errMsg });

		if (errCode) {
			const { body: errBody, status } = buildReverieError(REVERIE_ERRORS.LUMEN_ERROR);
			return c.json(errBody, status as 502);
		}

		const { body: errBody, status } = buildReverieError(REVERIE_ERRORS.INTERNAL_ERROR);
		return c.json(errBody, status as 500);
	}
});

export { configure };
