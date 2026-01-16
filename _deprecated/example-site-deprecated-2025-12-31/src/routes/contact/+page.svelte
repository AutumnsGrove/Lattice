<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>Find Us - The Midnight Bloom</title>
	<meta name="description" content="Visit The Midnight Bloom tea café. Open Wednesday through Sunday, 6 PM to 4 AM." />
</svelte:head>

<div class="contact-page">
	<div class="content prose">
		{@html data.page?.content || '<p>Contact information coming soon.</p>'}
	</div>
</div>

<style>
	.contact-page {
		max-width: 750px;
		margin: 0 auto;
	}

	.content :global(h1) {
		font-size: 2.5rem;
		color: hsl(var(--primary));
		margin: 0 0 2rem 0;
		font-family: system-ui, sans-serif;
	}

	.content :global(h2) {
		font-size: 1.5rem;
		color: hsl(var(--foreground));
		margin: 2rem 0 1rem 0;
		font-family: system-ui, sans-serif;
	}

	.content :global(p) {
		color: hsl(var(--muted-foreground));
		line-height: 1.8;
		margin: 0 0 1.25rem 0;
	}

	.content :global(strong) {
		color: hsl(var(--foreground));
	}

	.content :global(em) {
		color: hsl(var(--primary));
	}
</style>
