<script lang="ts">
	import { bark, earth } from '../palette';

	interface Props {
		class?: string;
		barkColor?: string;
		ringColor?: string;
	}

	let {
		class: className = 'w-8 h-6',
		barkColor,
		ringColor
	}: Props = $props();

	const barkFill = barkColor ?? bark.warmBark;
	const ringFill = ringColor ?? earth.sand;
	const centerColor = bark.lightBark;
</script>

<!-- Tree stump with visible rings -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 50">
	<!-- Bark exterior -->
	<path fill={barkFill} d="M10 20 Q8 35 5 50 L65 50 Q62 35 60 20 Q35 15 10 20" />

	<!-- Top surface -->
	<ellipse fill={ringFill} cx="35" cy="20" rx="28" ry="12" />

	<!-- Tree rings -->
	<ellipse fill="none" stroke={barkFill} stroke-width="1.5" cx="35" cy="20" rx="22" ry="9" opacity="0.6" />
	<ellipse fill="none" stroke={barkFill} stroke-width="1" cx="35" cy="20" rx="16" ry="6" opacity="0.5" />
	<ellipse fill="none" stroke={barkFill} stroke-width="1" cx="35" cy="20" rx="10" ry="4" opacity="0.4" />
	<ellipse fill={centerColor} cx="35" cy="20" rx="4" ry="2" opacity="0.6" />

	<!-- Bark texture lines -->
	<path fill="none" stroke={bark.darkBark} stroke-width="1" d="M15 25 Q14 35 12 45" opacity="0.4" />
	<path fill="none" stroke={bark.darkBark} stroke-width="1" d="M55 25 Q56 35 58 45" opacity="0.4" />
	<path fill="none" stroke={bark.darkBark} stroke-width="1" d="M35 32 L35 48" opacity="0.3" />
</svg>
