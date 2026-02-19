<script>
	/**
	 * LightboxCaption - Shared caption component for lightbox viewers
	 * Displays image captions with consistent styling
	 *
	 * @prop {string} caption - The caption text to display
	 */
	let { caption = '' } = $props();
</script>

{#if caption}
	<div class="lightbox-caption">{caption}</div>
{/if}

<style>
	.lightbox-caption {
		padding: 0.75rem 1rem;
		color: rgba(255, 255, 255, 0.9);
		font-size: 0.9rem;
		font-style: italic;
		text-align: center;
		max-width: 90vw;
		line-height: 1.5;
	}
</style>
