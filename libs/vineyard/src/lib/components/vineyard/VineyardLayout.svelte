<!--
  VineyardLayout.svelte
  Main layout wrapper for Vineyard showcase pages

  Usage:
  <VineyardLayout tool="amber" tagline="Your files, preserved" status="preview">
    <slot />
  </VineyardLayout>
-->
<script lang="ts">
	import type { VineyardLayoutProps, GroveTool } from "../../types/index.js";
	import type { Snippet } from "svelte";
	import StatusBadge from "./StatusBadge.svelte";

	interface Props extends VineyardLayoutProps {
		children: Snippet;
	}

	let { tool, tagline, status, children }: Props = $props();

	const toolName = $derived(tool.charAt(0).toUpperCase() + tool.slice(1));

	const toolPhilosophies: Record<GroveTool, string> = {
		amber: "Amber is fossilized tree resin—preserving moments in time.",
		ivy: "Ivy connects and climbs, reaching toward the light.",
		foliage: "Foliage provides the canopy—the visible layer of the forest.",
		meadow: "Meadow is where the grove meets the open sky.",
		rings: "Rings tell the story of growth over time.",
		trails: "Trails guide travelers through the forest.",
		heartwood: "Heartwood is the strong core that holds everything together.",
		forage: "Forage discovers hidden treasures in the undergrowth.",
	};

	const relatedTools: Record<GroveTool, GroveTool[]> = {
		amber: ["ivy", "meadow"],
		ivy: ["amber", "heartwood"],
		foliage: ["meadow", "trails"],
		meadow: ["foliage", "ivy", "rings"],
		rings: ["meadow", "trails"],
		trails: ["rings", "foliage"],
		heartwood: ["ivy", "meadow"],
		forage: ["amber", "trails"],
	};
</script>

<div class="vineyard-layout" data-tool={tool} lang="en">
	<header class="vineyard-hero">
		<div class="hero-content">
			<div class="hero-badge">
				<StatusBadge {status} />
			</div>
			<h1 class="tool-name">{toolName}</h1>
			<p class="tagline">{tagline}</p>
			<p class="philosophy">{toolPhilosophies[tool]}</p>
		</div>
		<div class="hero-decoration" aria-hidden="true"></div>
	</header>

	<main class="vineyard-content" id="main-content" aria-label="Feature showcase">
		{@render children()}
	</main>

	<footer class="vineyard-footer">
		<div class="footer-content">
			<p class="footer-label">Works well with</p>
			<nav class="related-tools" aria-label="Related Grove tools">
				{#each relatedTools[tool] as relatedTool}
					<a href="https://{relatedTool}.grove.place/vineyard" class="related-link">
						{relatedTool.charAt(0).toUpperCase() + relatedTool.slice(1)}
					</a>
				{/each}
			</nav>
			<p class="footer-brand">Part of the Grove ecosystem</p>
		</div>
	</footer>
</div>

<style>
	.vineyard-layout {
		font-family: "Lexend", system-ui, sans-serif;
		min-height: 100vh;
		background: var(--color-background, #fefdfb);
		color: var(--color-foreground, #3d2914);
	}

	.vineyard-hero {
		position: relative;
		padding: 4rem 2rem 3rem;
		background: var(--color-surface, rgba(255, 255, 255, 0.5));
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--color-border-subtle, rgba(0, 0, 0, 0.08));
		overflow: hidden;
	}

	.hero-content {
		position: relative;
		z-index: 1;
		max-width: 48rem;
		margin: 0 auto;
		text-align: center;
	}

	.hero-badge {
		margin-bottom: 1rem;
	}

	.tool-name {
		font-size: 3rem;
		font-weight: 700;
		margin: 0 0 0.5rem;
		color: var(--color-primary, #16a34a);
	}

	.tagline {
		font-size: 1.5rem;
		font-weight: 400;
		color: var(--color-foreground, #3d2914);
		margin: 0 0 1rem;
	}

	.philosophy {
		font-size: 1rem;
		font-style: italic;
		color: var(--color-foreground-muted, rgba(61, 41, 20, 0.7));
		margin: 0;
	}

	.hero-decoration {
		position: absolute;
		top: -50%;
		right: -10%;
		width: 40%;
		height: 200%;
		background: radial-gradient(
			ellipse at center,
			var(--color-accent-bg, rgba(22, 163, 74, 0.08)) 0%,
			transparent 70%
		);
		pointer-events: none;
	}

	.vineyard-content {
		max-width: 72rem;
		margin: 0 auto;
		padding: 3rem 2rem;
	}

	.vineyard-footer {
		background: var(--color-surface-elevated, #ffffff);
		border-top: 1px solid var(--color-border-subtle, rgba(0, 0, 0, 0.08));
		padding: 2rem;
	}

	.footer-content {
		max-width: 48rem;
		margin: 0 auto;
		text-align: center;
	}

	.footer-label {
		font-size: 0.875rem;
		color: var(--color-foreground-subtle, rgba(61, 41, 20, 0.5));
		margin: 0 0 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.related-tools {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	.related-link {
		padding: 0.5rem 1rem;
		background: var(--color-surface, rgba(255, 255, 255, 0.5));
		border: 1px solid var(--color-border-subtle, rgba(0, 0, 0, 0.08));
		border-radius: 9999px;
		color: var(--color-primary, #16a34a);
		text-decoration: none;
		font-weight: 500;
		font-size: 0.875rem;
		transition: all 0.2s ease;
	}

	.related-link:hover {
		background: var(--color-accent-bg, #f0fdf4);
		border-color: var(--color-primary, #16a34a);
		transform: translateY(-1px);
	}

	.footer-brand {
		font-size: 0.75rem;
		color: var(--color-foreground-faint, rgba(61, 41, 20, 0.4));
		margin: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.related-link {
			transition: none;
		}
		.related-link:hover {
			transform: none;
		}
	}

	@media (max-width: 640px) {
		.vineyard-hero {
			padding: 2rem 1rem 1.5rem;
		}

		.tool-name {
			font-size: 2rem;
		}

		.tagline {
			font-size: 1.125rem;
		}

		.vineyard-content {
			padding: 2rem 1rem;
		}
	}
</style>
