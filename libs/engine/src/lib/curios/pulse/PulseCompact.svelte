<script lang="ts">
  import type { PulseActiveStatus, PulseTodayStats } from "./index";
  import PulseIndicator from "./PulseIndicator.svelte";

  interface Props {
    active: PulseActiveStatus;
    today: PulseTodayStats;
  }

  let { active, today }: Props = $props();
</script>

<div class="pulse-compact" role="complementary" aria-label="Development pulse">
  <PulseIndicator {active} size="sm" />

  <div class="compact-stats">
    <span class="compact-stat" title="Commits today">{today.commits} commits</span>
    {#if today.prsMerged > 0}
      <span class="compact-divider" aria-hidden="true">|</span>
      <span class="compact-stat" title="PRs merged today">{today.prsMerged} PRs</span>
    {/if}
  </div>
</div>

<style>
  .pulse-compact {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
  }

  .compact-stats {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .compact-divider {
    opacity: 0.3;
  }

  .compact-stat {
    white-space: nowrap;
  }
</style>
