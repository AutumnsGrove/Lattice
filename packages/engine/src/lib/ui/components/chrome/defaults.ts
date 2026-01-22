import type { NavItem, FooterLink } from "./types";
import {
  Scroll,
  Telescope,
  MapPin,
  Tag,
  BookOpen,
  Trees,
  PenLine,
  Home,
  HandCoins,
  Send,
  Github,
  ExternalLink,
  Mail,
  Hammer,
  Grape,
  Footprints,
  HeartHandshake,
  Activity,
  Blinds,
  Coffee,
} from "lucide-svelte";

// =============================================================================
// GROVE DIVIDER CONFIGURATION
// =============================================================================
// Standardized divider settings used across mobile menu and footer components.
// GroveDivider renders alternating Grove logos as decorative section separators.

/** Divider configuration for horizontal separators in mobile menu */
export const DIVIDER_HORIZONTAL = {
  count: 7,
  size: "xs" as const,
  glass: true,
} as const;

/** Divider configuration for vertical separators in desktop footer */
export const DIVIDER_VERTICAL = {
  count: 9,
  size: "xs" as const,
  glass: true,
  vertical: true,
  spacing: "0.5rem",
} as const;

// =============================================================================
// NAVIGATION ITEMS
// =============================================================================

// Default navigation items (desktop header)
export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { href: "/manifesto", label: "Manifesto", icon: Scroll },
  { href: "/vision", label: "Vision", icon: Telescope },
  { href: "/roadmap", label: "Roadmap", icon: MapPin },
  { href: "/pricing", label: "Pricing", icon: Tag },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/forest", label: "Forest", icon: Trees },
  {
    href: "https://autumn.grove.place/blog",
    label: "Blog",
    icon: PenLine,
    external: true,
  },
];

// Default mobile navigation items (includes Home)
export const DEFAULT_MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/manifesto", label: "Manifesto", icon: Scroll },
  { href: "/vision", label: "Vision", icon: Telescope },
  { href: "/roadmap", label: "Roadmap", icon: MapPin },
  { href: "/pricing", label: "Pricing", icon: HandCoins },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/forest", label: "Forest", icon: Trees },
  {
    href: "https://autumn.grove.place/blog",
    label: "Blog",
    icon: PenLine,
    external: true,
  },
];

// =============================================================================
// FOOTER LINKS (Desktop)
// =============================================================================
// These appear in the desktop footer. Deduplicated from nav to avoid redundancy.
// On mobile, footer hides these sections - they appear in the mobile overflow menu instead.

// Resources section (desktop footer)
// Excludes: Knowledge, Roadmap, Forest, Pricing, Manifesto, Vision (already in nav)
export const DEFAULT_RESOURCE_LINKS: FooterLink[] = [
  { href: "/workshop", label: "Workshop", icon: Hammer },
  { href: "/vineyard", label: "Vineyard", icon: Grape },
  { href: "/journey", label: "Journey", icon: Footprints },
  {
    href: "https://status.grove.place",
    label: "Status",
    icon: Activity,
    external: true,
  },
];

// Connect section (desktop footer)
// Excludes: Blog (already in nav)
export const DEFAULT_CONNECT_LINKS: FooterLink[] = [
  { href: "/hello", label: "Hello", icon: HeartHandshake },
  { href: "/contact", label: "Contact", icon: Mail },
  { href: "/support", label: "Support", icon: Coffee },
  {
    href: "https://github.com/AutumnsGrove/GroveEngine",
    label: "GitHub",
    icon: Github,
    external: true,
  },
];

// =============================================================================
// MOBILE MENU FOOTER SECTIONS
// =============================================================================
// These appear in the mobile overflow menu below the main nav items.
// Deduplicated from mobile nav to show only unique items.

// Resources section (mobile menu)
// Excludes: Knowledge, Roadmap, Forest, Pricing, Manifesto, Vision (in mobile nav)
export const DEFAULT_MOBILE_RESOURCE_LINKS: FooterLink[] = [
  { href: "/workshop", label: "Workshop", icon: Hammer },
  { href: "/vineyard", label: "Vineyard", icon: Grape },
  { href: "/journey", label: "Journey", icon: Footprints },
  {
    href: "https://status.grove.place",
    label: "Status",
    icon: Activity,
    external: true,
  },
];

// Connect section (mobile menu)
export const DEFAULT_MOBILE_CONNECT_LINKS: FooterLink[] = [
  { href: "/hello", label: "Hello", icon: HeartHandshake },
  { href: "/contact", label: "Contact", icon: Mail },
  { href: "/support", label: "Support", icon: Coffee },
  {
    href: "https://github.com/AutumnsGrove/GroveEngine",
    label: "GitHub",
    icon: Github,
    external: true,
  },
];

// =============================================================================
// LEGAL LINKS
// =============================================================================

// Default legal links (footer bottom bar)
export const DEFAULT_LEGAL_LINKS: FooterLink[] = [
  { href: "/knowledge/legal/privacy-policy", label: "Privacy" },
  { href: "/knowledge/legal/terms-of-service", label: "Terms" },
  { href: "/shade", label: "Shade", icon: Blinds },
];
