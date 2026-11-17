/**
 * Grove subdomain rules
 *
 * A subdomain becomes a hostname, a Durable Object name, and part of a storage
 * key, so one definition has to decide what is acceptable. This is that
 * definition: Aspen's hooks, the operators worker and the CLI all describe the
 * same rule, and three copies of a regex is how they stop describing it.
 *
 * @see tools/grove-wrap-go/cmd/tenant.go — the Go side mirrors this for input
 * validation. It cannot import it; the tests on both sides pin the same cases.
 */

/**
 * Lowercase alphanumeric and hyphens, 1-63 characters, no leading or trailing
 * hyphen (RFC 1035 label rules).
 */
export const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/** Whether a string is a usable Grove subdomain. */
export function isValidSubdomain(subdomain: string): boolean {
	return SUBDOMAIN_PATTERN.test(subdomain);
}
