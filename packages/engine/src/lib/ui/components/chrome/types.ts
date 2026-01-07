import type { Component } from 'svelte';

// Re-export Season type for convenience
export type { Season } from '../nature/palette';

export interface NavItem {
  href: string;
  label: string;
  icon?: Component;
  external?: boolean;
}

export interface FooterLink {
  href: string;
  label: string;
  icon?: Component;
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
