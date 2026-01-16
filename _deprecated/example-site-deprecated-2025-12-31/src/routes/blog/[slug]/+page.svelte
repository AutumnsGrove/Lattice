<script>
	import { ContentWithGutter } from '@autumnsgrove/groveengine';

	let { data } = $props();

	// Extract headers from raw markdown content for TOC
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

<ContentWithGutter
	content={data.post.content}
	gutterContent={data.post.gutterContent?.items || []}
	{headers}
	showTableOfContents={true}
>
	<!-- Header content passed as children -->
	<header class="post-header">
		<h1>{data.post.title}</h1>
		<div class="post-meta">
			<time datetime={data.post.date}>
				{new Date(data.post.date).toLocaleDateString('en-US', {
					year: 'numeric', month: 'long', day: 'numeric'
				})}
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
</ContentWithGutter>

<footer class="post-footer">
	<a href="/blog" class="back-link">← Back to Blog</a>
</footer>

<style>
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

	.post-footer {
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
