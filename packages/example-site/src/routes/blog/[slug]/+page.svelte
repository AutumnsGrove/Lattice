<script>
	let { data } = $props();

	// Extract headers for table of contents
	function extractHeaders(content) {
		const headers = [];
		const regex = /<h([2-3])[^>]*id="([^"]*)"[^>]*>([^<]*)<\/h[2-3]>/gi;
		let match;
		while ((match = regex.exec(content)) !== null) {
			headers.push({
				level: parseInt(match[1]),
				id: match[2],
				text: match[3]
			});
		}
		return headers;
	}

	// Simple header extraction from raw content
	function getHeadersFromContent(content) {
		const headers = [];
		const lines = content.split('\n');
		for (const line of lines) {
			const match = line.match(/^(#{2,3})\s+(.+)$/);
			if (match) {
				const level = match[1].length;
				const text = match[2].trim();
				const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
				headers.push({ level, id, text });
			}
		}
		return headers;
	}

	let headers = $derived(data.post.rawContent ? getHeadersFromContent(data.post.rawContent) : []);
</script>

<svelte:head>
	<title>{data.post.title} - The Midnight Bloom</title>
	<meta name="description" content={data.post.description || ''} />
</svelte:head>

<div class="post-layout">
	<!-- Left Gutter -->
	{#if data.post.gutterContent?.items?.length}
		<aside class="left-gutter">
			{#each data.post.gutterContent.items as item}
				<div class="gutter-item" data-anchor={item.anchor}>
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
	<article class="post-content">
		<header class="post-header">
			<h1>{data.post.title}</h1>
			<div class="post-meta">
				<time datetime={data.post.date}>
					{new Date(data.post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
				</time>
				{#if data.post.tags?.length}
					<div class="tags">
						{#each data.post.tags as tag}
							<span class="tag">{tag}</span>
						{/each}
					</div>
				{/if}
			</div>
		</header>

		<div class="content prose">
			{@html data.post.content}
		</div>

		<footer class="post-footer">
			<a href="/blog" class="back-link">← Back to Blog</a>
		</footer>
	</article>

	<!-- Right Gutter / Table of Contents -->
	{#if headers.length > 0}
		<aside class="right-gutter">
			<nav class="toc">
				<h3>Contents</h3>
				<ul>
					{#each headers as header}
						<li class:indent={header.level === 3}>
							<a href="#{header.id}">{header.text}</a>
						</li>
					{/each}
				</ul>
			</nav>
		</aside>
	{/if}
</div>

<style>
	.post-layout {
		display: grid;
		grid-template-columns: 200px 1fr 200px;
		gap: 2rem;
		max-width: 1200px;
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

	.post-content {
		min-width: 0;
	}

	.post-header {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid hsl(var(--border));
	}

	.post-header h1 {
		font-size: 2.5rem;
		color: hsl(var(--foreground));
		margin: 0 0 1rem 0;
		font-family: system-ui, sans-serif;
		line-height: 1.2;
	}

	.post-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.post-meta time {
		color: hsl(var(--muted-foreground));
		font-size: 0.95rem;
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
		font-size: 1.75rem;
		color: hsl(var(--foreground));
		margin: 2.5rem 0 1rem 0;
		font-family: system-ui, sans-serif;
	}

	.content :global(h3) {
		font-size: 1.35rem;
		color: hsl(var(--foreground));
		margin: 2rem 0 0.75rem 0;
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

	.content :global(blockquote) {
		border-left: 3px solid hsl(var(--primary));
		padding-left: 1rem;
		margin: 1.5rem 0;
		color: hsl(var(--muted-foreground));
		font-style: italic;
	}

	.content :global(code) {
		background: hsl(var(--muted));
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
		font-size: 0.9em;
	}

	.content :global(pre) {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 1rem;
		overflow-x: auto;
		margin: 1.5rem 0;
	}

	.content :global(pre code) {
		background: none;
		padding: 0;
	}

	.content :global(strong) {
		color: hsl(var(--foreground));
	}

	.content :global(em) {
		color: hsl(var(--primary));
	}

	.content :global(hr) {
		border: none;
		border-top: 1px solid hsl(var(--border));
		margin: 2rem 0;
	}

	.right-gutter {
		position: sticky;
		top: 100px;
		height: fit-content;
	}

	.toc {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 8px;
		padding: 1rem;
	}

	.toc h3 {
		font-size: 0.9rem;
		color: hsl(var(--muted-foreground));
		margin: 0 0 0.75rem 0;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-family: system-ui, sans-serif;
	}

	.toc ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.toc li {
		margin-bottom: 0.5rem;
	}

	.toc li.indent {
		padding-left: 1rem;
	}

	.toc a {
		color: hsl(var(--muted-foreground));
		text-decoration: none;
		font-size: 0.9rem;
		display: block;
		padding: 0.25rem 0;
		transition: color 0.2s;
	}

	.toc a:hover {
		color: hsl(var(--primary));
	}

	.post-footer {
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

	@media (max-width: 1024px) {
		.post-layout {
			grid-template-columns: 1fr;
		}

		.left-gutter,
		.right-gutter {
			display: none;
		}
	}
</style>
