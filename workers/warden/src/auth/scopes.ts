/**
 * Scope Validation
 *
 * Agents are granted scopes like ["github:read", "tavily:*"] that control
 * which services and actions they can access through Warden.
 *
 * Scope format: "service:permission" or "service:*" for wildcard
 */

import type { WardenService } from "../types";

/** Action-to-scope mapping for each service */
const SERVICE_SCOPES: Record<string, Record<string, string>> = {
	github: {
		list_repos: "read",
		get_repo: "read",
		get_issue: "read",
		list_issues: "read",
		create_issue: "write",
		create_comment: "write",
		list_workflow_runs: "actions",
		trigger_workflow: "actions",
		// Admin scopes (expanded)
		admin: "admin",
	},
	tavily: {
		search: "read",
		crawl: "read",
		extract: "read",
	},
	cloudflare: {
		list_workers: "read",
		get_worker: "read",
		list_kv_namespaces: "read",
		list_d1_databases: "read",
		list_dns_records: "dns",
		create_dns_record: "dns",
		purge_cache: "write",
	},
	exa: {
		search: "search",
		find_similar: "similar",
		get_contents: "contents",
	},
	resend: {
		send_email: "send",
	},
	stripe: {
		list_customers: "read",
		get_customer: "read",
		list_subscriptions: "read",
		list_invoices: "read",
		get_invoice: "read",
	},
	openrouter: {
		chat_completion: "inference",
		list_models: "read",
		get_generation: "read",
	},
};

/** Check if an agent's scopes permit a given service + action */
export function validateScope(
	agentScopes: string[],
	service: WardenService,
	action: string,
): boolean {
	const requiredPermission = SERVICE_SCOPES[service]?.[action];
	if (!requiredPermission) return false;

	for (const scope of agentScopes) {
		const [scopeService, scopePermission] = scope.split(":");

		// Exact match
		if (scopeService === service && scopePermission === requiredPermission) {
			return true;
		}

		// Wildcard match (service:*)
		if (scopeService === service && scopePermission === "*") {
			return true;
		}

		// Global wildcard (*:*)
		if (scopeService === "*" && scopePermission === "*") {
			return true;
		}
	}

	return false;
}

/** Get the required scope for a service+action (for error messages) */
export function getRequiredScope(service: WardenService, action: string): string | null {
	const permission = SERVICE_SCOPES[service]?.[action];
	return permission ? `${service}:${permission}` : null;
}

/** Check if a service+action combination is valid */
export function isValidAction(service: string, action: string): boolean {
	return !!SERVICE_SCOPES[service]?.[action];
}
