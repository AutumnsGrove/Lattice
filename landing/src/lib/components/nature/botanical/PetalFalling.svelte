<script lang="ts">
	import { springBlossoms } from '../palette';
	import { browser } from '$app/environment';

	type PetalVariant = 'round' | 'pointed' | 'heart' | 'curled' | 'tiny';

	interface Props {
		class?: string;
		/** Petal shape variant */
		variant?: PetalVariant;
		/** Override petal color (defaults to spring blossom pink) */
		color?: string;
		/** Fall animation duration in seconds */
		duration?: number;
		/** Animation delay in seconds */
		delay?: number;
		/** Horizontal drift amount in pixels (can be negative) */
		drift?: number;
		/** Fall distance in vh units */
		fallDistance?: number;
		/** Enable falling animation */
		animate?: boolean;
		/** Opacity for depth effect */
		opacity?: number;
		/** Seed for deterministic rotation patterns */
		seed?: number;
	}

	let {
		class: className = 'w-3 h-3',
		variant = 'round',
		color,
		duration = 12,
		delay = 0,
		drift = 0,
		fallDistance = 100,
		animate = true,
		opacity = 0.85,
		seed = 0
	}: Props = $props();

	// Use spring blossom colors with slight variation based on variant
	const petalColor = color ?? (
		variant === 'tiny' ? springBlossoms.palePink :
		variant === 'curled' ? springBlossoms.rose :
		springBlossoms.blush
	);

	// Secondary color for gradient effect
	const highlightColor = springBlossoms.palePink;

	// Deterministic rotation based on seed
	const initialRotation = (seed * 37) % 360;
	const rotationDirection = seed % 2 === 0 ? 1 : -1;
	const rotationAmount = 180 + (seed % 180); // 180-360 degrees total rotation

	// Unique animation name to prevent conflicts
	const animId = `petal-${seed}`;

	// Inject dynamic keyframes at runtime to avoid PostCSS parsing issues
	$effect(() => {
		if (!browser || !animate) return;

		const styleId = `petal-style-${seed}`;
		// Check if already injected
		if (document.getElementById(styleId)) return;

		const style = document.createElement('style');
		style.id = styleId;
		style.textContent = `
			@keyframes ${animId}-fall {
				0% {
					transform: translateY(0) translateX(0) rotate(${initialRotation}deg);
				}
				100% {
					transform: translateY(${fallDistance}vh) translateX(${drift}px) rotate(${initialRotation + rotationAmount * rotationDirection}deg);
				}
			}
			@keyframes ${animId}-flutter {
				0%, 100% {
					transform: rotateX(0deg) rotateY(0deg) scale(1);
				}
				25% {
					transform: rotateX(20deg) rotateY(30deg) scale(0.95);
				}
				50% {
					transform: rotateX(-15deg) rotateY(-25deg) scale(1.02);
				}
				75% {
					transform: rotateX(25deg) rotateY(15deg) scale(0.98);
				}
			}
		`;
		document.head.appendChild(style);

		return () => {
			// Cleanup on component destroy
			const el = document.getElementById(styleId);
			if (el) el.remove();
		};
	});
</script>

<!-- Cherry blossom petal - delicate and flutter-y -->
<svg
	class="{className}"
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 20 20"
	style="
		opacity: {opacity};
		{animate ? `animation: ${animId}-fall ${duration}s ease-in-out ${delay}s infinite, ${animId}-flutter ${duration / 4}s ease-in-out ${delay}s infinite;` : ''}
	"
>
	<defs>
		<!-- Gradient for depth -->
		<radialGradient id="petal-grad-{seed}" cx="30%" cy="30%" r="70%">
			<stop offset="0%" stop-color={highlightColor} />
			<stop offset="100%" stop-color={petalColor} />
		</radialGradient>
	</defs>

	{#if variant === 'round'}
		<!-- Classic round cherry blossom petal -->
		<ellipse
			cx="10"
			cy="10"
			rx="8"
			ry="9"
			fill="url(#petal-grad-{seed})"
			transform="rotate({initialRotation} 10 10)"
		/>
		<!-- Subtle vein -->
		<path
			d="M10 3 Q10 10 10 18"
			fill="none"
			stroke={springBlossoms.rose}
			stroke-width="0.5"
			opacity="0.3"
			transform="rotate({initialRotation} 10 10)"
		/>
	{:else if variant === 'pointed'}
		<!-- Pointed petal - slightly more dramatic -->
		<path
			d="M10 2 Q18 8 16 14 Q12 20 10 18 Q8 20 4 14 Q2 8 10 2"
			fill="url(#petal-grad-{seed})"
			transform="rotate({initialRotation} 10 10)"
		/>
	{:else if variant === 'heart'}
		<!-- Heart-shaped petal with notch at top -->
		<path
			d="M10 18 Q4 12 4 8 Q4 4 8 4 Q10 4 10 6 Q10 4 12 4 Q16 4 16 8 Q16 12 10 18"
			fill="url(#petal-grad-{seed})"
			transform="rotate({initialRotation} 10 10)"
		/>
	{:else if variant === 'curled'}
		<!-- Curled petal - caught by the wind -->
		<path
			d="M6 4 Q14 2 16 8 Q18 14 14 18 Q8 18 6 14 Q4 10 6 4"
			fill="url(#petal-grad-{seed})"
			transform="rotate({initialRotation} 10 10)"
		/>
		<!-- Curl shadow -->
		<path
			d="M8 6 Q12 5 14 8"
			fill="none"
			stroke={springBlossoms.rose}
			stroke-width="0.5"
			opacity="0.4"
			transform="rotate({initialRotation} 10 10)"
		/>
	{:else}
		<!-- Tiny - simple dot for distant petals -->
		<circle
			cx="10"
			cy="10"
			r="6"
			fill={petalColor}
			transform="rotate({initialRotation} 10 10)"
		/>
	{/if}
</svg>

<style>
	/* Dynamic keyframes are injected via style attribute */
	/* These are fallback static versions */
	@keyframes petal-fall-base {
		0% {
			transform: translateY(0) translateX(0);
		}
		100% {
			transform: translateY(100vh) translateX(var(--drift, 30px));
		}
	}

	@keyframes petal-flutter-base {
		0%, 100% {
			transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
		}
		25% {
			transform: rotateX(15deg) rotateY(30deg) rotateZ(10deg);
		}
		50% {
			transform: rotateX(-10deg) rotateY(-20deg) rotateZ(-5deg);
		}
		75% {
			transform: rotateX(20deg) rotateY(10deg) rotateZ(15deg);
		}
	}

	svg {
		transform-style: preserve-3d;
		will-change: transform, opacity;
	}
</style>

