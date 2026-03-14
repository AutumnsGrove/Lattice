<script lang="ts">
	/**
	 * Shrines Public Page
	 *
	 * Sacred spaces for things you love — never performative, always sincere.
	 */

	import CurioShrines from "@autumnsgrove/lattice/curios/shrines/CurioShrines.svelte";

	let { data } = $props();
</script>

<svelte:head>
	<title>Shrines</title>
	<meta name="description" content="Personal shrines — sacred spaces for things you love." />
</svelte:head>

<div class="shrines-page">
	<header class="page-header">
		<h1>Shrines</h1>
		<p class="page-description">Sacred spaces for things I love.</p>
	</header>

	<CurioShrines shrines={data.shrines} />
</div>

<style>
	.shrines-page {
		max-width: 900px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.page-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-text, #333);
		margin: 0 0 0.5rem;
	}
	:global(.dark) h1 {
		color: var(--bark, #f5f2ea);
	}

	.page-description {
		color: var(--color-text-muted, #666);
		font-size: 0.95rem;
		margin: 0;
	}
	:global(.dark) .page-description {
		color: var(--bark-700, #ccb59c);
	}
</style>
