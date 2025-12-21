<script lang="ts">
	import { bark, accents } from '../palette';

	interface Props {
		class?: string;
		bodyColor?: string;
		maskColor?: string;
		beakColor?: string;
		animate?: boolean;
		facing?: 'left' | 'right';
	}

	let {
		class: className = 'w-6 h-6',
		bodyColor,
		maskColor,
		beakColor,
		animate = true,
		facing = 'right'
	}: Props = $props();

	// Northern Cardinal colors (male) - from palette
	const body = bodyColor ?? accents.bird.cardinalRed;
	const mask = maskColor ?? accents.bird.cardinalMask;
	const beak = beakColor ?? accents.bird.cardinalBeak;
	const legColor = bark.darkBark;

	const scaleX = facing === 'left' ? -1 : 1;
</script>

<!-- Northern Cardinal - perched, with distinctive crest -->
<svg
	class="{className} {animate ? 'bob' : ''}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 50 60"
	style="transform: scaleX({scaleX})"
>
	<!-- Tail feathers - long and red -->
	<path fill={body} d="M5 35 Q0 40 2 50 Q8 48 12 42 Q14 38 10 34 Q7 33 5 35" />
	<path fill="#b91c1c" d="M6 36 Q3 42 4 48 Q8 46 10 42" opacity="0.6" />

	<!-- Body - bright red -->
	<ellipse fill={body} cx="22" cy="32" rx="14" ry="12" />

	<!-- Wing - slightly darker red with feather details -->
	<path fill="#b91c1c" d="M10 28 Q6 34 9 42 Q16 40 20 34 Q18 27 10 28" />
	<path fill="#991b1b" d="M12 32 Q10 36 12 40 Q15 38 16 35 Q14 32 12 32" opacity="0.5" />

	<!-- Breast - lighter red highlight -->
	<ellipse fill="#ef4444" cx="30" cy="35" rx="8" ry="9" opacity="0.7" />

	<!-- Head - red with crest -->
	<circle fill={body} cx="36" cy="20" r="10" />

	<!-- Distinctive crest (pointed tuft) -->
	<path fill={body} d="M32 12 Q36 5 38 8 Q40 10 38 14 Q35 13 32 12" />
	<path fill="#ef4444" d="M34 10 Q36 6 37 9" opacity="0.5" />

	<!-- Black mask - surrounds eye and covers throat -->
	<path fill={mask} d="M38 16 Q44 14 46 18 Q46 22 44 24 Q40 26 36 26 Q32 24 32 20 Q34 16 38 16" />

	<!-- Eye - visible within mask -->
	<circle fill="#1a1a1a" cx="40" cy="19" r="2.5" />
	<!-- Eye highlight -->
	<circle fill="white" cx="41" cy="18" r="0.8" />

	<!-- Beak - thick orange-red cone shape (cardinal signature) -->
	<path fill={beak} d="M44 20 L52 21 L44 24 Q43 22 44 20" />
	<!-- Beak curve detail -->
	<path fill="#ea580c" d="M45 21 Q48 21 50 21.5" stroke="#c2410c" stroke-width="0.3" />

	<!-- Legs - dark -->
	<g fill="none" stroke={legColor} stroke-width="1.5">
		<path d="M20 44 L20 54 M18 52 L22 52" />
		<path d="M26 44 L26 54 M24 52 L28 52" />
	</g>
</svg>

<style>
	@keyframes bob {
		0%, 100% { transform: translateY(0); }
		50% { transform: translateY(-1.5px); }
	}

	.bob {
		animation: bob 2.5s ease-in-out infinite;
	}
</style>
