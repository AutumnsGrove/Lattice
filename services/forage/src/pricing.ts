/**
 * Cloudflare Registrar pricing lookup using cfdomainpricing.com
 *
 * Uses a third-party maintained JSON endpoint with all Cloudflare Registrar prices.
 * Cloudflare uses fixed TLD-based pricing with no premium domain markups.
 *
 * Features:
 * - In-memory caching with 24-hour TTL
 * - Graceful fallback on fetch failures
 * - Batch pricing lookups for efficiency
 */

const PRICING_API_URL = "https://cfdomainpricing.com/prices.json";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Pricing thresholds (in cents)
const BUNDLED_MAX_CENTS = 3000; // $30/year
const RECOMMENDED_MAX_CENTS = 5000; // $50/year
const PREMIUM_ABOVE_CENTS = 5000; // $50/year

/**
 * Pricing data structure from cfdomainpricing.com
 */
interface TldPricingData {
	registration: number; // USD
	renewal: number; // USD
}

/**
 * Processed domain price information
 */
export interface DomainPrice {
	domain: string;
	tld: string;
	priceCents: number;
	renewalCents: number;
	currency: "USD";
	category: "bundled" | "recommended" | "standard" | "premium";
	isBundled: boolean;
	isRecommended: boolean;
	isPremium: boolean;
}

/**
 * In-memory pricing cache
 */
let pricingCache: Map<string, TldPricingData> | null = null;
let cacheLoadedAt: number | null = null;

/**
 * Categorize price based on thresholds
 */
function categorizePrice(
	priceCents: number,
): Pick<DomainPrice, "category" | "isBundled" | "isRecommended" | "isPremium"> {
	const isBundled = priceCents <= BUNDLED_MAX_CENTS;
	const isRecommended = priceCents <= RECOMMENDED_MAX_CENTS;
	const isPremium = priceCents >= PREMIUM_ABOVE_CENTS;

	let category: DomainPrice["category"];
	if (isBundled) {
		category = "bundled";
	} else if (isRecommended) {
		category = "recommended";
	} else if (isPremium) {
		category = "premium";
	} else {
		category = "standard";
	}

	return { category, isBundled, isRecommended, isPremium };
}

/**
 * Fetch pricing data from cfdomainpricing.com
 */
async function fetchPricingData(): Promise<Map<string, TldPricingData>> {
	const response = await fetch(PRICING_API_URL, {
		headers: {
			Accept: "application/json",
			"User-Agent": "Forage/1.0",
		},
	});

	if (!response.ok) {
		throw new Error(`Failed to fetch pricing: ${response.status} ${response.statusText}`);
	}

	const data = (await response.json()) as Record<string, TldPricingData>;

	// Convert to Map for efficient lookups
	const priceMap = new Map<string, TldPricingData>();
	for (const [tld, pricing] of Object.entries(data)) {
		priceMap.set(tld.toLowerCase(), pricing);
	}

	return priceMap;
}

/**
 * Ensure pricing cache is loaded and fresh
 */
async function ensureCacheLoaded(): Promise<void> {
	// Check if we have fresh cache
	if (pricingCache && cacheLoadedAt) {
		const cacheAge = Date.now() - cacheLoadedAt;
		if (cacheAge < CACHE_TTL_MS) {
			return;
		}
	}

	// Need to fetch fresh data
	try {
		pricingCache = await fetchPricingData();
		cacheLoadedAt = Date.now();
		console.log(`Loaded pricing for ${pricingCache.size} TLDs`);
	} catch (error) {
		// If we have stale cache, use it
		if (pricingCache) {
			console.warn("Failed to refresh pricing, using stale cache:", error);
			return;
		}
		throw error;
	}
}

/**
 * Get pricing for a specific TLD
 *
 * @param tld - Top-level domain (e.g., "com", "io", "dev")
 * @returns TLD pricing or null if not supported by Cloudflare
 */
export async function getTldPricing(tld: string): Promise<DomainPrice | null> {
	await ensureCacheLoaded();

	const normalizedTld = tld.toLowerCase().replace(/^\./, "");
	const pricing = pricingCache?.get(normalizedTld);

	if (!pricing) {
		return null;
	}

	const priceCents = Math.round(pricing.registration * 100);
	const renewalCents = Math.round(pricing.renewal * 100);
	const categories = categorizePrice(priceCents);

	return {
		domain: `.${normalizedTld}`,
		tld: normalizedTld,
		priceCents,
		renewalCents,
		currency: "USD",
		...categories,
	};
}

/**
 * Get pricing for a full domain name
 *
 * @param domain - Full domain name (e.g., "example.com")
 * @returns Domain pricing or null if TLD not supported by Cloudflare
 */
export async function getDomainPricing(domain: string): Promise<DomainPrice | null> {
	const tld = domain.toLowerCase().split(".").pop();
	if (!tld) return null;

	const tldPricing = await getTldPricing(tld);
	if (!tldPricing) return null;

	return {
		...tldPricing,
		domain,
		tld,
	};
}

/**
 * Get pricing for multiple domains efficiently
 *
 * @param domains - List of domain names
 * @returns Map of domain -> DomainPrice (only for supported TLDs)
 */
export async function getBatchPricing(domains: string[]): Promise<Map<string, DomainPrice>> {
	await ensureCacheLoaded();

	const results = new Map<string, DomainPrice>();

	for (const domain of domains) {
		const tld = domain.toLowerCase().split(".").pop();
		if (!tld) continue;

		const pricing = pricingCache?.get(tld);
		if (!pricing) continue;

		const priceCents = Math.round(pricing.registration * 100);
		const renewalCents = Math.round(pricing.renewal * 100);
		const categories = categorizePrice(priceCents);

		results.set(domain, {
			domain,
			tld,
			priceCents,
			renewalCents,
			currency: "USD",
			...categories,
		});
	}

	return results;
}

/**
 * Get list of all TLDs supported by Cloudflare Registrar
 */
export async function getSupportedTlds(): Promise<string[]> {
	await ensureCacheLoaded();
	return Array.from(pricingCache?.keys() ?? []);
}

/**
 * Check if a TLD is supported by Cloudflare Registrar
 * Note: Requires cache to be loaded (call any pricing function first)
 */
export function isTldSupported(tld: string): boolean {
	const normalizedTld = tld.toLowerCase().replace(/^\./, "");
	return pricingCache?.has(normalizedTld) ?? false;
}

/**
 * Get pricing in cents for a domain (convenience function)
 * Returns null if TLD not supported
 */
export async function getDomainPriceCents(domain: string): Promise<number | null> {
	const pricing = await getDomainPricing(domain);
	return pricing?.priceCents ?? null;
}

/**
 * Force refresh the pricing cache
 */
export async function refreshPricingCache(): Promise<void> {
	pricingCache = await fetchPricingData();
	cacheLoadedAt = Date.now();
}
