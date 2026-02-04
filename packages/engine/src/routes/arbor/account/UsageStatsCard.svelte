<script lang="ts">
  import { GlassCard } from "$lib/ui";
  import { AlertCircle, HardDrive, FileText, Calendar } from "lucide-svelte";
  import { formatStorage, formatLimit } from "$lib/config/tiers";
  import type { UsageData } from "./types";
  import { USAGE_WARNING_THRESHOLD } from "./utils";

  interface Props {
    usage: UsageData | null;
    usageError: boolean;
  }

  let { usage, usageError }: Props = $props();

  // Helper to calculate percentage with cap at 100
  function calcPercent(used: number, limit: number): number {
    return Math.min(100, (used / limit) * 100);
  }
</script>

{#if usageError}
  <GlassCard variant="default" class="mb-6">
    <h2>Usage</h2>
    <div class="error-state small" role="alert" aria-live="polite">
      <AlertCircle class="error-icon" aria-hidden="true" />
      <p class="error-desc">Unable to load usage statistics. Please try again later.</p>
    </div>
  </GlassCard>
{:else if usage}
  <GlassCard variant="default" class="mb-6">
    <h2>Usage</h2>
    <div class="usage-grid">
      <div class="usage-item">
        <HardDrive class="usage-icon" aria-hidden="true" />
        <div class="usage-info">
          <span class="usage-label" id="storage-label">Storage</span>
          <span class="usage-value">
            {formatStorage(usage.storageUsed)} / {formatStorage(usage.storageLimit)}
          </span>
          {#if true}
            {@const storagePercent = calcPercent(usage.storageUsed, usage.storageLimit)}
            <div
              class="usage-bar"
              role="progressbar"
              aria-valuenow={Math.round(storagePercent)}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-labelledby="storage-label"
            >
              <div
                class="usage-fill"
                style:width="{storagePercent}%"
                class:warning={storagePercent > USAGE_WARNING_THRESHOLD}
              ></div>
            </div>
          {/if}
        </div>
      </div>

      <div class="usage-item">
        <FileText class="usage-icon" aria-hidden="true" />
        <div class="usage-info">
          <span class="usage-label" id="posts-label">Blooms</span>
          <span class="usage-value">
            {usage.postCount} / {usage.postLimit ? formatLimit(usage.postLimit) : "Unlimited"}
          </span>
          {#if usage.postLimit}
            {@const postsPercent = calcPercent(usage.postCount, usage.postLimit)}
            <div
              class="usage-bar"
              role="progressbar"
              aria-valuenow={Math.round(postsPercent)}
              aria-valuemin="0"
              aria-valuemax="100"
              aria-labelledby="posts-label"
            >
              <div
                class="usage-fill"
                style:width="{postsPercent}%"
                class:warning={postsPercent > USAGE_WARNING_THRESHOLD}
              ></div>
            </div>
          {/if}
        </div>
      </div>

      <div class="usage-item">
        <Calendar class="usage-icon" aria-hidden="true" />
        <div class="usage-info">
          <span class="usage-label">Account Age</span>
          <span class="usage-value">{usage.accountAge} days</span>
        </div>
      </div>
    </div>
  </GlassCard>
{/if}

<style>
  /* Error States */
  .error-state {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: var(--border-radius-standard);
  }

  .error-state.small {
    padding: 0.75rem;
    gap: 0.75rem;
  }

  :global(.error-icon) {
    width: 1.5rem;
    height: 1.5rem;
    color: #dc2626;
    flex-shrink: 0;
  }

  .error-state.small :global(.error-icon) {
    width: 1.25rem;
    height: 1.25rem;
  }

  .error-desc {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }

  .error-state.small .error-desc {
    font-size: 0.85rem;
  }

  /* Usage Grid */
  .usage-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .usage-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--grove-overlay-5);
    border-radius: var(--border-radius-standard);
  }

  :global(.usage-icon) {
    width: 1.25rem;
    height: 1.25rem;
    color: var(--color-primary);
    flex-shrink: 0;
    margin-top: 0.125rem;
  }

  .usage-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .usage-label {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .usage-value {
    font-weight: 600;
    color: var(--color-text);
  }

  .usage-bar {
    height: 4px;
    background: var(--grove-overlay-15);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 0.25rem;
  }

  .usage-fill {
    height: 100%;
    background: var(--color-primary);
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .usage-fill.warning {
    background: #ea580c;
  }
</style>
