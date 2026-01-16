<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.title}</title>
	<meta name="description" content={data.description} />
</svelte:head>

<div class="home">
	<section class="hero">
		<h1>{data.hero.title}</h1>
		<p class="tagline">{data.hero.subtitle}</p>
		{#if data.hero.cta}
			<a href={data.hero.cta.link} class="cta-button">{data.hero.cta.text}</a>
		{/if}
	</section>

	{#if data.content}
		<section class="intro">
			{@html data.content}
		</section>
	{/if}

	{#if data.latestPost}
		<section class="latest-post">
			<h2>From the Blog</h2>
			<article class="post-preview">
				<h3><a href="/blog/{data.latestPost.slug}">{data.latestPost.title}</a></h3>
				<p class="post-meta">
					<time datetime={data.latestPost.date}>{new Date(data.latestPost.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
				</p>
				{#if data.latestPost.description}
					<p class="post-description">{data.latestPost.description}</p>
				{/if}
				{#if data.latestPost.tags?.length}
					<div class="tags">
						{#each data.latestPost.tags as tag}
							<span class="tag">{tag}</span>
						{/each}
					</div>
				{/if}
				<a href="/blog/{data.latestPost.slug}" class="read-more">Read more</a>
			</article>
		</section>
	{/if}

	<section class="hours-banner">
		<div class="hours-content">
			<h2>Hours</h2>
			<p class="days">Wednesday - Sunday</p>
			<p class="time">6:00 PM - 4:00 AM</p>
			<p class="note">Open when the stars come out</p>
		</div>
	</section>
</div>

<style>
	.home {
		max-width: 900px;
		margin: 0 auto;
	}

	.hero {
		text-align: center;
		padding: 4rem 2rem;
		background: linear-gradient(145deg, hsl(var(--card)) 0%, hsl(260 20% 12%) 100%);
		border-radius: 12px;
		margin-bottom: 3rem;
		border: 1px solid hsl(var(--border));
	}

	:global(:not(.dark)) .hero {
		background: linear-gradient(145deg, hsl(40 30% 97%) 0%, hsl(340 30% 95%) 100%);
	}

	h1 {
		font-size: 3rem;
		margin: 0 0 1rem 0;
		color: hsl(var(--primary));
		font-family: system-ui, sans-serif;
	}

	.tagline {
		font-size: 1.3rem;
		color: hsl(var(--muted-foreground));
		margin: 0 0 2rem 0;
		font-style: italic;
	}

	.cta-button {
		display: inline-block;
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		padding: 0.875rem 2rem;
		border-radius: 8px;
		text-decoration: none;
		font-weight: 600;
		font-family: system-ui, sans-serif;
		transition: background 0.2s, transform 0.2s;
	}

	.cta-button:hover {
		background: hsl(var(--accent));
		transform: translateY(-2px);
	}

	.intro {
		padding: 2rem 0;
		border-bottom: 1px solid hsl(var(--border));
		margin-bottom: 3rem;
	}

	.intro :global(h1),
	.intro :global(h2) {
		color: hsl(var(--foreground));
		font-family: system-ui, sans-serif;
	}

	.intro :global(p) {
		color: hsl(var(--muted-foreground));
		line-height: 1.8;
		font-size: 1.05rem;
	}

	.intro :global(ul) {
		color: hsl(var(--muted-foreground));
	}

	.intro :global(strong) {
		color: hsl(var(--foreground));
	}

	.intro :global(em) {
		color: hsl(var(--primary));
	}

	.latest-post {
		margin-bottom: 3rem;
	}

	.latest-post h2 {
		font-size: 1.5rem;
		color: hsl(var(--primary));
		margin-bottom: 1.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid hsl(var(--border));
		font-family: system-ui, sans-serif;
	}

	.post-preview {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 1.5rem;
	}

	.post-preview h3 {
		margin: 0 0 0.5rem 0;
		font-family: system-ui, sans-serif;
	}

	.post-preview h3 a {
		color: hsl(var(--foreground));
		text-decoration: none;
	}

	.post-preview h3 a:hover {
		color: hsl(var(--primary));
	}

	.post-meta {
		color: hsl(var(--muted-foreground));
		font-size: 0.9rem;
		margin: 0 0 1rem 0;
	}

	.post-description {
		color: hsl(var(--muted-foreground));
		line-height: 1.6;
		margin: 0 0 1rem 0;
	}

	.tags {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 1rem;
	}

	.tag {
		background: hsl(var(--accent));
		color: hsl(var(--accent-foreground));
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.8rem;
		font-family: system-ui, sans-serif;
	}

	.read-more {
		color: hsl(var(--primary));
		text-decoration: none;
		font-weight: 500;
		font-family: system-ui, sans-serif;
	}

	.read-more:hover {
		text-decoration: underline;
	}

	.hours-banner {
		background: hsl(var(--card));
		border: 1px solid hsl(var(--border));
		border-radius: 12px;
		padding: 2rem;
		text-align: center;
	}

	.hours-banner h2 {
		font-size: 1.25rem;
		color: hsl(var(--primary));
		margin: 0 0 1rem 0;
		font-family: system-ui, sans-serif;
	}

	.hours-content .days {
		font-size: 1.1rem;
		color: hsl(var(--foreground));
		margin: 0 0 0.25rem 0;
		font-weight: 500;
	}

	.hours-content .time {
		font-size: 1.5rem;
		color: hsl(var(--accent));
		margin: 0 0 0.5rem 0;
		font-weight: 600;
		font-family: system-ui, sans-serif;
	}

	.hours-content .note {
		color: hsl(var(--muted-foreground));
		font-style: italic;
		margin: 0;
	}

	@media (max-width: 768px) {
		h1 {
			font-size: 2rem;
		}

		.hero {
			padding: 2rem 1rem;
		}

		.tagline {
			font-size: 1.1rem;
		}
	}
</style>
