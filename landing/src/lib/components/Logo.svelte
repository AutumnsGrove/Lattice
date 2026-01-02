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
		<!-- Snow accents in winter - natural snow coverage on upper branches only -->
		{#if isWinter}
			<!-- Top point snow cap - organic shape following the arrow tip -->
			<path fill={winter.snow} d="M170 8 Q175 -2 208 -4 Q241 -2 246 8 Q244 18 235 22 Q220 26 208 24 Q196 26 181 22 Q172 18 170 8 Z" opacity="0.95" />
			<path fill={winter.frost} d="M182 12 Q190 6 208 5 Q226 6 234 12 Q232 20 222 22 Q212 24 208 23 Q204 24 194 22 Q184 20 182 12 Z" opacity="0.55" />
			<!-- Snow particles on top -->
			<circle fill={winter.snow} cx="195" cy="2" r="4" opacity="0.8" />
			<circle fill={winter.snow} cx="221" cy="3" r="3" opacity="0.75" />
			<circle fill={winter.frost} cx="208" cy="-2" r="5" opacity="0.6" />

			<!-- Upper-left diagonal arm - snow sitting on the angled surface -->
			<path fill={winter.snow} d="M22 42 Q28 32 48 28 Q68 30 72 44 Q68 56 55 62 Q40 66 28 60 Q18 54 22 42 Z" opacity="0.93" transform="rotate(-8 47 47)" />
			<path fill={winter.frost} d="M32 46 Q38 38 52 36 Q64 40 66 50 Q62 58 52 60 Q42 62 34 56 Q30 52 32 46 Z" opacity="0.5" transform="rotate(-8 49 48)" />
			<!-- Scattered snow bits -->
			<circle fill={winter.snow} cx="58" cy="38" r="5" opacity="0.85" />
			<circle fill={winter.snow} cx="36" cy="52" r="4" opacity="0.8" />
			<circle fill={winter.frost} cx="48" cy="44" r="3" opacity="0.6" />

			<!-- Upper-right diagonal arm - mirrored snow -->
			<path fill={winter.snow} d="M395 42 Q389 32 369 28 Q349 30 345 44 Q349 56 362 62 Q377 66 389 60 Q399 54 395 42 Z" opacity="0.93" transform="rotate(8 370 47)" />
			<path fill={winter.frost} d="M385 46 Q379 38 365 36 Q353 40 351 50 Q355 58 365 60 Q375 62 383 56 Q387 52 385 46 Z" opacity="0.5" transform="rotate(8 368 48)" />
			<!-- Scattered snow bits -->
			<circle fill={winter.snow} cx="359" cy="38" r="5" opacity="0.85" />
			<circle fill={winter.snow} cx="381" cy="52" r="4" opacity="0.8" />
			<circle fill={winter.frost} cx="369" cy="44" r="3" opacity="0.6" />

			<!-- Left horizontal arm - snow along the top edge -->
			<path fill={winter.snow} d="M4 162 Q8 154 28 152 Q58 150 78 156 Q88 162 86 172 Q82 180 62 182 Q38 184 18 180 Q6 176 4 168 Q2 164 4 162 Z" opacity="0.94" />
			<path fill={winter.frost} d="M16 166 Q22 160 42 158 Q62 160 72 166 Q74 174 58 176 Q38 178 22 174 Q16 172 16 166 Z" opacity="0.5" />
			<!-- Snow particles -->
			<circle fill={winter.snow} cx="24" cy="158" r="6" opacity="0.85" />
			<circle fill={winter.snow} cx="52" cy="156" r="4" opacity="0.8" />
			<circle fill={winter.snow} cx="72" cy="160" r="5" opacity="0.75" />
			<circle fill={winter.frost} cx="38" cy="162" r="3" opacity="0.55" />

			<!-- Right horizontal arm - snow along the top edge -->
			<path fill={winter.snow} d="M413 162 Q409 154 389 152 Q359 150 339 156 Q329 162 331 172 Q335 180 355 182 Q379 184 399 180 Q411 176 413 168 Q415 164 413 162 Z" opacity="0.94" />
			<path fill={winter.frost} d="M401 166 Q395 160 375 158 Q355 160 345 166 Q343 174 359 176 Q379 178 395 174 Q401 172 401 166 Z" opacity="0.5" />
			<!-- Snow particles -->
			<circle fill={winter.snow} cx="393" cy="158" r="6" opacity="0.85" />
			<circle fill={winter.snow} cx="365" cy="156" r="4" opacity="0.8" />
			<circle fill={winter.snow} cx="345" cy="160" r="5" opacity="0.75" />
			<circle fill={winter.frost} cx="379" cy="162" r="3" opacity="0.55" />

			<!-- Center intersection - light dusting where branches meet -->
			<path fill={winter.snow} d="M178 168 Q182 158 208 156 Q234 158 238 168 Q240 178 228 184 Q216 188 208 186 Q200 188 188 184 Q176 178 178 168 Z" opacity="0.7" />
			<circle fill={winter.frost} cx="196" cy="172" r="4" opacity="0.45" />
			<circle fill={winter.frost} cx="220" cy="172" r="4" opacity="0.45" />
			<circle fill={winter.snow} cx="208" cy="164" r="5" opacity="0.6" />

			<!-- Light frost accents on inner branch edges (upper only) -->
			<circle fill={winter.ice} cx="135" cy="128" r="6" opacity="0.35" />
			<circle fill={winter.ice} cx="282" cy="128" r="6" opacity="0.35" />
			<circle fill={winter.ice} cx="165" cy="95" r="4" opacity="0.3" />
			<circle fill={winter.ice} cx="252" cy="95" r="4" opacity="0.3" />
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
