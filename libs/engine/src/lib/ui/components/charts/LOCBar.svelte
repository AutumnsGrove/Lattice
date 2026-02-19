<script>
  /**
   * LOCBar - Lines of Code visualization
   * Shows additions and deletions as a horizontal stacked bar
   */

  let {
    additions = 0,
    deletions = 0,
    maxWidth = 100,
    height = 8,
    showLabels = false,
    compact = false
  } = $props();

  const total = $derived(additions + deletions || 1);
  const addPercent = $derived((additions / total) * 100);
  const delPercent = $derived((deletions / total) * 100);

  // Scale based on a reasonable max (e.g., 1000 lines)
  const maxLines = 2000;
  const scaledTotal = $derived(Math.min(total / maxLines, 1) * 100);
</script>

{#if compact}
  <div class="loc-bar-compact" style="width: {maxWidth}px;">
    <div class="bar-track">
      <div
        class="bar-add"
        style="width: {(additions / maxLines) * 100}%;"
        title="+{additions.toLocaleString()} additions"
      ></div>
      <div
        class="bar-del"
        style="width: {(deletions / maxLines) * 100}%;"
        title="-{deletions.toLocaleString()} deletions"
      ></div>
    </div>
  </div>
{:else}
  <div class="loc-bar" style="width: {maxWidth}px;">
    {#if showLabels}
      <div class="loc-labels">
        <span class="label-add">+{additions.toLocaleString()}</span>
        <span class="label-del">-{deletions.toLocaleString()}</span>
      </div>
    {/if}
    <div class="bar-container" style="height: {height}px;">
      <div
        class="bar-segment bar-add"
        style="width: {addPercent}%;"
        title="+{additions.toLocaleString()} additions"
      ></div>
      <div
        class="bar-segment bar-del"
        style="width: {delPercent}%;"
        title="-{deletions.toLocaleString()} deletions"
      ></div>
    </div>
  </div>
{/if}

<style>
  .loc-bar {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .loc-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    font-weight: 500;
  }
  .label-add {
    color: var(--accent-success);
  }
  .label-del {
    color: var(--accent-danger);
  }
  :global(.dark) .label-add {
    color: var(--accent-success);
  }
  :global(.dark) .label-del {
    color: #e57373;
  }
  .bar-container {
    display: flex;
    background: #e9ecef;
    border-radius: 4px;
    overflow: hidden;
  }
  :global(.dark) .bar-container {
    background: var(--light-border-secondary);
  }
  .bar-segment {
    height: 100%;
    transition: width 0.3s ease;
  }
  .bar-add {
    background: linear-gradient(90deg, var(--accent-success) 0%, #34d058 100%);
  }
  .bar-del {
    background: linear-gradient(90deg, var(--accent-danger) 0%, #e57373 100%);
  }
  /* Compact style */
  .loc-bar-compact {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  .loc-bar-compact .bar-track {
    flex: 1;
    height: 4px;
    background: #e9ecef;
    border-radius: 2px;
    display: flex;
    overflow: hidden;
  }
  :global(.dark) .loc-bar-compact .bar-track {
    background: var(--light-border-secondary);
  }
  .loc-bar-compact .bar-add,
  .loc-bar-compact .bar-del {
    height: 100%;
    max-width: 50%;
    transition: width 0.3s ease;
  }
</style>
