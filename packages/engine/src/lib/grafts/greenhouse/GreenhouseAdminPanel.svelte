<!--
  @component GreenhouseAdminPanel

  Wayfinder-only admin panel for managing greenhouse tenant enrollment
  and feature flag cultivation. This graft consolidates all greenhouse
  management functionality into the engine.

  @example
  ```svelte
  <script>
    import { GreenhouseAdminPanel } from '$lib/grafts/greenhouse';
    let { data } = $props();
  </script>

  {#if data.isWayfinder}
    <GreenhouseAdminPanel
      tenants={data.greenhouseTenants}
      tenantNames={data.tenantNames}
      availableTenants={data.availableTenants}
      featureFlags={data.featureFlags}
      onEnroll={handleEnroll}
      onToggle={handleToggle}
      onRemove={handleRemove}
      onCultivate={handleCultivate}
      onPrune={handlePrune}
    />
  {/if}
  ```
-->
<script>
  import { GlassCard, Button } from '$lib/ui';
  import GreenhouseEnrollTable from './GreenhouseEnrollTable.svelte';
  import GreenhouseEnrollDialog from './GreenhouseEnrollDialog.svelte';
  import CultivateFlagTable from './CultivateFlagTable.svelte';
  import { Sprout, Plus, Users, CheckCircle, XCircle, Leaf } from 'lucide-svelte';

  /**
   * @typedef {import('../../feature-flags/types.js').GreenhouseTenant} GreenhouseTenant
   * @typedef {import('../../feature-flags/admin.js').FeatureFlagSummary} FeatureFlagSummary
   */

  /** @type {{
   *   tenants?: GreenhouseTenant[];
   *   tenantNames?: Record<string, string>;
   *   availableTenants?: Record<string, string>;
   *   featureFlags?: FeatureFlagSummary[];
   *   onEnroll?: (tenantId: string, notes: string) => void;
   *   onToggle?: (tenantId: string, enabled: boolean) => void;
   *   onRemove?: (tenantId: string) => void;
   *   onCultivate?: (flagId: string) => void;
   *   onPrune?: (flagId: string) => void;
   *   enrollLoading?: boolean;
   *   loadingFlagId?: string;
   *   formResult?: { success?: boolean; error?: string; message?: string };
   *   class?: string;
   * }} */
  let {
    tenants = [],
    tenantNames = {},
    availableTenants = {},
    featureFlags = [],
    onEnroll,
    onToggle,
    onRemove,
    onCultivate,
    onPrune,
    enrollLoading = false,
    loadingFlagId,
    formResult,
    class: className = ''
  } = $props();

  // Dialog state
  let showEnrollDialog = $state(false);

  // Stats
  const totalEnrolled = $derived(tenants.length);
  const activeCount = $derived(tenants.filter((t) => t.enabled).length);
  const disabledCount = $derived(totalEnrolled - activeCount);
  const availableCount = $derived(Object.keys(availableTenants).length);

  // Handle enrollment
  /** @param {string} tenantId @param {string} notes */
  function handleEnroll(tenantId, notes) {
    showEnrollDialog = false;
    onEnroll?.(tenantId, notes);
  }

  // Handle toggle
  /** @param {string} tenantId @param {boolean} enabled */
  function handleToggle(tenantId, enabled) {
    onToggle?.(tenantId, enabled);
  }

  // Handle remove with confirmation
  /** @param {string} tenantId */
  function handleRemove(tenantId) {
    if (!confirm('Remove this tenant from the greenhouse program?')) {
      return;
    }
    onRemove?.(tenantId);
  }

  // Handle flag cultivate/prune
  /** @param {string} flagId @param {boolean} enabled */
  function handleFlagToggle(flagId, enabled) {
    if (enabled) {
      onCultivate?.(flagId);
    } else {
      onPrune?.(flagId);
    }
  }
</script>

<div class="greenhouse-admin {className}">
  <!-- Header -->
  <div class="admin-header">
    <div class="header-text">
      <h2>
        <Sprout class="inline-icon" />
        Greenhouse Admin
      </h2>
      <p class="subtitle">Manage early access to experimental features</p>
    </div>
    <Button
      variant="primary"
      onclick={() => (showEnrollDialog = true)}
      disabled={availableCount === 0}
    >
      <Plus class="btn-icon" />
      Enroll Tenant
      {#if availableCount > 0}
        <span class="available-badge">{availableCount}</span>
      {/if}
    </Button>
  </div>

  <!-- Action result message -->
  {#if formResult?.success}
    <GlassCard variant="frosted" class="message-card success">
      <div class="message-content">
        <CheckCircle class="message-icon success" />
        <span>{formResult.message || 'Action completed successfully'}</span>
      </div>
    </GlassCard>
  {:else if formResult?.error}
    <GlassCard variant="frosted" class="message-card error">
      <div class="message-content">
        <XCircle class="message-icon error" />
        <span>{formResult.error}</span>
      </div>
    </GlassCard>
  {/if}

  <!-- Stats -->
  <div class="stats-grid">
    <GlassCard variant="frosted" class="stat-card">
      <div class="stat-value total">{totalEnrolled}</div>
      <div class="stat-label">
        <Users class="stat-icon" />
        Total Enrolled
      </div>
    </GlassCard>
    <GlassCard variant="frosted" class="stat-card">
      <div class="stat-value active">{activeCount}</div>
      <div class="stat-label">
        <CheckCircle class="stat-icon" />
        Active
      </div>
    </GlassCard>
    <GlassCard variant="frosted" class="stat-card">
      <div class="stat-value disabled">{disabledCount}</div>
      <div class="stat-label">
        <XCircle class="stat-icon" />
        Disabled
      </div>
    </GlassCard>
  </div>

  <!-- Info Card -->
  <GlassCard variant="frosted" class="info-card">
    <div class="info-content">
      <div class="info-icon-wrapper">
        <Sprout class="info-icon" />
      </div>
      <div>
        <h3>About the Greenhouse Program</h3>
        <p>
          Greenhouse tenants get early access to features marked as
          <code>greenhouse_only</code>. When a feature is ready for general release, set its
          <code>greenhouse_only</code> flag to 0 and add normal targeting rules.
        </p>
      </div>
    </div>
  </GlassCard>

  <!-- Tenants Table -->
  <GreenhouseEnrollTable
    {tenants}
    {tenantNames}
    onToggle={handleToggle}
    onRemove={handleRemove}
  />

  <!-- Cultivate Mode Section -->
  <div class="cultivate-section">
    <div class="section-header">
      <div class="section-title">
        <Leaf class="section-icon" />
        <h3>Cultivate Mode</h3>
      </div>
      <p class="section-subtitle">Toggle features globally for all Groves</p>
    </div>

    <!-- Quick Actions Info -->
    <GlassCard variant="frosted" class="info-card">
      <div class="info-content">
        <div class="info-icon-wrapper">
          <Sprout class="info-icon" />
        </div>
        <div>
          <h3>Quick Actions</h3>
          <ul class="quick-actions-list">
            <li>
              <strong class="cultivate">Cultivate</strong> = enable for everyone (flag rules are evaluated)
            </li>
            <li>
              <strong class="prune">Prune</strong> = disable for everyone (flag returns default value)
            </li>
          </ul>
        </div>
      </div>
    </GlassCard>

    <!-- Feature Flags Table -->
    <CultivateFlagTable
      flags={featureFlags}
      onToggle={handleFlagToggle}
      {loadingFlagId}
    />
  </div>
</div>

<!-- Enroll Dialog -->
<GreenhouseEnrollDialog
  open={showEnrollDialog}
  {availableTenants}
  onClose={() => (showEnrollDialog = false)}
  onEnroll={handleEnroll}
  loading={enrollLoading}
/>

<style>
  .greenhouse-admin {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .admin-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .header-text h2 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 0 0.25rem 0;
    font-size: 1.5rem;
    font-family: var(--font-family-display);
    color: var(--color-text);
  }

  .subtitle {
    margin: 0;
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }

  :global(.greenhouse-admin .inline-icon) {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--accent-success);
  }

  :global(.greenhouse-admin .btn-icon) {
    width: 1rem;
    height: 1rem;
    margin-right: 0.25rem;
  }

  .available-badge {
    margin-left: 0.25rem;
    padding: 0.125rem 0.5rem;
    font-size: 0.75rem;
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.2);
  }

  :global(.dark) .available-badge {
    background: rgba(255, 255, 255, 0.1);
  }

  /* Message cards */
  :global(.greenhouse-admin .message-card) {
    padding: 0.75rem 1rem;
  }

  :global(.greenhouse-admin .message-card.success) {
    border-color: var(--accent-success);
    background: rgba(34, 197, 94, 0.05);
  }

  :global(.greenhouse-admin .message-card.error) {
    border-color: var(--accent-danger);
    background: rgba(239, 68, 68, 0.05);
  }

  .message-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  :global(.greenhouse-admin .message-icon) {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
  }

  :global(.greenhouse-admin .message-icon.success) {
    color: var(--accent-success);
  }

  :global(.greenhouse-admin .message-icon.error) {
    color: var(--accent-danger);
  }

  /* Stats grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  :global(.greenhouse-admin .stat-card) {
    text-align: center;
    padding: 1rem;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 0.5rem;
  }

  .stat-value.total {
    color: var(--accent-success);
  }

  .stat-value.active {
    color: #22c55e;
  }

  .stat-value.disabled {
    color: #f59e0b;
  }

  .stat-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  :global(.greenhouse-admin .stat-icon) {
    width: 0.875rem;
    height: 0.875rem;
    opacity: 0.7;
  }

  /* Info card */
  :global(.greenhouse-admin .info-card) {
    padding: 1rem;
  }

  .info-content {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }

  .info-icon-wrapper {
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.5rem;
    background: rgba(16, 185, 129, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.greenhouse-admin .info-icon) {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--accent-success);
  }

  .info-content h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1rem;
    font-family: var(--font-family-display);
    color: var(--color-text);
  }

  .info-content p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .info-content code {
    padding: 0.125rem 0.375rem;
    background: var(--color-surface-elevated);
    border-radius: 0.25rem;
    font-size: 0.75rem;
    font-family: var(--font-family-mono);
  }

  /* Cultivate section */
  .cultivate-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .section-header {
    margin-bottom: 0.5rem;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .section-title h3 {
    margin: 0;
    font-size: 1.25rem;
    font-family: var(--font-family-display);
    color: var(--color-text);
  }

  :global(.greenhouse-admin .section-icon) {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--accent-success);
  }

  .section-subtitle {
    margin: 0.25rem 0 0 0;
    color: var(--color-text-muted);
    font-size: 0.9rem;
  }

  .quick-actions-list {
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .quick-actions-list li {
    margin-bottom: 0.25rem;
  }

  .quick-actions-list strong.cultivate {
    color: var(--accent-success);
  }

  .quick-actions-list strong.prune {
    color: var(--color-text-muted);
  }

  /* Responsive */
  @media (max-width: 640px) {
    .admin-header {
      flex-direction: column;
      gap: 1rem;
    }

    .stats-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
