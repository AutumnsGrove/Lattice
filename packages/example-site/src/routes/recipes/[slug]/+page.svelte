<script>
	import { ContentWithGutter } from '@autumnsgrove/groveengine';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.recipe.title} - The Midnight Bloom</title>
	<meta name="description" content={data.recipe.description || ''} />
</svelte:head>

<ContentWithGutter
	content={data.recipe.content}
	gutterContent={data.recipe.gutterContent?.items || []}
	headers={[]}
	showTableOfContents={false}
>
	<header class="recipe-header">
		<h1>{data.recipe.title}</h1>
		{#if data.recipe.description}
			<p class="description">{data.recipe.description}</p>
		{/if}
		{#if data.recipe.tags?.length}
			<div class="tags">
				{#each data.recipe.tags as tag}
					<span class="tag">{tag}</span>
				{/each}
			</div>
		{/if}
	</header>
</ContentWithGutter>

<footer class="recipe-footer">
	<a href="/recipes" class="back-link">← Back to Recipes</a>
</footer>

<style>
	.recipe-header {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid hsl(var(--border));
	}

	.recipe-header h1 {
		font-size: 2.5rem;
		color: hsl(var(--foreground));
		margin: 0 0 0.5rem 0;
		font-family: system-ui, sans-serif;
		line-height: 1.2;
	}

	.description {
		color: hsl(var(--muted-foreground));
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
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

	.recipe-footer {
		max-width: 1200px;
		margin: 3rem auto 0;
		padding: 2rem 0;
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
</style>
