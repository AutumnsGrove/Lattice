import type { Component, ComponentType, SvelteComponent } from "svelte";

// Re-export Season type for convenience
export type { Season } from "../nature/palette";

/**
 * Flexible icon type that accepts:
 * - Svelte 5 Component type
 * - Legacy SvelteComponent/SvelteComponentTyped (Lucide icons)
 * - Any component constructor
 *
 * This allows cross-package compatibility when Lucide versions differ.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IconComponent =
  | Component
  | ComponentType<SvelteComponent<any>>
  | (new (...args: any[]) => any);

export interface NavItem {
  href: string;
  label: string;
  icon?: IconComponent;
  external?: boolean;
  /** Term slug for Grove Mode label resolution (e.g., "porch", "forests") */
  termSlug?: string;
}

/**
 * Tab item for AdminHeader navigation
 */
export interface AdminTab {
  href: string;
  label: string;
  icon?: IconComponent;
}

export interface FooterLink {
  href: string;
  label: string;
  icon?: IconComponent;
  external?: boolean;
  /** Term slug for Grove Mode label resolution */
  termSlug?: string;
}

/**
 * User object for header auth display
 */
export interface HeaderUser {
  id: string;
  name?: string | null;
  email?: string;
  avatarUrl?: string | null;
}

export type MaxWidth = "narrow" | "default" | "wide";

/**
 * Check if a navigation item is active based on the current path
 */
export function isActivePath(href: string, currentPath: string): boolean {
  if (href === "/") return currentPath === "/";
  return currentPath.startsWith(href);
}

/**
 * Resolve the display label for a nav/footer item based on Grove Mode state.
 *
 * When Grove Mode is ON: shows the Grove term from the manifest.
 * When Grove Mode is OFF: shows the standard term if available, otherwise the Grove term.
 * Falls back to the item's label prop if no termSlug or no manifest match.
 */
export function resolveNavLabel(
  item: NavItem | FooterLink,
  groveMode: boolean,
  manifest?: Record<string, { term: string; standardTerm?: string; alwaysGrove?: boolean }>
): string {
  if (!item.termSlug || !manifest) return item.label;
  const entry = manifest[item.termSlug];
  if (!entry) return item.label;
  if (entry.alwaysGrove) return entry.term;
  return groveMode ? entry.term : (entry.standardTerm || entry.term);
}
