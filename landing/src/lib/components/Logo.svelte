<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0
-->
<script lang="ts">
	import type { Season } from './nature/palette';
	import { autumn, winter, greens, bark, springBlossoms } from './nature/palette';
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
	// - Spring: Blossom pink - celebrating cherry blossom season!
	// - Summer: Grove brand green
	// - Autumn: Warm orange tones matching the forest palette
	// - Winter: Frosted cool spruce (heavily snow-dusted evergreen)
	const defaultColor = $derived(
		season === 'spring' ? springBlossoms.pink :  // Blossom pink for spring!
		season === 'autumn' ? autumn.pumpkin :       // Orange matching autumn forest palette
		season === 'winter' ? winter.coldSpruce :    // Cool spruce with heavy snow
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
		<!-- Snow accents in winter - heavy snow coverage -->
		{#if isWinter}
			<!-- Top point snow cap - prominent rounded cap -->
			<ellipse fill={winter.snow} cx="208" cy="6" rx="38" ry="12" opacity="0.95" />
			<ellipse fill={winter.frost} cx="208" cy="14" rx="30" ry="8" opacity="0.6" />

			<!-- Upper diagonal arm tips - thick snow coverage -->
			<ellipse fill={winter.snow} cx="42" cy="52" rx="26" ry="10" opacity="0.92" transform="rotate(-45 42 52)" />
			<ellipse fill={winter.frost} cx="52" cy="62" rx="20" ry="7" opacity="0.5" transform="rotate(-45 52 62)" />
			<ellipse fill={winter.snow} cx="375" cy="52" rx="26" ry="10" opacity="0.92" transform="rotate(45 375 52)" />
			<ellipse fill={winter.frost} cx="365" cy="62" rx="20" ry="7" opacity="0.5" transform="rotate(45 365 62)" />

			<!-- Horizontal arm snow caps - left and right -->
			<ellipse fill={winter.snow} cx="28" cy="173" rx="32" ry="11" opacity="0.93" />
			<ellipse fill={winter.frost} cx="45" cy="180" rx="24" ry="7" opacity="0.55" />
			<ellipse fill={winter.snow} cx="389" cy="173" rx="32" ry="11" opacity="0.93" />
			<ellipse fill={winter.frost} cx="372" cy="180" rx="24" ry="7" opacity="0.55" />

			<!-- Center intersection snow pile -->
			<ellipse fill={winter.snow} cx="208" cy="172" rx="30" ry="10" opacity="0.75" />
			<ellipse fill={winter.frost} cx="208" cy="180" rx="22" ry="6" opacity="0.4" />

			<!-- Lower diagonal arm tips - snow settled on angled surfaces -->
			<ellipse fill={winter.snow} cx="88" cy="315" rx="22" ry="8" opacity="0.85" transform="rotate(45 88 315)" />
			<ellipse fill={winter.frost} cx="98" cy="322" rx="16" ry="5" opacity="0.45" transform="rotate(45 98 322)" />
			<ellipse fill={winter.snow} cx="329" cy="315" rx="22" ry="8" opacity="0.85" transform="rotate(-45 329 315)" />
			<ellipse fill={winter.frost} cx="319" cy="322" rx="16" ry="5" opacity="0.45" transform="rotate(-45 319 322)" />

			<!-- Extra frost highlights on branch edges -->
			<ellipse fill={winter.ice} cx="130" cy="125" rx="12" ry="4" opacity="0.4" transform="rotate(-45 130 125)" />
			<ellipse fill={winter.ice} cx="287" cy="125" rx="12" ry="4" opacity="0.4" transform="rotate(45 287 125)" />
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
