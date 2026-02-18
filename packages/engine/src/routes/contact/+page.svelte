<script>
	let { data } = $props();
</script>

<svelte:head>
	<title
		>{data.title}{data.context?.type === "tenant" ? ` - ${data.context.tenant.name}` : ""}</title
	>
	<meta name="description" content={data.description} />
</svelte:head>

<article class="contact-page">
	<h1>{data.title}</h1>

	<div class="content">
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- server-sanitized HTML content -->
		{@html data.content}
	</div>
</article>

<style>
	.contact-page {
		max-width: 700px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}
	h1 {
		font-size: 2.5rem;
		margin-bottom: 2rem;
		color: var(--color-primary);
		transition: color 0.3s ease;
	}
	.content {
		line-height: 1.8;
		color: var(--color-text);
		transition: color 0.3s ease;
	}
	.content :global(h2) {
		font-size: 1.75rem;
		margin-top: 2rem;
		margin-bottom: 1rem;
		color: var(--color-primary);
	}
	.content :global(h3) {
		font-size: 1.25rem;
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
		color: var(--color-text);
	}
	.content :global(p) {
		margin-bottom: 1rem;
	}
	.content :global(ul) {
		margin-bottom: 1rem;
		padding-left: 1.5rem;
	}
	.content :global(li) {
		margin-bottom: 0.5rem;
	}
	.content :global(strong) {
		color: var(--color-primary);
	}
	@media (max-width: 768px) {
		h1 {
			font-size: 2rem;
		}
	}
</style>
