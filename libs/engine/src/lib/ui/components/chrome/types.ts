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
 * Props for the AccountStatus component — unified auth display for chrome headers.
 *
 * Three visual states:
 * - Loading: skeleton pulse circle
 * - Unauthenticated: sign-in link with LogIn icon
 * - Authenticated: avatar + name, optional dropdown with sign-out
 */
export interface AccountStatusProps {
  /** Server-driven user object. null = not logged in, undefined = unknown/loading */
  user?: HeaderUser | null;
  /** Explicit loading state (shows skeleton). Defaults to false. */
  loading?: boolean;
  /** Sign-in URL (default: "https://heartwood.grove.place") */
  signInHref?: string;
  /** Label for sign-in link (default: "Sign in") */
  signInLabel?: string;
  /** Where clicking the avatar navigates (default: "/arbor") */
  userHref?: string;
  /** Sign-out URL (default: "/logout") */
  signOutHref?: string;
  /** Label for sign-out action (default: "Sign out") */
  signOutLabel?: string;
  /** Avatar-only mode — hides name text (default: false) */
  compact?: boolean;
  /** When false, avatar links directly to userHref with no dropdown (default: true) */
  dropdown?: boolean;
  /** Injectable custom dropdown items rendered between user info and sign-out */
  menuItems?: import("svelte").Snippet;
}

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
  manifest?: Record<
    string,
    { term: string; standardTerm?: string; alwaysGrove?: boolean }
  >,
): string {
  if (!item.termSlug || !manifest) return item.label;
  const entry = manifest[item.termSlug];
  if (!entry) return item.label;
  if (entry.alwaysGrove) return entry.term;
  return groveMode ? entry.term : entry.standardTerm || entry.term;
}
