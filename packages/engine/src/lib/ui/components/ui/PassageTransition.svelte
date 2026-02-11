<script lang="ts">
	import { onMount } from "svelte";
	import { cn } from "$lib/ui/utils";
	import Logo from "./Logo.svelte";

	/**
	 * PassageTransition - Self-contained navigation overlay for cross-origin Grove links
	 *
	 * Drop this component on any page or layout and it automatically intercepts
	 * clicks on links to other *.grove.place subdomains, showing a warm glassmorphism
	 * overlay with a breathing Grove logo and floating light motes while the browser
	 * navigates through the Passage (Grove's subdomain router).
	 *
	 * Named after the Passage — the Cloudflare Worker that routes wanderers between gardens.
	 *
	 * @example Basic — just drop it in a layout and forget about it
	 * ```svelte
	 * <PassageTransition />
	 * ```
	 *
	 * @example With destination names — add data-passage-name to links for personalized text
	 * ```svelte
	 * <a href="https://autumn.grove.place" data-passage-name="Autumn">Visit Autumn</a>
	 * <PassageTransition />
	 * ```
	 *
	 * Without data-passage-name, the overlay shows "Following the path..."
	 * With it, it shows "Wandering to {name}'s garden..."
	 */

	interface Props {
		/** Additional CSS classes for the overlay container */
		class?: string;
	}

	let { class: className }: Props = $props();

	// Internal state
	let active = $state(false);
	let name = $state<string | undefined>(undefined);

	// Mote configuration — staggered floating particles for ambient life
	const motes = Array.from({ length: 8 }, (_, i) => ({
		delay: `${i * 0.35}s`,
		x: `${18 + ((i * 11) % 65)}%`,
		drift: `${-20 + ((i * 7) % 40)}px`,
		size: `${2 + (i % 3)}px`,
		duration: `${2.5 + (i % 3) * 0.5}s`,
	}));

	/**
	 * Check if a URL points to a different Grove subdomain than the current page.
	 * Matches any *.grove.place link that isn't the current hostname.
	 */
	function isPassageLink(href: string): boolean {
		try {
			const url = new URL(href, window.location.origin);
			return (
				url.hostname.endsWith(".grove.place") &&
				url.hostname !== window.location.hostname &&
				url.hostname !== "grove.place"
			);
		} catch {
			return false;
		}
	}

	onMount(() => {
		function handleClick(e: MouseEvent) {
			// Don't intercept modified clicks (new tab, middle-click, etc.)
			if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

			// Walk up from click target to find the nearest <a> with an href
			const link = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
			if (!link) return;

			const href = link.getAttribute("href");
			if (!href || !isPassageLink(href)) return;

			e.preventDefault();

			// Look for a friendly name on the link or its ancestors
			name =
				link.getAttribute("data-passage-name") ??
				link.closest("[data-passage-name]")?.getAttribute("data-passage-name") ??
				undefined;
			active = true;

			// Double rAF ensures the overlay paints before navigation begins
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					window.location.href = href;
				});
			});
		}

		document.addEventListener("click", handleClick);
		return () => document.removeEventListener("click", handleClick);
	});
</script>

{#if active}
	<div
		class={cn(
			"fixed inset-0 z-grove-overlay flex flex-col items-center justify-center",
			"passage-overlay",
			className,
		)}
		role="alert"
		aria-live="assertive"
	>
		<!-- Warm glassmorphism backdrop -->
		<div class="absolute inset-0 passage-backdrop" />

		<!-- Centered content -->
		<div class="relative z-10 flex flex-col items-center gap-5">
			<div class="passage-breathe">
				<svelte:boundary>
					<Logo class="w-16 h-16 drop-shadow-lg" />
					{#snippet failed()}
						<!-- Fallback: simple leaf circle if Logo fails to render -->
						<div class="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
							<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 1.5 17 1.5s4.78 8.1 0 13.5c-2.5 2.5-6.2 5-6.2 5Z"/><path d="M11 20a7 7 0 0 0 1.2-13.1C6.5 4.9 5 1.5 5 1.5S.22 9.6 5 15c2.5 2.5 6 5 6 5Z"/></svg>
						</div>
					{/snippet}
				</svelte:boundary>
			</div>
			<p class="passage-label text-white/90 text-base font-sans font-medium tracking-wide">
				{#if name}
					Wandering to {name}&rsquo;s garden&hellip;
				{:else}
					Following the path&hellip;
				{/if}
			</p>
		</div>

		<!-- Floating light motes — like fireflies guiding through the forest -->
		<div class="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
			{#each motes as mote, i (i)}
				<div
					class="passage-mote"
					style="
						--mote-delay: {mote.delay};
						--mote-x: {mote.x};
						--mote-drift: {mote.drift};
						--mote-size: {mote.size};
						--mote-duration: {mote.duration};
					"
				/>
			{/each}
		</div>
	</div>
{/if}

<style>
	/* Backdrop — warm bark tones with blur */
	.passage-backdrop {
		background: rgba(59, 36, 20, 0.78);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		animation: passage-backdrop-in 300ms ease-out forwards;
	}

	:global(.dark) .passage-backdrop {
		background: rgba(10, 10, 10, 0.85);
	}

	@keyframes passage-backdrop-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* Logo breathing — gentle scale pulse */
	.passage-breathe {
		animation: passage-breathe 2s ease-in-out infinite;
		animation-delay: 200ms;
	}

	@keyframes passage-breathe {
		0%,
		100% {
			transform: scale(1);
			opacity: 0.85;
		}
		50% {
			transform: scale(1.08);
			opacity: 1;
		}
	}

	/* Text label — fades up after backdrop settles */
	.passage-label {
		animation: passage-label-in 400ms ease-out 200ms both;
	}

	@keyframes passage-label-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Floating motes — tiny light particles drifting upward */
	.passage-mote {
		position: absolute;
		bottom: 35%;
		left: var(--mote-x);
		width: var(--mote-size);
		height: var(--mote-size);
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.5);
		box-shadow: 0 0 4px rgba(255, 255, 255, 0.3);
		animation: passage-float var(--mote-duration) ease-in-out var(--mote-delay) infinite;
	}

	@keyframes passage-float {
		0% {
			transform: translateY(0) translateX(0);
			opacity: 0;
		}
		15% {
			opacity: 0.7;
		}
		80% {
			opacity: 0.35;
		}
		100% {
			transform: translateY(-130px) translateX(var(--mote-drift));
			opacity: 0;
		}
	}

	/* Reduced motion — respect user preferences */
	@media (prefers-reduced-motion: reduce) {
		.passage-breathe {
			animation: none;
			opacity: 1;
		}

		.passage-mote {
			animation: none;
			display: none;
		}

		.passage-backdrop {
			animation: none;
			opacity: 1;
		}

		.passage-label {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
