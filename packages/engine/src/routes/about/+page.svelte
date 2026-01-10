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

<ContentWithGutter
	content={data.page.content}
	gutterContent={data.page.gutterContent || []}
	headers={data.page.headers || []}
>
	{#snippet children()}
		<header class="content-header">
			<h1>{data.page.title}</h1>
		</header>
	{/snippet}
</ContentWithGutter>
