<script>
	import InternalsPostViewer from '$lib/components/custom/InternalsPostViewer.svelte';
	import { Button } from '$lib/ui';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title} - AutumnsGrove</title>
	<meta name="description" content={data.description || ''} />
</svelte:head>

{#if data.hero}
	<div class="hero">
		<h1>{data.hero.title}</h1>
		<p class="subtitle">{data.hero.subtitle}</p>
		{#if data.hero.cta}
			<Button href={data.hero.cta.link} variant="default" size="lg" class="cta-button">{data.hero.cta.text}</Button>
		{/if}
	</div>
{/if}

{#if data.content}
	<div class="intro">
		{@html data.content}
	</div>
{/if}

{#if data.latestPost}
	<section class="latest-post-section">
		<h2 class="section-title">Latest Post</h2>
		<InternalsPostViewer
			post={data.latestPost}
			caption="From the blog"
		/>
	</section>
{/if}

<footer class="home-footer">
	<a href="/credits">Font Credits & Attribution</a>
</footer>

<style>
	.home-footer {
		text-align: center;
		padding: 2rem 0;
		margin-top: 3rem;
		border-top: 1px solid var(--color-border);
		transition: border-color 0.3s ease;
	}
	.home-footer a {
		color: var(--color-text-muted);
		text-decoration: none;
		font-size: 0.9rem;
		transition: color 0.2s ease;
	}
	.home-footer a:hover {
		color: var(--color-primary);
		text-decoration: underline;
	}
	.hero {
		text-align: center;
		padding: 4rem 2rem;
		background: linear-gradient(145deg, #f8f9fa 0%, #e8f5e9 50%, #c8e6c9 100%);
		border-radius: 12px;
		margin-bottom: 3rem;
		transition: background 0.3s ease;
	}
	:global(.dark) .hero {
		background: linear-gradient(145deg, var(--light-bg-secondary) 0%, #1a2f1a 50%, var(--status-success-bg) 100%);
	}
	h1 {
		font-size: 3rem;
		margin: 0 0 1rem 0;
		color: var(--color-primary);
		transition: color 0.3s ease;
	}
	.subtitle {
		font-size: 1.25rem;
		color: var(--color-text-muted);
		margin: 0 0 2rem 0;
		transition: color 0.3s ease;
	}
	.cta-button {
		margin-top: 0.5rem;
	}
	.intro {
		max-width: 700px;
		margin: 0 auto;
	}
	.intro :global(h2) {
		color: var(--color-text);
		margin-bottom: 1rem;
		transition: color 0.3s ease;
	}
	.intro :global(p) {
		font-size: 1.1rem;
		color: var(--color-text-muted);
		line-height: 1.8;
		transition: color 0.3s ease;
	}
	.latest-post-section {
		max-width: 700px;
		margin: 3rem auto 0;
	}
	.section-title {
		font-size: 1.5rem;
		color: var(--color-primary);
		margin-bottom: 1.25rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid var(--light-border-primary);
		transition: color 0.3s ease, border-color 0.3s ease;
	}
	:global(.dark) .section-title {
		color: var(--color-primary-light);
		border-bottom-color: var(--light-border-secondary);
	}
	@media (max-width: 768px) {
		h1 {
			font-size: 2rem;
		}
		.hero {
			padding: 2rem 1rem;
		}
		.subtitle {
			font-size: 1rem;
		}
		.latest-post-section {
			margin: 2rem 1rem 0;
		}
		.section-title {
			font-size: 1.25rem;
		}
	}
</style>
