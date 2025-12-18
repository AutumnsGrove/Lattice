<script>
  import { Card, Spinner } from '$lib/ui';
  import { api } from "$lib/utils/api.js";

  /**
   * @typedef {Object} HealthStatus
   * @property {string} [status]
   * @property {string} [error]
   * @property {boolean} [r2_configured]
   * @property {boolean} [d1_configured]
   * @property {boolean} [kv_configured]
   * @property {boolean} [github_token_configured]
   * @property {string} [timestamp]
   */

  let { data } = $props();

  /** @type {HealthStatus | null} */
  let healthStatus = $state(null);
  let loading = $state(true);

  async function fetchHealth() {
    loading = true;
    try {
      healthStatus = await api.get('/api/git/health');
    } catch (error) {
      console.error('Failed to fetch health:', error);
      healthStatus = { status: 'error', error: error instanceof Error ? error.message : String(error) };
    }
    loading = false;
  }

  $effect(() => {
    fetchHealth();
  });
</script>

<div class="max-w-screen-xl">
  <header class="mb-8">
    <h1 class="m-0 mb-2 text-3xl text-[var(--color-text)] dark:text-[var(--color-text-dark)] transition-colors">Dashboard</h1>
    <p class="m-0 text-[var(--color-text-muted)] dark:text-[var(--color-text-subtle-dark)] text-lg transition-colors">Welcome back, Autumn!</p>
  </header>

  <div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-8">
    <Card title="System Status">
      {#if loading}
        <Spinner />
      {:else if healthStatus?.status === 'healthy'}
        <p class="stat-value healthy">Healthy</p>
      {:else}
        <p class="stat-value error">Error</p>
      {/if}
    </Card>

    <Card title="GitHub Token">
      {#if loading}
        <Spinner />
      {:else}
        <p class="stat-value" class:healthy={healthStatus?.github_token_configured} class:error={!healthStatus?.github_token_configured}>
          {healthStatus?.github_token_configured ? 'Configured' : 'Missing'}
        </p>
      {/if}
    </Card>

    <Card title="KV Cache">
      {#if loading}
        <Spinner />
      {:else}
        <p class="stat-value" class:healthy={healthStatus?.kv_configured} class:error={!healthStatus?.kv_configured}>
          {healthStatus?.kv_configured ? 'Connected' : 'Missing'}
        </p>
      {/if}
    </Card>

    <Card title="D1 Database">
      {#if loading}
        <Spinner />
      {:else}
        <p class="stat-value" class:healthy={healthStatus?.d1_configured} class:error={!healthStatus?.d1_configured}>
          {healthStatus?.d1_configured ? 'Connected' : 'Missing'}
        </p>
      {/if}
    </Card>
  </div>

  <section class="mt-8">
    <h2 class="m-0 mb-4 text-xl text-[var(--color-text)] dark:text-[var(--color-text-dark)] transition-colors">Quick Actions</h2>
    <div class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
      <a href="/admin/blog" class="action-card">
        <span class="text-3xl">&#x1F4DD;</span>
        <span class="font-medium text-center">Manage Blog Posts</span>
      </a>
      <a href="/admin/recipes" class="action-card">
        <span class="text-3xl">&#x1F373;</span>
        <span class="font-medium text-center">Manage Recipes</span>
      </a>
      <a href="/admin/images" class="action-card">
        <span class="text-3xl">&#x1F4F7;</span>
        <span class="font-medium text-center">Upload Images</span>
      </a>
      <a href="/admin/analytics" class="action-card">
        <span class="text-3xl">&#x1F4CA;</span>
        <span class="font-medium text-center">View Analytics</span>
      </a>
      <a href="/admin/timeline" class="action-card">
        <span class="text-3xl">&#x1F4C5;</span>
        <span class="font-medium text-center">Timeline</span>
      </a>
      <a href="/admin/logs" class="action-card">
        <span class="text-3xl">&#x1F5A5;</span>
        <span class="font-medium text-center">System Console</span>
      </a>
      <a href="/admin/settings" class="action-card">
        <span class="text-3xl">&#x2699;</span>
        <span class="font-medium text-center">Settings</span>
      </a>
      <a href="/" class="action-card" target="_blank">
        <span class="text-3xl">&#x1F310;</span>
        <span class="font-medium text-center">View Site</span>
      </a>
    </div>
  </section>
</div>

<style>
  .stat-value {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
  .stat-value.healthy {
    color: var(--accent-success);
  }
  .stat-value.error {
    color: var(--accent-danger);
  }
  .action-card {
    background: var(--mobile-menu-bg);
    padding: 1.5rem;
    border-radius: var(--border-radius-standard);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--color-border);
    text-decoration: none;
    color: var(--color-text);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    transition: transform 0.2s, box-shadow 0.2s, background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
  }
  .action-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  :global(.dark) .action-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }
</style>
