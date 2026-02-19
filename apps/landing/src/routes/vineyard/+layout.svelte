<script lang="ts">
	import type { Snippet } from 'svelte';
	import { GlassNavbar } from '@autumnsgrove/lattice/ui';
	import { Home, Sparkles, TreePine, Type, Palette } from 'lucide-svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<div class="min-h-screen bg-[var(--color-background)]">
	<GlassNavbar maxWidth="wide">
		{#snippet logo()}
			<a href="/" class="flex items-center gap-2 text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors" title="Back to Grove">
				<Home class="w-4 h-4" />
				<span class="font-semibold">Grove</span>
			</a>
			<span class="text-[var(--color-foreground-subtle)] mx-2">/</span>
			<span class="font-medium text-[var(--color-foreground-muted)]">Vineyard</span>
		{/snippet}
		{#snippet actions()}
			<nav class="hidden sm:flex items-center gap-4 text-sm">
				<a href="#glass" class="text-[var(--color-foreground-muted)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5">
					<Sparkles class="w-3.5 h-3.5" />
					Glass
				</a>
				<a href="#nature" class="text-[var(--color-foreground-muted)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5">
					<TreePine class="w-3.5 h-3.5" />
					Nature
				</a>
				<a href="#typography" class="text-[var(--color-foreground-muted)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5">
					<Type class="w-3.5 h-3.5" />
					Type
				</a>
				<a href="#palettes" class="text-[var(--color-foreground-muted)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-1.5">
					<Palette class="w-3.5 h-3.5" />
					Palettes
				</a>
			</nav>
		{/snippet}
	</GlassNavbar>

	<main class="pt-4">
		{@render children()}
	</main>
</div>
