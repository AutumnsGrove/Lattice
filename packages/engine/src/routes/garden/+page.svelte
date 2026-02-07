<script>
	import { goto } from '$app/navigation';
	import { Card, Badge, GroveSwap, GroveIntro } from '$lib/ui';

	let { data } = $props();

	// Get accent color from site settings (falls back to default if not set)
	const accentColor = $derived(data.siteSettings?.accent_color || null);

	/**
	 * @param {MouseEvent} event
	 * @param {string} slug
	 */
	function handleCardClick(event, slug) {
		// Don't navigate if clicking on a tag link or badge
		const target = /** @type {HTMLElement} */ (event.target);
		if (target.closest('a')) {
			return;
		}
		goto(`/garden/${slug}`);
	}

	/**
	 * @param {KeyboardEvent} event
	 * @param {string} slug
	 */
	function handleCardKeydown(event, slug) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			goto(`/garden/${slug}`);
		}
	}
</script>

<svelte:head>
	<title>Garden{data.context?.type === 'tenant' ? ` - ${data.context.tenant.name}` : ''}</title>
	<meta name="description" content="Explore my collection of posts - thoughts, ideas, and explorations." />
</svelte:head>

<div class="text-center mt-4 mb-16 max-md:mb-12">
	<h1 class="blog-header-title"><GroveSwap term="your-garden">Garden</GroveSwap></h1>
	<GroveIntro term="your-garden" />
	<p class="blog-header-text">Thoughts, ideas, and explorations.</p>
	{#if data.isOwner}
		<div class="flex gap-2 items-center mt-4">
			<span class="flex items-center justify-center p-1 admin-indicator" title="Logged in as {data.user?.email}">
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="20 6 9 17 4 12"></polyline>
				</svg>
			</span>
			<a href="/arbor" class="admin-link" aria-label="Admin Panel">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
					<circle cx="12" cy="12" r="3"></circle>
				</svg>
			</a>
		</div>
	{/if}
</div>

{#if data.posts.length === 0}
	<div class="text-center py-12 text-foreground-muted">
		<p>No <GroveSwap term="blooms">blooms</GroveSwap> yet. Check back soon!</p>
	</div>
{:else}
	<div class="grid gap-8 max-w-3xl mx-auto">
		{#each data.posts as post (post.slug)}
			<Card
				hoverable
				onclick={(/** @type {MouseEvent} */ e) => handleCardClick(e, post.slug)}
				onkeydown={(/** @type {KeyboardEvent} */ e) => handleCardKeydown(e, post.slug)}
				role="button"
				tabindex="0"
			>
				<h2 class="text-xl font-semibold mb-4 text-green-800 dark:text-green-500 transition-colors">{post.title}</h2>
				<div class="flex items-center gap-4 mb-3 flex-wrap">
					<time datetime={post.date} class="text-sm text-foreground-subtle transition-colors">
						{new Date(post.date).toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})}
					</time>
					{#if post.tags.length > 0}
						<div class="tags" style:--accent-color={accentColor}>
							{#each post.tags as tag (tag)}
								<a href="/garden/search?tag={encodeURIComponent(tag)}" class="tag-link" aria-label="Filter posts by tag: {tag}">
									<Badge variant="tag" class="accent-tag">{tag}</Badge>
								</a>
							{/each}
						</div>
					{/if}
				</div>
				{#if post.description}
					<p class="description">{post.description}</p>
				{/if}
			</Card>
		{/each}
	</div>
{/if}

<style>
	.blog-header-title {
		font-size: 2.5rem;
		color: var(--blog-header-title);
		margin-bottom: 0.75rem;
		letter-spacing: -0.02em;
		transition: color 0.3s ease;
	}

	@media (max-width: 768px) {
		.blog-header-title {
			font-size: 2rem;
		}
	}

	.blog-header-text {
		color: var(--blog-header-text);
		font-size: 1.1rem;
		transition: color 0.3s ease;
	}

	.admin-indicator {
		color: var(--admin-indicator);
	}

	.admin-link {
		color: var(--admin-link-text);
		text-decoration: none;
		border-radius: 4px;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		transition: background-color 0.2s ease;
	}

	.admin-link:hover {
		background: var(--admin-link-hover-bg);
	}

	.description {
		color: var(--blog-header-text);
		line-height: 1.6;
		margin: 0;
		transition: color 0.3s ease;
	}

	/* Tag link styling */
	.tag-link {
		text-decoration: none;
	}

	/* Apply accent color to tags when set via CSS custom property */
	.tags[style*="--accent-color"] .tag-link :global(.accent-tag) {
		background: var(--accent-color, var(--tag-bg));
		border-color: var(--accent-color, var(--tag-bg));
	}

	.tags[style*="--accent-color"] .tag-link:hover :global(.accent-tag) {
		filter: brightness(1.1);
	}
</style>
