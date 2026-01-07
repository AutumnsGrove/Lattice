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
  CircleDollarSign,
  Send,
  Github,
  ExternalLink,
  Mail,
  Hammer,
  Grape,
} from "lucide-svelte";

// Default navigation items (desktop)
export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { href: "/manifesto", label: "Manifesto", icon: Scroll },
  { href: "/vision", label: "Vision", icon: Telescope },
  { href: "/roadmap", label: "Roadmap", icon: MapPin },
  { href: "/pricing", label: "Pricing", icon: Tag },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/forest", label: "Forest", icon: Trees },
  {
    href: "https://autumnsgrove.com/blog",
    label: "Blog",
    icon: PenLine,
    external: true,
  },
];

// Default mobile navigation items (includes Home and Contact)
export const DEFAULT_MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/manifesto", label: "Manifesto", icon: Scroll },
  { href: "/vision", label: "Vision", icon: Telescope },
  { href: "/roadmap", label: "Roadmap", icon: MapPin },
  { href: "/pricing", label: "Pricing", icon: CircleDollarSign },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/forest", label: "Forest", icon: Trees },
  { href: "/contact", label: "Contact", icon: Send },
  {
    href: "https://autumnsgrove.com/blog",
    label: "Blog",
    icon: PenLine,
    external: true,
  },
];

// Default resource links (for footer) - deduplicated from nav
// Only includes items NOT in DEFAULT_NAV_ITEMS
export const DEFAULT_RESOURCE_LINKS: FooterLink[] = [
  { href: "/roadmap/workshop", label: "Workshop", icon: Hammer },
  { href: "/vineyard", label: "Vineyard", icon: Grape },
];

// Default connect links (for footer) - deduplicated from nav
// Only includes items NOT in DEFAULT_NAV_ITEMS
export const DEFAULT_CONNECT_LINKS: FooterLink[] = [
  { href: "/contact", label: "Contact", icon: Mail },
  {
    href: "https://github.com/AutumnsGrove/GroveEngine",
    label: "GitHub",
    icon: Github,
    external: true,
  },
];

// Mobile menu footer sections - unique items not in mobile nav
// Resources: Workshop, Vineyard (nav already has Knowledge, Roadmap, Forest, Pricing, Manifesto, Vision)
export const DEFAULT_MOBILE_RESOURCE_LINKS: FooterLink[] = [
  { href: "/roadmap/workshop", label: "Workshop", icon: Hammer },
  { href: "/vineyard", label: "Vineyard", icon: Grape },
];

// Connect: GitHub only (nav already has Contact, Blog)
export const DEFAULT_MOBILE_CONNECT_LINKS: FooterLink[] = [
  {
    href: "https://github.com/AutumnsGrove/GroveEngine",
    label: "GitHub",
    icon: Github,
    external: true,
  },
];

// Default legal links (for footer)
export const DEFAULT_LEGAL_LINKS: FooterLink[] = [
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
];
