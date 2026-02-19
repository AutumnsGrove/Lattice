/**
 * Arbor Defaults
 *
 * Default configuration values for ArborPanel consumers.
 */

import type { ArborFooterLink } from "./types";

/** Default footer links shared across Grove admin panels */
export const DEFAULT_ARBOR_FOOTER_LINKS: ArborFooterLink[] = [
  {
    href: "https://grove.place/knowledge/help",
    label: "Help Center",
    external: true,
  },
  {
    href: "https://grove.place/porch",
    label: "Get Support",
    external: true,
  },
];
