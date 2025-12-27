<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { winter } from '../palette';

	type SnowflakeVariant = 'crystal' | 'simple' | 'star' | 'delicate' | 'dot';

	interface Props {
		class?: string;
		color?: string;
		variant?: SnowflakeVariant;
		/** Opacity for depth effect */
		opacity?: number;
	}

	let {
		class: className = 'w-4 h-4',
		color = winter.snow,
		variant = 'crystal',
		opacity = 1
	}: Props = $props();
</script>

<!-- Snowflake - various crystalline shapes -->
<svg
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 40 40"
	style="opacity: {opacity};"
>
	{#if variant === 'crystal'}
		<!-- Classic 6-pointed crystal snowflake -->
		<g fill="none" stroke={color} stroke-width="1.5" stroke-linecap="round">
			<!-- Main axes -->
			<line x1="20" y1="4" x2="20" y2="36" />
			<line x1="6" y1="12" x2="34" y2="28" />
			<line x1="6" y1="28" x2="34" y2="12" />
			<!-- Branch details on vertical axis -->
			<line x1="20" y1="8" x2="16" y2="12" />
			<line x1="20" y1="8" x2="24" y2="12" />
			<line x1="20" y1="32" x2="16" y2="28" />
			<line x1="20" y1="32" x2="24" y2="28" />
			<!-- Branch details on diagonal axes -->
			<line x1="10" y1="14" x2="12" y2="10" />
			<line x1="10" y1="14" x2="8" y2="18" />
			<line x1="30" y1="26" x2="28" y2="30" />
			<line x1="30" y1="26" x2="32" y2="22" />
			<line x1="10" y1="26" x2="12" y2="30" />
			<line x1="10" y1="26" x2="8" y2="22" />
			<line x1="30" y1="14" x2="28" y2="10" />
			<line x1="30" y1="14" x2="32" y2="18" />
		</g>
		<!-- Center crystal -->
		<circle fill={color} cx="20" cy="20" r="2" />
	{:else if variant === 'simple'}
		<!-- Simple 6-pointed star snowflake -->
		<g fill="none" stroke={color} stroke-width="2" stroke-linecap="round">
			<line x1="20" y1="5" x2="20" y2="35" />
			<line x1="7" y1="12.5" x2="33" y2="27.5" />
			<line x1="7" y1="27.5" x2="33" y2="12.5" />
		</g>
		<circle fill={color} cx="20" cy="20" r="3" />
	{:else if variant === 'star'}
		<!-- Decorative star snowflake with filled points -->
		<polygon
			fill={color}
			points="20,2 22,15 35,12 25,20 35,28 22,25 20,38 18,25 5,28 15,20 5,12 18,15"
		/>
		<circle fill={color} cx="20" cy="20" r="4" opacity="0.8" />
	{:else if variant === 'delicate'}
		<!-- Delicate branching snowflake -->
		<g fill="none" stroke={color} stroke-width="1" stroke-linecap="round">
			<!-- Main spokes -->
			<line x1="20" y1="4" x2="20" y2="36" />
			<line x1="6" y1="12" x2="34" y2="28" />
			<line x1="6" y1="28" x2="34" y2="12" />
			<!-- Delicate inner branches -->
			<line x1="20" y1="10" x2="14" y2="13" />
			<line x1="20" y1="10" x2="26" y2="13" />
			<line x1="20" y1="30" x2="14" y2="27" />
			<line x1="20" y1="30" x2="26" y2="27" />
			<!-- Tiny end crystals -->
			<circle cx="20" cy="4" r="1.5" fill={color} />
			<circle cx="20" cy="36" r="1.5" fill={color} />
			<circle cx="6" cy="12" r="1.5" fill={color} />
			<circle cx="34" cy="28" r="1.5" fill={color} />
			<circle cx="6" cy="28" r="1.5" fill={color} />
			<circle cx="34" cy="12" r="1.5" fill={color} />
		</g>
		<circle fill={color} cx="20" cy="20" r="2.5" />
	{:else if variant === 'dot'}
		<!-- Simple snow dot/orb (for distant flakes) -->
		<circle fill={color} cx="20" cy="20" r="8" />
		<circle fill="white" cx="17" cy="17" r="2" opacity="0.6" />
	{/if}
</svg>
