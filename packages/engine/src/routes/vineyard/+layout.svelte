<script lang="ts">
	import type { Snippet } from 'svelte';
	import { GlassNavbar } from '$lib/ui/components/ui';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="min-h-screen bg-gradient-to-b from-cream-50 to-cream-100">
	<GlassNavbar maxWidth="wide">
		{#snippet logo()}
			<a href="/vineyard" class="flex items-center gap-2 font-semibold text-bark-900">
				<span class="text-2xl">🍇</span>
				<span>Grove Vineyard</span>
			</a>
		{/snippet}
		{#snippet actions()}
			<nav class="flex items-center gap-4 text-sm">
				<a href="#glass" class="text-bark-700 hover:text-grove-600 transition-colors">Glass</a>
				<a href="#components" class="text-bark-700 hover:text-grove-600 transition-colors">Components</a>
				<a href="#palettes" class="text-bark-700 hover:text-grove-600 transition-colors">Palettes</a>
			</nav>
		{/snippet}
	</GlassNavbar>

	<main class="pt-4">
		{@render children()}
	</main>
</div>

<style>
	:global(body) {
		background: linear-gradient(to bottom, #fefdfb, #fdfcf8);
	}
</style>
