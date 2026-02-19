<!--
  @component UploadManagementPanel

  Wayfinder-only admin panel for managing per-tenant upload suspension.
  Tenants start suspended by default; toggling them to "enabled" creates
  a flag rule that overrides uploads_suspended to false.

  @example
  ```svelte
  <UploadManagementPanel
    tenants={data.tenants}
    tenantNames={data.tenantNames}
    onSuspend={handleSuspend}
    onUnsuspend={handleUnsuspend}
    formResult={form}
  />
  ```
-->
<script>
  import { GlassCard, Button } from '$lib/ui';
  import { Upload, Users, CheckCircle, XCircle, ShieldCheck, Search } from 'lucide-svelte';

  /** @type {import('./types.js').UploadManagementPanelProps} */
  let {
    tenants = [],
    tenantNames = {},
    onSuspend,
    onUnsuspend,
    formResult,
    class: className = ''
  } = $props();

  // Search filter
  let searchQuery = $state('');

  // Stats
  const totalTenants = $derived(tenants.length);
  const enabledCount = $derived(tenants.filter((t) => !t.suspended).length);
  const suspendedCount = $derived(tenants.filter((t) => t.suspended).length);

  // Filtered tenants
  const filteredTenants = $derived(() => {
    if (!searchQuery.trim()) return tenants;
    const q = searchQuery.toLowerCase();
    return tenants.filter((t) => {
      const name = tenantNames[t.tenantId] || t.tenantId;
      return name.toLowerCase().includes(q) || t.tenantId.toLowerCase().includes(q);
    });
  });

  /** @param {string} tenantId */
  function handleToggle(tenantId) {
    const tenant = tenants.find((t) => t.tenantId === tenantId);
    if (!tenant) return;

    if (tenant.suspended) {
      onUnsuspend?.(tenantId);
    } else {
      onSuspend?.(tenantId);
    }
  }
</script>

<div class="upload-admin {className}">
  <!-- Header -->
  <div class="admin-header">
    <div class="header-text">
      <h2>
        <Upload class="inline-icon" />
        Upload Management
      </h2>
      <p class="subtitle">Control which tenants can upload images</p>
    </div>
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
      <div class="stat-value total">{totalTenants}</div>
      <div class="stat-label">
        <Users class="stat-icon" />
        Total Tenants
      </div>
    </GlassCard>
    <GlassCard variant="frosted" class="stat-card">
      <div class="stat-value active">{enabledCount}</div>
      <div class="stat-label">
        <CheckCircle class="stat-icon" />
        Uploads Enabled
      </div>
    </GlassCard>
    <GlassCard variant="frosted" class="stat-card">
      <div class="stat-value disabled">{suspendedCount}</div>
      <div class="stat-label">
        <XCircle class="stat-icon" />
        Uploads Suspended
      </div>
    </GlassCard>
  </div>

  <!-- Info Card -->
  <GlassCard variant="frosted" class="info-card">
    <div class="info-content">
      <div class="info-icon-wrapper">
        <ShieldCheck class="info-icon" />
      </div>
      <div>
        <h3>About Upload Suspension</h3>
        <p>
          All tenants start with uploads suspended. Enable uploads for individual tenants
          here. When PhotoDNA integration is approved, flip the
          <code>uploads_suspended</code> default to unsuspend everyone at once.
        </p>
      </div>
    </div>
  </GlassCard>

  <!-- Search -->
  <div class="search-bar">
    <Search class="search-icon" />
    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Search tenants..."
      class="search-input"
    />
  </div>

  <!-- Tenants Table -->
  <GlassCard variant="frosted" class="table-card">
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Tenant</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredTenants() as tenant (tenant.tenantId)}
            <tr>
              <td>
                <div class="tenant-info">
                  <span class="tenant-name">{tenantNames[tenant.tenantId] || tenant.tenantId}</span>
                  <span class="tenant-id">{tenant.tenantId}</span>
                </div>
              </td>
              <td>
                {#if tenant.suspended}
                  <span class="status-badge suspended">
                    <XCircle class="status-icon" />
                    Suspended
                  </span>
                {:else}
                  <span class="status-badge enabled">
                    <CheckCircle class="status-icon" />
                    Enabled
                  </span>
                {/if}
              </td>
              <td>
                <Button
                  variant={tenant.suspended ? 'primary' : 'ghost'}
                  size="sm"
                  onclick={() => handleToggle(tenant.tenantId)}
                >
                  {tenant.suspended ? 'Enable Uploads' : 'Suspend'}
                </Button>
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="3" class="empty-message">
                {searchQuery ? 'No tenants match your search' : 'No tenants found'}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </GlassCard>
</div>

<style>
  .upload-admin {
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

  :global(.upload-admin .inline-icon) {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--accent-success);
  }

  /* Message cards */
  :global(.upload-admin .message-card) {
    padding: 0.75rem 1rem;
  }

  :global(.upload-admin .message-card.success) {
    border-color: var(--accent-success);
    background: rgba(34, 197, 94, 0.05);
  }

  :global(.upload-admin .message-card.error) {
    border-color: var(--accent-danger);
    background: rgba(239, 68, 68, 0.05);
  }

  .message-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  :global(.upload-admin .message-icon) {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
  }

  :global(.upload-admin .message-icon.success) {
    color: var(--accent-success);
  }

  :global(.upload-admin .message-icon.error) {
    color: var(--accent-danger);
  }

  /* Stats grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  :global(.upload-admin .stat-card) {
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

  :global(.upload-admin .stat-icon) {
    width: 0.875rem;
    height: 0.875rem;
    opacity: 0.7;
  }

  /* Info card */
  :global(.upload-admin .info-card) {
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

  :global(.upload-admin .info-icon) {
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

  /* Search bar */
  .search-bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    background: var(--color-surface);
  }

  :global(.upload-admin .search-icon) {
    width: 1rem;
    height: 1rem;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .search-input {
    flex: 1;
    border: none;
    background: none;
    outline: none;
    font-size: 0.9rem;
    color: var(--color-text);
  }

  .search-input::placeholder {
    color: var(--color-text-muted);
  }

  /* Table */
  :global(.upload-admin .table-card) {
    padding: 0;
    overflow: hidden;
  }

  .table-scroll {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    text-align: left;
    padding: 0.75rem 1rem;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface-elevated);
  }

  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    font-size: 0.9rem;
  }

  tr:last-child td {
    border-bottom: none;
  }

  .tenant-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .tenant-name {
    font-weight: 500;
    color: var(--color-text);
  }

  .tenant-id {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-family: var(--font-family-mono);
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.8rem;
    font-weight: 500;
  }

  .status-badge.enabled {
    color: #16a34a;
    background: rgba(34, 197, 94, 0.1);
  }

  .status-badge.suspended {
    color: #d97706;
    background: rgba(245, 158, 11, 0.1);
  }

  :global(.upload-admin .status-icon) {
    width: 0.875rem;
    height: 0.875rem;
  }

  .empty-message {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .stats-grid {
      grid-template-columns: 1fr;
    }

    th:nth-child(3),
    td:nth-child(3) {
      text-align: right;
    }
  }
</style>
