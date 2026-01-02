<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import EmailSignup from '$lib/components/EmailSignup.svelte';

	// Nature components for the midnight scene
	import {
		Moon,
		StarCluster,
		Lantern,
		Firefly
	} from '@autumnsgrove/groveengine/ui/nature';
</script>

<SEO
	title="Manifesto — Grove"
	description="What we believe. A declaration of values for the quiet corners of the internet."
	url="/manifesto"
/>

<main class="min-h-screen flex flex-col">
	<Header />

	<!-- The Manifesto -->
	<article
		class="flex-1 relative overflow-hidden bg-gradient-to-b from-purple-950 via-slate-950 to-black"
		aria-label="Grove Manifesto: A declaration of our beliefs, written under the stars"
	>
		<!-- Stars scattered throughout -->
		<div class="absolute inset-0 pointer-events-none" aria-hidden="true">
			<div class="absolute top-16 left-[8%]">
				<StarCluster class="w-20 h-20 opacity-50" />
			</div>
			<div class="absolute top-24 right-[12%]">
				<StarCluster class="w-14 h-14 opacity-40" />
			</div>
			<div class="absolute top-48 left-[25%]">
				<StarCluster class="w-10 h-10 opacity-35" />
			</div>
			<div class="absolute top-32 right-[35%]">
				<StarCluster class="w-8 h-8 opacity-30" />
			</div>
			<div class="absolute top-[20%] left-[45%]">
				<StarCluster class="w-6 h-6 opacity-25" />
			</div>
			<div class="absolute top-[35%] right-[8%]">
				<StarCluster class="w-12 h-12 opacity-35" />
			</div>
			<div class="absolute top-[50%] left-[5%]">
				<StarCluster class="w-10 h-10 opacity-30" />
			</div>
			<div class="absolute top-[65%] right-[20%]">
				<StarCluster class="w-8 h-8 opacity-25" />
			</div>
			<div class="absolute top-[80%] left-[15%]">
				<StarCluster class="w-6 h-6 opacity-20" />
			</div>
		</div>

		<!-- Moon -->
		<div class="absolute top-20 right-[15%] opacity-60 pointer-events-none" aria-hidden="true">
			<Moon class="w-20 h-20" phase="waning-crescent" />
		</div>

		<!-- Fireflies - sparse, magical -->
		<div class="absolute top-[30%] left-[20%] opacity-70 pointer-events-none" aria-hidden="true">
			<Firefly class="w-3 h-3" />
		</div>
		<div class="absolute top-[45%] right-[25%] opacity-50 pointer-events-none" aria-hidden="true">
			<Firefly class="w-2 h-2" />
		</div>
		<div class="absolute top-[60%] left-[30%] opacity-60 pointer-events-none" aria-hidden="true">
			<Firefly class="w-2 h-2" />
		</div>

		<!-- Content -->
		<div class="relative z-10 px-6 py-20 md:py-28">
			<div class="max-w-2xl mx-auto">
				<!-- Title -->
				<header class="text-center mb-16 md:mb-24">
					<p class="text-purple-400/80 text-sm uppercase tracking-widest mb-4">A Declaration</p>
					<h1 class="text-4xl md:text-5xl lg:text-6xl font-serif text-white mb-6">
						What We Believe
					</h1>
					<div class="flex items-center justify-center gap-4">
						<div class="w-16 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
						<div class="w-2 h-2 rounded-full bg-amber-400/60"></div>
						<div class="w-16 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
					</div>
				</header>

				<!-- The Declarations -->
				<div class="space-y-16 md:space-y-24 text-center">

					<!-- Opening -->
					<section class="space-y-4">
						<p class="text-xl md:text-2xl text-purple-100 font-serif leading-relaxed">
							We believe the internet was a garden once.
						</p>
						<p class="text-xl md:text-2xl text-purple-100 font-serif leading-relaxed">
							We believe it can be again.
						</p>
					</section>

					<!-- Divider -->
					<div class="flex justify-center">
						<div class="w-24 h-px bg-gradient-to-r from-transparent via-purple-700/50 to-transparent"></div>
					</div>

					<!-- Ownership - Glass Callout -->
					<section class="relative">
						<div class="bg-purple-900/30 backdrop-blur-md rounded-2xl p-8 md:p-10 border border-purple-700/30 shadow-xl">
							<p class="text-lg md:text-xl text-purple-100 font-serif leading-relaxed mb-6">
								We believe your words belong to you—not to platforms that lock them in,
								not to algorithms that decide who sees them,
								not to AI companies that harvest them for machine learning.
							</p>
							<p class="text-xl md:text-2xl font-serif leading-relaxed">
								<span class="text-amber-300">Your voice remains yours.</span>
								<span class="text-purple-200"> Not a dataset. Not a statistic. </span>
								<span class="text-amber-300">Yours.</span>
							</p>
						</div>
					</section>

					<!-- Divider -->
					<div class="flex justify-center">
						<div class="w-24 h-px bg-gradient-to-r from-transparent via-purple-700/50 to-transparent"></div>
					</div>

					<!-- Privacy & Portability -->
					<section class="space-y-6">
						<p class="text-lg md:text-xl text-purple-200 font-serif leading-relaxed">
							We believe privacy isn't a premium feature.
						</p>
						<p class="text-lg md:text-xl text-purple-200 font-serif leading-relaxed">
							We believe <span class="text-amber-300/90">"free"</span> doesn't mean <span class="text-amber-300/90">"you're the product."</span>
						</p>
						<p class="text-lg md:text-xl text-purple-200 font-serif leading-relaxed">
							We believe you should be able to leave and take your roots with you.
						</p>
					</section>

					<!-- Divider -->
					<div class="flex justify-center">
						<div class="w-24 h-px bg-gradient-to-r from-transparent via-purple-700/50 to-transparent"></div>
					</div>

					<!-- Community - Glass Callout -->
					<section class="relative">
						<div class="bg-purple-900/20 backdrop-blur-sm rounded-xl p-8 border border-purple-800/20">
							<p class="text-lg md:text-xl text-purple-100 font-serif leading-relaxed mb-4">
								We believe in community without competition.
							</p>
							<p class="text-lg md:text-xl text-purple-200 font-serif leading-relaxed mb-4">
								In feeds without algorithms.
								<br />
								In encouragement without performance.
							</p>
							<p class="text-base md:text-lg text-purple-200/90 font-serif leading-relaxed mt-6">
								No metrics breeding outrage.
								<br />
								No viral mechanics rewarding the loudest voice.
								<br />
								Just people, sharing what matters to them.
							</p>
						</div>
					</section>

					<!-- Divider -->
					<div class="flex justify-center">
						<div class="w-24 h-px bg-gradient-to-r from-transparent via-purple-700/50 to-transparent"></div>
					</div>

					<!-- Queer-Friendly -->
					<section class="space-y-4">
						<p class="text-lg md:text-xl text-purple-100 font-serif leading-relaxed">
							We believe in <span class="text-amber-300">queer-friendly infrastructure.</span>
						</p>
						<p class="text-lg md:text-xl text-purple-200 font-serif leading-relaxed">
							In safe digital spaces, especially when physical ones feel hostile.
						</p>
						<p class="text-lg md:text-xl text-purple-200 font-serif leading-relaxed">
							In building something intentionally welcoming.
						</p>
					</section>

					<!-- Divider -->
					<div class="flex justify-center">
						<div class="w-24 h-px bg-gradient-to-r from-transparent via-purple-700/50 to-transparent"></div>
					</div>

					<!-- Simplicity -->
					<section class="space-y-4">
						<p class="text-lg md:text-xl text-purple-200 font-serif leading-relaxed">
							We believe the technology should disappear.
						</p>
						<p class="text-lg md:text-xl text-purple-200 font-serif leading-relaxed">
							That you shouldn't need to fight your tools to create.
						</p>
						<p class="text-lg md:text-xl text-purple-200 font-serif leading-relaxed">
							That simplicity is not the same as simplistic.
						</p>
					</section>

					<!-- Divider -->
					<div class="flex justify-center">
						<div class="w-24 h-px bg-gradient-to-r from-transparent via-purple-700/50 to-transparent"></div>
					</div>

					<!-- Open Web -->
					<section class="space-y-4">
						<p class="text-lg md:text-xl text-purple-100 font-serif leading-relaxed">
							We believe in the <span class="text-amber-300">open web.</span>
						</p>
						<p class="text-base md:text-lg text-purple-200/90 font-serif leading-relaxed">
							In RSS feeds.
							<br />
							In markdown files you can take anywhere.
							<br />
							In standards that outlast any single platform.
						</p>
					</section>

					<!-- Divider -->
					<div class="flex justify-center">
						<div class="w-24 h-px bg-gradient-to-r from-transparent via-purple-700/50 to-transparent"></div>
					</div>

					<!-- Building Slowly - Glass Callout -->
					<section class="relative">
						<div class="bg-slate-900/40 backdrop-blur-sm rounded-xl p-8 border border-slate-700/30">
							<p class="text-lg md:text-xl text-purple-100 font-serif leading-relaxed mb-4">
								We are building slowly, with care, without venture capital pressure to enshittify.
							</p>
							<p class="text-lg md:text-xl text-purple-200 font-serif leading-relaxed">
								We are a forest, not a factory.
								<br />
								<span class="text-amber-300/80">We grow at the pace of roots.</span>
							</p>
						</div>
					</section>

					<!-- Divider -->
					<div class="flex justify-center">
						<div class="w-24 h-px bg-gradient-to-r from-transparent via-purple-700/50 to-transparent"></div>
					</div>

					<!-- The Heart -->
					<section class="space-y-6 py-8">
						<p class="text-lg md:text-xl text-purple-200 font-serif leading-relaxed">
							Grove is not trying to be everything.
						</p>
						<p class="text-xl md:text-2xl text-purple-100 font-serif leading-relaxed">
							It's trying to be <span class="text-amber-300">somewhere.</span>
						</p>
						<div class="pt-4 space-y-2">
							<p class="text-lg md:text-xl text-purple-200/80 font-serif italic">
								A quiet corner.
							</p>
							<p class="text-lg md:text-xl text-purple-200/80 font-serif italic">
								A place to be.
							</p>
						</div>
					</section>

					<!-- The Lantern -->
					<div class="flex justify-center py-8" aria-hidden="true">
						<Lantern class="w-12 h-20" variant="hanging" lit animate />
					</div>

					<!-- Closing - Major Glass Callout -->
					<section class="relative">
						<div class="bg-gradient-to-b from-purple-900/40 to-slate-900/40 backdrop-blur-md rounded-2xl p-10 md:p-12 border border-purple-600/30 shadow-2xl">
							<p class="text-base md:text-lg text-purple-200/90 font-serif leading-relaxed mb-6">
								This is our manifesto.
								<br />
								Not a pitch. Not a promise of features.
								<br />
								A statement of what we believe.
							</p>
							<p class="text-xl md:text-2xl text-white font-serif leading-relaxed">
								If this sounds like home,
								<br />
								<span class="text-amber-300">welcome to the Grove.</span>
							</p>
						</div>
					</section>

					<!-- CTA -->
					<section class="pt-8 pb-4">
						<p class="text-purple-400 mb-6 font-sans text-sm">
							We're growing. Join us.
						</p>
						<div class="flex justify-center">
							<EmailSignup variant="dark" />
						</div>
					</section>

				</div>
			</div>
		</div>

		<!-- Bottom gradient fade -->
		<div class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
	</article>

	<Footer />
</main>

<style>
	/*
	 * Ambient glow effect for amber-highlighted text
	 *
	 * Uses :global() because text-amber-300 is a Tailwind utility class
	 * applied inline. The subtle glow (15% opacity, 20px blur) creates
	 * a lantern-like warmth on key phrases without overpowering the text.
	 *
	 * Matches the midnight bloom aesthetic: warm amber accents against
	 * deep purple/black backgrounds.
	 */
	:global(.text-amber-300) {
		text-shadow: 0 0 20px rgba(252, 211, 77, 0.15);
	}
</style>
