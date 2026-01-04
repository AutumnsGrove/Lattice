<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import type { FontId } from '../../tokens/fonts.js';
	import { fontById, getFontUrl, getFontStack } from '../../tokens/fonts.js';

	interface Props {
		/** The font ID to apply */
		font: FontId;
		/** HTML element to render as */
		as?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'code' | 'pre' | 'article' | 'section';
		/** Additional CSS classes */
		class?: string;
		/** Inline styles */
		style?: string;
		/** Content to render */
		children: Snippet;
	}

	let { font, as = 'span', class: className = '', style = '', children }: Props = $props();

	const fontDef = $derived(fontById[font]);
	const fontStack = $derived(fontDef ? getFontStack(font) : 'inherit');
	const combinedStyle = $derived(`font-family: ${fontStack};${style ? ` ${style}` : ''}`);

	// Ensure the font is loaded (inject @font-face if not already present)
	onMount(() => {
		if (!fontDef) return;

		const styleId = `grove-font-${font}`;
		if (document.getElementById(styleId)) return;

		const styleEl = document.createElement('style');
		styleEl.id = styleId;
		styleEl.textContent = `
			@font-face {
				font-family: '${fontDef.fontFamily}';
				src: url('${getFontUrl(fontDef.file)}') format('${fontDef.format}');
				font-weight: normal;
				font-style: normal;
				font-display: swap;
			}
		`;
		document.head.appendChild(styleEl);
	});
</script>

{#if as === 'div'}
	<div class={className} style={combinedStyle}>
		{@render children()}
	</div>
{:else if as === 'p'}
	<p class={className} style={combinedStyle}>
		{@render children()}
	</p>
{:else if as === 'h1'}
	<h1 class={className} style={combinedStyle}>
		{@render children()}
	</h1>
{:else if as === 'h2'}
	<h2 class={className} style={combinedStyle}>
		{@render children()}
	</h2>
{:else if as === 'h3'}
	<h3 class={className} style={combinedStyle}>
		{@render children()}
	</h3>
{:else if as === 'h4'}
	<h4 class={className} style={combinedStyle}>
		{@render children()}
	</h4>
{:else if as === 'h5'}
	<h5 class={className} style={combinedStyle}>
		{@render children()}
	</h5>
{:else if as === 'h6'}
	<h6 class={className} style={combinedStyle}>
		{@render children()}
	</h6>
{:else if as === 'code'}
	<code class={className} style={combinedStyle}>
		{@render children()}
	</code>
{:else if as === 'pre'}
	<pre class={className} style={combinedStyle}>{@render children()}</pre>
{:else if as === 'article'}
	<article class={className} style={combinedStyle}>
		{@render children()}
	</article>
{:else if as === 'section'}
	<section class={className} style={combinedStyle}>
		{@render children()}
	</section>
{:else}
	<span class={className} style={combinedStyle}>
		{@render children()}
	</span>
{/if}
