<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import { bark, natural } from '../palette';

	interface Props {
		class?: string;
		color?: string;
		variant?: 'trellis' | 'fence' | 'archway';
	}

	let {
		class: className = 'w-12 h-16',
		color,
		variant = 'trellis'
	}: Props = $props();

	const woodColor = $derived(color ?? bark.warmBark);
	const shadowColor = $derived(bark.darkBark);
</script>

<!-- Lattice/Trellis structure - ties into "Lattice" brand name -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100">
	{#if variant === 'trellis'}
		<!-- Classic garden trellis -->
		<!-- Vertical posts -->
		<rect fill={woodColor} x="5" y="0" width="6" height="100" rx="1" />
		<rect fill={woodColor} x="69" y="0" width="6" height="100" rx="1" />

		<!-- Horizontal bars -->
		<rect fill={woodColor} x="5" y="5" width="70" height="4" rx="1" />
		<rect fill={woodColor} x="5" y="95" width="70" height="4" rx="1" />

		<!-- Diagonal lattice pattern -->
		<g opacity="0.9">
			<!-- Left-leaning diagonals -->
			<line x1="11" y1="9" x2="69" y2="50" stroke={woodColor} stroke-width="3" />
			<line x1="11" y1="30" x2="69" y2="71" stroke={woodColor} stroke-width="3" />
			<line x1="11" y1="51" x2="69" y2="92" stroke={woodColor} stroke-width="3" />
			<line x1="11" y1="72" x2="48" y2="95" stroke={woodColor} stroke-width="3" />
			<line x1="32" y1="9" x2="69" y2="30" stroke={woodColor} stroke-width="3" />

			<!-- Right-leaning diagonals -->
			<line x1="69" y1="9" x2="11" y2="50" stroke={woodColor} stroke-width="3" />
			<line x1="69" y1="30" x2="11" y2="71" stroke={woodColor} stroke-width="3" />
			<line x1="69" y1="51" x2="11" y2="92" stroke={woodColor} stroke-width="3" />
			<line x1="69" y1="72" x2="32" y2="95" stroke={woodColor} stroke-width="3" />
			<line x1="48" y1="9" x2="11" y2="30" stroke={woodColor} stroke-width="3" />
		</g>

		<!-- Post shadows -->
		<rect fill={shadowColor} x="9" y="0" width="2" height="100" opacity="0.2" />
		<rect fill={shadowColor} x="73" y="0" width="2" height="100" opacity="0.2" />
	{:else if variant === 'fence'}
		<!-- Fence section -->
		<rect fill={woodColor} x="5" y="20" width="70" height="6" rx="1" />
		<rect fill={woodColor} x="5" y="70" width="70" height="6" rx="1" />

		<!-- Vertical slats -->
		<rect fill={woodColor} x="8" y="10" width="8" height="90" rx="1" />
		<rect fill={woodColor} x="24" y="10" width="8" height="90" rx="1" />
		<rect fill={woodColor} x="40" y="5" width="8" height="95" rx="1" />
		<rect fill={woodColor} x="56" y="10" width="8" height="90" rx="1" />
		<rect fill={woodColor} x="72" y="10" width="6" height="90" rx="1" />

		<!-- Pointed tops -->
		<polygon fill={woodColor} points="8,10 12,0 16,10" />
		<polygon fill={woodColor} points="24,10 28,0 32,10" />
		<polygon fill={woodColor} points="40,5 44,-5 48,5" />
		<polygon fill={woodColor} points="56,10 60,0 64,10" />
	{:else}
		<!-- Archway trellis -->
		<path
			fill="none"
			stroke={woodColor}
			stroke-width="6"
			d="M10 100 L10 40 Q10 10 40 10 Q70 10 70 40 L70 100"
		/>
		<!-- Cross beams on arch -->
		<line x1="10" y1="60" x2="70" y2="60" stroke={woodColor} stroke-width="4" />
		<line x1="10" y1="80" x2="70" y2="80" stroke={woodColor} stroke-width="4" />
		<!-- Arch lattice -->
		<path fill="none" stroke={woodColor} stroke-width="2" d="M15 100 L15 45 Q15 20 40 20 Q65 20 65 45 L65 100" />
		<path fill="none" stroke={woodColor} stroke-width="2" d="M20 100 L20 48 Q20 28 40 28 Q60 28 60 48 L60 100" />
	{/if}
</svg>
