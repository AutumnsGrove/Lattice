/**
 * Short Links Configuration
 *
 * Single source of truth for link.grove.place: the host, slug rules, and the
 * generator alphabet. Validators, the redirect worker, and both Arbor surfaces
 * all read from here. See docs/specs/short-links-spec.md.
 */

import { GROVE_DOMAIN } from "../../utils/grove-url.js";

/** Subdomain the redirect worker answers on (also reserved in the domain blocklist). */
export const SHORT_LINK_SUBDOMAIN = "link";

/** Full short link host: link.grove.place */
export const SHORT_LINK_HOST = `${SHORT_LINK_SUBDOMAIN}.${GROVE_DOMAIN}`;

/** Base for share URLs: https://link.grove.place */
export const SHORT_LINK_BASE_URL = `https://${SHORT_LINK_HOST}`;

/** Where a post lives inside a grove: {subdomain}.grove.place/garden/{slug} */
export const SHORT_LINK_POST_PATH_PREFIX = "/garden/";

/** Where the bare host (no slug) sends visitors. */
export const SHORT_LINK_HOME_URL = `https://${GROVE_DOMAIN}`;

export const SHORT_LINK_SLUG_RULES = {
	minLength: 3,
	maxLength: 32,
	/** Lowercase letters, digits, single hyphens; no leading/trailing hyphen. */
	pattern: /^[a-z0-9]+(-[a-z0-9]+)*$/,
	patternDescription: "Use lowercase letters, numbers, and single hyphens between them",
} as const;

/** Generated slugs: 6 chars from an alphabet with no look-alikes (0/o, 1/i/l). */
export const SHORT_LINK_GENERATOR = {
	length: 6,
	alphabet: "23456789abcdefghjkmnpqrstuvwxyz",
	/** Retries when a generated slug collides or trips the offensive filter. */
	maxAttempts: 8,
} as const;

export const SHORT_LINK_MAX_TARGET_LENGTH = 2048;

/** Most links returned by one list call. */
export const SHORT_LINK_LIST_LIMIT = 200;
