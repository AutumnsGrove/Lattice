/**
 * Arbor Component Types
 *
 * Type definitions for the ArborPanel component family — the first-class
 * admin panel shell for Grove consumers.
 */

import type { Snippet } from "svelte";
import type { IconComponent } from "../chrome/types";

// Re-export for consumer convenience
export type { IconComponent };

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

/**
 * A single navigable item in the Arbor sidebar.
 *
 * `kind` defaults to `'item'` and can be omitted for brevity.
 */
export interface ArborNavItem {
  kind?: "item";
  /** Route path this item links to */
  href: string;
  /** Display label */
  label: string;
  /** Lucide icon component (or any Svelte component accepting `class`) */
  icon?: IconComponent;
  /** Badge count — shows a breathing activity dot when > 0 */
  badge?: number;
  /** Force-show the activity dot even without a badge count */
  showActivity?: boolean;
  /** Grove Mode term slug for label resolution (e.g., "reeds", "arbor") */
  termSlug?: string;
  /** Permission strings the user must have to see this item (all required) */
  requiredPermissions?: string[];
  /** When `false`, the item is hidden (useful for feature gating) */
  visible?: boolean;
}

/**
 * A visual separator between groups of nav items.
 */
export interface ArborNavDivider {
  kind: "divider";
  /** Optional group label displayed above the divider (e.g., "Wayfinder Tools") */
  label?: string;
  /** Divider rendering style (default: `'line'`) */
  style?: ArborDividerStyle;
}

/**
 * Divider rendering style:
 * - `'line'`  — Simple horizontal rule (default)
 * - `'grove'` — GroveDivider component (alternating Grove logos, xs size)
 * - `string`  — Any unicode character repeated as the separator (e.g., '·', '✦', '🌿')
 */
export type ArborDividerStyle = "line" | "grove" | (string & {});

/** Union type for sidebar navigation entries */
export type ArborNavEntry = ArborNavItem | ArborNavDivider;

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------

/** A link rendered in the sidebar footer (Help Center, Support, etc.) */
export interface ArborFooterLink {
  href: string;
  label: string;
  icon?: IconComponent;
  /** Opens in a new tab when true */
  external?: boolean;
}

// ---------------------------------------------------------------------------
// Component Props
// ---------------------------------------------------------------------------

/** Props for the main `<ArborPanel>` shell component */
export interface ArborPanelProps {
  /** Navigation entries for the sidebar (items and optional dividers) */
  navItems: ArborNavEntry[];
  /** User permission strings — items with `requiredPermissions` are hidden unless all are present */
  userPermissions?: string[];
  /** Footer links (Help, Support, etc.) — used by the default footer */
  footerLinks?: ArborFooterLink[];
  /** User info for footer display — used by the default footer.
   *  Accepts any user object with at least email/name (extra fields are ignored). */
  user?: {
    email?: string;
    name?: string | null;
    [key: string]: unknown;
  } | null;
  /** Brand title in sidebar header (default: "Arbor") */
  brandTitle?: string;
  /** Whether to show the Grove logo in sidebar header (default: true) */
  showLogo?: boolean;
  /** Logout href — used by the default footer */
  logoutHref?: string;
  /** Logout callback — used by the default footer (alternative to logoutHref) */
  onLogout?: () => void;
  /** Messages to auto-render via GroveMessages above content */
  messages?: Array<{
    id: string;
    title: string;
    body: string;
    message_type: "info" | "warning" | "celebration" | "update";
    pinned: boolean;
    created_at: string;
  }>;
  /** Shows the floating "Demo Mode" banner */
  isDemoMode?: boolean;
  /** Whether to apply the leaf-pattern background (default: true) */
  showLeafPattern?: boolean;
  /** Custom snippet for sidebar header (replaces default logo + title) */
  sidebarHeader?: Snippet;
  /** Custom snippet for sidebar footer (replaces default user + logout) */
  sidebarFooter?: Snippet;
  /** Content slot */
  children: Snippet;
}

/** Props for the `<ArborSection>` page wrapper */
export interface ArborSectionProps {
  /** Section title */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Icon to show next to title */
  icon?: IconComponent;
  /** Grove Mode term slug for title resolution */
  termSlug?: string;
  /** Actions snippet (buttons, etc.) rendered in the header row */
  actions?: Snippet;
  /** Main content */
  children: Snippet;
}
