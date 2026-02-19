/**
 * Tenant Navigation Builder
 *
 * Transforms tenant database configuration into NavItem[] format
 * for use with the chrome Header/MobileMenu components.
 *
 * This utility bridges the gap between tenant-specific data (nav pages,
 * feature flags) and the unified navigation components.
 */

import type { NavItem } from "./types";
import { Home, BookOpen, Image, Clock, User, FileText } from "lucide-svelte";
import type { IconComponent } from "./types";

/**
 * A navigation page from the tenant's database
 */
export interface TenantNavPage {
  slug: string;
  title: string;
}

/**
 * Configuration options for building tenant navigation
 */
export interface TenantNavOptions {
  /** The tenant site name (e.g., "Autumn's Grove") */
  siteName: string;

  /** Custom navigation pages from the database */
  navPages?: TenantNavPage[];

  /** Whether to show the Timeline/Trail link */
  showTimeline?: boolean;

  /** Whether to show the Gallery link */
  showGallery?: boolean;
}

/**
 * Icon mapping for common page slugs.
 * Falls back to FileText for unknown slugs.
 */
const PAGE_ICONS: Record<string, IconComponent> = {
  home: Home,
  blog: BookOpen,
  garden: BookOpen,
  gallery: Image,
  timeline: Clock,
  trail: Clock,
  about: User,
};

/**
 * Builds navigation items for a tenant site.
 *
 * @param options - Tenant configuration from database/context
 * @returns Array of NavItem objects for Header/MobileMenu
 *
 * @example
 * ```ts
 * const navItems = buildTenantNavItems({
 *   siteName: "Autumn's Grove",
 *   navPages: [{ slug: 'portfolio', title: 'Portfolio' }],
 *   showGallery: true,
 * });
 * ```
 */
export function buildTenantNavItems(options: TenantNavOptions): NavItem[] {
  const items: NavItem[] = [
    { href: "/", label: "Home", icon: Home },
    { href: "/garden", label: "Garden", icon: BookOpen },
  ];

  // Add optional sections based on tenant config
  if (options.showTimeline) {
    items.push({ href: "/timeline", label: "Timeline", icon: Clock });
  }
  if (options.showGallery) {
    items.push({ href: "/gallery", label: "Gallery", icon: Image });
  }

  // Add custom nav pages from database
  for (const page of options.navPages ?? []) {
    const slug = page.slug.toLowerCase();
    // Skip if already added (home, garden, gallery, timeline)
    if (["home", "garden", "blog", "gallery", "timeline"].includes(slug)) {
      continue;
    }

    items.push({
      href: `/${page.slug}`,
      label: page.title,
      icon: PAGE_ICONS[slug] ?? FileText,
    });
  }

  // About always last (unless it was added as a custom page)
  const hasAbout = items.some(
    (item) => item.href === "/about" || item.label.toLowerCase() === "about",
  );
  if (!hasAbout) {
    items.push({ href: "/about", label: "About", icon: User });
  }

  return items;
}
