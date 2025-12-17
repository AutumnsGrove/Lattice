<script lang="ts">
	import type { Season } from './nature/palette';
	import { autumn } from './nature/palette';
	import { onMount } from 'svelte';

	interface Props {
		class?: string;
		color?: string;
		trunkColor?: string;
		season?: Season;
		animate?: boolean;
		animateEntrance?: boolean;
	}

	let {
		class: className = 'w-6 h-6',
		color,
		trunkColor,
		season = 'summer',
		animate = false,
		animateEntrance = false
	}: Props = $props();

	// In autumn, default to warm amber/orange tones
	const defaultColor = season === 'autumn' ? autumn.amber : 'currentColor';
	const foliageColor = color ?? defaultColor;
	const actualTrunkColor = trunkColor ?? foliageColor;

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
		class="{className} {animate ? 'sway' : ''}"
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
		class="{className} {animate ? 'sway' : ''}"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 417 512.238"
	>
		<!-- Trunk -->
		<path fill={actualTrunkColor} d="M171.274 344.942h74.09v167.296h-74.09V344.942z"/>
		<!-- Foliage -->
		<path fill={foliageColor} d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"/>
	</svg>
{/if}

<style>
	@keyframes sway {
		0%, 100% { transform: rotate(0deg); }
		50% { transform: rotate(1deg); }
	}

	.sway {
		transform-origin: center bottom;
		animation: sway 4s ease-in-out infinite;
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
