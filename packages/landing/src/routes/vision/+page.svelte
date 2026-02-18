<script lang="ts">
	import EmailSignup from '$lib/components/EmailSignup.svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { GlassCard, GroveSwap } from '@autumnsgrove/groveengine/ui';
	import { MobileTOC } from '@autumnsgrove/groveengine';
	import SEO from '$lib/components/SEO.svelte';

	let { data } = $props();

	// Centralized icon registry
	import { navIcons, contentIcons, actionIcons, toolIcons } from '$lib/utils/icons';

	// Destructured icons for Svelte 5 direct component rendering
	const VisionIcon = navIcons.vision;
	const TreesIcon = contentIcons.trees;
	const SolarpunkIcon = toolIcons.solarpanel;

	// Core Values icons
	const AccessibilityIcon = toolIcons.helpcircle;
	const OwnershipIcon = actionIcons.download;
	const SimplicityIcon = contentIcons.leaf;
	const CommunityIcon = contentIcons.heart;
	const AiSanctuaryIcon = toolIcons.brickwallshield;

	// "What Makes This Different" icons
	const NoMetricsIcon = actionIcons.trenddown;
	const NoAlgorithmIcon = contentIcons.clock;
	const PrivateEncouragementIcon = toolIcons.messagessquare;
	const FullControlIcon = actionIcons.settings;
	const OpenStandardsIcon = toolIcons.signpost;

	// TOC headers with icons (using engine TOC format)
	const tocHeaders = [
		{ id: 'the-vision', text: 'The Vision', level: 2, icon: VisionIcon },
		{ id: 'core-values', text: 'Core Values', level: 2, icon: CommunityIcon },
		{ id: 'on-community-meadow', text: 'On Community — Meadow', level: 2, icon: TreesIcon },
		{ id: 'where-this-comes-from', text: 'Where This Comes From', level: 2, icon: contentIcons.heart }
	];
</script>

<SEO
	title="Vision — Grove"
	description="A return to something simpler. A place where people can plant their thoughts and watch them grow."
	url="/vision"
/>

<main class="min-h-screen flex flex-col">
	<Header user={data.user} />

	<!-- Content -->
	<article class="flex-1 px-6 py-12">
		<div class="max-w-3xl mx-auto">
			<!-- Vision Header -->
			<header class="mb-12 text-center">
				<p class="text-foreground-faint font-sans text-sm uppercase tracking-wide mb-3">A Vision Document</p>
				<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-6">Why This Exists</h1>
				<div class="flex items-center justify-center gap-4">
					<div class="w-12 h-px bg-divider"></div>
					<svg class="w-4 h-4 text-accent-subtle" viewBox="0 0 20 20" fill="currentColor">
						<circle cx="10" cy="10" r="4" />
					</svg>
					<div class="w-12 h-px bg-divider"></div>
				</div>
			</header>

			<!-- Intro -->
			<div class="prose prose-bark max-w-none">
				<p class="text-lg text-foreground-muted font-sans leading-relaxed mb-8">
					The internet used to be a place of personal expression. Geocities. Angelfire. Blogs with personality.
					Somewhere along the way, we traded that for algorithms, engagement metrics, and platforms that own our words.
				</p>

				<p class="text-lg text-foreground-muted font-sans leading-relaxed mb-12">
					<strong class="text-accent-muted">Grove.place is a return to something simpler.</strong> A place where people can plant their thoughts and watch them grow.
					No ads. No tracking. No algorithmic feeds deciding who sees what. Just writers and readers, meeting in a digital grove.
				</p>

				<!-- The Vision -->
				<section id="the-vision" class="mb-12 scroll-mt-28">
					<h2 class="text-2xl font-serif text-foreground mb-4 flex items-center gap-2">
						<VisionIcon class="w-6 h-6 text-accent-subtle" />
						The Vision
					</h2>
					<p class="text-foreground-muted font-sans leading-relaxed">
						<em>A forest of voices.</em> Every <GroveSwap term="wanderer">Wanderer</GroveSwap> is a tree in the grove. Some are saplings just starting out.
						Some are ancient oaks with deep roots. All are welcome. All have space to grow.
					</p>
					<p class="text-foreground-muted font-sans leading-relaxed mt-4">
						The platform should feel like walking through a peaceful forest at golden hour. Calm. Intentional.
						A refuge from the noise of social media.
					</p>
				</section>

				<!-- Core Values -->
				<section id="core-values" class="mb-12 scroll-mt-28">
					<h2 class="text-2xl font-serif text-foreground mb-6">Core Values</h2>

					<div class="grid gap-6">
						<GlassCard>
							<h3 class="text-lg font-serif text-accent-muted mb-2 flex items-center gap-2">
								<AccessibilityIcon class="w-5 h-5 text-accent-subtle" />
								Accessibility
							</h3>
							<p class="text-foreground-muted font-sans leading-relaxed mb-3">
								Everyone deserves a voice online. Pricing should never be the barrier that stops someone from sharing their story.
								The basic tier exists so that anyone who wants to write can afford to write.
							</p>
							<p class="text-foreground-muted font-sans leading-relaxed">
								<strong class="text-foreground">Reading is always free.</strong> Every Grove blog is publicly accessible — no login, no paywall. You pay to write, not to read.
							</p>
						</GlassCard>

						<GlassCard>
							<h3 class="text-lg font-serif text-accent-muted mb-2 flex items-center gap-2">
								<OwnershipIcon class="w-5 h-5 text-accent-subtle" />
								Ownership
							</h3>
							<p class="text-foreground-muted font-sans leading-relaxed">
								Your words are yours. Your data is yours. You can export everything, anytime.
								If you leave, you take your roots with you.
							</p>
						</GlassCard>

						<GlassCard>
							<h3 class="text-lg font-serif text-accent-muted mb-2 flex items-center gap-2">
								<SimplicityIcon class="w-5 h-5 text-accent-subtle" />
								Simplicity
							</h3>
							<p class="text-foreground-muted font-sans leading-relaxed">
								No feature bloat. No endless settings. Write in Markdown. Upload images. Publish. That's it.
								The technology should disappear into the background.
							</p>
						</GlassCard>

						<GlassCard>
							<h3 class="text-lg font-serif text-accent-muted mb-2 flex items-center gap-2">
								<CommunityIcon class="w-5 h-5 text-accent-subtle" />
								Community With Care
							</h3>
							<p class="text-foreground-muted font-sans leading-relaxed">
								Intentionally queer-friendly. Welcoming to all. No engagement metrics breeding outrage.
								No viral mechanics rewarding the loudest voice. Just people, sharing what matters to them.
							</p>
						</GlassCard>

						<GlassCard>
							<h3 class="text-lg font-serif text-accent-muted mb-2 flex items-center gap-2">
								<AiSanctuaryIcon class="w-5 h-5 text-accent-subtle" />
								AI Sanctuary
							</h3>
							<p class="text-foreground-muted font-sans leading-relaxed">
								Your words are not training data. Grove blocks every AI crawler, every scraper, every "search agent" that wants to harvest content for machine learning.
								<a href="https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/" target="_blank" rel="noopener noreferrer" class="text-accent-muted underline decoration-1 underline-offset-2 hover:text-accent">Cloudflare stands at the gate</a>, and our corner of the web becomes a black hole to external AI. Learn more about <a href="https://grove.place/knowledge/help/how-grove-protects-your-content" target="_blank" rel="noopener noreferrer" class="text-accent-muted underline decoration-1 underline-offset-2 hover:text-accent">how Grove protects your content from AI scraping</a>.
							</p>
							<p class="text-foreground-muted font-sans leading-relaxed mt-3">
								We do use AI internally for content moderation, but intentionally: with <a href="/knowledge/help/what-is-zdr" class="text-accent-muted underline decoration-1 underline-offset-2 hover:text-accent">zero data retention</a>, with privacy-first providers, with no training on your words.
								There's a difference between using a tool carefully and feeding a machine indiscriminately.
							</p>
							<p class="text-foreground-subtle font-sans italic mt-3">
								Your voice remains yours. Not a dataset. Not a statistic. Yours.
							</p>
						</GlassCard>
					</div>

					<!-- Solarpunk Callout -->
					<a
						href="/knowledge/help/what-is-solarpunk"
						class="group flex items-center gap-3 mt-6 px-4 py-3 bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100/90 dark:hover:bg-amber-900/40 rounded-lg border border-amber-200/60 dark:border-amber-800/40 transition-colors no-underline"
					>
						<SolarpunkIcon class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
						<span class="text-sm text-foreground-muted group-hover:text-foreground transition-colors">
							These values reflect <strong class="text-amber-700 dark:text-amber-300">solarpunk</strong> thinking. <span class="text-foreground-subtle group-hover:text-foreground-muted">Learn what that means →</span>
						</span>
					</a>
				</section>

				<!-- Meadow Section -->
				<section id="on-community-meadow" class="mb-12 scroll-mt-28">
					<h2 class="text-2xl font-serif text-foreground mb-4 flex items-center gap-2">
						<TreesIcon class="w-6 h-6 text-accent-subtle" />
						On Community — Meadow
					</h2>

					<div class="bg-accent border border-accent rounded-xl p-6 mb-6">
						<p class="text-foreground-muted font-sans leading-relaxed italic">
							A forest is not a collection of isolated trees.
						</p>
						<p class="text-foreground-muted font-sans leading-relaxed mt-4">
							Beneath the surface, roots intermingle. Trees share nutrients through mycorrhizal networks —
							the "wood wide web" that connects an entire forest into a single living organism.
							The oldest trees nurture the saplings. The seasonal cycles nourish new growth.
						</p>
					</div>

					<p class="text-foreground-muted font-sans leading-relaxed mb-6">
						<strong class="text-accent-muted">Meadow is the roots.</strong> It's optional. Your blog exists independently, complete on its own.
						But if you choose, you can connect — follow friends, see their posts in a simple chronological feed,
						leave reactions that only they can see.
					</p>

					<h3 class="text-lg font-serif text-foreground mb-4">What Makes This Different</h3>
					<ul class="space-y-3 text-foreground-muted font-sans">
						<li class="flex items-start gap-3">
							<NoMetricsIcon class="w-4 h-4 text-accent-subtle mt-1 shrink-0" />
							<span><strong>No public metrics.</strong> Follower counts aren't displayed. Like counts don't create hierarchies. Your worth isn't measured by engagement.</span>
						</li>
						<li class="flex items-start gap-3">
							<NoAlgorithmIcon class="w-4 h-4 text-accent-subtle mt-1 shrink-0" />
							<span><strong>No algorithm.</strong> The feed is chronological. Your friends' posts appear in order. Nothing is hidden or boosted based on "engagement potential."</span>
						</li>
						<li class="flex items-start gap-3">
							<PrivateEncouragementIcon class="w-4 h-4 text-accent-subtle mt-1 shrink-0" />
							<span><strong>Private encouragement.</strong> Reactions and comments are visible to the author only. Feedback becomes encouragement, not performance.</span>
						</li>
						<li class="flex items-start gap-3">
							<FullControlIcon class="w-4 h-4 text-accent-subtle mt-1 shrink-0" />
							<span><strong>Full control.</strong> Want to see friends' posts but disable interactions on yours? Fine. Want to hide from discovery entirely? Fine. Every setting is yours to configure.</span>
						</li>
						<li class="flex items-start gap-3">
							<OpenStandardsIcon class="w-4 h-4 text-accent-subtle mt-1 shrink-0" />
							<span><strong>Built on open standards.</strong> Your blog isn't locked into Grove. The connections between blogs use the same portable technology that powers podcasts and news readers. If you ever leave, your followers can still follow you wherever you go.</span>
						</li>
					</ul>
				</section>

				<!-- Where This Comes From -->
				<section id="where-this-comes-from" class="mb-12 scroll-mt-28">
					<h2 class="text-2xl font-serif text-foreground mb-4">Where This Comes From</h2>
					<p class="text-foreground-muted font-sans leading-relaxed mb-4">
						These aren't abstract principles. They come from somewhere real.
					</p>
					<p class="text-foreground-muted font-sans leading-relaxed mb-4">
						Before Grove existed, I had a backyard with a hammock and a garden. A front porch where I watched sunrises. Birds I knew by song. Friends who came over just to exist together. My days had <em>texture</em>.
					</p>
					<p class="text-foreground-muted font-sans leading-relaxed mb-4">
						Then I lost it all. And in the numbness that followed, I started building a place where people could plant their own little sanctuaries, tend their own corners of the internet, and find some of that texture again.
					</p>
					<GlassCard variant="accent" class="mb-6">
						<p class="text-foreground-muted font-sans leading-relaxed">
							Grove is a refuge because I needed one. <strong class="text-accent-muted">I'm building a grove for people who lost their groves.</strong>
						</p>
					</GlassCard>
					<a
						href="/knowledge/philosophy/why-i-built-the-grove"
						class="inline-flex items-center gap-2 text-accent-muted hover:text-accent-foreground transition-colors font-sans"
					>
						Read the full story →
					</a>
				</section>

				<!-- Closing -->
				<section class="text-center py-8 border-t border-default">
					<p class="text-foreground-subtle font-sans italic mb-2">
						Encouragement without performance. Connection without competition.
					</p>
					<p class="text-accent-muted font-serif text-lg">
						A forest of voices. A place to be.
					</p>
				</section>

				<!-- Call to Action -->
				<section class="text-center py-8">
					<p class="text-foreground-muted font-sans leading-relaxed mb-6">
						We're not open yet, but we're growing.<br />
						Leave your email to join us when Grove blooms.
					</p>
					<div class="flex justify-center">
						<EmailSignup />
					</div>
				</section>
			</div>
		</div>
	</article>

	<!--
		Floating TOC Icon Navigation (desktop)

		This is a specialized "icon-only" TOC pattern with hover tooltips,
		distinct from the standard text-based TableOfContents component.
		Used for pages with few sections where icons provide quick visual navigation.

		Z-INDEX: z-grove-fab (40) - sits above page content but below:
		- Mobile menu overlay (9990)
		- Mobile menu (9999)
		- Modals (50+)
		See tailwind.preset.js for the full z-index scale.
	-->
	<nav class="fixed top-1/2 right-6 -translate-y-1/2 z-grove-fab hidden lg:flex flex-col gap-2" aria-label="Section navigation">
		{#each tocHeaders as header}
			{@const SectionIcon = header.icon}
			<div class="relative group">
				<a
					href="#{header.id}"
					class="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-cream-100 shadow-md border border-accent/30 dark:border-accent/20 hover:bg-accent/10 dark:hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 transition-all duration-200"
					aria-label="Jump to {header.text}"
					title={header.text}
				>
					{#if SectionIcon}
						<SectionIcon class="w-5 h-5 text-accent dark:text-accent-muted group-hover:scale-110 transition-transform" />
					{/if}
				</a>

				<!-- Section name tooltip on hover -->
				<div class="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
					<div class="px-3 py-1.5 rounded-lg bg-white dark:bg-cream-100 shadow-md border border-accent/20 dark:border-accent/10 text-sm font-medium text-foreground whitespace-nowrap">
						{header.text}
					</div>
				</div>
			</div>
		{/each}
	</nav>

	<!-- Mobile TOC (using engine component with icons) -->
	<MobileTOC headers={tocHeaders} title="On this page" />

	<Footer />
</main>

<style>
	.bg-divider { background-color: var(--color-divider); }
</style>
