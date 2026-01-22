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
    --grove-amber-100: #fef3c7;
    --grove-amber-500: #f59e0b;
    --grove-amber-600: #d97706;
    --grove-stone-100: #f5f5f4;
    --grove-stone-800: #292524;
    --grove-glass-border: rgba(245, 158, 11, 0.2);
    --demo-blue: #3b82f6;

    background: var(--grove-stone-100);
    border: 1px solid var(--grove-glass-border);
    border-radius: 0.75rem;
    overflow: hidden;
  }

  .demo-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, var(--grove-amber-100) 0%, #fff 100%);
    border-bottom: 1px solid var(--grove-glass-border);
  }

  .demo-title-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--grove-amber-600);
  }

  .demo-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--grove-stone-800);
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
    color: var(--demo-blue);
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .mock-dot {
    width: 0.375rem;
    height: 0.375rem;
    background: var(--demo-blue);
    border-radius: 50%;
    animation: blink 2s ease-in-out infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .demo-description {
    font-size: 0.8125rem;
    color: #78716c;
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
</style>
