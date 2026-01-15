<script lang="ts">
  /**
   * The Clearing - Grove Status Page
   *
   * A calm, clear view of Grove's system health - like stepping into
   * a forest clearing where you can see the whole sky.
   */
  import type { PageData } from './$types.js';

  let { data }: { data: PageData } = $props();

  // Status colors and icons
  const statusConfig = {
    operational: { color: 'text-green-600', bg: 'bg-green-100', label: 'All Systems Operational' },
    degraded: { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Degraded Performance' },
    partial_outage: { color: 'text-orange-600', bg: 'bg-orange-100', label: 'Partial Outage' },
    major_outage: { color: 'text-red-600', bg: 'bg-red-100', label: 'Major Outage' },
    maintenance: { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Scheduled Maintenance' },
  };

  const severityConfig = {
    minor: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
    major: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
    critical: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  };

  const incidentStatusLabels = {
    investigating: 'Investigating',
    identified: 'Identified',
    monitoring: 'Monitoring',
    resolved: 'Resolved',
  };

  function formatDate(date: Date | null | undefined): string {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  function formatDuration(ms: number): string {
    if (ms < 1) return '<1ms';
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  function getStatusEmoji(status: string): string {
    switch (status) {
      case 'operational': return '✅';
      case 'degraded': return '⚠️';
      case 'partial_outage': return '🟠';
      case 'major_outage': return '🔴';
      case 'maintenance': return '🔧';
      default: return '❓';
    }
  }
</script>

<svelte:head>
  <title>The Clearing - Grove Status</title>
  <meta name="description" content="Grove system status and health monitoring" />
</svelte:head>

<main class="min-h-screen bg-gradient-to-b from-grove-50 to-white">
  <div class="max-w-4xl mx-auto px-4 py-12">
    <!-- Header -->
    <header class="text-center mb-12">
      <h1 class="text-3xl font-serif text-bark mb-2">The Clearing</h1>
      <p class="text-bark/60">Grove System Status</p>
    </header>

    {#if data.error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
        <p class="text-red-600">{data.error}</p>
      </div>
    {/if}

    <!-- Current Status Banner -->
    {#if data.status}
      {@const config = statusConfig[data.status.overallStatus] ?? statusConfig.operational}
      <div class="rounded-2xl {config.bg} p-8 mb-8 text-center">
        <div class="text-4xl mb-4">{getStatusEmoji(data.status.overallStatus)}</div>
        <h2 class="text-2xl font-serif {config.color} mb-2">{config.label}</h2>
        {#if data.status.maintenanceActive && data.status.maintenanceMessage}
          <p class="text-bark/70 mt-2">{data.status.maintenanceMessage}</p>
          {#if data.status.maintenanceExpectedEnd}
            <p class="text-sm text-bark/50 mt-1">
              Expected completion: {formatDate(data.status.maintenanceExpectedEnd)}
            </p>
          {/if}
        {/if}
        <p class="text-sm text-bark/50 mt-4">
          Last updated: {formatDate(data.status.updatedAt)}
        </p>
      </div>

      <!-- Uptime Stats -->
      {#if data.status.showUptime && (data.status.uptimePercentage30d || data.status.uptimePercentage90d)}
        <div class="grid grid-cols-2 gap-4 mb-8">
          {#if data.status.uptimePercentage30d}
            <div class="bg-white rounded-lg border border-grove-200 p-4 text-center">
              <div class="text-2xl font-mono text-grove-700">
                {data.status.uptimePercentage30d.toFixed(2)}%
              </div>
              <div class="text-sm text-bark/50">30-Day Uptime</div>
            </div>
          {/if}
          {#if data.status.uptimePercentage90d}
            <div class="bg-white rounded-lg border border-grove-200 p-4 text-center">
              <div class="text-2xl font-mono text-grove-700">
                {data.status.uptimePercentage90d.toFixed(2)}%
              </div>
              <div class="text-sm text-bark/50">90-Day Uptime</div>
            </div>
          {/if}
        </div>
      {/if}
    {/if}

    <!-- Active Incidents -->
    {#if data.incidents && data.incidents.length > 0}
      <section class="mb-12">
        <h2 class="text-xl font-serif text-bark mb-4">Recent Incidents</h2>
        <div class="space-y-4">
          {#each data.incidents as incident}
            {@const config = severityConfig[incident.severity]}
            <div class="rounded-lg {config.bg} border {config.border} p-4">
              <div class="flex items-start justify-between mb-2">
                <div>
                  <span class="inline-block px-2 py-0.5 rounded text-xs font-medium {config.color} {config.bg} border {config.border} mr-2">
                    {incident.severity.toUpperCase()}
                  </span>
                  <span class="inline-block px-2 py-0.5 rounded text-xs font-medium bg-bark/10 text-bark/70">
                    {incidentStatusLabels[incident.status]}
                  </span>
                </div>
                <span class="text-sm text-bark/50">{formatDate(incident.startedAt)}</span>
              </div>
              <h3 class="font-medium text-bark mb-1">{incident.title}</h3>
              {#if incident.description}
                <p class="text-sm text-bark/70 mb-2">{incident.description}</p>
              {/if}
              {#if incident.affectedComponents.length > 0}
                <div class="text-sm text-bark/50">
                  Affected: {incident.affectedComponents.join(', ')}
                </div>
              {/if}
              {#if incident.resolvedAt}
                <div class="text-sm text-green-600 mt-2">
                  Resolved: {formatDate(incident.resolvedAt)}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {:else}
      <section class="mb-12">
        <div class="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div class="text-2xl mb-2">🌿</div>
          <p class="text-green-700">No incidents to report. All clear in the grove.</p>
        </div>
      </section>
    {/if}

    <!-- Recent Sentinel Tests -->
    {#if data.recentRuns && data.recentRuns.length > 0}
      <section class="mb-12">
        <h2 class="text-xl font-serif text-bark mb-4">Infrastructure Validation</h2>
        <p class="text-sm text-bark/60 mb-4">
          Recent stress tests validating system performance and reliability.
        </p>
        <div class="bg-white rounded-lg border border-grove-200 overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-grove-50 border-b border-grove-200">
                <th class="text-left px-4 py-3 font-medium text-bark/70">Test</th>
                <th class="text-right px-4 py-3 font-medium text-bark/70">Success Rate</th>
                {#if data.status?.showLatency}
                  <th class="text-right px-4 py-3 font-medium text-bark/70">p95 Latency</th>
                {/if}
                {#if data.status?.showThroughput}
                  <th class="text-right px-4 py-3 font-medium text-bark/70">Throughput</th>
                {/if}
                <th class="text-right px-4 py-3 font-medium text-bark/70">Date</th>
              </tr>
            </thead>
            <tbody>
              {#each data.recentRuns as run}
                <tr class="border-b border-grove-100 last:border-0">
                  <td class="px-4 py-3">
                    <div class="font-medium text-bark">{run.name}</div>
                    <div class="text-xs text-bark/50">{run.profileType}</div>
                  </td>
                  <td class="px-4 py-3 text-right">
                    <span class="{parseFloat(run.successRate) >= 99 ? 'text-green-600' : parseFloat(run.successRate) >= 95 ? 'text-yellow-600' : 'text-red-600'}">
                      {run.successRate}%
                    </span>
                  </td>
                  {#if data.status?.showLatency}
                    <td class="px-4 py-3 text-right font-mono text-bark/70">
                      {formatDuration(run.p95LatencyMs)}
                    </td>
                  {/if}
                  {#if data.status?.showThroughput}
                    <td class="px-4 py-3 text-right font-mono text-bark/70">
                      {run.throughputOpsPerSec?.toFixed(0) ?? 'N/A'} ops/s
                    </td>
                  {/if}
                  <td class="px-4 py-3 text-right text-bark/50">
                    {formatDate(run.completedAt)}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}

    <!-- System Components (if status exists with components) -->
    {#if data.status && Object.keys(data.status.componentStatuses).length > 0}
      <section class="mb-12">
        <h2 class="text-xl font-serif text-bark mb-4">System Components</h2>
        <div class="grid gap-2">
          {#each Object.entries(data.status.componentStatuses) as [component, status]}
            <div class="flex items-center justify-between bg-white rounded-lg border border-grove-200 px-4 py-3">
              <span class="font-medium text-bark capitalize">{component.replace(/_/g, ' ')}</span>
              <span class="{status === 'operational' ? 'text-green-600' : status === 'degraded' ? 'text-yellow-600' : 'text-red-600'} flex items-center gap-2">
                <span class="w-2 h-2 rounded-full {status === 'operational' ? 'bg-green-500' : status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}"></span>
                {status === 'operational' ? 'Operational' : status === 'degraded' ? 'Degraded' : 'Outage'}
              </span>
            </div>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Footer -->
    <footer class="text-center text-sm text-bark/50 pt-8 border-t border-grove-200">
      <p>Powered by Sentinel - Grove Infrastructure Validation</p>
      <p class="mt-2">
        <a href="/" class="hover:text-grove-600 transition-colors">← Back to Grove</a>
      </p>
    </footer>
  </div>
</main>
