/**
 * API: /api/grafts/upgrades/cultivate
 *
 * Help your grove grow to the next stage.
 */

import { POST } from "../../../server/api/cultivate";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = POST;
