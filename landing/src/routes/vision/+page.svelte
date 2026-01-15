<script lang="ts">
	import EmailSignup from '$lib/components/EmailSignup.svelte';
	import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
	import SEO from '$lib/components/SEO.svelte';

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
</script>

<SEO
	title="Vision — Grove"
	description="A return to something simpler. A place where people can plant their thoughts and watch them grow."
	url="/vision"
/>

<main class="min-h-screen flex flex-col">
	<Header />

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
				<section class="mb-12">
					<h2 class="text-2xl font-serif text-foreground mb-4 flex items-center gap-2">
						<VisionIcon class="w-6 h-6 text-accent-subtle" />
						The Vision
					</h2>
					<p class="text-foreground-muted font-sans leading-relaxed">
						<em>A forest of voices.</em> Every Wanderer is a tree in the grove. Some are saplings just starting out.
						Some are ancient oaks with deep roots. All are welcome. All have space to grow.
					</p>
					<p class="text-foreground-muted font-sans leading-relaxed mt-4">
						The platform should feel like walking through a peaceful forest at golden hour. Calm. Intentional.
						A refuge from the noise of social media.
					</p>
				</section>

				<!-- Core Values -->
				<section class="mb-12">
					<h2 class="text-2xl font-serif text-foreground mb-6">Core Values</h2>

					<div class="grid gap-6">
						<div class="bg-white/60 dark:bg-emerald-950/25 backdrop-blur-md rounded-xl p-6 border border-white/40 dark:border-emerald-800/25 shadow-sm">
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
						</div>

						<div class="bg-white/60 dark:bg-emerald-950/25 backdrop-blur-md rounded-xl p-6 border border-white/40 dark:border-emerald-800/25 shadow-sm">
							<h3 class="text-lg font-serif text-accent-muted mb-2 flex items-center gap-2">
								<OwnershipIcon class="w-5 h-5 text-accent-subtle" />
								Ownership
							</h3>
							<p class="text-foreground-muted font-sans leading-relaxed">
								Your words are yours. Your data is yours. You can export everything, anytime.
								If you leave, you take your roots with you.
							</p>
						</div>

						<div class="bg-white/60 dark:bg-emerald-950/25 backdrop-blur-md rounded-xl p-6 border border-white/40 dark:border-emerald-800/25 shadow-sm">
							<h3 class="text-lg font-serif text-accent-muted mb-2 flex items-center gap-2">
								<SimplicityIcon class="w-5 h-5 text-accent-subtle" />
								Simplicity
							</h3>
							<p class="text-foreground-muted font-sans leading-relaxed">
								No feature bloat. No endless settings. Write in Markdown. Upload images. Publish. That's it.
								The technology should disappear into the background.
							</p>
						</div>

						<div class="bg-white/60 dark:bg-emerald-950/25 backdrop-blur-md rounded-xl p-6 border border-white/40 dark:border-emerald-800/25 shadow-sm">
							<h3 class="text-lg font-serif text-accent-muted mb-2 flex items-center gap-2">
								<CommunityIcon class="w-5 h-5 text-accent-subtle" />
								Community With Care
							</h3>
							<p class="text-foreground-muted font-sans leading-relaxed">
								Intentionally queer-friendly. Welcoming to all. No engagement metrics breeding outrage.
								No viral mechanics rewarding the loudest voice. Just people, sharing what matters to them.
							</p>
						</div>

						<div class="bg-white/60 dark:bg-emerald-950/25 backdrop-blur-md rounded-xl p-6 border border-white/40 dark:border-emerald-800/25 shadow-sm">
							<h3 class="text-lg font-serif text-accent-muted mb-2 flex items-center gap-2">
								<AiSanctuaryIcon class="w-5 h-5 text-accent-subtle" />
								AI Sanctuary
							</h3>
							<p class="text-foreground-muted font-sans leading-relaxed">
								Your words are not training data. Grove blocks every AI crawler, every scraper, every "search agent" that wants to harvest content for machine learning.
								<a href="https://developers.cloudflare.com/bots/additional-configurations/block-ai-bots/" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">Cloudflare stands at the gate</a>, and our corner of the web becomes a black hole to external AI. Learn more about <a href="https://grove.place/knowledge/help/how-grove-protects-your-content" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">how Grove protects your content from AI scraping</a>.
							</p>
							<p class="text-foreground-muted font-sans leading-relaxed mt-3">
								We do use AI internally for content moderation, but intentionally: with zero data retention, with privacy-first providers, with no training on your words.
								There's a difference between using a tool carefully and feeding a machine indiscriminately.
							</p>
							<p class="text-foreground-subtle font-sans italic mt-3">
								Your voice remains yours. Not a dataset. Not a statistic. Yours.
							</p>
						</div>
					</div>

					<!-- Solarpunk Callout -->
					<a
						href="/knowledge/help/what-is-solarpunk"
						class="group flex items-center gap-3 mt-6 px-4 py-3 bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100/90 dark:hover:bg-amber-900/40 rounded-lg border border-amber-200/60 dark:border-amber-800/40 transition-colors"
					>
						<SolarpunkIcon class="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
						<span class="text-sm text-foreground-muted group-hover:text-foreground transition-colors">
							These values reflect <strong class="text-amber-700 dark:text-amber-300">solarpunk</strong> thinking. <span class="text-foreground-subtle group-hover:text-foreground-muted">Learn what that means →</span>
						</span>
					</a>
				</section>

				<!-- Meadow Section -->
				<section class="mb-12">
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

	<Footer />
</main>

<style>
	.bg-divider { background-color: var(--color-divider); }
</style>
