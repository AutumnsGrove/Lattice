<script lang="ts">
	import EmailSignup from '$lib/components/EmailSignup.svelte';
	import { Header, Footer, seasonStore } from '@autumnsgrove/groveengine/ui/chrome';
	import { Logo } from '@autumnsgrove/groveengine/ui/nature';
	import SEO from '$lib/components/SEO.svelte';

	// Lucide icons
	import {
		Sprout,
		Shield,
		Users,
		Download,
		ArrowRight,
		Leaf,
		Trees,
		BookOpen
	} from 'lucide-svelte';
</script>

<SEO
	title="Hello — Grove"
	description="Thanks for your curiosity. Grove is a quiet corner of the internet where your words can grow — and stay yours."
	url="/hello"
/>

<Header />

<main class="min-h-screen flex flex-col items-center justify-center px-6 py-12">
	<!-- Logo -->
	<div class="mb-6">
		<Logo class="w-20 h-20" season={$seasonStore} />
	</div>

	<!-- Welcome -->
	<h1 class="text-3xl md:text-4xl font-serif text-foreground mb-2 text-center">
		Hello there.
	</h1>

	<p class="text-lg text-foreground-muted font-sans text-center mb-8 max-w-md">
		Thanks for scanning. Let me tell you what this is about.
	</p>

	<!-- Decorative divider -->
	<div class="flex items-center gap-4 mb-8">
		<div class="w-8 h-px bg-divider"></div>
		<Leaf class="w-4 h-4 text-accent-subtle" />
		<div class="w-8 h-px bg-divider"></div>
	</div>

	<!-- The Pitch -->
	<section class="w-full max-w-lg mb-10">
		<div class="glass-grove rounded-xl p-6 space-y-4">
			<p class="text-foreground font-sans leading-relaxed">
				<strong class="text-accent-muted">Grove</strong> is a blogging platform that does things differently.
			</p>
			<p class="text-foreground-muted font-sans leading-relaxed">
				You get your own site at <span class="text-foreground font-medium">yourname.grove.place</span>.
				No ads watch your readers. No algorithms decide who sees your words.
				No AI companies scrape your writing for training data.
			</p>
			<p class="text-foreground font-sans leading-relaxed font-medium">
				Your words are yours. That's it. That's the whole thing.
			</p>
			<p class="text-foreground-subtle font-sans text-sm italic text-right pt-2">
				— Autumn, founder
			</p>
		</div>
	</section>

	<!-- Quick Features -->
	<section class="w-full max-w-lg mb-10">
		<ul class="grid gap-3">
			<li class="flex items-start gap-3 text-foreground-subtle font-sans">
				<Shield class="w-5 h-5 text-accent-muted flex-shrink-0 mt-0.5" />
				<span><span class="text-foreground font-medium">AI protection</span> — we block the bots that want to harvest your writing</span>
			</li>
			<li class="flex items-start gap-3 text-foreground-subtle font-sans">
				<Users class="w-5 h-5 text-accent-muted flex-shrink-0 mt-0.5" />
				<span><span class="text-foreground font-medium">You're the customer</span> — not the product being sold to advertisers</span>
			</li>
			<li class="flex items-start gap-3 text-foreground-subtle font-sans">
				<Download class="w-5 h-5 text-accent-muted flex-shrink-0 mt-0.5" />
				<span><span class="text-foreground font-medium">Take it with you</span> — export everything anytime, no lock-in</span>
			</li>
		</ul>
	</section>

	<!-- Primary CTA -->
	<section class="w-full max-w-md mb-8 text-center">
		<a
			href="https://plant.grove.place"
			rel="noopener noreferrer"
			class="btn-primary inline-flex items-center gap-2 text-base mb-3"
		>
			Plant Your Blog
			<Sprout class="w-4 h-4" />
		</a>
		<p class="text-foreground-subtle text-sm font-sans">
			Plans start at $8/month. Reading is always free.
		</p>
	</section>

	<!-- Decorative divider -->
	<div class="flex items-center gap-4 mb-8">
		<div class="w-8 h-px bg-divider"></div>
		<Leaf class="w-4 h-4 text-accent-subtle" />
		<div class="w-8 h-px bg-divider"></div>
	</div>

	<!-- Not ready yet? Email signup -->
	<section class="w-full max-w-md mb-10 text-center">
		<p class="text-foreground-muted font-sans mb-4">
			Not ready yet? Leave your email and we'll let you know when things are growing.
		</p>
		<EmailSignup />
	</section>

	<!-- Explore links -->
	<section class="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
		<a
			href="/vision"
			class="group flex items-center gap-2 text-sm font-sans text-foreground-subtle hover:text-accent-muted transition-colors"
		>
			<BookOpen class="w-4 h-4 group-hover:scale-110 transition-transform" />
			<span>Our vision</span>
		</a>
		<span class="text-divider hidden sm:inline">·</span>
		<a
			href="/forest"
			class="group flex items-center gap-2 text-sm font-sans text-foreground-subtle hover:text-accent-muted transition-colors"
		>
			<Trees class="w-4 h-4 group-hover:scale-110 transition-transform" />
			<span>See the forest</span>
		</a>
		<span class="text-divider hidden sm:inline">·</span>
		<a
			href="/pricing"
			class="group flex items-center gap-2 text-sm font-sans text-foreground-subtle hover:text-accent-muted transition-colors"
		>
			<ArrowRight class="w-4 h-4 group-hover:scale-110 transition-transform" />
			<span>Pricing</span>
		</a>
	</section>
</main>

<Footer />

<style>
	.bg-divider { background-color: var(--color-divider); }

	/* Glass effect now defined globally in app.css */
</style>
