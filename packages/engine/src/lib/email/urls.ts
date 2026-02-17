/**
 * Grove Email URL Helpers
 *
 * Smart links that work across tenants by redirecting through grove.place/go/
 * This allows email templates to use consistent URLs that resolve to each
 * user's individual arbor panel at click time.
 *
 * @example
 * ```tsx
 * import { GROVE_URLS } from '@autumnsgrove/lattice/email/urls';
 *
 * <GroveButton href={GROVE_URLS.ARBOR_PANEL}>
 *   Go to your grove
 * </GroveButton>
 * ```
 */

const BASE_URL = "https://grove.place";
const GO_PREFIX = `${BASE_URL}/go`;

/**
 * Smart URLs for email templates
 *
 * These redirect through /go/* which resolves the user's tenant
 * and sends them to their specific arbor panel.
 */
export const GROVE_URLS = {
  // Landing pages (no auth needed)
  HOME: BASE_URL,
  ABOUT: `${BASE_URL}/about`,
  PRICING: `${BASE_URL}/pricing`,
  CHANGELOG: `${BASE_URL}/changelog`,

  // Smart links (redirect to user's arbor panel)
  ARBOR_PANEL: `${GO_PREFIX}/arbor`,
  NEW_POST: `${GO_PREFIX}/arbor/posts/new`,
  SETTINGS: `${GO_PREFIX}/arbor/settings`,
  APPEARANCE: `${GO_PREFIX}/arbor/settings/appearance`,
  POSTS: `${GO_PREFIX}/arbor/posts`,
  PAGES: `${GO_PREFIX}/arbor/pages`,

  // External
  PLANT: "https://plant.grove.place",
} as const;

/**
 * Build a smart link URL with optional UTM parameters
 *
 * @example
 * ```ts
 * // Basic usage
 * buildGoUrl('arbor/posts/new')
 * // → "https://grove.place/go/arbor/posts/new"
 *
 * // With UTM tracking
 * buildGoUrl('arbor', { utm_source: 'email', utm_campaign: 'welcome' })
 * // → "https://grove.place/go/arbor?utm_source=email&utm_campaign=welcome"
 * ```
 */
export function buildGoUrl(
  path: string,
  params?: Record<string, string>,
): string {
  const url = new URL(`${GO_PREFIX}/${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

/**
 * Build a URL with email campaign tracking
 *
 * @example
 * ```ts
 * buildEmailUrl('arbor', 'welcome-sequence', 'day-1')
 * // → "https://grove.place/go/arbor?utm_source=email&utm_medium=sequence&utm_campaign=welcome-sequence&utm_content=day-1"
 * ```
 */
export function buildEmailUrl(
  path: string,
  campaign: string,
  content?: string,
): string {
  const params: Record<string, string> = {
    utm_source: "email",
    utm_medium: "sequence",
    utm_campaign: campaign,
  };

  if (content) {
    params.utm_content = content;
  }

  return buildGoUrl(path, params);
}
