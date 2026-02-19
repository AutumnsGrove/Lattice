/**
 * RDAP Domain Availability Checker
 *
 * Uses free RDAP (Registration Data Access Protocol) APIs to check domain availability.
 * No API keys required. RDAP is the modern, IETF-standard replacement for WHOIS.
 */

// IANA RDAP bootstrap URL - maps TLDs to their RDAP servers
const IANA_RDAP_BOOTSTRAP = "https://data.iana.org/rdap/dns.json";

// Request timeout in milliseconds
const TIMEOUT = 10000;

// User agent for requests
const USER_AGENT = "Forage/1.0 (domain availability checker)";

// Cache for RDAP bootstrap data
let rdapBootstrapCache: Map<string, string> | null = null;

export interface DomainCheckResult {
	domain: string;
	status: "available" | "registered" | "unknown";
	registrar?: string;
	expiration?: string;
	creation?: string;
	error?: string;
}

/**
 * Fetch IANA's RDAP bootstrap file which maps TLDs to RDAP servers
 */
async function fetchRdapBootstrap(): Promise<Map<string, string>> {
	if (rdapBootstrapCache) {
		return rdapBootstrapCache;
	}

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

		const response = await fetch(IANA_RDAP_BOOTSTRAP, {
			headers: { "User-Agent": USER_AGENT },
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const data = (await response.json()) as {
			services: [string[], string[]][];
		};

		// Build TLD -> server mapping
		const tldMap = new Map<string, string>();
		for (const entry of data.services || []) {
			const tlds = entry[0]; // List of TLDs
			const servers = entry[1]; // List of RDAP server URLs
			if (servers && servers.length > 0) {
				const server = servers[0].replace(/\/$/, ""); // Remove trailing slash
				for (const tld of tlds) {
					tldMap.set(tld.toLowerCase(), server);
				}
			}
		}

		rdapBootstrapCache = tldMap;
		return tldMap;
	} catch (error) {
		console.error("Could not fetch RDAP bootstrap:", error);
		return new Map();
	}
}

/**
 * Get the RDAP server URL for a given domain
 */
async function getRdapServer(domain: string): Promise<string | null> {
	const tld = domain.toLowerCase().split(".").pop() || "";
	const bootstrap = await fetchRdapBootstrap();
	return bootstrap.get(tld) || null;
}

/**
 * Check availability of a single domain using RDAP
 */
export async function checkDomain(domain: string): Promise<DomainCheckResult> {
	domain = domain.toLowerCase().trim();

	// Get RDAP server for this TLD
	const rdapServer = await getRdapServer(domain);
	if (!rdapServer) {
		return {
			domain,
			status: "unknown",
			error: `No RDAP server found for TLD .${domain.split(".").pop()}`,
		};
	}

	// Query RDAP
	const url = `${rdapServer}/domain/${domain}`;

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

		const response = await fetch(url, {
			headers: {
				"User-Agent": USER_AGENT,
				Accept: "application/rdap+json, application/json",
			},
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (response.status === 404) {
			// 404 typically means domain is not registered
			return { domain, status: "available" };
		}

		if (response.status === 429) {
			return {
				domain,
				status: "unknown",
				error: "Rate limited - try again later",
			};
		}

		if (!response.ok) {
			return {
				domain,
				status: "unknown",
				error: `HTTP ${response.status}`,
			};
		}

		const data = (await response.json()) as {
			entities?: Array<{
				roles?: string[];
				handle?: string;
				vcardArray?: [string, Array<[string, unknown, unknown, unknown]>];
			}>;
			events?: Array<{
				eventAction?: string;
				eventDate?: string;
			}>;
		};

		// Domain is registered - extract details
		const result: DomainCheckResult = { domain, status: "registered" };

		// Try to get registrar
		for (const entity of data.entities || []) {
			const roles = entity.roles || [];
			if (roles.includes("registrar")) {
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

		// Try to get dates
		for (const event of data.events || []) {
			const action = event.eventAction;
			const date = (event.eventDate || "").slice(0, 10); // Just the date part
			if (action === "expiration") {
				result.expiration = date;
			} else if (action === "registration") {
				result.creation = date;
			}
		}

		return result;
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			return {
				domain,
				status: "unknown",
				error: "Request timeout",
			};
		}
		return {
			domain,
			status: "unknown",
			error: String(error),
		};
	}
}

/**
 * Check availability of multiple domains with rate limiting
 */
export async function checkDomains(domains: string[], delayMs = 500): Promise<DomainCheckResult[]> {
	const results: DomainCheckResult[] = [];

	for (let i = 0; i < domains.length; i++) {
		const result = await checkDomain(domains[i]);
		results.push(result);

		// Rate limiting - don't hammer the servers
		if (i < domains.length - 1 && delayMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
		}
	}

	return results;
}

/**
 * Check multiple domains in parallel with concurrency limit
 */
export async function checkDomainsParallel(
	domains: string[],
	maxConcurrent = 5,
	delayBetweenBatches = 500,
): Promise<DomainCheckResult[]> {
	const results: DomainCheckResult[] = new Array(domains.length);

	// Process in batches
	for (let i = 0; i < domains.length; i += maxConcurrent) {
		const batch = domains.slice(i, i + maxConcurrent);
		const batchResults = await Promise.all(batch.map((domain) => checkDomain(domain)));

		// Store results in original order
		for (let j = 0; j < batchResults.length; j++) {
			results[i + j] = batchResults[j];
		}

		// Delay between batches
		if (i + maxConcurrent < domains.length && delayBetweenBatches > 0) {
			await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
		}
	}

	return results;
}
