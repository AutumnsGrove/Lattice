<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		defaultOpen?: boolean;
		children?: Snippet;
		class?: string;
	}

	let {
		title,
		defaultOpen = false,
		children,
		class: className = '',
		...restProps
	}: Props = $props();

	let isOpen = $state(defaultOpen);

	function toggle() {
		isOpen = !isOpen;
	}
</script>

<div class="collapsible-section {className}" {...restProps}>
	<button
		type="button"
		class="collapsible-trigger w-full flex items-center justify-between px-4 py-3 text-left font-medium border-b hover:bg-muted/50 transition-colors"
		onclick={toggle}
		aria-expanded={isOpen}
	>
		<span>{title}</span>
		<svg
			class="w-5 h-5 transition-transform {isOpen ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if isOpen}
		<div class="collapsible-content px-4 py-4">
			{@render children?.()}
		</div>
	{/if}
</div>

<style>
	.collapsible-section {
		border: 1px solid hsl(var(--border));
		border-radius: var(--radius);
		overflow: hidden;
	}

	.collapsible-trigger {
		background: hsl(var(--background));
	}

	.collapsible-content {
		background: hsl(var(--card));
	}
</style>
