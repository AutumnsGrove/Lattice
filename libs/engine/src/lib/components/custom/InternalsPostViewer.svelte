<script>
	/**
	 * Simple component to display a featured garden post
	 * @prop {{ title: string; description?: string; slug: string; date?: string }} post - Post data
	 * @prop {string} [caption] - Optional caption text
	 */
	let { post, caption = "" } = $props();

	const formattedDate = $derived(post.date ? new Date(post.date).toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	}) : null);
</script>

<article class="post-viewer">
	{#if caption}
		<span class="caption">{caption}</span>
	{/if}
	<a href="/garden/{post.slug}" class="post-link">
		<h3 class="title">{post.title}</h3>
		{#if post.description}
			<p class="description">{post.description}</p>
		{/if}
		{#if formattedDate}
			<time class="date">{formattedDate}</time>
		{/if}
	</a>
</article>

<style>
	.post-viewer {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-standard);
		padding: 1.5rem;
		transition: all 0.3s ease;
	}

	.caption {
		display: block;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-primary);
		margin-bottom: 0.5rem;
	}

	.post-link {
		text-decoration: none;
		color: inherit;
		display: block;
	}

	.post-link:hover .title {
		color: var(--color-primary);
	}

	.title {
		font-size: 1.25rem;
		margin: 0 0 0.5rem 0;
		color: var(--color-text);
		transition: color 0.2s ease;
	}

	.description {
		margin: 0 0 0.75rem 0;
		color: var(--color-text-muted);
		font-size: 0.95rem;
		line-height: 1.6;
	}

	.date {
		display: block;
		font-size: 0.875rem;
		color: var(--color-text-subtle);
	}

	:global(.dark) .post-viewer {
		background: var(--color-bg-tertiary-dark);
		border-color: var(--color-border-dark);
	}

	:global(.dark) .title {
		color: var(--color-text-dark);
	}

	:global(.dark) .description {
		color: var(--color-text-subtle-dark);
	}

	:global(.dark) .date {
		color: var(--color-text-subtle-dark);
	}
</style>
