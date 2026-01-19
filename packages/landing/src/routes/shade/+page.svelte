<script lang="ts">
	import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
	import { toolIcons, stateIcons } from '$lib/utils/icons';

	const ShadeIcon = toolIcons.blinds;
	const BlockIcon = stateIcons.x;
	const AllowIcon = stateIcons.check;
</script>

<svelte:head>
	<title>Shade — Grove</title>
	<meta name="description" content="In a forest full of harvesters, this grove stays shaded. How Grove protects your words from AI scrapers." />
</svelte:head>

<main class="min-h-screen flex flex-col">
	<Header />

	<article class="flex-1 px-6 py-12">
		<div class="max-w-3xl mx-auto">
			<!-- Hero -->
			<header class="text-center mb-12">
				<ShadeIcon class="w-12 h-12 mx-auto mb-4 text-grove-600" />
				<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">Shade</h1>
				<p class="text-xl text-foreground-faint font-serif italic">
					In a forest full of harvesters, this grove stays shaded.
				</p>
			</header>

			<!-- Core Message -->
			<div class="card p-8 mb-10 bg-accent/10 border-accent/30 text-center">
				<p class="text-xl font-serif text-foreground mb-4">
					<strong>Writers own their words.</strong>
				</p>
				<p class="text-foreground-muted">
					Content on Grove may not be used for AI training, machine learning, or automated data harvesting.
					Technical access does not constitute consent.
				</p>
			</div>

			<!-- What This Means -->
			<section class="mb-10">
				<h2 class="text-2xl font-serif text-foreground mb-4">What this means</h2>
				<p class="text-foreground-muted mb-4">
					The internet used to be a place of personal expression. Somewhere along the way, that expression became "content"—raw material for training AI models, often without permission, attribution, or compensation.
				</p>
				<p class="text-foreground-muted">
					Shade is our quiet refusal. Your blog posts, your photos, your stories—they're yours. Not training data.
				</p>
			</section>

			<!-- What We Block / Allow -->
			<div class="grid md:grid-cols-2 gap-6 mb-10">
				<div class="card p-6">
					<h3 class="text-lg font-semibold text-foreground mb-3">What we block</h3>
					<ul class="space-y-2 text-foreground-muted">
						<li class="flex items-start gap-2">
							<BlockIcon class="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
							<span>AI training crawlers (GPTBot, ClaudeBot, CCBot, and dozens more)</span>
						</li>
						<li class="flex items-start gap-2">
							<BlockIcon class="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
							<span>Automated scrapers and data harvesters</span>
						</li>
						<li class="flex items-start gap-2">
							<BlockIcon class="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
							<span>Bulk archiving services</span>
						</li>
					</ul>
				</div>

				<div class="card p-6">
					<h3 class="text-lg font-semibold text-foreground mb-3">What we allow</h3>
					<ul class="space-y-2 text-foreground-muted">
						<li class="flex items-start gap-2">
							<AllowIcon class="w-4 h-4 mt-0.5 text-grove-600 shrink-0" />
							<span>Search engines (Google, Bing, Kagi, DuckDuckGo)</span>
						</li>
						<li class="flex items-start gap-2">
							<AllowIcon class="w-4 h-4 mt-0.5 text-grove-600 shrink-0" />
							<span>Human readers (always welcome)</span>
						</li>
						<li class="flex items-start gap-2">
							<AllowIcon class="w-4 h-4 mt-0.5 text-grove-600 shrink-0" />
							<span>RSS feeds for your subscribers</span>
						</li>
					</ul>
				</div>
			</div>

			<!-- How We Protect -->
			<section class="mb-10">
				<h2 class="text-2xl font-serif text-foreground mb-4">How we protect your content</h2>
				<p class="text-foreground-muted mb-4">
					Shade uses eight layers of protection—from Cloudflare's bot detection to human verification, from robots.txt directives to legal frameworks. No single layer is perfect, but together they make Grove an expensive, low-value target for scrapers.
				</p>
				<p class="text-foreground-muted">
					We accept that determined actors with significant resources may still find ways through. Our goal isn't an impenetrable fortress—it's making scraping difficult enough that AI companies move to easier targets, while establishing clear documentation that consent was never given.
				</p>
			</section>

			<!-- Legal Standing -->
			<section class="mb-10">
				<h2 class="text-2xl font-serif text-foreground mb-4">Legal position</h2>
				<div class="bg-surface-subtle p-6 rounded-lg border border-border">
					<p class="text-foreground-muted mb-4">
						This prohibition applies regardless of robots.txt compliance. The absence of technical barriers does not imply permission. Any use of Grove content for AI training, machine learning, or automated data collection is expressly prohibited.
					</p>
					<p class="text-foreground-muted">
						This applies to all entities, including but not limited to: OpenAI, Anthropic, Google, Meta, Microsoft, and their subsidiaries.
					</p>
				</div>
			</section>

			<!-- The Google Problem -->
			<section class="mb-10">
				<h2 class="text-2xl font-serif text-foreground mb-4">A note on imperfect solutions</h2>
				<p class="text-foreground-muted mb-4">
					Some companies—Google notably among them—don't fully separate their search indexing from AI training data collection. We use every signal available to opt out, but acknowledge this is imperfect.
				</p>
				<p class="text-foreground-muted">
					We document our objection. We make our position clear. And we hope the industry moves toward better consent mechanisms.
				</p>
			</section>

			<!-- Open Spec -->
			<section class="mb-10">
				<h2 class="text-2xl font-serif text-foreground mb-4">An open approach</h2>
				<p class="text-foreground-muted mb-4">
					Shade isn't just for Grove. The principles are universal, and we've documented our approach so others can adopt it. If you're building something where writers should own their words, you're welcome to implement Shade on your platform.
				</p>
				<p class="text-foreground-muted">
					The full technical specification is open source.
				</p>
			</section>

			<!-- Contact -->
			<section class="text-center pt-6 border-t border-border">
				<p class="text-foreground-muted mb-2">
					Questions or concerns?
				</p>
				<p>
					<a href="mailto:hello@grove.place" class="text-accent-muted hover:text-accent transition-colors">
						hello@grove.place
					</a>
				</p>
				<p class="text-foreground-faint text-sm mt-4">
					<a href="/knowledge/legal/terms-of-service" class="hover:text-foreground-muted transition-colors">Terms of Service</a>
					<span class="mx-2">·</span>
					<a href="/knowledge/legal/privacy-policy" class="hover:text-foreground-muted transition-colors">Privacy Policy</a>
				</p>
			</section>
		</div>
	</article>

	<Footer />
</main>
