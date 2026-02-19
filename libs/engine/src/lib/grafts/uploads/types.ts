/**
 * Upload Management Graft Types
 */

export interface UploadManagementPanelProps {
  /** All tenants with their suspension status */
  tenants: TenantUploadRow[];
  /** Map of tenant ID to display name */
  tenantNames: Record<string, string>;
  /** Callback when suspending a tenant */
  onSuspend?: (tenantId: string) => void;
  /** Callback when unsuspending a tenant */
  onUnsuspend?: (tenantId: string) => void;
  /** Form action result for feedback messages */
  formResult?: { success?: boolean; error?: string; message?: string };
  /** Optional CSS class */
  class?: string;
}

export interface TenantUploadRow {
  tenantId: string;
  suspended: boolean;
}
