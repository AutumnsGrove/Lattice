<script>
  /**
   * ActivityOverview - Weekly activity visualization
   * Shows a GitHub-style contribution chart for recent days
   *
   * Data format: { activity_date: string, commit_count: number }[]
   * (matches GitHub contributions API format)
   */
  import Sparkline from './Sparkline.svelte';

  /**
   * @typedef {Object} ActivityData
   * @property {string} activity_date
   * @property {number} commit_count
   */

  /**
   * @typedef {Object} LocData
   * @property {number} additions
   * @property {number} deletions
   */

  let {
    data = /** @type {ActivityData[]} */ ([]),
    locData = /** @type {LocData} */ ({ additions: 0, deletions: 0 }),
    days = 14
  } = $props();

  // Format date as YYYY-MM-DD in local timezone (not UTC!)
  // This matches how GitHub attributes contributions to user's timezone
  /** @param {Date} date */
  function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Ensure we have the right number of days, using local timezone
  // Use $derived.by to cache the result (not $derived with arrow function which returns the function)
  const filledData = $derived.by(() => {
    const result = [];
    const today = new Date();

    // Build activity map for quick lookup
    /** @type {Record<string, number>} */
    const activityMap = {};
    for (const item of data) {
      activityMap[item.activity_date] = item.commit_count;
    }

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = formatDateKey(date);  // Local timezone!

      const commits = activityMap[dateStr] || 0;
      result.push({
        date: dateStr,
        commits,
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: i === 0
      });
    }

    return result;
  });

  // These now reference the cached result, not call the function 5x
  const commitDataArr = $derived(filledData.map(d => d.commits));

  const totalCommits = $derived(filledData.reduce((sum, d) => sum + d.commits, 0));
  const activeDays = $derived(filledData.filter(d => d.commits > 0).length);
  const peakCommits = $derived(Math.max(...filledData.map(d => d.commits), 0));

  // Get intensity level for heatmap (0-4)
  /** @param {number} commits */
  function getIntensity(commits) {
    if (commits === 0) return 0;
    if (commits <= 2) return 1;
    if (commits <= 5) return 2;
    if (commits <= 10) return 3;
    return 4;
  }
</script>

<div class="activity-overview">
  <div class="overview-header">
    <h3>Recent Activity</h3>
    <div class="overview-stats">
      <span class="stat">
        <strong>{totalCommits}</strong> commits
      </span>
      <span class="stat active-days">
        <strong>{activeDays}</strong> of {days} days active
      </span>
    </div>
  </div>

  <div class="overview-content">
    <!-- Heatmap -->
    <div class="heatmap">
      {#each filledData as day}
        <div
          class="heatmap-cell level-{getIntensity(day.commits)}"
          class:today={day.isToday}
          title="{day.date}: {day.commits} commits"
        >
          <span class="cell-day">{day.dayOfWeek.charAt(0)}</span>
        </div>
      {/each}
    </div>

    <!-- Sparklines -->
    <div class="sparklines">
      <div class="sparkline-row">
        <span class="sparkline-label">Commits</span>
        <Sparkline
          data={commitDataArr}
          width={140}
          height={20}
          strokeColor="#5cb85f"
          fillColor="rgba(92, 184, 95, 0.15)"
        />
        <span class="sparkline-peak" title="Peak commits in a day">↑{peakCommits}</span>
      </div>
    </div>
  </div>

  <div class="overview-footer">
    <div class="loc-summary">
      <span class="add">+{locData.additions.toLocaleString()}</span>
      <span class="del">-{locData.deletions.toLocaleString()}</span>
    </div>
  </div>
</div>

<style>
  .activity-overview {
    background: white;
    border-radius: 12px;
    padding: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    margin-bottom: 1.5rem;
  }
  :global(.dark) .activity-overview {
    background: var(--light-bg-tertiary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  .overview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }
  .overview-header h3 {
    margin: 0;
    font-size: 0.9rem;
    color: #2c5f2d;
    font-weight: 600;
  }
  :global(.dark) .overview-header h3 {
    color: var(--accent-success);
  }
  .overview-stats {
    display: flex;
    gap: 0.75rem;
    font-size: 0.8rem;
    color: #666;
  }
  :global(.dark) .overview-stats {
    color: var(--light-text-muted);
  }
  .overview-stats strong {
    color: var(--light-border-secondary);
  }
  :global(.dark) .overview-stats strong {
    color: var(--light-text-very-light);
  }
  .overview-content {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
  }
  @media (max-width: 500px) {
    .overview-content {
      flex-direction: column;
      gap: 0.75rem;
    }
  }
  /* Heatmap */
  .heatmap {
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
    max-width: 200px;
  }
  .heatmap-cell {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0;
    transition: transform 0.15s ease;
  }
  .heatmap-cell:hover {
    transform: scale(1.2);
  }
  .heatmap-cell.today {
    outline: 1px solid var(--accent-success);
    outline-offset: 1px;
  }
  .heatmap-cell.level-0 {
    background: #ebedf0;
  }
  .heatmap-cell.level-1 {
    background: #9be9a8;
  }
  .heatmap-cell.level-2 {
    background: #40c463;
  }
  .heatmap-cell.level-3 {
    background: #30a14e;
  }
  .heatmap-cell.level-4 {
    background: #216e39;
  }
  :global(.dark) .heatmap-cell.level-0 {
    background: #161b22;
  }
  :global(.dark) .heatmap-cell.level-1 {
    background: #0e4429;
  }
  :global(.dark) .heatmap-cell.level-2 {
    background: #006d32;
  }
  :global(.dark) .heatmap-cell.level-3 {
    background: #26a641;
  }
  :global(.dark) .heatmap-cell.level-4 {
    background: #39d353;
  }
  .cell-day {
    display: none;
  }
  /* Sparklines */
  .sparklines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .sparkline-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .sparkline-label {
    font-size: 0.7rem;
    color: var(--light-text-light);
    width: 45px;
    text-align: right;
  }
  :global(.dark) .sparkline-label {
    color: #777;
  }
  .sparkline-peak {
    font-size: 0.65rem;
    color: var(--light-text-muted);
    margin-left: 0.35rem;
    font-variant-numeric: tabular-nums;
  }
  :global(.dark) .sparkline-peak {
    color: #666;
  }
  /* Footer */
  .overview-footer {
    margin-top: 0.75rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--light-text-very-light);
    display: flex;
    justify-content: flex-end;
  }
  :global(.dark) .overview-footer {
    border-top-color: var(--light-border-secondary);
  }
  .loc-summary {
    display: flex;
    gap: 0.75rem;
    font-size: 0.8rem;
    font-weight: 500;
  }
  .loc-summary .add {
    color: var(--accent-success);
  }
  .loc-summary .del {
    color: var(--accent-danger);
  }
  :global(.dark) .loc-summary .add {
    color: var(--accent-success);
  }
  :global(.dark) .loc-summary .del {
    color: #e57373;
  }
</style>
