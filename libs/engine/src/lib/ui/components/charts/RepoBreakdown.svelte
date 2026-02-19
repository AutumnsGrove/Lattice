<script>
  /**
   * RepoBreakdown - Shows which repositories had activity
   * A simple horizontal stacked bar or pill visualization
   */

  /**
   * @typedef {Object} RepoData
   * @property {string} name
   * @property {number} [commits]
   * @property {number} [additions]
   * @property {number} [deletions]
   */

  let {
    repos = /** @type {RepoData[]} */ ([]),
    mode = /** @type {'commits' | 'loc'} */ ('commits'),
    maxWidth = 150,
    showLegend = true
  } = $props();

  // Color palette for repos
  const colors = [
    '#5cb85f', // green
    '#5bc0de', // cyan
    '#f0ad4e', // orange
    '#d9534f', // red
    '#9b59b6', // purple
    '#3498db', // blue
    '#1abc9c', // teal
    '#e67e22', // dark orange
  ];

  function getTotal() {
    if (mode === 'commits') {
      return repos.reduce((/** @type {number} */ sum, /** @type {RepoData} */ r) => sum + (r.commits || 1), 0) || 1;
    }
    return repos.reduce((/** @type {number} */ sum, /** @type {RepoData} */ r) => sum + (r.additions || 0) + (r.deletions || 0), 0) || 1;
  }

  /** @param {RepoData} repo */
  function getValue(repo) {
    if (mode === 'commits') {
      return repo.commits || 1;
    }
    return (repo.additions || 0) + (repo.deletions || 0);
  }

  const total = $derived(getTotal());
  const segments = $derived(
    repos.map((/** @type {RepoData} */ repo, /** @type {number} */ i) => ({
      name: repo.name,
      value: getValue(repo),
      percent: (getValue(repo) / total) * 100,
      color: colors[i % colors.length]
    }))
  );
</script>

{#if repos.length > 0}
  <div class="repo-breakdown" style="max-width: {maxWidth}px;">
    <div class="breakdown-bar">
      {#each segments as segment, i}
        <div
          class="breakdown-segment"
          style="width: {segment.percent}%; background-color: {segment.color};"
          title="{segment.name}: {segment.value} {mode === 'commits' ? 'commits' : 'lines'}"
        ></div>
      {/each}
    </div>

    {#if showLegend && repos.length <= 4}
      <div class="breakdown-legend">
        {#each segments as segment}
          <div class="legend-item">
            <span class="legend-dot" style="background-color: {segment.color};"></span>
            <span class="legend-name">{segment.name}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .repo-breakdown {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .breakdown-bar {
    display: flex;
    height: 6px;
    background: #e9ecef;
    border-radius: 3px;
    overflow: hidden;
  }
  :global(.dark) .breakdown-bar {
    background: var(--light-border-secondary);
  }
  .breakdown-segment {
    height: 100%;
    min-width: 2px;
    transition: width 0.3s ease;
  }
  .breakdown-segment:first-child {
    border-radius: 3px 0 0 3px;
  }
  .breakdown-segment:last-child {
    border-radius: 0 3px 3px 0;
  }
  .breakdown-segment:only-child {
    border-radius: 3px;
  }
  .breakdown-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.65rem;
    color: #666;
  }
  :global(.dark) .legend-item {
    color: var(--light-text-muted);
  }
  .legend-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .legend-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 60px;
  }
</style>
