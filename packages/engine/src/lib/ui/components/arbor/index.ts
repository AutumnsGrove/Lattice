/**
 * Arbor Component Family
 *
 * First-class admin panel shell for Grove consumers. Provides a glass sidebar
 * with navigation, utility bar (collapsed icon rail), mobile slide-in, and
 * composable section layout — so building an admin experience feels like
 * snapping Legos together.
 *
 * @example
 * ```svelte
 * <script>
 *   import { ArborPanel, ArborSection } from '@autumnsgrove/groveengine/ui/arbor';
 * </script>
 *
 * <ArborPanel {navItems} {footerLinks} user={data.user}>
 *   <ArborSection title="Dashboard">
 *     ...page content
 *   </ArborSection>
 * </ArborPanel>
 * ```
 */

// Public components
export { default as ArborOverlay } from "./ArborOverlay.svelte";
export { default as ArborPanel } from "./ArborPanel.svelte";
export { default as ArborSection } from "./ArborSection.svelte";
export { default as ArborSidebarFooter } from "./ArborSidebarFooter.svelte";
export { default as ArborSidebarHeader } from "./ArborSidebarHeader.svelte";
export { default as ArborToggle } from "./ArborToggle.svelte";

// Types
export type {
  ArborNavEntry,
  ArborNavItem,
  ArborNavDivider,
  ArborDividerStyle,
  ArborFooterLink,
  ArborPanelProps,
  ArborSectionProps,
  IconComponent,
} from "./types";

// Defaults
export { DEFAULT_ARBOR_FOOTER_LINKS } from "./defaults";

// Re-export sidebarStore for convenience
export { sidebarStore } from "../../stores/sidebar.svelte";
