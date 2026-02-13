<script lang="ts">
  /**
   * Pulse Public Route — Page
   *
   * Displays live development heartbeat for the site owner.
   * Uses Pulse components from the curios library.
   */

  import { Activity } from "lucide-svelte";
  import { Pulse } from "$lib/curios/pulse";
  import { toast } from "$lib/ui";

  import type {
    PulseEvent,
    PulseDailyStats,
    PulseHourlyActivity,
    PulseActiveStatus,
    PulseTodayStats,
    PulseStreak,
    PulseCurioConfig,
  } from "$lib/curios/pulse";

  interface PageData {
    config: PulseCurioConfig;
    active: PulseActiveStatus;
    today: PulseTodayStats;
    streak: PulseStreak;
    events: PulseEvent[];
    dailyStats: PulseDailyStats[];
    hourlyActivity: PulseHourlyActivity[];
  }

  let { data }: { data: PageData } = $props();

  // Local state for incremental loading
  const initialEvents = data.events;
  let events = $state(initialEvents);
  let hasMore = $state(initialEvents.length >= (data.config.feedMaxItems || 50));
  let offset = $state(initialEvents.length);

  async function loadMore(): Promise<void> {
    try {
      const response = await fetch(
        `/api/curios/pulse?limit=50&offset=${offset}`,
      ); // csrf-ok

      if (!response.ok) throw new Error("Failed to load more");

      const result = (await response.json()) as {
        events: PulseEvent[];
        pagination: { hasMore: boolean };
      };
      events = [...events, ...result.events];
      offset += result.events.length;
      hasMore = result.pagination.hasMore;
    } catch (error) {
      toast.error("Failed to load more events");
      console.error("Load more error:", error);
    }
  }
</script>

<svelte:head>
  <title>Development Pulse</title>
  <meta
    name="description"
    content="Live development heartbeat — real-time activity from GitHub"
  />
</svelte:head>

<div class="pulse-page">
  <header class="pulse-header">
    <h1><Activity size={28} /> Development Pulse</h1>
    <p>Live heartbeat of what's being built, right now</p>
  </header>

  <Pulse
    config={data.config}
    active={data.active}
    today={data.today}
    streak={data.streak}
    {events}
    dailyStats={data.dailyStats}
    hourlyActivity={data.hourlyActivity}
    {hasMore}
    onLoadMore={loadMore}
  />
</div>

<style>
  .pulse-page {
    max-width: 900px;
    margin: 0 auto;
    padding: 1rem;
  }

  .pulse-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .pulse-header h1 {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: #2c5f2d;
    margin: 0;
    font-size: 1.75rem;
  }

  :global(.dark) .pulse-header h1 {
    color: var(--grove-500, #4ade80);
  }

  .pulse-header p {
    color: #666;
    margin: 0.5rem 0 0;
  }

  :global(.dark) .pulse-header p {
    color: var(--color-muted-foreground, #888);
  }
</style>
