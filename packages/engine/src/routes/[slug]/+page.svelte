<script>
	import ContentWithGutter from '$lib/components/custom/ContentWithGutter.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.page.title}</title>
	{#if data.page.description}
		<meta name="description" content={data.page.description} />
	{/if}
</svelte:head>

{#if data.page.hero}
	<section class="hero">
		<div class="hero-content">
			{#if data.page.hero.title}
				<h1 class="hero-title">{data.page.hero.title}</h1>
			{/if}
			{#if data.page.hero.subtitle}
				<p class="hero-subtitle">{data.page.hero.subtitle}</p>
			{/if}
			{#if data.page.hero.cta}
				<a href={data.page.hero.cta.link} class="hero-cta">
					{data.page.hero.cta.text}
				</a>
			{/if}
		</div>
	</section>
{/if}

<ContentWithGutter
	content={data.page.content}
	gutterContent={data.page.gutterContent || []}
	headers={data.page.headers || []}
>
	{#snippet children()}
		{#if !data.page.hero}
			<header class="content-header">
				<h1>{data.page.title}</h1>
				{#if data.page.description}
					<p class="page-description">{data.page.description}</p>
				{/if}
			</header>
		{/if}
	{/snippet}
</ContentWithGutter>

<style>
	.hero {
		padding: 4rem 2rem;
		text-align: center;
		background: var(--color-bg-secondary);
		border-bottom: 1px solid var(--color-border);
		margin-bottom: 2rem;
	}

	:global(.dark) .hero {
		background: var(--color-bg-secondary-dark);
		border-color: var(--color-border-dark);
	}

	.hero-content {
		max-width: 800px;
		margin: 0 auto;
	}

	.hero-title {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 1rem;
		color: var(--color-text);
	}

	:global(.dark) .hero-title {
		color: var(--color-text-dark);
	}

	.hero-subtitle {
		font-size: 1.25rem;
		color: var(--color-text-muted);
		margin: 0 0 2rem;
	}

	:global(.dark) .hero-subtitle {
		color: var(--color-text-subtle-dark);
	}

	.hero-cta {
		display: inline-block;
		padding: 0.75rem 2rem;
		background: var(--color-primary);
		color: white;
		text-decoration: none;
		border-radius: var(--border-radius-button);
		font-weight: 500;
		transition: background-color 0.2s;
	}

	.hero-cta:hover {
		background: var(--color-primary-hover);
	}

	.content-header {
		margin-bottom: 2rem;
	}

	.content-header h1 {
		margin: 0 0 0.5rem;
		font-size: 2rem;
		color: var(--color-text);
	}

	:global(.dark) .content-header h1 {
		color: var(--color-text-dark);
	}

	.page-description {
		margin: 0;
		font-size: 1.1rem;
		color: var(--color-text-muted);
	}

	:global(.dark) .page-description {
		color: var(--color-text-subtle-dark);
	}
</style>
