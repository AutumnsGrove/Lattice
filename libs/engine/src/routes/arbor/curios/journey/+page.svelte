<script lang="ts">
  import { GlassCard, Waystone } from "$lib/ui/components/ui";
  import { ChevronLeft, Sparkles } from "lucide-svelte";
</script>

<svelte:head>
  <title>Journey Curio - Admin</title>
</svelte:head>

<div class="journey-coming-soon">
  <header class="page-header">
    <a href="/arbor/curios" class="back-link">
      <ChevronLeft class="back-icon" />
      <span>Back to Curios</span>
    </a>

    <div class="header-content">
      <div class="title-row">
        <Sparkles class="header-icon" />
        <h1>Journey</h1>
        <Waystone slug="what-is-journey" label="Learn about Journey" />
      </div>
      <p class="subtitle">
        Visualize your creative path and celebrate your blogging milestones
      </p>
    </div>
  </header>

  <GlassCard class="coming-soon-card">
    <div class="coming-soon-content">
      <div class="coming-soon-icon">
        <Sparkles />
      </div>
      <h2>Coming Soon</h2>
      <p class="coming-soon-description">
        Journey will help you visualize your blogging milestones, track your
        growth over time, and celebrate your creative path. Watch as your
        journey unfolds through beautiful visualizations and meaningful insights.
      </p>
      <p class="phase-note">
        Coming in Full Bloom (Early Summer)
      </p>
    </div>
  </GlassCard>
</div>

<style>
  .journey-coming-soon {
    max-width: 800px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--color-text-muted);
    font-size: 0.875rem;
    text-decoration: none;
    margin-bottom: 1rem;
    transition: color 0.15s;
  }

  .back-link:hover {
    color: var(--color-text);
  }

  :global(.back-icon) {
    width: 1rem;
    height: 1rem;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  :global(.header-icon) {
    width: 2rem;
    height: 2rem;
    color: var(--color-primary);
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    color: var(--color-text-muted);
    font-size: 1rem;
    line-height: 1.6;
    max-width: 600px;
  }

  :global(.coming-soon-card) {
    padding: 3rem 2rem !important;
  }

  .coming-soon-content {
    text-align: center;
  }

  .coming-soon-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 1.5rem;
  }

  :global(.coming-soon-icon svg) {
    width: 3rem;
    height: 3rem;
    color: var(--color-primary);
    opacity: 0.8;
  }

  h2 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 1rem 0;
  }

  .coming-soon-description {
    font-size: 1rem;
    line-height: 1.6;
    color: var(--color-text-muted);
    margin: 0 0 1.5rem 0;
    max-width: 500px;
    margin-left: auto;
    margin-right: auto;
  }

  .phase-note {
    font-size: 0.9rem;
    font-style: italic;
    color: var(--color-text-muted);
    margin: 0;
  }

  @media (max-width: 640px) {
    .title-row {
      flex-wrap: wrap;
    }

    :global(.coming-soon-card) {
      padding: 2rem 1.5rem !important;
    }

    h2 {
      font-size: 1.5rem;
    }
  }
</style>
