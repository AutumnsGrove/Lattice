/**
 * Service Initialization
 *
 * Import this module to register all services with the registry.
 * Each service file self-registers on import via registerService().
 */

import "./github";
import "./tavily";
import "./cloudflare";
import "./exa";
import "./resend";
import "./stripe";
import "./openrouter";

export { getService, listServices } from "./registry";
