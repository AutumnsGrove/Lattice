<script lang="ts">
  import type { PulseHourlyActivity } from "./index";

  interface Props {
    hourlyActivity: PulseHourlyActivity[];
    days?: number;
  }

  let { hourlyActivity, days = 7 }: Props = $props();

  // Build heatmap grid: rows = days, cols = hours (0-23)
  const grid = $derived.by(() => {
    const map = new Map<string, number>();
    let maxEvents = 1;

    for (const entry of hourlyActivity) {
      const key = `${entry.date}-${entry.hour}`;
      const val = entry.commits + entry.events;
      map.set(key, val);
      if (val > maxEvents) maxEvents = val;
    }

    // Get last N days
    const today = new Date();
    const rows: Array<{ date: string; dayLabel: string; cells: Array<{ hour: number; value: number; level: number }> }> = [];

    for (let d = days - 1; d >= 0; d--) {
      const date = new Date(today);
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().split("T")[0];
      const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });

      const cells = [];
      for (let h = 0; h < 24; h++) {
        const value = map.get(`${dateStr}-${h}`) ?? 0;
        const level = value === 0 ? 0 : Math.min(4, Math.ceil((value / maxEvents) * 4));
        cells.push({ hour: h, value, level });
      }

      rows.push({ date: dateStr, dayLabel, cells });
    }

    return rows;
  });

  const hourLabels = ["12a", "", "", "3a", "", "", "6a", "", "", "9a", "", "", "12p", "", "", "3p", "", "", "6p", "", "", "9p", "", ""];
</script>

<div class="pulse-heatmap" role="img" aria-label="Activity heatmap showing commits per hour over the last {days} days">
  <div class="heatmap-header">
    <div class="day-spacer"></div>
    {#each hourLabels as label, i}
      <div class="hour-label" aria-hidden="true">
        {#if label}{label}{/if}
      </div>
    {/each}
  </div>

  {#each grid as row}
    <div class="heatmap-row">
      <div class="day-label">{row.dayLabel}</div>
      {#each row.cells as cell}
        <div
          class="heatmap-cell level-{cell.level}"
          title="{row.dayLabel} {cell.hour}:00 — {cell.value} event{cell.value !== 1 ? 's' : ''}"
          role="gridcell"
          aria-label="{row.date} {cell.hour}:00 UTC, {cell.value} events"
        ></div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .pulse-heatmap {
    overflow-x: auto;
  }

  .heatmap-header {
    display: grid;
    grid-template-columns: 2.5rem repeat(24, 1fr);
    gap: 2px;
    margin-bottom: 2px;
  }

  .day-spacer {
    width: 2.5rem;
  }

  .hour-label {
    font-size: 0.6rem;
    color: var(--color-text-muted);
    text-align: center;
    opacity: 0.6;
  }

  .heatmap-row {
    display: grid;
    grid-template-columns: 2.5rem repeat(24, 1fr);
    gap: 2px;
    margin-bottom: 2px;
  }

  .day-label {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 0.5rem;
  }

  .heatmap-cell {
    aspect-ratio: 1;
    border-radius: 2px;
    min-width: 12px;
    min-height: 12px;
    transition: transform 0.1s;
  }

  .heatmap-cell:hover {
    transform: scale(1.3);
    outline: 1px solid var(--color-text-muted);
    z-index: 1;
  }

  /* Seasonal-aware intensity levels */
  .level-0 {
    background: var(--grove-overlay-4, rgba(0, 0, 0, 0.04));
  }

  .level-1 {
    background: rgba(34, 197, 94, 0.2);
  }

  .level-2 {
    background: rgba(34, 197, 94, 0.4);
  }

  .level-3 {
    background: rgba(34, 197, 94, 0.6);
  }

  .level-4 {
    background: rgba(34, 197, 94, 0.85);
  }

  :global(.dark) .level-1 {
    background: rgba(74, 222, 128, 0.15);
  }

  :global(.dark) .level-2 {
    background: rgba(74, 222, 128, 0.3);
  }

  :global(.dark) .level-3 {
    background: rgba(74, 222, 128, 0.5);
  }

  :global(.dark) .level-4 {
    background: rgba(74, 222, 128, 0.75);
  }

  @media (prefers-reduced-motion: reduce) {
    .heatmap-cell:hover {
      transform: none;
    }
  }
</style>
