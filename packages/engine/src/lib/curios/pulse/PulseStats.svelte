<script lang="ts">
  import type { PulseTodayStats, PulseStreak } from "./index";
  import { GlassCard } from "$lib/ui/components/ui";

  interface Props {
    today: PulseTodayStats;
    streak: PulseStreak;
  }

  let { today, streak }: Props = $props();

  const stats = $derived([
    {
      label: "Commits",
      value: today.commits,
      color: "var(--color-primary)",
    },
    {
      label: "PRs Merged",
      value: today.prsMerged,
      color: "#a855f7",
    },
    {
      label: "Issues Closed",
      value: today.issuesClosed,
      color: "#f59e0b",
    },
    {
      label: "Lines Changed",
      value: today.linesAdded + today.linesRemoved,
      detail: `+${today.linesAdded} / -${today.linesRemoved}`,
      color: "#3b82f6",
    },
  ]);
</script>

<div class="pulse-stats" role="region" aria-label="Today's development stats">
  {#each stats as stat}
    <GlassCard class="stat-card">
      <div class="stat-value" style="color: {stat.color}">
        {stat.value.toLocaleString()}
      </div>
      <div class="stat-label">{stat.label}</div>
      {#if stat.detail}
        <div class="stat-detail">{stat.detail}</div>
      {/if}
    </GlassCard>
  {/each}

  {#if streak.days > 1}
    <GlassCard class="stat-card streak-card">
      <div class="stat-value streak-value">
        {streak.days}
      </div>
      <div class="stat-label">Day Streak</div>
      <div class="stat-detail">since {streak.since}</div>
    </GlassCard>
  {/if}
</div>

<style>
  .pulse-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 1rem;
  }

  :global(.stat-card) {
    padding: 1.25rem;
    text-align: center;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 0.25rem;
  }

  .stat-label {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-detail {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    opacity: 0.7;
    margin-top: 0.25rem;
  }

  .streak-value {
    color: #f59e0b;
  }

  :global(.streak-card) {
    background: rgba(245, 158, 11, 0.05) !important;
    border-color: rgba(245, 158, 11, 0.15) !important;
  }

  @media (max-width: 640px) {
    .pulse-stats {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
