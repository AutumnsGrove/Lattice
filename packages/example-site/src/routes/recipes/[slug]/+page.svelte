<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.recipe.title} - The Midnight Bloom</title>
	<meta name="description" content={data.recipe.description || ''} />
</svelte:head>

<div class="recipe-layout">
	<!-- Left Gutter -->
	{#if data.recipe.gutterContent?.items?.length}
		<aside class="left-gutter">
			{#each data.recipe.gutterContent.items as item}
				<div class="gutter-item">
					{#if item.content}
						<div class="gutter-content">
							{@html item.content}
						</div>
					{/if}
				</div>
			{/each}
		</aside>
	{/if}

	<!-- Main Content -->
	<article class="recipe-content">
		<header class="recipe-header">
			<h1>{data.recipe.title}</h1>
			{#if data.recipe.tags?.length}
				<div class="tags">
					{#each data.recipe.tags as tag}
						<span class="tag">{tag}</span>
					{/each}
				</div>
			{/if}
		</header>

		<div class="content prose">
			{@html data.recipe.content}
		</div>

		<footer class="recipe-footer">
			<a href="/recipes" class="back-link">← Back to Recipes</a>
		</footer>
	</article>
</div>

<style>
	.recipe-layout {
		display: grid;
		grid-template-columns: 200px 1fr;
		gap: 2rem;
		max-width: 1000px;
		margin: 0 auto;
	}

	.left-gutter {
		position: sticky;
		top: 100px;
		height: fit-content;
	}

	.gutter-item {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}

	.gutter-content :global(p) {
		margin: 0;
		color: hsl(var(--muted-foreground));
		line-height: 1.5;
	}

	.gutter-content :global(strong) {
		color: hsl(var(--foreground));
	}

	.recipe-content {
		min-width: 0;
	}

	.recipe-header {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid hsl(var(--border));
	}

	.recipe-header h1 {
		font-size: 2.25rem;
		color: hsl(var(--foreground));
		margin: 0 0 1rem 0;
		font-family: system-ui, sans-serif;
	}

	.tags {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.tag {
		background: hsl(var(--accent));
		color: hsl(var(--accent-foreground));
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.8rem;
		font-family: system-ui, sans-serif;
	}

	.content {
		line-height: 1.8;
		color: hsl(var(--foreground));
	}

	.content :global(h2) {
		font-size: 1.5rem;
		color: hsl(var(--foreground));
		margin: 2rem 0 1rem 0;
		font-family: system-ui, sans-serif;
	}

	.content :global(h3) {
		font-size: 1.25rem;
		color: hsl(var(--foreground));
		margin: 1.5rem 0 0.75rem 0;
		font-family: system-ui, sans-serif;
	}

	.content :global(p) {
		margin: 0 0 1.25rem 0;
	}

	.content :global(ul), .content :global(ol) {
		margin: 0 0 1.25rem 0;
		padding-left: 1.5rem;
	}

	.content :global(li) {
		margin-bottom: 0.5rem;
	}

	.content :global(strong) {
		color: hsl(var(--foreground));
	}

	.content :global(em) {
		color: hsl(var(--primary));
	}

	.recipe-footer {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid hsl(var(--border));
	}

	.back-link {
		color: hsl(var(--primary));
		text-decoration: none;
		font-weight: 500;
		font-family: system-ui, sans-serif;
	}

	.back-link:hover {
		text-decoration: underline;
	}

	@media (max-width: 900px) {
		.recipe-layout {
			grid-template-columns: 1fr;
		}

		.left-gutter {
			display: none;
		}
	}
</style>
