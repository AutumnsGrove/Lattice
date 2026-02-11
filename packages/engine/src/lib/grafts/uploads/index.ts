/**
 * Upload Management Graft
 *
 * Wayfinder-only admin panel for managing per-tenant upload suspension.
 *
 * @example
 * ```svelte
 * <script>
 *   import { UploadManagementPanel } from '@autumnsgrove/groveengine/grafts/uploads';
 * </script>
 *
 * <UploadManagementPanel
 *   tenants={data.tenants}
 *   tenantNames={data.tenantNames}
 *   onSuspend={handleSuspend}
 *   onUnsuspend={handleUnsuspend}
 *   formResult={form}
 * />
 * ```
 */

// Types
export type { UploadManagementPanelProps, TenantUploadRow } from "./types.js";

// Components
export { default as UploadManagementPanel } from "./UploadManagementPanel.svelte";
