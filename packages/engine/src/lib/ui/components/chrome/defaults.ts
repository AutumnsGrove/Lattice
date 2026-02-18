import type { NavItem, FooterLink } from "./types";
import {
  Scroll,
  Telescope,
  MapPin,
  Tag,
  BookOpen,
  Trees,
  Users,
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
  HeartPulse,
  Blinds,
  Coffee,
  Inbox,
  Armchair,
} from "lucide-svelte";
import BlueSky from "../icons/BlueSky.svelte";

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
  { href: "/canopy", label: "Canopy", icon: Users, termSlug: "canopy" },
  {
    href: "https://autumn.grove.place/garden",
    label: "Garden",
    icon: PenLine,
    external: true,
    termSlug: "your-garden",
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
  { href: "/canopy", label: "Canopy", icon: Users, termSlug: "canopy" },
  {
    href: "https://autumn.grove.place/garden",
    label: "Garden",
    icon: PenLine,
    external: true,
    termSlug: "your-garden",
  },
];

// =============================================================================
// LANDING-SPECIFIC FOOTER LINKS (Desktop)
// =============================================================================
// These are grove.place-specific links that use relative URLs.
// Only used by the landing site's Footer wrapper — NOT safe for other properties.

// Resources section (desktop footer, landing only)
export const LANDING_RESOURCE_LINKS: FooterLink[] = [
  { href: "/workshop", label: "Workshop", icon: Hammer, termSlug: "workshop" },
  { href: "/vineyard", label: "Vineyard", icon: Grape, termSlug: "vineyard" },
  { href: "/forest", label: "Forest", icon: Trees, termSlug: "forests" },
  { href: "/journey", label: "Journey", icon: Footprints },
  { href: "/pulse", label: "Pulse", icon: HeartPulse },
  {
    href: "https://status.grove.place",
    label: "Status",
    icon: Activity,
    external: true,
  },
];

// Connect section (desktop footer, landing only)
export const LANDING_CONNECT_LINKS: FooterLink[] = [
  { href: "/hello", label: "Hello", icon: HeartHandshake },
  { href: "/feedback", label: "Feedback", icon: Inbox },
  { href: "/contact", label: "Contact", icon: Mail },
  { href: "/porch", label: "Porch", icon: Armchair, termSlug: "porch" },
  { href: "/contribute", label: "Contributing", icon: Coffee },
  {
    href: "https://bsky.app/profile/groveplace.bsky.social",
    label: "Bluesky",
    icon: BlueSky,
    external: true,
  },
  {
    href: "https://github.com/AutumnsGrove/GroveEngine",
    label: "GitHub",
    icon: Github,
    external: true,
  },
];

// =============================================================================
// LANDING-SPECIFIC MOBILE MENU FOOTER SECTIONS
// =============================================================================

// Resources section (mobile menu, landing only)
export const LANDING_MOBILE_RESOURCE_LINKS: FooterLink[] = [
  { href: "/workshop", label: "Workshop", icon: Hammer, termSlug: "workshop" },
  { href: "/vineyard", label: "Vineyard", icon: Grape, termSlug: "vineyard" },
  { href: "/forest", label: "Forest", icon: Trees, termSlug: "forests" },
  { href: "/journey", label: "Journey", icon: Footprints },
  { href: "/pulse", label: "Pulse", icon: HeartPulse },
  {
    href: "https://status.grove.place",
    label: "Status",
    icon: Activity,
    external: true,
  },
];

// Connect section (mobile menu, landing only)
export const LANDING_MOBILE_CONNECT_LINKS: FooterLink[] = [
  { href: "/hello", label: "Hello", icon: HeartHandshake },
  { href: "/feedback", label: "Feedback", icon: Inbox },
  { href: "/contact", label: "Contact", icon: Mail },
  { href: "/porch", label: "Porch", icon: Armchair, termSlug: "porch" },
  { href: "/contribute", label: "Contributing", icon: Coffee },
  {
    href: "https://bsky.app/profile/groveplace.bsky.social",
    label: "Bluesky",
    icon: BlueSky,
    external: true,
  },
  {
    href: "https://github.com/AutumnsGrove/GroveEngine",
    label: "GitHub",
    icon: Github,
    external: true,
  },
];

// =============================================================================
// LANDING-SPECIFIC LEGAL LINKS
// =============================================================================

// Legal links with relative URLs (landing only)
export const LANDING_LEGAL_LINKS: FooterLink[] = [
  { href: "/knowledge/legal/privacy-policy", label: "Privacy" },
  { href: "/knowledge/legal/terms-of-service", label: "Terms" },
  { href: "/shade", label: "Shade", icon: Blinds, termSlug: "shade" },
];

// =============================================================================
// SHARED DEFAULTS (safe for all properties)
// =============================================================================
// Non-landing properties get empty resource/connect columns and absolute legal URLs.
// This prevents broken relative links on subdomains like plant.grove.place.

export const DEFAULT_RESOURCE_LINKS: FooterLink[] = [];
export const DEFAULT_CONNECT_LINKS: FooterLink[] = [];
export const DEFAULT_MOBILE_RESOURCE_LINKS: FooterLink[] = [];
export const DEFAULT_MOBILE_CONNECT_LINKS: FooterLink[] = [];
export const DEFAULT_LEGAL_LINKS: FooterLink[] = [
  {
    href: "https://grove.place/knowledge/legal/privacy-policy",
    label: "Privacy",
  },
  {
    href: "https://grove.place/knowledge/legal/terms-of-service",
    label: "Terms",
  },
];
