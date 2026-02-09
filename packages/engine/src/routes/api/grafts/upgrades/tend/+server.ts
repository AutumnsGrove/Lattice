/**
 * API: /api/grafts/upgrades/tend
 *
 * Open the garden shed for self-service billing management.
 */

import { POST } from "../../../server/api/tend";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = POST;
