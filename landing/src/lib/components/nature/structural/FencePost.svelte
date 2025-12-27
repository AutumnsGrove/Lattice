<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { bark } from '../palette';

	interface Props {
		class?: string;
		color?: string;
		variant?: 'pointed' | 'flat' | 'round';
	}

	let {
		class: className = 'w-4 h-12',
		color,
		variant = 'pointed'
	}: Props = $props();

	const postColor = $derived(color ?? bark.warmBark);
	const shadowColor = $derived(bark.darkBark);
</script>

<!-- Fence post -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 70">
	{#if variant === 'pointed'}
		<!-- Pointed top post -->
		<polygon fill={postColor} points="5,15 12.5,0 20,15" />
		<rect fill={postColor} x="5" y="15" width="15" height="55" />
		<!-- Shadow -->
		<rect fill={shadowColor} x="17" y="15" width="3" height="55" opacity="0.2" />
		<polygon fill={shadowColor} points="12.5,0 20,15 17,15 12.5,5" opacity="0.2" />
	{:else if variant === 'flat'}
		<!-- Flat top post -->
		<rect fill={postColor} x="5" y="5" width="15" height="65" rx="1" />
		<!-- Cap -->
		<rect fill={postColor} x="3" y="5" width="19" height="4" rx="1" />
		<!-- Shadow -->
		<rect fill={shadowColor} x="17" y="9" width="3" height="61" opacity="0.2" />
	{:else}
		<!-- Round top post -->
		<rect fill={postColor} x="5" y="12" width="15" height="58" />
		<ellipse fill={postColor} cx="12.5" cy="12" rx="7.5" ry="5" />
		<!-- Highlight on round top -->
		<ellipse fill="white" cx="10" cy="10" rx="3" ry="2" opacity="0.15" />
		<!-- Shadow -->
		<rect fill={shadowColor} x="17" y="12" width="3" height="58" opacity="0.2" />
	{/if}

	<!-- Wood grain lines -->
	<line x1="8" y1="20" x2="8" y2="65" stroke={shadowColor} stroke-width="0.5" opacity="0.3" />
	<line x1="17" y1="25" x2="17" y2="60" stroke={shadowColor} stroke-width="0.5" opacity="0.2" />
</svg>
