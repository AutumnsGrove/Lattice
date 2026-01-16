<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>Blog - The Midnight Bloom</title>
	<meta name="description" content="Thoughts, stories, and musings from The Midnight Bloom tea café." />
</svelte:head>

<div class="blog-page">
	<header class="page-header">
		<h1>Blog</h1>
		<p class="subtitle">Thoughts from the late hours</p>
	</header>

	<div class="posts-grid">
		{#each data.posts as post}
			<article class="post-card">
				<h2><a href="/blog/{post.slug}">{post.title}</a></h2>
				<p class="meta">
					<time datetime={post.date}>{new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
				</p>
				{#if post.description}
					<p class="description">{post.description}</p>
				{/if}
				{#if post.tags?.length}
					<div class="tags">
						{#each post.tags as tag}
							<span class="tag">{tag}</span>
						{/each}
					</div>
				{/if}
			</article>
		{:else}
			<p class="no-posts">No posts yet. Check back soon.</p>
		{/each}
	</div>
</div>

<style>
	.blog-page {
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

	.posts-grid {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.post-card {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 1.5rem;
		transition: border-color 0.2s;
	}

	.post-card:hover {
		border-color: hsl(var(--primary));
	}

	.post-card h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
		font-family: system-ui, sans-serif;
	}

	.post-card h2 a {
		color: hsl(var(--foreground));
		text-decoration: none;
	}

	.post-card h2 a:hover {
		color: hsl(var(--primary));
	}

	.meta {
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
		margin: 0 0 1rem 0;
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
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.8rem;
		font-family: system-ui, sans-serif;
	}

	.no-posts {
		text-align: center;
		color: hsl(var(--muted-foreground));
		padding: 3rem;
	}
</style>
