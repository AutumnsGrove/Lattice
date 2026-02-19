<script lang="ts">
  import type { PulseActiveStatus } from "./index";
  import { formatRelativeTime } from "./index";

  interface Props {
    active: PulseActiveStatus;
    size?: "sm" | "md" | "lg";
  }

  let { active, size = "md" }: Props = $props();

  const sizeClasses: Record<string, string> = {
    sm: "indicator-sm",
    md: "indicator-md",
    lg: "indicator-lg",
  };
</script>

<div class="pulse-indicator {sizeClasses[size]}" role="status" aria-label={active.isActive ? "Currently active" : "Inactive"}>
  <span class="dot {active.isActive ? 'active' : 'inactive'}">
    {#if active.isActive}
      <span class="ripple"></span>
    {/if}
  </span>
  <span class="label">
    {#if active.isActive}
      <span class="status-text active-text">Currently building...</span>
      {#if active.message}
        <span class="commit-message">{active.message}</span>
      {/if}
    {:else if active.lastCommit}
      <span class="status-text">Last seen {formatRelativeTime(active.lastCommit)}</span>
    {:else}
      <span class="status-text">No recent activity</span>
    {/if}
  </span>
</div>

<style>
  .pulse-indicator {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .dot {
    position: relative;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .indicator-sm .dot {
    width: 0.5rem;
    height: 0.5rem;
  }

  .indicator-md .dot {
    width: 0.75rem;
    height: 0.75rem;
  }

  .indicator-lg .dot {
    width: 1rem;
    height: 1rem;
  }

  .dot.active {
    background: var(--grove-500, #22c55e);
    box-shadow: 0 0 8px var(--grove-overlay-50, rgba(34, 197, 94, 0.5));
  }

  .dot.inactive {
    background: var(--color-text-muted);
    opacity: 0.4;
  }

  .ripple {
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2px solid var(--grove-500, #22c55e);
    opacity: 0;
    animation: pulse-ripple 2s ease-out infinite;
  }

  @keyframes pulse-ripple {
    0% {
      opacity: 0.6;
      transform: scale(0.8);
    }
    100% {
      opacity: 0;
      transform: scale(1.8);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ripple {
      animation: none;
      opacity: 0.3;
      transform: scale(1.2);
    }
  }

  .label {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .status-text {
    font-size: 0.875rem;
    color: var(--color-text-muted);
  }

  .active-text {
    color: var(--grove-500, #22c55e);
    font-weight: 500;
  }

  :global(.dark) .active-text {
    color: var(--grove-400, #4ade80);
  }

  .commit-message {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-style: italic;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 400px;
  }
</style>
