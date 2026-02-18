/**
 * Wayfinder Dashboard Links
 *
 * External service URLs displayed in the Landing arbor dashboard.
 * Account IDs and project UUIDs extracted here so they live in
 * one place instead of scattered across Svelte templates.
 */

const CF_ACCOUNT_ID = "04e847fa7655624e84414a8280b3a4d0";
const KNOWN_AGENTS_PROJECT_ID = "378d0348-a640-4be0-9a60-fbd306d6bf4e";
const LANGFUSE_PROJECT_ID = "cmlf7boc10248ad070td8wrpu";
const GITHUB_ORG = "AutumnsGrove";

export const WAYFINDER_LINKS = {
  github: {
    repo: `https://github.com/${GITHUB_ORG}/Lattice`,
    issues: `https://github.com/${GITHUB_ORG}/Lattice/issues`,
    project: `https://github.com/users/${GITHUB_ORG}/projects/1`,
  },
  cloudflare: {
    domains: `https://dash.cloudflare.com/${CF_ACCOUNT_ID}/home/domains`,
    analytics: `https://dash.cloudflare.com/${CF_ACCOUNT_ID}/grove.place`,
  },
  knownAgents: `https://knownagents.com/projects/${KNOWN_AGENTS_PROJECT_ID}/crawlers-and-scrapers`,
  langfuse: `https://us.cloud.langfuse.com/project/${LANGFUSE_PROJECT_ID}`,
  stripe: "https://dashboard.stripe.com",
  myArbor: "https://autumn.grove.place/arbor",
} as const;

export type WayfinderLinks = typeof WAYFINDER_LINKS;
