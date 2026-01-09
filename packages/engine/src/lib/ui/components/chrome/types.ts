import type { Component, ComponentType, SvelteComponent } from 'svelte';

// Re-export Season type for convenience
export type { Season } from '../nature/palette';

/**
 * Flexible icon type that accepts:
 * - Svelte 5 Component type
 * - Legacy SvelteComponent/SvelteComponentTyped (Lucide icons)
 * - Any component constructor
 *
 * This allows cross-package compatibility when Lucide versions differ.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IconComponent = Component | ComponentType<SvelteComponent<any>> | (new (...args: any[]) => any);

export interface NavItem {
  href: string;
  label: string;
  icon?: IconComponent;
  external?: boolean;
}

export interface FooterLink {
  href: string;
  label: string;
  icon?: IconComponent;
  external?: boolean;
}

export type MaxWidth = "narrow" | "default" | "wide";

/**
 * Check if a navigation item is active based on the current path
 */
export function isActivePath(href: string, currentPath: string): boolean {
  if (href === '/') return currentPath === '/';
  return currentPath.startsWith(href);
}
