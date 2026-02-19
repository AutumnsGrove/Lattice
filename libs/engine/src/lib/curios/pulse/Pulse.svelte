<script lang="ts">
  import type {
    PulseActiveStatus,
    PulseTodayStats,
    PulseStreak,
    PulseEvent,
    PulseDailyStats,
    PulseHourlyActivity,
    PulseCurioConfig,
  } from "./index";
  import PulseIndicator from "./PulseIndicator.svelte";
  import PulseStats from "./PulseStats.svelte";
  import PulseHeatmap from "./PulseHeatmap.svelte";
  import PulseFeed from "./PulseFeed.svelte";
  import PulseTrends from "./PulseTrends.svelte";
  import { GlassCard } from "$lib/ui/components/ui";

  interface Props {
    config: PulseCurioConfig;
    active: PulseActiveStatus;
    today: PulseTodayStats;
    streak: PulseStreak;
    events: PulseEvent[];
    dailyStats: PulseDailyStats[];
    hourlyActivity: PulseHourlyActivity[];
    hasMore?: boolean;
    onLoadMore?: () => void;
  }

  let {
    config,
    active,
    today,
    streak,
    events,
    dailyStats,
    hourlyActivity,
    hasMore = false,
    onLoadMore,
  }: Props = $props();
</script>

<div class="pulse-page">
  <!-- Hero: Heartbeat Indicator -->
  <GlassCard class="pulse-hero">
    <PulseIndicator {active} size="lg" />
    {#if streak.days > 1}
      <div class="streak-badge" role="status" aria-label="{streak.days} day commit streak">
        {streak.days}-day streak
      </div>
    {/if}
  </GlassCard>

  <!-- Today's Stats -->
  {#if config.showStats}
    <section aria-labelledby="pulse-stats-heading">
      <h2 id="pulse-stats-heading" class="section-title">Today</h2>
      <PulseStats {today} {streak} />
    </section>
  {/if}

  <!-- Activity Heatmap -->
  {#if config.showHeatmap && hourlyActivity.length > 0}
    <section aria-labelledby="pulse-heatmap-heading">
      <h2 id="pulse-heatmap-heading" class="section-title">Activity</h2>
      <GlassCard class="heatmap-wrapper">
        <PulseHeatmap {hourlyActivity} />
      </GlassCard>
    </section>
  {/if}

  <!-- Trends -->
  {#if config.showTrends && dailyStats.length > 0}
    <section aria-labelledby="pulse-trends-heading">
      <h2 id="pulse-trends-heading" class="section-title">Trends</h2>
      <PulseTrends {dailyStats} />
    </section>
  {/if}

  <!-- Event Feed -->
  {#if config.showFeed}
    <section aria-labelledby="pulse-feed-heading">
      <h2 id="pulse-feed-heading" class="section-title">Recent Activity</h2>
      <GlassCard class="feed-wrapper">
        <PulseFeed {events} {hasMore} {onLoadMore} />
      </GlassCard>
    </section>
  {/if}
</div>

<style>
  .pulse-page {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  :global(.pulse-hero) {
    padding: 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .streak-badge {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-warning, #f59e0b);
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.15);
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    letter-spacing: 0.02em;
  }

  .section-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-muted-foreground, var(--color-text-muted));
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0 0 1rem;
  }

  :global(.heatmap-wrapper) {
    padding: 1.25rem;
  }

  :global(.feed-wrapper) {
    padding: 1.25rem;
  }
</style>
