/**
 * GET /domains — List Available Domains
 *
 * Returns the domain catalog for the current tenant's tier.
 * Includes schema metadata but not full field definitions.
 */

import { Hono } from "hono";
import {
	getImplementedDomains,
	SCHEMA_REGISTRY,
	IMPLEMENTED_COUNT,
	IMPLEMENTED_FIELD_COUNT,
} from "@autumnsgrove/lattice/reverie";
import type { Env, ReverieVariables, ReverieResponse } from "../types";

const domains = new Hono<{ Bindings: Env; Variables: ReverieVariables }>();

domains.get("/", (c) => {
	const domainIds = getImplementedDomains();

	const domainList = domainIds.map((id) => {
		const schema = SCHEMA_REGISTRY[id];
		return {
			id,
			name: schema?.name ?? id,
			group: schema?.group,
			fieldCount: schema ? Object.keys(schema.fields).length : 0,
			readOnly: schema?.writeEndpoint === null,
			keywords: schema?.keywords ?? [],
		};
	});

	const response: ReverieResponse = {
		success: true,
		data: {
			domains: domainList,
			total: IMPLEMENTED_COUNT,
			totalFields: IMPLEMENTED_FIELD_COUNT,
		},
	};

	return c.json(response);
});

export { domains };
