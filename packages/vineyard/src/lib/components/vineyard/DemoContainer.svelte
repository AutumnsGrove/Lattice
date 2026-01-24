<!--
  DemoContainer.svelte
  Wrapper for interactive demo content

  Usage:
  <DemoContainer
    title="Theme Picker Demo"
    description="Try switching between curated themes"
    mockData={true}
  >
    <ThemePicker themes={sampleThemes} />
  </DemoContainer>
-->
<script lang="ts">
  import type { DemoContainerProps } from '../../types/index.js';
  import type { Snippet } from 'svelte';
  import { FlaskConical } from 'lucide-svelte';

  interface Props extends DemoContainerProps {
    children: Snippet;
  }

  let { title, description, mockData = false, children }: Props = $props();
</script>

<div class="demo-container" class:mock-data={mockData}>
  <header class="demo-header">
    <div class="demo-title-group">
      <FlaskConical size={18} />
      <h4 class="demo-title">{title}</h4>
    </div>
    {#if mockData}
      <span class="mock-indicator">
        <span class="mock-dot"></span>
        Mock Data
      </span>
    {/if}
  </header>

  {#if description}
    <p class="demo-description">{description}</p>
  {/if}

  <div class="demo-content">
    {@render children()}
  </div>
</div>

<style>
  .demo-container {
    background: var(--color-surface-elevated, #f5f5f4);
    border: 1px solid var(--color-border-subtle, rgba(0, 0, 0, 0.08));
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .demo-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--color-accent-bg, #f0fdf4);
    border-bottom: 1px solid var(--color-border-subtle, rgba(0, 0, 0, 0.08));
  }

  .demo-title-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-primary, #16a34a);
  }

  .demo-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-foreground, #292524);
    margin: 0;
  }

  .mock-indicator {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 9999px;
    font-size: 0.6875rem;
    font-weight: 600;
    color: #3b82f6;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .mock-dot {
    width: 0.375rem;
    height: 0.375rem;
    background: #3b82f6;
    border-radius: 50%;
    animation: blink 2s ease-in-out infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .demo-description {
    font-size: 0.8125rem;
    color: var(--color-foreground-muted, rgba(61, 41, 20, 0.7));
    margin: 0;
    padding: 0.75rem 1rem 0;
  }

  .demo-content {
    padding: 1rem;
  }

  .mock-data .demo-content {
    position: relative;
  }

  .mock-data .demo-content::before {
    content: '';
    position: absolute;
    inset: 0;
    border: 2px dashed rgba(59, 130, 246, 0.2);
    border-radius: 0.5rem;
    pointer-events: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .mock-dot {
      animation: none;
    }
  }
</style>
