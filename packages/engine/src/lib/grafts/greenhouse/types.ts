/**
 * Greenhouse Graft Type Definitions
 *
 * Types for the GreenhouseGraft component system.
 * Components for managing and displaying greenhouse program status.
 */

import type { Snippet } from "svelte";
import type { BaseGraftProps } from "../types.js";
import type { GreenhouseTenant, FlagType } from "../../feature-flags/types.js";

// Re-export for convenience
export type { GreenhouseTenant };

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for GreenhouseStatusCard component.
 * Displays a tenant's greenhouse enrollment status.
 */
export interface GreenhouseStatusCardProps extends BaseGraftProps {
  /** Whether the tenant is currently in the greenhouse program */
  inGreenhouse: boolean;

  /** When the tenant was enrolled (if applicable) */
  enrolledAt?: Date;

  /** Notes about the enrollment (visible to tenant) */
  notes?: string;

  /** Custom content to render in the card footer */
  footer?: Snippet;
}

/**
 * Props for GreenhouseEnrollTable component.
 * Displays a table of enrolled greenhouse tenants for operators.
 */
export interface GreenhouseEnrollTableProps extends BaseGraftProps {
  /** Array of greenhouse tenant records */
  tenants: GreenhouseTenant[];

  /** Tenant names lookup (tenantId -> display name) */
  tenantNames?: Record<string, string>;

  /** Whether to show the toggle column */
  showToggle?: boolean;

  /** Whether to show the notes column */
  showNotes?: boolean;

  /** Whether to show the remove action */
  showRemove?: boolean;

  /** Called when toggling a tenant's enabled status */
  onToggle?: (tenantId: string, enabled: boolean) => void;

  /** Called when removing a tenant from greenhouse */
  onRemove?: (tenantId: string) => void;

  /** Called when clicking to edit notes */
  onEditNotes?: (tenantId: string) => void;
}

/**
 * Props for GreenhouseEnrollDialog component.
 * Modal dialog for enrolling a new tenant in greenhouse.
 */
export interface GreenhouseEnrollDialogProps extends BaseGraftProps {
  /** Whether the dialog is open */
  open: boolean;

  /** Available tenants to enroll (tenantId -> display name) */
  availableTenants: Record<string, string>;

  /** Called to close the dialog */
  onClose: () => void;

  /** Called when enrollment is confirmed */
  onEnroll: (tenantId: string, notes: string) => void;

  /** Whether enrollment is in progress (shows loading state) */
  loading?: boolean;
}

/**
 * Props for GreenhouseToggle component.
 * Simple toggle switch for enabling/disabling a tenant's greenhouse status.
 */
export interface GreenhouseToggleProps extends BaseGraftProps {
  /** Current enabled state */
  enabled: boolean;

  /** Tenant ID this toggle is for */
  tenantId: string;

  /** Whether the toggle is disabled */
  disabled?: boolean;

  /** Called when the toggle is clicked */
  onToggle: (tenantId: string, enabled: boolean) => void;
}

// =============================================================================
// SERVER DATA TYPES
// =============================================================================

/**
 * Data returned by greenhouse admin page load function.
 */
export interface GreenhousePageData {
  /** List of enrolled greenhouse tenants */
  tenants: GreenhouseTenant[];

  /** Map of tenant IDs to display names */
  tenantNames: Record<string, string>;

  /** Map of available (non-enrolled) tenant IDs to display names */
  availableTenants: Record<string, string>;
}

/**
 * Action result for greenhouse form actions.
 */
export interface GreenhouseActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

// =============================================================================
// CULTIVATE MODE TYPES
// =============================================================================

/**
 * Summary of a feature flag for the Cultivate Mode UI.
 */
export interface FeatureFlagSummary {
  /** Unique flag identifier */
  id: string;

  /** Human-readable flag name */
  name: string;

  /** Optional description */
  description?: string;

  /** Whether the flag is globally enabled (cultivated) */
  enabled: boolean;

  /** Whether the flag is only available to greenhouse tenants */
  greenhouseOnly: boolean;

  /** The type of flag value */
  flagType: FlagType;

  /** Default value when no rules match */
  defaultValue: unknown;

  /** Cache TTL in seconds (0 = no cache) */
  cacheTtl: number;
}

/**
 * Props for CultivateFlagRow component.
 * Displays a single feature flag with toggle for cultivate/prune.
 */
export interface CultivateFlagRowProps extends BaseGraftProps {
  /** The flag to display */
  flag: FeatureFlagSummary;

  /** Called when toggling the flag's enabled status */
  onToggle: (flagId: string, enabled: boolean) => void;

  /** Whether the row is in a loading state */
  loading?: boolean;
}

/**
 * Props for CultivateFlagTable component.
 * Displays a table of all feature flags with cultivate/prune controls.
 */
export interface CultivateFlagTableProps extends BaseGraftProps {
  /** Array of feature flag summaries */
  flags: FeatureFlagSummary[];

  /** Called when toggling a flag's enabled status */
  onToggle: (flagId: string, enabled: boolean) => void;

  /** Flag ID currently being toggled (for loading state) */
  loadingFlagId?: string;
}

// =============================================================================
// TENANT GRAFT CONTROL TYPES
// =============================================================================

/**
 * Information about a graft that a tenant can control.
 */
export interface TenantGraftInfo {
  /** Unique flag identifier */
  id: string;

  /** Human-readable flag name */
  name: string;

  /** Optional description explaining what this graft does */
  description?: string;

  /** Whether the graft is currently enabled for this tenant */
  enabled: boolean;

  /** Whether the tenant has a custom override (vs. using default) */
  hasOverride: boolean;

  /** The graft's global default value */
  globalDefault: boolean;

  /** Category for grouping */
  category: "experimental" | "stable" | "beta";
}

/**
 * Props for GraftControlPanel component.
 * Self-serve graft controls for greenhouse tenants.
 */
export interface GraftControlPanelProps extends BaseGraftProps {
  /** Array of grafts the tenant can control */
  grafts: TenantGraftInfo[];

  /** Current evaluated graft values from layout cascade */
  currentValues?: Record<string, boolean>;

  /** Called when toggling a graft's status */
  onToggle: (graftId: string, enabled: boolean) => void;

  /** Called when resetting all overrides to defaults */
  onReset: () => void;

  /** Graft ID currently being toggled (for loading state) */
  loadingGraftId?: string;

  /** Whether a reset is in progress */
  resetting?: boolean;
}

/**
 * Props for GraftToggleRow component.
 * Individual graft toggle for tenant self-serve.
 */
export interface GraftToggleRowProps extends BaseGraftProps {
  /** The graft to display */
  graft: TenantGraftInfo;

  /** Called when toggling the graft */
  onToggle: (graftId: string, enabled: boolean) => void;

  /** Whether the row is in a loading state */
  loading?: boolean;
}

// =============================================================================
// GREENHOUSE ADMIN PANEL TYPES (Wayfinder-only)
// =============================================================================

/**
 * Props for GreenhouseAdminPanel component.
 * Wayfinder-only admin panel for managing greenhouse enrollment.
 */
export interface GreenhouseAdminPanelProps extends BaseGraftProps {
  /** Array of enrolled greenhouse tenants */
  tenants: GreenhouseTenant[];

  /** Tenant names lookup (tenantId -> display name) */
  tenantNames: Record<string, string>;

  /** Available tenants to enroll (tenantId -> display name) */
  availableTenants: Record<string, string>;

  /** Array of feature flags for cultivate mode */
  featureFlags: FeatureFlagSummary[];

  /** Called when enrolling a tenant */
  onEnroll: (tenantId: string, notes: string) => void;

  /** Called when toggling a tenant's enabled status */
  onToggle: (tenantId: string, enabled: boolean) => void;

  /** Called when removing a tenant from greenhouse */
  onRemove: (tenantId: string) => void;

  /** Called when cultivating (enabling) a flag */
  onCultivate: (flagId: string) => void;

  /** Called when pruning (disabling) a flag */
  onPrune: (flagId: string) => void;

  /** Whether enrollment is in progress */
  enrollLoading?: boolean;

  /** Flag ID currently being toggled (for loading state) */
  loadingFlagId?: string;

  /** Result of the last form action */
  formResult?: {
    success?: boolean;
    error?: string;
    message?: string;
  };
}
