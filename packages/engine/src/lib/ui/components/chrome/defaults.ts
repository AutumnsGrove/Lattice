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
  Waypoints,
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
  { href: "/contact", label: "Contact", icon: Waypoints },
  {
    href: "https://autumnsgrove.com/blog",
    label: "Blog",
    icon: PenLine,
    external: true,
  },
];

// Default resource links (for footer)
export const DEFAULT_RESOURCE_LINKS: FooterLink[] = [
  { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
  { href: "/roadmap", label: "Roadmap", icon: MapPin },
  { href: "/roadmap/workshop", label: "Workshop", icon: Hammer },
  { href: "/forest", label: "Forest", icon: Trees },
  { href: "/vineyard", label: "Vineyard", icon: Grape },
  { href: "/pricing", label: "Pricing", icon: Tag },
  { href: "/manifesto", label: "Manifesto", icon: Scroll },
  { href: "/vision", label: "Our Vision", icon: Telescope },
];

// Default connect links (for footer)
export const DEFAULT_CONNECT_LINKS: FooterLink[] = [
  { href: "/contact", label: "Contact", icon: Mail },
  {
    href: "https://autumnsgrove.com/blog",
    label: "Blog",
    icon: PenLine,
    external: true,
  },
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
