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
	}

	let {
		class: className = 'w-5 h-8',
		color
	}: Props = $props();

	const coneColor = $derived(color ?? bark.warmBark);
	const scaleLight = bark.lightBark;
	const scaleDark = bark.darkBark;
</script>

<!-- Pine cone -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 55">
	<!-- Stem -->
	<rect fill={scaleDark} x="15" y="0" width="5" height="6" rx="1" />

	<!-- Pine cone body (overlapping scales) -->
	<!-- Top scales -->
	<ellipse fill={coneColor} cx="17.5" cy="12" rx="6" ry="4" />
	<path fill={scaleDark} d="M12 12 Q17.5 10 23 12" stroke-width="0" opacity="0.3" />

	<!-- Upper-mid scales -->
	<ellipse fill={coneColor} cx="12" cy="18" rx="7" ry="5" />
	<ellipse fill={coneColor} cx="23" cy="18" rx="7" ry="5" />
	<path fill={scaleLight} d="M6 18 Q12 15 18 18" opacity="0.2" />
	<path fill={scaleLight} d="M17 18 Q23 15 29 18" opacity="0.2" />

	<!-- Middle scales -->
	<ellipse fill={coneColor} cx="17.5" cy="24" rx="8" ry="5" />
	<ellipse fill={coneColor} cx="8" cy="26" rx="7" ry="5" />
	<ellipse fill={coneColor} cx="27" cy="26" rx="7" ry="5" />
	<path fill={scaleDark} d="M10 24 Q17.5 21 25 24" opacity="0.3" />

	<!-- Lower-mid scales -->
	<ellipse fill={coneColor} cx="12" cy="33" rx="8" ry="5" />
	<ellipse fill={coneColor} cx="23" cy="33" rx="8" ry="5" />
	<path fill={scaleLight} d="M5 33 Q12 30 19 33" opacity="0.2" />
	<path fill={scaleLight} d="M16 33 Q23 30 30 33" opacity="0.2" />

	<!-- Bottom scales -->
	<ellipse fill={coneColor} cx="17.5" cy="40" rx="9" ry="5" />
	<ellipse fill={coneColor} cx="10" cy="42" rx="6" ry="4" />
	<ellipse fill={coneColor} cx="25" cy="42" rx="6" ry="4" />
	<path fill={scaleDark} d="M9 40 Q17.5 37 26 40" opacity="0.3" />

	<!-- Tip scales -->
	<ellipse fill={coneColor} cx="17.5" cy="48" rx="7" ry="4" />
	<ellipse fill={coneColor} cx="17.5" cy="52" rx="4" ry="3" />
</svg>
