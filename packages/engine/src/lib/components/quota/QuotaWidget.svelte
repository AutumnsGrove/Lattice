<script lang="ts">
  /**
   * QuotaWidget - Displays post usage quota
   *
   * Shows current post count, limit, and visual progress bar.
   * Includes upgrade prompts when near or at limit.
   */

  import type { QuotaWidgetData } from '../../heartwood/index.js';
  import { STATUS_COLORS } from '../../heartwood/index.js';

  interface Props {
    data: QuotaWidgetData;
    upgradeUrl?: string;
    compact?: boolean;
  }

  let { data, upgradeUrl = '/upgrade', compact = false }: Props = $props();

  // Defensive check for malformed data
  const isValidData = $derived(
    data &&
    typeof data === 'object' &&
    typeof data.count === 'number' &&
    typeof data.color === 'string'
  );

  // Default fallback data for when data is invalid
  const safeData = $derived(isValidData ? data : {
    count: 0,
    limit: null,
    percentage: null,
    remaining: null,
    color: 'gray' as const,
    statusText: 'Loading...',
    description: 'Unable to load quota information',
    showUpgrade: false,
    tierName: 'Unknown',
    canPost: true,
  });

  // Get color classes from shared utility
  const colorClasses = $derived(STATUS_COLORS[safeData.color]);
</script>

{#if compact}
  <!-- Compact mode: just the numbers -->
  <div class="flex items-center gap-2 text-sm">
    <span class="font-medium">
      {safeData.count}{#if safeData.limit !== null}<span class="text-foreground-faint">/{safeData.limit}</span>{/if}
    </span>
    <span class="px-1.5 py-0.5 text-xs rounded {colorClasses.badge}">
      {safeData.statusText}
    </span>
  </div>
{:else}
  <!-- Full widget -->
  <div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4 {colorClasses.bg}">
    <div class="flex justify-between items-center mb-2">
      <h4 class="font-semibold text-foreground">Post Usage</h4>
      <span class="px-2 py-1 text-xs font-medium rounded-full {colorClasses.badge}">
        {safeData.statusText}
      </span>
    </div>

    <!-- Count display -->
    <div class="text-2xl font-bold mb-2 text-foreground">
      {safeData.count}{#if safeData.limit !== null}<span class="text-foreground-faint">/{safeData.limit}</span>{/if}
    </div>

    <!-- Progress bar -->
    {#if safeData.limit !== null && safeData.percentage !== null}
      <div class="w-full bg-cream-200 dark:bg-bark-700 rounded-full h-2 mb-2">
        <div
          class="h-full rounded-full transition-all duration-300 {colorClasses.fill}"
          style="width: {Math.min(safeData.percentage, 100)}%"
        ></div>
      </div>
      <p class="text-sm {colorClasses.text}">{safeData.percentage.toFixed(1)}% used</p>
    {:else}
      <p class="text-sm text-foreground-muted">Unlimited posts with {safeData.tierName} plan</p>
    {/if}

    <!-- Upgrade prompt -->
    {#if safeData.showUpgrade}
      <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
        <p class="text-sm text-blue-800 dark:text-blue-200 mb-2">
          Upgrade for more posts
        </p>
        <a
          href={upgradeUrl}
          class="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          View Plans
          <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>
    {/if}

    <!-- Cannot post warning -->
    {#if !safeData.canPost}
      <div class="mt-4 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
        <p class="text-sm text-red-800 dark:text-red-200 font-medium">
          You cannot create new posts until you upgrade or delete existing posts.
        </p>
      </div>
    {/if}

    <!-- Error state for invalid data -->
    {#if !isValidData}
      <div class="mt-4 p-3 bg-cream-50 dark:bg-bark-800 rounded-lg border border-cream-200 dark:border-bark-700">
        <p class="text-sm text-foreground-subtle">
          Unable to load quota information. Please refresh the page.
        </p>
      </div>
    {/if}
  </div>
{/if}
