<script lang="ts">
	import type { Season } from './nature/palette';
	import { autumn, winter, greens, bark } from './nature/palette';
	import { onMount } from 'svelte';

	interface Props {
		class?: string;
		color?: string;
		trunkColor?: string;
		season?: Season;
		animate?: boolean;
		animateEntrance?: boolean;
		/** Add breathing animation (subtle pulse for loading states) */
		breathing?: boolean;
	}

	let {
		class: className = 'w-6 h-6',
		color,
		trunkColor,
		season = 'autumn',  // Default to autumn (Grove's signature season)
		animate = false,
		animateEntrance = false,
		breathing = false
	}: Props = $props();

	// Check if winter for snow accents (Logo keeps foliage, just gets snow-dusted)
	const isWinter = $derived(season === 'winter');

	// Build animation class - breathing takes precedence over sway
	const animationClass = $derived(breathing ? 'breathing' : (animate ? 'sway' : ''));

	// Seasonal color mapping for the logo
	// - Spring: Light spring green (temporary - will refine when spring mode is fully implemented)
	// - Summer: Grove brand green
	// - Autumn: Warm orange tones matching the forest palette
	// - Winter: Frosted muted green (Logo stays green year-round like an evergreen)
	const defaultColor = $derived(
		season === 'spring' ? greens.mint :       // Temporary light spring green
		season === 'autumn' ? autumn.pumpkin :    // Orange matching autumn forest palette
		season === 'winter' ? winter.winterGreen :
		greens.grove  // Summer uses Grove brand green
	);
	const foliageColor = $derived(color ?? defaultColor);
	// Trunk should always be brown (like real tree bark), not match the foliage
	const actualTrunkColor = $derived(trunkColor ?? bark.bark);

	// Animation state for entrance animation
	let mounted = $state(false);

	onMount(() => {
		if (animateEntrance) {
			// Small delay to ensure CSS transition triggers
			requestAnimationFrame(() => {
				mounted = true;
			});
		}
	});

	// Calculate if arrows should be in final position
	const inPosition = $derived(animateEntrance ? mounted : true);
</script>

{#if animateEntrance}
	<!-- Animated version with 4 separate arrows -->
	<svg
		class="{className} {animationClass}"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 417 512.238"
	>
		<defs>
			<!-- Clip paths to isolate each arrow direction -->
			<clipPath id="clip-top">
				<polygon points="0,0 417,0 417,208.5 208.5,208.5 0,208.5" />
			</clipPath>
			<clipPath id="clip-right">
				<polygon points="208.5,0 417,0 417,400 208.5,400 208.5,208.5" />
			</clipPath>
			<clipPath id="clip-bottom">
				<polygon points="0,208.5 208.5,208.5 417,208.5 417,400 0,400" />
			</clipPath>
			<clipPath id="clip-left">
				<polygon points="0,0 208.5,0 208.5,208.5 208.5,400 0,400" />
			</clipPath>
		</defs>

		<!-- Trunk (static) -->
		<path fill={actualTrunkColor} d="M171.274 344.942h74.09v167.296h-74.09V344.942z"/>

		<!-- Top Arrow -->
		<g
			class="arrow arrow-top"
			class:in-position={inPosition}
			clip-path="url(#clip-top)"
		>
			<path fill={foliageColor} d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"/>
		</g>

		<!-- Right Arrow -->
		<g
			class="arrow arrow-right"
			class:in-position={inPosition}
			clip-path="url(#clip-right)"
		>
			<path fill={foliageColor} d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"/>
		</g>

		<!-- Bottom Arrow -->
		<g
			class="arrow arrow-bottom"
			class:in-position={inPosition}
			clip-path="url(#clip-bottom)"
		>
			<path fill={foliageColor} d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"/>
		</g>

		<!-- Left Arrow -->
		<g
			class="arrow arrow-left"
			class:in-position={inPosition}
			clip-path="url(#clip-left)"
		>
			<path fill={foliageColor} d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"/>
		</g>
	</svg>
{:else}
	<!-- Static version -->
	<svg
		class="{className} {animationClass}"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 417 512.238"
	>
		<!-- Trunk -->
		<path fill={actualTrunkColor} d="M171.274 344.942h74.09v167.296h-74.09V344.942z"/>
		<!-- Foliage -->
		<path fill={foliageColor} d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"/>
		<!-- Snow accents in winter -->
		{#if isWinter}
			<!-- Top point snow cap -->
			<ellipse fill={winter.snow} cx="208" cy="8" rx="32" ry="10" opacity="0.85" />

			<!-- Upper diagonal arm tips (the angled parts pointing up-left and up-right) -->
			<ellipse fill={winter.snow} cx="52" cy="60" rx="18" ry="6" opacity="0.7" transform="rotate(-25 52 60)" />
			<ellipse fill={winter.snow} cx="365" cy="60" rx="18" ry="6" opacity="0.7" transform="rotate(25 365 60)" />

			<!-- Horizontal arm snow (left and right extending arms) -->
			<ellipse fill={winter.snow} cx="45" cy="175" rx="28" ry="7" opacity="0.75" />
			<ellipse fill={winter.snow} cx="372" cy="175" rx="28" ry="7" opacity="0.75" />

			<!-- Center intersection snow pile -->
			<ellipse fill={winter.snow} cx="208" cy="175" rx="25" ry="8" opacity="0.6" />

			<!-- Lower diagonal arm tips -->
			<ellipse fill={winter.snow} cx="95" cy="320" rx="16" ry="5" opacity="0.55" transform="rotate(25 95 320)" />
			<ellipse fill={winter.snow} cx="322" cy="320" rx="16" ry="5" opacity="0.55" transform="rotate(-25 322 320)" />
		{/if}
	</svg>
{/if}

<style>
	@keyframes sway {
		0%, 100% { transform: rotate(0deg); }
		50% { transform: rotate(1deg); }
	}

	@keyframes breathe {
		0%, 100% {
			transform: scale(1);
			opacity: 0.7;
		}
		50% {
			transform: scale(1.05);
			opacity: 1;
		}
	}

	.sway {
		transform-origin: center bottom;
		animation: sway 4s ease-in-out infinite;
	}

	.breathing {
		transform-origin: center center;
		animation: breathe 2s ease-in-out infinite;
	}

	/* Arrow entrance animations */
	.arrow {
		transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); /* Bounce easing */
	}

	/* Starting positions (offset by ~20%) */
	.arrow-top {
		transform: translateY(-40px);
	}
	.arrow-right {
		transform: translateX(40px);
	}
	.arrow-bottom {
		transform: translateY(40px);
	}
	.arrow-left {
		transform: translateX(-40px);
	}

	/* Final positions */
	.arrow-top.in-position {
		transform: translateY(0);
	}
	.arrow-right.in-position {
		transform: translateX(0);
	}
	.arrow-bottom.in-position {
		transform: translateY(0);
	}
	.arrow-left.in-position {
		transform: translateX(0);
	}
</style>
