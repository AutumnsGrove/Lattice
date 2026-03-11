<script lang="ts">
	/**
	 * CurioShrines — Public shrine display grid
	 *
	 * Renders all published shrines as spatial canvases within decorative frames.
	 * Sacred spaces for things you love — never performative, always sincere.
	 */

	import type { ShrineDisplay } from "./index";
	import ShrineCanvas from "./ShrineCanvas.svelte";
	import { Heart } from "@lucide/svelte";

	interface Props {
		shrines: ShrineDisplay[];
	}

	let { shrines }: Props = $props();
</script>

{#if shrines.length === 0}
	<section class="shrines-empty" aria-label="No shrines available">
		<Heart size={32} aria-hidden="true" />
		<p>No shrines to display yet.</p>
	</section>
{:else}
	<div class="shrines-grid" role="list" aria-label="Personal shrines">
		{#each shrines as shrine (shrine.id)}
			<article class="shrine-wrapper" role="listitem">
				<ShrineCanvas
					items={shrine.contents}
					size={shrine.size}
					frameStyle={shrine.frameStyle}
					title={shrine.title}
				/>
				<div class="shrine-label">
					<h3 class="shrine-title">{shrine.title}</h3>
					{#if shrine.description}
						<p class="shrine-description">{shrine.description}</p>
					{/if}
				</div>
			</article>
		{/each}
	</div>
{/if}

<style>
	.shrines-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 2rem;
		justify-content: center;
		padding: 1rem 0;
	}

	.shrine-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.shrine-label {
		text-align: center;
		max-width: 250px;
	}

	.shrine-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text, #333);
		margin: 0;
	}
	:global(.dark) .shrine-title {
		color: var(--bark, #f5f2ea);
	}

	.shrine-description {
		font-size: 0.8rem;
		color: var(--color-text-muted, #666);
		margin: 0.25rem 0 0;
		line-height: 1.4;
	}
	:global(.dark) .shrine-description {
		color: var(--bark-700, #ccb59c);
	}

	.shrines-empty {
		text-align: center;
		padding: 3rem 1.5rem;
		color: var(--color-text-muted, #999);
	}
	.shrines-empty p {
		margin: 0.75rem 0 0;
		font-size: 0.9rem;
	}

	@media (max-width: 480px) {
		.shrines-grid {
			gap: 1.5rem;
		}
	}
</style>
