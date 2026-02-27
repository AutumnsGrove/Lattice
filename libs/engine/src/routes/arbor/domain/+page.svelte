<script>
	import { GlassCard } from "$lib/ui";
	import { DomainChecker } from "$lib/ui/components/domain";

	let { data } = $props();
</script>

<div class="domain-page">
	<header class="page-header">
		<h1>Custom Domain</h1>
		<p class="subtitle">Check if your dream domain is available</p>
	</header>

	<GlassCard variant="frosted" class="domain-page__card">
		<DomainChecker username={data.username} userTier={data.userTier} variant="inline" />
	</GlassCard>
</div>

<style>
	.domain-page {
		max-width: 600px;
	}
	.page-header {
		margin-bottom: 2rem;
	}
	.page-header h1 {
		margin: 0 0 0.25rem 0;
		font-size: 2rem;
		color: var(--color-text);
	}
	.subtitle {
		margin: 0;
		color: var(--color-text-muted);
	}
	:global(.domain-page__card) {
		padding: 1.5rem;
	}
</style>
