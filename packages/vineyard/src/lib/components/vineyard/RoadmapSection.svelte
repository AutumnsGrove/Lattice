<!--
  RoadmapSection.svelte
  Displays feature roadmap with built, in-progress, and planned items

  Usage:
  <RoadmapSection
    built={['Core storage view', 'Usage breakdown']}
    inProgress={['Export functionality']}
    planned={['Bulk delete', 'Storage alerts']}
  />
-->
<script lang="ts">
  import type { RoadmapSectionProps } from '../../types/index.js';
  import { Check, ArrowRight, Circle } from 'lucide-svelte';

  let { built, inProgress, planned }: RoadmapSectionProps = $props();
</script>

<section class="roadmap-section">
  <div class="roadmap-header">
    <h3 class="roadmap-title">Roadmap</h3>
    <p class="roadmap-subtitle">What's built, what's next, and what's planned</p>
  </div>

  <div class="roadmap-timeline">
    {#if built.length > 0}
      <div class="roadmap-group roadmap-built">
        <div class="group-header">
          <div class="group-icon">
            <Check size={16} />
          </div>
          <h4 class="group-title">Built</h4>
          <span class="group-count">{built.length}</span>
        </div>
        <ul class="group-list">
          {#each built as item}
            <li class="roadmap-item">
              <span class="item-indicator"></span>
              <span class="item-text">{item}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if inProgress.length > 0}
      <div class="roadmap-group roadmap-in-progress">
        <div class="group-header">
          <div class="group-icon">
            <ArrowRight size={16} />
          </div>
          <h4 class="group-title">In Progress</h4>
          <span class="group-count">{inProgress.length}</span>
        </div>
        <ul class="group-list">
          {#each inProgress as item}
            <li class="roadmap-item">
              <span class="item-indicator"></span>
              <span class="item-text">{item}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if planned.length > 0}
      <div class="roadmap-group roadmap-planned">
        <div class="group-header">
          <div class="group-icon">
            <Circle size={16} />
          </div>
          <h4 class="group-title">Planned</h4>
          <span class="group-count">{planned.length}</span>
        </div>
        <ul class="group-list">
          {#each planned as item}
            <li class="roadmap-item">
              <span class="item-indicator"></span>
              <span class="item-text">{item}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  </div>
</section>

<style>
  .roadmap-section {
    --grove-amber-100: #fef3c7;
    --grove-amber-500: #f59e0b;
    --grove-amber-600: #d97706;
    --grove-stone-100: #f5f5f4;
    --grove-stone-800: #292524;
    --grove-glass-border: rgba(245, 158, 11, 0.2);
    --status-ready: #22c55e;
    --status-in-progress: #f97316;
    --status-planned: #9ca3af;
  }

  .roadmap-header {
    margin-bottom: 1.5rem;
  }

  .roadmap-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--grove-stone-800);
    margin: 0 0 0.25rem;
  }

  .roadmap-subtitle {
    font-size: 0.9375rem;
    color: #78716c;
    margin: 0;
  }

  .roadmap-timeline {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .roadmap-group {
    background: white;
    border: 1px solid var(--grove-glass-border);
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .group-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--grove-glass-border);
  }

  .group-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
  }

  .roadmap-built .group-icon {
    background: rgba(34, 197, 94, 0.1);
    color: var(--status-ready);
  }

  .roadmap-in-progress .group-icon {
    background: rgba(249, 115, 22, 0.1);
    color: var(--status-in-progress);
  }

  .roadmap-planned .group-icon {
    background: rgba(156, 163, 175, 0.1);
    color: var(--status-planned);
  }

  .group-title {
    flex: 1;
    font-size: 1rem;
    font-weight: 600;
    color: var(--grove-stone-800);
    margin: 0;
  }

  .group-count {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.125rem 0.5rem;
    border-radius: 9999px;
    background: var(--grove-stone-100);
    color: #78716c;
  }

  .group-list {
    list-style: none;
    margin: 0;
    padding: 0.5rem 0;
  }

  .roadmap-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.625rem 1.25rem;
    transition: background 0.15s ease;
  }

  .roadmap-item:hover {
    background: var(--grove-stone-100);
  }

  .item-indicator {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .roadmap-built .item-indicator {
    background: var(--status-ready);
  }

  .roadmap-in-progress .item-indicator {
    background: var(--status-in-progress);
    animation: pulse-dot 2s ease-in-out infinite;
  }

  .roadmap-planned .item-indicator {
    background: transparent;
    border: 2px solid var(--status-planned);
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.2); }
  }

  .item-text {
    font-size: 0.9375rem;
    color: var(--grove-stone-800);
  }

  @media (min-width: 768px) {
    .roadmap-timeline {
      flex-direction: row;
    }

    .roadmap-group {
      flex: 1;
    }
  }
</style>
