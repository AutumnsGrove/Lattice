<script lang="ts">
  import type { PulseDailyStats } from "./index";
  import { GlassCard } from "$lib/ui/components/ui";

  interface Props {
    dailyStats: PulseDailyStats[];
  }

  let { dailyStats }: Props = $props();

  // Compute trend data
  const trends = $derived.by(() => {
    if (dailyStats.length === 0) return null;

    const sorted = [...dailyStats].sort((a, b) => a.date.localeCompare(b.date));

    // Split into this week and last week
    const midpoint = Math.floor(sorted.length / 2);
    const lastWeek = sorted.slice(0, midpoint);
    const thisWeek = sorted.slice(midpoint);

    const sum = (arr: PulseDailyStats[], key: keyof PulseDailyStats) =>
      arr.reduce((total, d) => total + (Number(d[key]) || 0), 0);

    const commitsTrend = {
      label: "Commits",
      current: sum(thisWeek, "commits"),
      previous: sum(lastWeek, "commits"),
      sparkline: sorted.map((d) => d.commits),
    };

    const linesAddedTrend = {
      label: "Lines Added",
      current: sum(thisWeek, "linesAdded"),
      previous: sum(lastWeek, "linesAdded"),
      sparkline: sorted.map((d) => d.linesAdded),
    };

    const prsTrend = {
      label: "PRs Merged",
      current: sum(thisWeek, "prsMerged"),
      previous: sum(lastWeek, "prsMerged"),
      sparkline: sorted.map((d) => d.prsMerged),
    };

    const issuesTrend = {
      label: "Issues Closed",
      current: sum(thisWeek, "issuesClosed"),
      previous: sum(lastWeek, "issuesClosed"),
      sparkline: sorted.map((d) => d.issuesClosed),
    };

    return [commitsTrend, linesAddedTrend, prsTrend, issuesTrend];
  });

  function delta(current: number, previous: number): string {
    if (previous === 0) return current > 0 ? "+" : "—";
    const pct = Math.round(((current - previous) / previous) * 100);
    return pct > 0 ? `+${pct}%` : `${pct}%`;
  }

  function deltaClass(current: number, previous: number): string {
    if (current > previous) return "delta-up";
    if (current < previous) return "delta-down";
    return "delta-flat";
  }

  // Simple sparkline as SVG polyline
  function sparklinePath(values: number[]): string {
    if (values.length === 0) return "";
    const max = Math.max(...values, 1);
    const w = 80;
    const h = 24;
    const step = w / Math.max(values.length - 1, 1);
    return values
      .map((v, i) => `${i * step},${h - (v / max) * h}`)
      .join(" ");
  }
</script>

{#if trends}
  <div class="pulse-trends" role="region" aria-label="Development trends">
    {#each trends as trend}
      <GlassCard class="trend-card">
        <div class="trend-header">
          <span class="trend-label">{trend.label}</span>
          <span class="trend-delta {deltaClass(trend.current, trend.previous)}">
            {delta(trend.current, trend.previous)}
          </span>
        </div>
        <div class="trend-value">{trend.current.toLocaleString()}</div>
        <svg class="sparkline" viewBox="0 0 80 24" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            points={sparklinePath(trend.sparkline)}
            fill="none"
            stroke="var(--color-primary)"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <div class="trend-period">
          vs previous {Math.floor(trend.sparkline.length / 2)} days
        </div>
      </GlassCard>
    {/each}
  </div>
{/if}

<style>
  .pulse-trends {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
  }

  :global(.trend-card) {
    padding: 1rem;
  }

  .trend-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .trend-label {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .trend-delta {
    font-size: 0.75rem;
    font-weight: 600;
  }

  .delta-up {
    color: #22c55e;
  }

  .delta-down {
    color: #ef4444;
  }

  .delta-flat {
    color: var(--color-text-muted);
  }

  .trend-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  .sparkline {
    width: 100%;
    height: 24px;
    margin-bottom: 0.25rem;
  }

  .trend-period {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    opacity: 0.6;
  }

  @media (max-width: 640px) {
    .pulse-trends {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
