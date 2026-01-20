<script lang="ts">
	/**
	 * Pricing Page
	 *
	 * Uses the PricingGraft from the engine for a consistent,
	 * reusable pricing experience across Grove properties.
	 */

	import { Header, Footer } from "@autumnsgrove/groveengine/ui/chrome";
	import { PricingGraft } from "@autumnsgrove/groveengine/grafts/pricing";
	import SEO from "$lib/components/SEO.svelte";

	let { data } = $props();
</script>

<SEO
	title="Pricing — Grove"
	description="Simple, accessible pricing for writers at every level. From curious newcomers to professionals who need a polished presence."
	url="/pricing"
/>

<main class="min-h-screen flex flex-col">
	<Header maxWidth="wide" />

	<article class="flex-1 px-6 py-12">
		<div class="max-w-5xl mx-auto">
			<PricingGraft
				productId="grove"
				tiers={data.tiers}
				showComparison={true}
				showFineprint={true}
				showToggle={false}
			>
				{#snippet header()}
					<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">
						Pricing
					</h1>
					<p class="text-lg text-foreground-subtle font-sans">
						A home for writers at every level.
					</p>
					<div class="flex items-center justify-center gap-4 mt-6">
						<div class="w-12 h-px bg-divider"></div>
						<svg
							class="w-4 h-4 text-accent-subtle"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<circle cx="10" cy="10" r="4" />
						</svg>
						<div class="w-12 h-px bg-divider"></div>
					</div>
				{/snippet}

				{#snippet footer()}
					<div class="text-center">
						<p class="text-foreground-subtle font-sans text-sm mb-2">
							Need something beyond Evergreen? Multiple domains, team
							collaboration, white-label options?
						</p>
						<p class="font-sans">
							<a
								href="mailto:hello@grove.place"
								class="text-accent-muted hover:text-primary underline"
							>
								Let's talk.
							</a>
						</p>
					</div>
				{/snippet}
			</PricingGraft>
		</div>
	</article>

	<Footer maxWidth="wide" />
</main>

<style>
	.bg-divider {
		background-color: var(--color-divider);
	}
</style>
