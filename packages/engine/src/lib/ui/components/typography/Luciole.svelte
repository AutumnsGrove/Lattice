<script lang="ts">
	import type { Snippet } from 'svelte';
	import FontProvider from './FontProvider.svelte';

	interface Props {
		as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'code' | 'pre' | 'article' | 'section';
		class?: string;
		style?: string;
		children: Snippet;
	}

	let { as = 'span', class: className = '', style = '', children }: Props = $props();
</script>

<FontProvider font="luciole" {as} class={className} {style}>
	{@render children()}
</FontProvider>
