<!--
  StatusBadge.svelte
  Consistent status indicator across all Vineyard pages

  Usage:
  <StatusBadge status="coming-soon" />

  Status types:
  - ready: Green, solid - Production-ready
  - preview: Yellow, dashed border - Functional but may change
  - demo: Blue, labeled - Working example, not real data
  - coming-soon: Gray, subtle - Designed, not yet built
  - in-development: Orange, pulsing - Actively being built
-->
<script lang="ts">
  import type { StatusBadgeProps } from '../../types/index.js';

  let { status }: StatusBadgeProps = $props();

  const labels: Record<string, string> = {
    'ready': 'Ready',
    'preview': 'Preview',
    'demo': 'Demo',
    'coming-soon': 'Coming Soon',
    'in-development': 'In Development'
  };
</script>

<span class="status-badge" data-status={status}>
  {labels[status] ?? status}
</span>

<style>
  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.025em;
    text-transform: uppercase;
    border-radius: 9999px;
    white-space: nowrap;
    transition: all 0.2s ease;
  }

  .status-badge[data-status="ready"] {
    background-color: #22c55e;
    color: white;
    box-shadow: 0 1px 3px rgba(34, 197, 94, 0.3);
  }

  .status-badge[data-status="preview"] {
    background-color: transparent;
    color: #d97706;
    border: 2px dashed #f59e0b;
  }

  .status-badge[data-status="demo"] {
    background-color: #3b82f6;
    color: white;
    box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3);
  }

  .status-badge[data-status="coming-soon"] {
    background-color: #f5f5f4;
    color: #6b7280;
    border: 1px solid #e5e5e5;
  }

  .status-badge[data-status="in-development"] {
    background-color: #f97316;
    color: white;
    box-shadow: 0 1px 3px rgba(249, 115, 22, 0.3);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.85;
      transform: scale(1.02);
    }
  }
</style>
