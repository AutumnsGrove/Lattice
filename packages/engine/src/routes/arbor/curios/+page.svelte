<script lang="ts">
  import { GlassCard, GlassButton, Badge, Waystone, GroveTerm, GroveSwap, GroveIntro } from "$lib/ui/components/ui";
  import { Calendar, Sparkles, GitBranch, Construction, Image, Warehouse } from "lucide-svelte";

  // Available curios with their status
  const curios = [
    {
      id: "gallery",
      name: "Gallery",
      description: "Beautiful image galleries with tags, collections, and lightbox viewing",
      icon: Image,
      status: "available",
      href: "/arbor/curios/gallery",
      features: [
        "Amber storage",
        "Tags and collections",
        "Lightbox viewer",
        "Masonry layout"
      ]
    },
    {
      id: "timeline",
      name: "Timeline",
      description: "AI-powered daily summaries of your GitHub activity",
      icon: Calendar,
      status: "greenhouse",
      href: "/arbor/curios/timeline",
      features: [
        "Daily commit summaries",
        "5 voice presets + custom",
        "Activity heatmap",
        "Gutter comments"
      ]
    },
    {
      id: "journey",
      name: "Journey",
      description: "Visualize your repo's growth with line-based metrics and beautiful charts",
      icon: GitBranch,
      status: "greenhouse",
      href: "/arbor/curios/journey",
      features: [
        "Version milestones",
        "Code composition",
        "Growth timeline",
        "AI release notes"
      ]
    }
  ];
</script>

<svelte:head>
  <title>Curios - Admin</title>
</svelte:head>

<div class="curios-page">
  <header class="page-header">
    <div class="header-content">
      <div class="title-row">
        <Sparkles class="header-icon" />
        <h1><GroveTerm term="curios">Curios</GroveTerm></h1>
        <Waystone slug="what-are-curios" label="Learn about Curios" />
      </div>
      <GroveIntro term="curios" />
      <p class="subtitle">
        Fun, delightful tools that make your site feel alive.
        Developer <GroveSwap term="curios">curios</GroveSwap> help you showcase your work in unique ways.
      </p>
    </div>
  </header>

  <div class="curios-grid">
    {#each curios as curio}
      <GlassCard class="curio-card {curio.status === 'coming-soon' ? 'coming-soon' : ''}">
        <div class="curio-header">
          <div class="curio-icon">
            <svelte:component this={curio.icon} />
          </div>
          <div class="curio-title-row">
            <h2>{curio.name}</h2>
            {#if curio.status === "coming-soon"}
              <Badge variant="secondary">
                <Construction class="badge-icon" />
                Coming Soon
              </Badge>
            {:else if curio.status === "greenhouse"}
              <Badge variant="default" class="greenhouse-badge">
                <Warehouse class="badge-icon" />
                Greenhouse
              </Badge>
            {:else}
              <Badge variant="default">Available</Badge>
            {/if}
          </div>
        </div>

        <p class="curio-description">{curio.description}</p>

        <ul class="feature-list">
          {#each curio.features as feature}
            <li>{feature}</li>
          {/each}
        </ul>

        <div class="curio-actions">
          {#if curio.href}
            <GlassButton href={curio.href} variant="accent">
              Configure
            </GlassButton>
          {:else}
            <GlassButton disabled variant="ghost">
              Coming Soon
            </GlassButton>
          {/if}
        </div>
      </GlassCard>
    {/each}
  </div>
</div>

<style>
  .curios-page {
    max-width: 1000px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 2rem;
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

  .curios-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }

  :global(.curio-card) {
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
  }

  :global(.curio-card.coming-soon) {
    opacity: 0.7;
  }

  .curio-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .curio-icon {
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--grove-overlay-8);
    border-radius: var(--border-radius-standard);
    color: var(--color-primary);
    flex-shrink: 0;
  }

  .curio-icon :global(svg) {
    width: 1.5rem;
    height: 1.5rem;
  }

  .curio-title-row {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .curio-title-row h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    color: var(--color-text);
  }

  :global(.badge-icon) {
    width: 0.875rem;
    height: 0.875rem;
    margin-right: 0.25rem;
  }

  :global(.greenhouse-badge) {
    background-color: rgb(209 250 229) !important; /* emerald-100 */
    color: rgb(5 150 105) !important; /* emerald-600 */
  }

  :global(.dark .greenhouse-badge) {
    background-color: rgb(6 78 59 / 0.2) !important; /* emerald-900/20 */
    color: rgb(52 211 153) !important; /* emerald-400 */
  }

  .curio-description {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .feature-list {
    list-style: none;
    padding: 0;
    margin: 0 0 1.5rem 0;
    flex: 1;
  }

  .feature-list li {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    padding: 0.25rem 0;
    padding-left: 1.25rem;
    position: relative;
  }

  .feature-list li::before {
    content: "✓";
    position: absolute;
    left: 0;
    color: var(--color-primary);
    font-size: 0.75rem;
  }

  .curio-actions {
    margin-top: auto;
  }

  @media (max-width: 640px) {
    .curios-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
