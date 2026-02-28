/**
 * RDAP Domain Availability Checker
 *
 * Lightweight RDAP (Registration Data Access Protocol) client for checking
 * domain availability. Uses the free, IETF-standard RDAP protocol — no
 * API keys required.
 *
 * Adapted from services/forage/src/rdap.ts for use in the engine API.
 */

// IANA RDAP bootstrap URL — maps TLDs to their RDAP servers
const IANA_RDAP_BOOTSTRAP = "https://data.iana.org/rdap/dns.json";

// Request timeout in milliseconds
const TIMEOUT = 8000;

// User agent for requests
const USER_AGENT = "Grove/1.0 (domain availability checker)";

// In-memory cache for RDAP bootstrap data (survives Worker lifetime)
let rdapBootstrapCache: Map<string, string> | null = null;

export interface DomainCheckResult {
	domain: string;
	status: "available" | "registered" | "unknown";
	registrar?: string;
	error?: string;
}

/**
 * Fetch IANA's RDAP bootstrap file which maps TLDs to RDAP servers.
 * Cached in memory for the Worker's lifetime.
 */
async function fetchRdapBootstrap(): Promise<Map<string, string>> {
	if (rdapBootstrapCache) {
		return rdapBootstrapCache;
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

	try {
		const response = await fetch(IANA_RDAP_BOOTSTRAP, {
			headers: { "User-Agent": USER_AGENT },
			signal: controller.signal,
		});

		if (!response.ok) {
			throw new Error(`Bootstrap fetch failed: HTTP ${response.status}`);
		}

		const data = (await response.json()) as {
			services: [string[], string[]][];
		};

		const tldMap = new Map<string, string>();
		for (const entry of data.services || []) {
			const tlds = entry[0];
			const servers = entry[1];
			if (servers && servers.length > 0) {
				const server = servers[0].replace(/\/$/, "");
				for (const tld of tlds) {
					tldMap.set(tld.toLowerCase(), server);
				}
			}
		}

		rdapBootstrapCache = tldMap;
		return tldMap;
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * Normalize a domain input: lowercase, trim, strip protocol/path/www.
 * Returns null if the input is not a valid-looking domain.
 */
export function normalizeDomain(input: string): string | null {
	let domain = input.toLowerCase().trim();

	// Strip protocol if someone pastes a URL
	domain = domain.replace(/^https?:\/\//, "");

	// Strip path, query, hash
	domain = domain.split("/")[0].split("?")[0].split("#")[0];

	// Strip www. prefix
	domain = domain.replace(/^www\./, "");

	// Strip trailing dot (FQDN)
	domain = domain.replace(/\.$/, "");

	// Must contain at least one dot
	if (!domain.includes(".")) return null;

	// Basic format validation: letters, numbers, hyphens, dots
	if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
		return null;
	}

	return domain;
}

/**
 * Check availability of a single domain using RDAP.
 */
export async function checkDomain(domain: string): Promise<DomainCheckResult> {
	const tld = domain.split(".").pop() || "";

	// Get RDAP server for this TLD
	let bootstrap: Map<string, string>;
	try {
		bootstrap = await fetchRdapBootstrap();
	} catch {
		return {
			domain,
			status: "unknown",
			error: "Could not load RDAP server list",
		};
	}

	const rdapServer = bootstrap.get(tld);
	if (!rdapServer) {
		return {
			domain,
			status: "unknown",
			error: `No RDAP server found for .${tld}`,
		};
	}

	const url = `${rdapServer}/domain/${domain}`;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent": USER_AGENT,
				Accept: "application/rdap+json, application/json",
			},
			signal: controller.signal,
		});

		if (response.status === 404) {
			return { domain, status: "available" };
		}

		if (response.status === 429) {
			return {
				domain,
				status: "unknown",
				error: "Rate limited — try again in a moment",
			};
		}

		if (!response.ok) {
			return {
				domain,
				status: "unknown",
				error: `RDAP server returned HTTP ${response.status}`,
			};
		}

		const data = (await response.json()) as {
			entities?: Array<{
				roles?: string[];
				handle?: string;
				vcardArray?: [string, Array<[string, unknown, unknown, unknown]>];
			}>;
		};

		// Domain is registered — try to extract registrar
		const result: DomainCheckResult = { domain, status: "registered" };

		for (const entity of data.entities || []) {
			if (entity.roles?.includes("registrar")) {
				const vcard = entity.vcardArray;
				if (vcard && vcard.length > 1) {
					for (const item of vcard[1]) {
						if (item[0] === "fn") {
							result.registrar = String(item[3]);
							break;
						}
					}
				}
				if (!result.registrar) {
					result.registrar = entity.handle;
				}
				break;
			}
		}

		return result;
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			return {
				domain,
				status: "unknown",
				error: "Request timed out",
			};
		}
		return {
			domain,
			status: "unknown",
			error: "Could not reach RDAP server",
		};
	} finally {
		clearTimeout(timeoutId);
	}
}
