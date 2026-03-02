/**
 * GET /atmospheres — List Available Atmospheres
 *
 * Returns the full atmosphere manifold — all predefined moods
 * with their settings, descriptions, and aliases.
 */

import { Hono } from "hono";
import { ATMOSPHERE_MANIFOLD } from "@autumnsgrove/lattice/reverie";
import type { Env, ReverieVariables, ReverieResponse } from "../types";

const atmospheres = new Hono<{ Bindings: Env; Variables: ReverieVariables }>();

atmospheres.get("/", (c) => {
	const response: ReverieResponse = {
		success: true,
		data: {
			atmospheres: ATMOSPHERE_MANIFOLD,
			count: ATMOSPHERE_MANIFOLD.length,
		},
	};

	return c.json(response);
});

export { atmospheres };
