/**
 * API: /api/grafts/upgrades/growth
 *
 * Check how your grove is flourishing.
 */

import { GET } from "../../../server/api/growth";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = GET;
