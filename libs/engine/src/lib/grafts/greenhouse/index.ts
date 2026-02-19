/**
 * Greenhouse Graft
 *
 * UI components for managing the greenhouse program - a trusted-tester tier
 * that allows selected tenants early access to experimental features.
 *
 * @example Tenant-facing status display
 * ```svelte
 * <script>
 *   import { GreenhouseStatusCard } from '@autumnsgrove/lattice/grafts/greenhouse';
 *   let { data } = $props();
 * </script>
 *
 * <GreenhouseStatusCard
 *   inGreenhouse={data.isInGreenhouse}
 *   enrolledAt={data.enrolledAt}
 * />
 * ```
 *
 * @example Operator admin UI
 * ```svelte
 * <script>
 *   import {
 *     GreenhouseEnrollTable,
 *     GreenhouseEnrollDialog
 *   } from '@autumnsgrove/lattice/grafts/greenhouse';
 *   let { data } = $props();
 *   let showDialog = $state(false);
 * </script>
 *
 * <GreenhouseEnrollTable
 *   tenants={data.tenants}
 *   tenantNames={data.tenantNames}
 *   onToggle={handleToggle}
 *   onRemove={handleRemove}
 * />
 *
 * <GreenhouseEnrollDialog
 *   open={showDialog}
 *   availableTenants={data.availableTenants}
 *   onClose={() => showDialog = false}
 *   onEnroll={handleEnroll}
 * />
 * ```
 */

// Types
export type {
  GreenhouseStatusCardProps,
  GreenhouseEnrollTableProps,
  GreenhouseEnrollDialogProps,
  GreenhouseToggleProps,
  GreenhousePageData,
  GreenhouseActionResult,
  // Cultivate Mode types
  FeatureFlagSummary,
  CultivateFlagRowProps,
  CultivateFlagTableProps,
  // Tenant Graft Control types
  TenantGraftInfo,
  GraftControlPanelProps,
  GraftToggleRowProps,
  // Tenant Detail Section types (Wayfinder per-tenant admin)
  TenantGreenhouseSectionProps,
  TenantUploadSectionProps,
  TenantGraftSectionProps,
  // Admin Panel types (Wayfinder-only)
  GreenhouseAdminPanelProps,
} from "./types.js";

// Components
export { default as GreenhouseStatusCard } from "./GreenhouseStatusCard.svelte";
export { default as GreenhouseEnrollTable } from "./GreenhouseEnrollTable.svelte";
export { default as GreenhouseEnrollDialog } from "./GreenhouseEnrollDialog.svelte";
export { default as GreenhouseToggle } from "./GreenhouseToggle.svelte";

// Cultivate Mode components
export { default as CultivateFlagRow } from "./CultivateFlagRow.svelte";
export { default as CultivateFlagTable } from "./CultivateFlagTable.svelte";

// Tenant Graft Control components (self-serve)
export { default as GraftControlPanel } from "./GraftControlPanel.svelte";
export { default as GraftToggleRow } from "./GraftToggleRow.svelte";

// Tenant Detail Sections (Wayfinder per-tenant admin)
export { default as TenantGreenhouseSection } from "./TenantGreenhouseSection.svelte";
export { default as TenantUploadSection } from "./TenantUploadSection.svelte";
export { default as TenantGraftSection } from "./TenantGraftSection.svelte";

// Admin Panel (Wayfinder-only)
export { default as GreenhouseAdminPanel } from "./GreenhouseAdminPanel.svelte";
