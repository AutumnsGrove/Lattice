<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { GlassCard } from '@autumnsgrove/groveengine/ui';
	import { MobileTOC } from '@autumnsgrove/groveengine';
	import SEO from '$lib/components/SEO.svelte';

	let { data } = $props();

	// Icon imports
	import { featureIcons, contentIcons, actionIcons, stateIcons, toolIcons } from '$lib/utils/icons';

	// Page icons
	const HeartIcon = contentIcons.heart;
	const GithubIcon = featureIcons.github;
	const BugIcon = toolIcons.bug;
	const LightbulbIcon = actionIcons.lightbulb;
	const EyeIcon = toolIcons.eye;
	const SproutIcon = contentIcons.sprout;
	const UsersIcon = contentIcons.users;
	const ArrowIcon = actionIcons.arrow;
	const CheckIcon = stateIcons.check;
	const FileTextIcon = contentIcons.filetext;

	// TOC headers
	const tocHeaders = [
		{ id: 'how-to-help', text: 'How to Help', level: 2, icon: HeartIcon },
		{ id: 'the-workflow', text: 'The Workflow', level: 2, icon: ArrowIcon },
		{ id: 'get-started', text: 'Get Started', level: 2, icon: SproutIcon },
		{ id: 'community', text: 'Community', level: 2, icon: UsersIcon }
	];
</script>

<SEO
	title="Contribute — Grove"
	description="Help build queer-friendly infrastructure for the web. Every bug report, feature idea, and line of code makes a difference."
	url="/contribute"
/>

<main class="min-h-screen flex flex-col">
	<Header user={data.user} />

	<article class="flex-1 px-6 py-12">
		<div class="max-w-3xl mx-auto">
			<!-- Header -->
			<header class="mb-12 text-center">
				<p class="text-foreground-faint font-sans text-sm uppercase tracking-wide mb-3">Join the Grove</p>
				<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-6">Contribute</h1>
				<div class="flex items-center justify-center gap-4">
					<div class="w-12 h-px bg-divider"></div>
					<HeartIcon class="w-4 h-4 text-accent-subtle" />
					<div class="w-12 h-px bg-divider"></div>
				</div>
			</header>

			<!-- Intro -->
			<div class="prose prose-bark max-w-none">
				<p class="text-lg text-foreground-muted font-sans leading-relaxed mb-8">
					Grove is built by people who believe the internet can be better. Warmer. More human.
					If that resonates with you, there's a place for you here.
				</p>

				<p class="text-lg text-foreground-muted font-sans leading-relaxed mb-12">
					You don't need to write code to help. Sometimes the most valuable contribution is simply
					<strong class="text-accent-muted">using the thing and telling us what you see</strong>.
				</p>

				<!-- How to Help -->
				<section id="how-to-help" class="mb-12 scroll-mt-28">
					<h2 class="text-2xl font-serif text-foreground mb-6 flex items-center gap-2">
						<HeartIcon class="w-6 h-6 text-accent-subtle" />
						How to Help
					</h2>

					<div class="grid gap-6">
						<GlassCard>
							<h3 class="text-lg font-serif text-accent-muted mb-2 flex items-center gap-2">
								<BugIcon class="w-5 h-5 text-accent-subtle" />
								Report Bugs
							</h3>
							<p class="text-foreground-muted font-sans leading-relaxed">
								Found something broken? That's genuinely helpful. Open an issue describing what happened,
								what you expected, and how to reproduce it.
							</p>
							<a
								href="https://github.com/AutumnsGrove/GroveEngine/issues/new?template=bug_report.md"
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-2 mt-3 text-accent-muted hover:text-accent-foreground transition-colors font-sans text-sm"
							>
								Report a bug <ArrowIcon class="w-4 h-4" />
							</a>
						</GlassCard>

						<GlassCard>
							<h3 class="text-lg font-serif text-accent-muted mb-2 flex items-center gap-2">
								<LightbulbIcon class="w-5 h-5 text-accent-subtle" />
								Suggest Features
							</h3>
							<p class="text-foreground-muted font-sans leading-relaxed">
								Have an idea that would make Grove better? We want to hear it. Tell us what problem
								it solves and who would benefit.
							</p>
							<a
								href="https://github.com/AutumnsGrove/GroveEngine/issues/new?template=feature_request.md"
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-2 mt-3 text-accent-muted hover:text-accent-foreground transition-colors font-sans text-sm"
							>
								Suggest a feature <ArrowIcon class="w-4 h-4" />
							</a>
						</GlassCard>

						<GlassCard>
							<h3 class="text-lg font-serif text-accent-muted mb-2 flex items-center gap-2">
								<EyeIcon class="w-5 h-5 text-accent-subtle" />
								Test & Explore
							</h3>
							<p class="text-foreground-muted font-sans leading-relaxed">
								Wander through the site. Try things. Click on stuff. Test on your phone, your tablet,
								with a screen reader. Then tell us what felt off—or what felt right.
							</p>
						</GlassCard>

						<GlassCard>
							<h3 class="text-lg font-serif text-accent-muted mb-2 flex items-center gap-2">
								<FileTextIcon class="w-5 h-5 text-accent-subtle" />
								Improve Docs
							</h3>
							<p class="text-foreground-muted font-sans leading-relaxed">
								Clear documentation helps everyone. Fix typos, clarify confusing sections,
								or add examples where they'd help.
							</p>
						</GlassCard>

						<GlassCard>
							<h3 class="text-lg font-serif text-accent-muted mb-2 flex items-center gap-2">
								<SproutIcon class="w-5 h-5 text-accent-subtle" />
								Write Code
							</h3>
							<p class="text-foreground-muted font-sans leading-relaxed">
								If you're ready to dive into the codebase, check out issues labeled
								<strong class="text-accent-muted">"good first issue"</strong> for beginner-friendly tasks.
							</p>
							<a
								href="https://github.com/AutumnsGrove/GroveEngine/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22"
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-2 mt-3 text-accent-muted hover:text-accent-foreground transition-colors font-sans text-sm"
							>
								Find a good first issue <ArrowIcon class="w-4 h-4" />
							</a>
						</GlassCard>
					</div>
				</section>

				<!-- The Workflow -->
				<section id="the-workflow" class="mb-12 scroll-mt-28">
					<h2 class="text-2xl font-serif text-foreground mb-4 flex items-center gap-2">
						<ArrowIcon class="w-6 h-6 text-accent-subtle" />
						The Workflow
					</h2>

					<div class="bg-accent border border-accent rounded-xl p-6 mb-6">
						<p class="text-foreground-muted font-sans leading-relaxed font-medium mb-4">
							Every contribution starts with an issue.
						</p>
						<div class="flex flex-wrap items-center gap-2 text-sm text-foreground-subtle font-mono">
							<span class="px-3 py-1 bg-background/50 rounded-full">Issue</span>
							<ArrowIcon class="w-4 h-4" />
							<span class="px-3 py-1 bg-background/50 rounded-full">Discussion</span>
							<ArrowIcon class="w-4 h-4" />
							<span class="px-3 py-1 bg-background/50 rounded-full">PR</span>
							<ArrowIcon class="w-4 h-4" />
							<span class="px-3 py-1 bg-background/50 rounded-full">Review</span>
							<ArrowIcon class="w-4 h-4" />
							<span class="px-3 py-1 bg-background/50 rounded-full text-accent-muted">Merge</span>
						</div>
					</div>

					<p class="text-foreground-muted font-sans leading-relaxed mb-4">
						We don't accept PRs that appear out of nowhere. This isn't gatekeeping—it's about
						<strong class="text-accent-muted">preventing wasted effort</strong>.
					</p>

					<ul class="space-y-3 text-foreground-muted font-sans">
						<li class="flex items-start gap-3">
							<CheckIcon class="w-4 h-4 text-green-500 mt-1 shrink-0" />
							<span><strong>Find or create an issue</strong> — Check existing issues first</span>
						</li>
						<li class="flex items-start gap-3">
							<CheckIcon class="w-4 h-4 text-green-500 mt-1 shrink-0" />
							<span><strong>Discuss your approach</strong> — Comment with your plan</span>
						</li>
						<li class="flex items-start gap-3">
							<CheckIcon class="w-4 h-4 text-green-500 mt-1 shrink-0" />
							<span><strong>Get the green light</strong> — Wait for maintainer approval</span>
						</li>
						<li class="flex items-start gap-3">
							<CheckIcon class="w-4 h-4 text-green-500 mt-1 shrink-0" />
							<span><strong>Submit your PR</strong> — Reference the issue number</span>
						</li>
					</ul>

					<p class="text-foreground-subtle font-sans text-sm mt-4 italic">
						Exception: Typo fixes and tiny documentation corrections can go straight to PR.
					</p>
				</section>

				<!-- Get Started -->
				<section id="get-started" class="mb-12 scroll-mt-28">
					<h2 class="text-2xl font-serif text-foreground mb-6 flex items-center gap-2">
						<SproutIcon class="w-6 h-6 text-accent-subtle" />
						Get Started
					</h2>

					<div class="grid gap-4">
						<a
							href="https://github.com/AutumnsGrove/GroveEngine/issues"
							target="_blank"
							rel="noopener noreferrer"
							class="group flex items-center gap-4 p-4 bg-background border border-default hover:border-accent/50 rounded-xl transition-all"
						>
							<div class="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-full group-hover:bg-accent/20 transition-colors">
								<GithubIcon class="w-6 h-6 text-foreground" />
							</div>
							<div class="flex-1">
								<h3 class="font-serif text-foreground group-hover:text-accent-muted transition-colors">Browse Open Issues</h3>
								<p class="text-sm text-foreground-subtle">See what needs doing</p>
							</div>
							<ArrowIcon class="w-5 h-5 text-foreground-subtle group-hover:text-accent-muted group-hover:translate-x-1 transition-all" />
						</a>

						<a
							href="https://github.com/AutumnsGrove/GroveEngine"
							target="_blank"
							rel="noopener noreferrer"
							class="group flex items-center gap-4 p-4 bg-background border border-default hover:border-accent/50 rounded-xl transition-all"
						>
							<div class="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-full group-hover:bg-accent/20 transition-colors">
								<SproutIcon class="w-6 h-6 text-foreground" />
							</div>
							<div class="flex-1">
								<h3 class="font-serif text-foreground group-hover:text-accent-muted transition-colors">View the Repository</h3>
								<p class="text-sm text-foreground-subtle">Explore the codebase</p>
							</div>
							<ArrowIcon class="w-5 h-5 text-foreground-subtle group-hover:text-accent-muted group-hover:translate-x-1 transition-all" />
						</a>

						<a
							href="https://github.com/AutumnsGrove/GroveEngine/blob/main/CONTRIBUTING.md"
							target="_blank"
							rel="noopener noreferrer"
							class="group flex items-center gap-4 p-4 bg-background border border-default hover:border-accent/50 rounded-xl transition-all"
						>
							<div class="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-full group-hover:bg-accent/20 transition-colors">
								<FileTextIcon class="w-6 h-6 text-foreground" />
							</div>
							<div class="flex-1">
								<h3 class="font-serif text-foreground group-hover:text-accent-muted transition-colors">Read the Contributor Guide</h3>
								<p class="text-sm text-foreground-subtle">Setup, code style, and conventions</p>
							</div>
							<ArrowIcon class="w-5 h-5 text-foreground-subtle group-hover:text-accent-muted group-hover:translate-x-1 transition-all" />
						</a>
					</div>
				</section>

				<!-- Community -->
				<section id="community" class="mb-12 scroll-mt-28">
					<h2 class="text-2xl font-serif text-foreground mb-4 flex items-center gap-2">
						<UsersIcon class="w-6 h-6 text-accent-subtle" />
						Community
					</h2>

					<p class="text-foreground-muted font-sans leading-relaxed mb-4">
						Grove is explicitly a <strong class="text-accent-muted">queer-friendly space</strong>.
						Bigotry, harassment, and exclusionary behavior have no place here.
					</p>

					<p class="text-foreground-muted font-sans leading-relaxed mb-6">
						Be kind. Be respectful. Remember there's a human (or a helpful AI) on the other
						side of every interaction. We're building something meaningful together.
					</p>

					<GlassCard variant="accent">
						<p class="text-foreground-muted font-sans leading-relaxed italic">
							"Every issue, commit, and review helps build something meaningful.
							Here's to queer-friendly infrastructure and solarpunk dreams."
						</p>
					</GlassCard>
				</section>

				<!-- Closing -->
				<section class="text-center py-8 border-t border-default">
					<p class="text-accent-muted font-serif text-lg mb-2">
						Thank you for being here.
					</p>
					<p class="text-foreground-subtle font-sans">
						Every contribution—big or small—helps build a better corner of the internet.
					</p>
				</section>
			</div>
		</div>
	</article>

	<!-- Desktop TOC -->
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
				<div class="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none">
					<div class="px-3 py-1.5 rounded-lg bg-white dark:bg-cream-100 shadow-md border border-accent/20 dark:border-accent/10 text-sm font-medium text-foreground whitespace-nowrap">
						{header.text}
					</div>
				</div>
			</div>
		{/each}
	</nav>

	<!-- Mobile TOC -->
	<MobileTOC headers={tocHeaders} title="On this page" />

	<Footer />
</main>

<style>
	.bg-divider { background-color: var(--color-divider); }
</style>
