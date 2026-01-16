<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>Recipes - The Midnight Bloom</title>
	<meta name="description" content="Tea recipes and brewing guides from The Midnight Bloom." />
</svelte:head>

<div class="recipes-page">
	<header class="page-header">
		<h1>Recipes</h1>
		<p class="subtitle">Brewing guides from our kitchen</p>
	</header>

	<div class="recipes-grid">
		{#each data.recipes as recipe}
			<article class="recipe-card">
				<h2><a href="/recipes/{recipe.slug}">{recipe.title}</a></h2>
				{#if recipe.description}
					<p class="description">{recipe.description}</p>
				{/if}
				{#if recipe.tags?.length}
					<div class="tags">
						{#each recipe.tags as tag}
							<span class="tag">{tag}</span>
						{/each}
					</div>
				{/if}
			</article>
		{:else}
			<p class="no-recipes">No recipes yet. Check back soon.</p>
		{/each}
	</div>
</div>

<style>
	.recipes-page {
		max-width: 800px;
		margin: 0 auto;
	}

	.page-header {
		text-align: center;
		margin-bottom: 3rem;
		padding-bottom: 2rem;
		border-bottom: 1px solid hsl(var(--border));
	}

	.page-header h1 {
		font-size: 2.5rem;
		color: hsl(var(--primary));
		margin: 0 0 0.5rem 0;
		font-family: system-ui, sans-serif;
	}

	.subtitle {
		color: hsl(var(--muted-foreground));
		font-style: italic;
		margin: 0;
	}

	.recipes-grid {
		display: grid;
		gap: 1.5rem;
	}

	.recipe-card {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 1.5rem;
		transition: border-color 0.2s;
	}

	.recipe-card:hover {
		border-color: hsl(var(--accent));
	}

	.recipe-card h2 {
		margin: 0 0 0.75rem 0;
		font-size: 1.35rem;
		font-family: system-ui, sans-serif;
	}

	.recipe-card h2 a {
		color: hsl(var(--foreground));
		text-decoration: none;
	}

	.recipe-card h2 a:hover {
		color: hsl(var(--primary));
	}

	.description {
		color: hsl(var(--muted-foreground));
		line-height: 1.6;
		margin: 0 0 1rem 0;
	}

	.tags {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.tag {
		background: hsl(var(--accent));
		color: hsl(var(--accent-foreground));
		padding: 0.2rem 0.6rem;
		border-radius: 20px;
		font-size: 0.75rem;
		font-family: system-ui, sans-serif;
	}

	.no-recipes {
		text-align: center;
		color: hsl(var(--muted-foreground));
		padding: 3rem;
	}
</style>
