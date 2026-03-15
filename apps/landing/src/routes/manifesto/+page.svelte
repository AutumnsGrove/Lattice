<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import EmailSignup from '$lib/components/EmailSignup.svelte';

	let { data } = $props();

	// Nature components for the midnight scene
	import {
		Moon,
		StarCluster,
		Lantern,
		Firefly,
		Bridge,
		Acorn,
		Leaf,
		TreePine
	} from '@autumnsgrove/lattice/ui/nature';

	// Icon for solarpunk link
	import { chromeIcons } from '@autumnsgrove/prism/icons';
	const SolarPanel = chromeIcons.solarPanel;
</script>

<SEO
	title="Manifesto — Grove"
	description="What I believe. A personal declaration of values for the quiet corners of the internet."
	url="/manifesto"
/>

<main class="min-h-screen flex flex-col">
	<Header user={data.user} />

	<!-- The Manifesto -->
	<article
		class="flex-1 relative overflow-hidden bg-gradient-to-b from-accent-subtle via-surface to-surface"
		aria-label="Grove Manifesto: A declaration of my beliefs, written under the stars"
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
			<Moon class="w-20 h-20" phase="waning" />
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
		<div class="absolute top-[75%] right-[15%] opacity-40 pointer-events-none" aria-hidden="true">
			<Firefly class="w-2 h-2" />
		</div>

		<!-- Content -->
		<div class="relative z-10 px-6 py-20 md:py-28">
			<div class="max-w-2xl mx-auto">
				<!-- Title -->
				<header class="text-center mb-16 md:mb-24">
					<p class="text-accent/80 text-sm uppercase tracking-widest mb-4">A Declaration</p>
					<h1 class="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground mb-6">
						What I Believe
					</h1>
					<div class="flex items-center justify-center gap-4">
						<div class="w-16 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"></div>
						<div class="w-2 h-2 rounded-full bg-warning/60"></div>
						<div class="w-16 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"></div>
					</div>
				</header>

				<!-- The Declarations -->
				<div class="space-y-16 md:space-y-20 text-center">

					<!-- ═══════════════════════════════════════════════════════════════ -->
					<!-- THE GARDEN THAT WAS -->
					<!-- ═══════════════════════════════════════════════════════════════ -->

					<section class="space-y-6">
						<div class="flex items-center justify-center gap-3 text-accent/60 mb-4">
							<Acorn class="w-4 h-4" />
							<span class="text-xs uppercase tracking-widest">The Garden That Was</span>
						</div>
						<p class="text-xl md:text-2xl text-accent-foreground font-serif leading-relaxed">
							The internet used to be a garden.
						</p>
						<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed">
							Not a manicured one—a wild one. Full of weird little corners and handmade pages.
							You could stumble onto someone's space and feel like you'd discovered something.
							A stranger's thoughts, laid out with care, just for you to find.
						</p>
						<p class="text-lg md:text-xl text-foreground-subtle font-serif leading-relaxed">
							I remember that feeling. Finding someone's cozy corner and thinking:
							<span class="text-warning/90 italic">I want something like this.</span>
						</p>
					</section>

					<!-- Divider -->
					<div class="flex justify-center">
						<div class="w-24 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"></div>
					</div>

					<!-- ═══════════════════════════════════════════════════════════════ -->
					<!-- THE WALLS -->
					<!-- ═══════════════════════════════════════════════════════════════ -->

					<section class="space-y-6">
						<div class="flex items-center justify-center gap-3 text-accent/60 mb-4">
							<span class="text-xs uppercase tracking-widest">The Walls</span>
						</div>
						<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed">
							Then the walls went up.
						</p>
						<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed">
							Garden walls, at first. Then higher. Then so high you couldn't see
							another garden on the horizon. The gardens disappeared into isolated biospheres—
							entirely self-consuming voids where the only way out was through a gate
							someone else controlled.
						</p>
					</section>

					<!-- Glass Callout - The Loss -->
					<section class="relative">
						<div class="bg-accent-subtle backdrop-blur-md rounded-2xl p-8 md:p-10 border border-border shadow-xl">
							<p class="text-lg md:text-xl text-accent-foreground font-serif leading-relaxed mb-6">
								Friends scattered to different platforms and became unreachable
								unless you followed them there. Some I can only talk to on one app—
								that's the only place they'll respond. Others I've lost entirely.
								People I met in games, in communities, in spaces that don't exist anymore.
							</p>
							<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed mb-6">
								I had music saved from artists I loved. One song I can still hum
								but will never hear again—the artist deleted it, lost the file themselves.
								<span class="text-warning/80">Gone.</span> Screenshots from games I played as a kid.
								Blog posts I'd bookmarked. Proof I existed somewhere, vanished.
							</p>
							<p class="text-base md:text-lg text-foreground-subtle font-serif leading-relaxed italic">
								That's what the walls took. Not just content. Connection. Memory. Proof.
							</p>
						</div>
					</section>

					<!-- Divider -->
					<div class="flex justify-center">
						<div class="w-24 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"></div>
					</div>

					<!-- ═══════════════════════════════════════════════════════════════ -->
					<!-- THE MACHINES -->
					<!-- ═══════════════════════════════════════════════════════════════ -->

					<section class="space-y-6">
						<div class="flex items-center justify-center gap-3 text-accent/60 mb-4">
							<span class="text-xs uppercase tracking-widest">The Machines</span>
						</div>
						<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed">
							I'm tired of watching my friends get trapped in dopamine slot machines
							designed to exploit how our minds work.
						</p>
						<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed">
							I signed up for a platform to see my friends. Instead I got 40,000 strangers
							the algorithm decided I should see instead. Reels, shorts, infinite scroll—
							engineered to hijack attention, especially neurodivergent attention.
						</p>
						<p class="text-lg md:text-xl text-foreground-subtle font-serif leading-relaxed">
							Platforms that built their empires on our words, then loosened protections
							for people like us the moment it became profitable.
						</p>
						<p class="text-xl md:text-2xl font-serif leading-relaxed mt-8">
							<span class="text-foreground-muted">I think that's </span>
							<span class="text-warning">disgusting.</span>
						</p>
					</section>

					<!-- Divider -->
					<div class="flex justify-center">
						<div class="w-24 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"></div>
					</div>

					<!-- ═══════════════════════════════════════════════════════════════ -->
					<!-- THE BRIDGE -->
					<!-- ═══════════════════════════════════════════════════════════════ -->

					<section class="space-y-6">
						<div class="flex items-center justify-center gap-3 text-accent/60 mb-4">
							<Bridge class="w-5 h-4" />
							<span class="text-xs uppercase tracking-widest">The Bridge</span>
						</div>
						<p class="text-lg md:text-xl text-accent-foreground font-serif leading-relaxed">
							Grove is everything that isn't.
						</p>
						<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed">
							I want to build a bridge—between people and other people,
							between you and your own data. I want you and your words to hold hands,
							not be separated by a company's database.
						</p>
					</section>

					<!-- Glass Callout - What Grove Is -->
					<section class="relative">
						<div class="bg-accent-subtle backdrop-blur-sm rounded-xl p-8 border border-border">
							<p class="text-lg md:text-xl text-accent-foreground font-serif leading-relaxed mb-4">
								There's a search engine called Kagi. You pay for it. It doesn't show you ads.
								It doesn't track you. When you search, you just... search.
							</p>
							<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed mb-4">
								That's how Grove works.
							</p>
							<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed">
								You pay for a place to write. I don't sell your attention to anyone.
								Your words are just words. There's the membership, and that's it.
							</p>
						</div>
					</section>

					<!-- Divider -->
					<div class="flex justify-center">
						<div class="w-24 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"></div>
					</div>

					<!-- ═══════════════════════════════════════════════════════════════ -->
					<!-- THE CHOICES -->
					<!-- ═══════════════════════════════════════════════════════════════ -->

					<section class="space-y-6">
						<div class="flex items-center justify-center gap-3 text-accent/60 mb-4">
							<Leaf class="w-4 h-4" />
							<span class="text-xs uppercase tracking-widest">The Choices</span>
						</div>
						<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed">
							Grove is text and photos only. That's not a limitation—it's a choice.
						</p>
						<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed">
							I want people to be intentional about what they post. Short-form video
							is ruining our attention spans—mine included. So I'm not building another
							place for content to disappear into an infinite scroll.
						</p>
						<p class="text-lg md:text-xl text-foreground-subtle font-serif leading-relaxed">
							No algorithms deciding who sees your words. No engagement metrics
							breeding outrage. No viral mechanics rewarding the loudest voice.
						</p>
						<p class="text-xl md:text-2xl text-accent-foreground font-serif leading-relaxed mt-6">
							Just people, sharing what matters to them.
						</p>
					</section>

					<!-- Divider -->
					<div class="flex justify-center">
						<div class="w-24 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"></div>
					</div>

					<!-- ═══════════════════════════════════════════════════════════════ -->
					<!-- QUEER-FRIENDLY -->
					<!-- ═══════════════════════════════════════════════════════════════ -->

					<section class="space-y-4">
						<p class="text-lg md:text-xl text-accent-foreground font-serif leading-relaxed">
							I believe in <span class="text-warning">queer-friendly infrastructure.</span>
						</p>
						<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed">
							In safe digital spaces, especially when physical ones feel hostile.
						</p>
						<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed">
							I'm building this because I want somewhere that's intentionally welcoming.
							Somewhere that won't suddenly decide we're not worth protecting.
						</p>
					</section>

					<!-- Divider -->
					<div class="flex justify-center">
						<div class="w-24 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"></div>
					</div>

					<!-- ═══════════════════════════════════════════════════════════════ -->
					<!-- OWNERSHIP -->
					<!-- ═══════════════════════════════════════════════════════════════ -->

					<section class="relative">
						<div class="bg-accent-subtle backdrop-blur-md rounded-2xl p-8 md:p-10 border border-border shadow-xl">
							<p class="text-lg md:text-xl text-accent-foreground font-serif leading-relaxed mb-6">
								Your words belong to you—not to platforms that lock them in,
								not to algorithms that decide who sees them,
								not to AI companies that harvest them without asking.
							</p>
							<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed mb-6">
								At any point, you can download everything. Not just when you leave—
								<span class="text-warning/90">always.</span> Your content lives in standard formats
								that work anywhere. Markdown files you can take to any platform.
							</p>
							<p class="text-xl md:text-2xl font-serif leading-relaxed">
								<span class="text-warning">Your voice remains yours.</span>
								<span class="text-foreground-muted"> Not a dataset. Not a statistic. </span>
								<span class="text-warning">Yours.</span>
							</p>
						</div>
					</section>

					<!-- Divider -->
					<div class="flex justify-center">
						<div class="w-24 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"></div>
					</div>

					<!-- ═══════════════════════════════════════════════════════════════ -->
					<!-- THE CENTURY -->
					<!-- ═══════════════════════════════════════════════════════════════ -->

					<section class="space-y-6">
						<div class="flex items-center justify-center gap-3 text-accent/60 mb-4">
							<TreePine class="w-4 h-5" />
							<span class="text-xs uppercase tracking-widest">The Century</span>
						</div>
						<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed">
							Your words could outlive you.
						</p>
						<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed">
							On most platforms, they'd vanish the moment you stopped paying—or the moment
							the company decided to pivot, or shut down, or get acquired.
						</p>
						<p class="text-lg md:text-xl text-accent-foreground font-serif leading-relaxed">
							Here, if you grow with Grove long enough, your grove earns
							<span class="text-warning/90">Centennial status</span>—your site stays online
							for a hundred years. Even after you're gone, if you want it to.
						</p>
						<p class="text-base md:text-lg text-foreground-subtle font-serif leading-relaxed italic mt-4">
							A hundred years is roughly how long an oak tree lives.
						</p>
					</section>

					<!-- Divider -->
					<div class="flex justify-center">
						<div class="w-24 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"></div>
					</div>

					<!-- ═══════════════════════════════════════════════════════════════ -->
					<!-- BUILDING SLOWLY -->
					<!-- ═══════════════════════════════════════════════════════════════ -->

					<section class="relative">
						<div class="bg-surface backdrop-blur-sm rounded-xl p-8 border border-border">
							<p class="text-lg md:text-xl text-accent-foreground font-serif leading-relaxed mb-4">
								I'm building this slowly, with care, without venture capital pressure to enshittify.
							</p>
							<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed">
								Grove is a forest, not a factory.
								<br />
								<span class="text-warning/80">I grow at the pace of roots.</span>
							</p>
						</div>
					</section>

					<!-- Solarpunk Link -->
					<section class="pt-4">
						<a
							href="/knowledge/help/what-is-solarpunk"
							class="group inline-flex items-center justify-center gap-3 px-6 py-3 bg-warning-bg hover:bg-warning-bg border border-border rounded-lg text-warning-foreground hover:text-warning-foreground transition-all text-sm"
						>
							<SolarPanel class="w-4 h-4 text-warning" />
							<span>This is <strong>solarpunk</strong> thinking</span>
							<span class="text-warning/60 group-hover:text-warning/80 group-hover:translate-x-0.5 transition-all">→</span>
						</a>
					</section>

					<!-- Divider -->
					<div class="flex justify-center">
						<div class="w-24 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent"></div>
					</div>

					<!-- ═══════════════════════════════════════════════════════════════ -->
					<!-- THE FEELING -->
					<!-- ═══════════════════════════════════════════════════════════════ -->

					<section class="space-y-6 py-4">
						<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed">
							When someone signs up for Grove, I want them to feel
							<span class="text-warning/90">empowered.</span>
						</p>
						<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed">
							Like they've found a launching point for something good.
							Like they're planting something that could grow for years.
							Like their words are safe here.
						</p>
						<p class="text-xl md:text-2xl text-accent-foreground font-serif leading-relaxed mt-6">
							Grove is not trying to be everything.
						</p>
						<p class="text-xl md:text-2xl text-accent-foreground font-serif leading-relaxed">
							It's trying to be <span class="text-warning">somewhere.</span>
						</p>
						<div class="pt-4 space-y-2">
							<p class="text-lg md:text-xl text-foreground-subtle font-serif italic">
								A quiet corner.
							</p>
							<p class="text-lg md:text-xl text-foreground-subtle font-serif italic">
								A place to be.
							</p>
						</div>
					</section>

					<!-- The Lantern -->
					<div class="flex justify-center py-8" aria-hidden="true">
						<Lantern class="w-12 h-20" variant="hanging" lit animate />
					</div>

					<!-- ═══════════════════════════════════════════════════════════════ -->
					<!-- CLOSING -->
					<!-- ═══════════════════════════════════════════════════════════════ -->

					<section class="relative">
						<div class="bg-gradient-to-b from-accent-subtle to-surface backdrop-blur-md rounded-2xl p-10 md:p-12 border border-border shadow-2xl">
							<p class="text-base md:text-lg text-foreground-muted font-serif leading-relaxed mb-6">
								This is my manifesto.
								<br />
								Not a pitch. Not a promise of features.
								<br />
								A statement of what I believe.
							</p>
							<p class="text-lg md:text-xl text-foreground-muted font-serif leading-relaxed mb-6">
								And if you believe it too—
							</p>
							<p class="text-xl md:text-2xl text-foreground font-serif leading-relaxed">
								<span class="text-warning">welcome to the Grove.</span>
							</p>
						</div>
					</section>

					<!-- Bridge to Vision -->
					<section class="pt-8">
						<a
							href="/vision"
							class="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-accent-subtle hover:bg-accent-subtle border border-border rounded-xl text-accent-foreground hover:text-foreground transition-all font-serif text-xl shadow-lg hover:shadow-accent/30"
						>
							<span class="italic">But loss isn't the whole story</span>
							<span class="group-hover:translate-x-1 transition-transform">→</span>
						</a>
					</section>

					<!-- CTA -->
					<section class="pt-12 pb-4">
						<p class="text-accent mb-6 font-sans text-sm">
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
		<div class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface to-transparent pointer-events-none"></div>
	</article>

	<Footer />
</main>

<style>
	/*
	 * Ambient glow effect for warning-highlighted text
	 *
	 * Uses :global() because text-warning is a Tailwind utility class
	 * applied inline. The subtle glow (15% opacity, 20px blur) creates
	 * a lantern-like warmth on key phrases without overpowering the text.
	 *
	 * Matches the midnight bloom aesthetic: warm amber accents against
	 * deep accent/surface backgrounds.
	 */
	:global(.text-warning) {
		text-shadow: 0 0 20px hsl(var(--warning) / 0.15);
	}
</style>
