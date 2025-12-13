<script lang="ts">
	import Header from './Header.svelte';
	import Footer from './Footer.svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		effectiveDate?: string;
		lastUpdated?: string;
		children: Snippet;
	}

	let { title, effectiveDate, lastUpdated, children }: Props = $props();
</script>

<main class="min-h-screen flex flex-col">
	<Header />

	<!-- Content -->
	<article class="flex-1 px-6 py-12">
		<div class="max-w-3xl mx-auto">
			<!-- Header -->
			<header class="mb-8">
				<p class="text-sm text-foreground-faint font-sans mb-2">
					<a href="/legal" class="hover:text-accent-muted transition-colors">&larr; All Legal Documents</a>
				</p>
				<h1 class="text-3xl md:text-4xl font-serif text-foreground mb-2">{title}</h1>
				{#if effectiveDate || lastUpdated}
					<p class="text-foreground-faint font-sans text-sm">
						{#if effectiveDate}Effective Date: {effectiveDate}{/if}
						{#if effectiveDate && lastUpdated} · {/if}
						{#if lastUpdated}Last Updated: {lastUpdated}{/if}
					</p>
				{/if}
			</header>

			<!-- Content -->
			<div class="prose-legal">
				{@render children()}
			</div>
		</div>
	</article>

	<Footer />
</main>
