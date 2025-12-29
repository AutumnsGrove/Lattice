<script lang="ts">
	import EmailSignup from '$lib/components/EmailSignup.svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import SEO from '$lib/components/SEO.svelte';
	import { RoadmapPreview } from '@autumnsgrove/groveengine/ui';
	import { page } from '$app/stores';
	import { season } from '$lib/stores/season';

	// Lucide icons
	import {
		Map,
		BookOpen,
		Trees,
		CircleDollarSign,
		Leaf,
		Shield,
		Users,
		Download,
		ArrowRight,
		Sprout
	} from 'lucide-svelte';

	// Get error from URL if present
	let error = $derived($page.url.searchParams.get('error'));

	// Toggle season on logo click
	function handleLogoClick() {
		season.cycle();
	}

</script>

<SEO
	title="Grove — a place to Be"
	description="A quiet corner of the internet where your words can grow and flourish. Your own space to write, share, and bloom."
	url="/"
/>

<Header />

<main class="min-h-screen flex flex-col items-center justify-center px-6 py-12">
	<!-- Error Banner -->
	{#if error}
		<div class="mb-8 w-full max-w-md p-4 bg-error border border-error rounded-lg">
			<div class="flex items-start gap-3">
				<svg class="w-5 h-5 text-error flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd" />
				</svg>
				<div>
					<p class="text-error font-sans font-medium">Sign in failed</p>
					<p class="text-error text-sm mt-1">{error}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Logo/Brand -->
	<div class="mb-8">
		<button
			onclick={handleLogoClick}
			class="transition-transform hover:scale-110 active:scale-95"
			aria-label="Toggle season theme"
			title="Click to change season"
		>
			<Logo class="w-24 h-24" season={$season} />
		</button>
	</div>

	<!-- Title -->
	<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-3 text-center">Grove</h1>

	<!-- Tagline -->
	<p class="text-xl md:text-2xl text-foreground-muted font-serif italic mb-12 text-center">
		a place to Be
	</p>

	<!-- Decorative divider -->
	<div class="flex items-center gap-4 mb-12">
		<div class="w-12 h-px bg-divider"></div>
		<svg class="w-5 h-5 text-accent-subtle" viewBox="0 0 20 20" fill="currentColor">
			<path
				d="M10 2C8 6 5 8 2 8c3 2 5 5 5 10 2-4 5-6 8-6-3-2-5-5-5-10z"
				fill-opacity="0.6"
			/>
		</svg>
		<div class="w-12 h-px bg-divider"></div>
	</div>

	<!-- CTA Links -->
	<div class="text-center max-w-md mb-12">
		<p class="text-foreground-muted text-lg font-sans leading-relaxed mb-6">
			A quiet corner of the internet where your words can grow.
		</p>

		<!-- Primary CTA: Plant your blog -->
		<a
			href="https://plant.grove.place"
			class="btn-primary inline-flex items-center gap-2 text-base mb-4"
		>
			Plant Your Blog
			<Sprout class="w-4 h-4" />
		</a>
		<p class="text-foreground-subtle text-sm font-sans mb-6">
			Signups aren't open yet, but feel free to look around.
		</p>

		<div class="flex flex-col sm:flex-row items-center justify-center gap-4">
			<a
				href="/about"
				class="btn-secondary inline-flex items-center gap-2 text-base"
			>
				What is Grove?
				<Leaf class="w-4 h-4" />
			</a>
			<a
				href="/vision"
				class="btn-secondary inline-flex items-center gap-2 text-base"
			>
				Our Vision
				<ArrowRight class="w-4 h-4" />
			</a>
		</div>
	</div>

	<!-- Quick Links -->
	<div class="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-12">
		<a
			href="/roadmap"
			class="group flex items-center gap-2 text-sm font-sans text-foreground-subtle hover:text-accent-muted transition-colors"
		>
			<Map class="w-4 h-4 group-hover:scale-110 transition-transform" />
			<span>Roadmap</span>
		</a>
		<span class="text-divider hidden sm:inline">·</span>
		<a
			href="/knowledge"
			class="group flex items-center gap-2 text-sm font-sans text-foreground-subtle hover:text-accent-muted transition-colors"
		>
			<BookOpen class="w-4 h-4 group-hover:scale-110 transition-transform" />
			<span>Knowledge</span>
		</a>
		<span class="text-divider hidden sm:inline">·</span>
		<a
			href="/forest"
			class="group flex items-center gap-2 text-sm font-sans text-foreground-subtle hover:text-accent-muted transition-colors"
		>
			<Trees class="w-4 h-4 group-hover:scale-110 transition-transform" />
			<span>Forest</span>
		</a>
		<span class="text-divider hidden sm:inline">·</span>
		<a
			href="/pricing"
			class="group flex items-center gap-2 text-sm font-sans text-foreground-subtle hover:text-accent-muted transition-colors"
		>
			<CircleDollarSign class="w-4 h-4 group-hover:scale-110 transition-transform" />
			<span>Pricing</span>
		</a>
	</div>

	<!-- Coming soon text -->
	<p class="text-foreground-subtle text-center max-w-md mb-8 font-sans text-sm">
		Want to be notified when we launch?
	</p>

	<!-- Email signup -->
	<EmailSignup />

	<!-- Decorative divider -->
	<div class="flex items-center gap-4 mt-16 mb-12">
		<div class="w-12 h-px bg-divider"></div>
		<svg class="w-5 h-5 text-accent-subtle" viewBox="0 0 20 20" fill="currentColor">
			<path
				d="M10 2C8 6 5 8 2 8c3 2 5 5 5 10 2-4 5-6 8-6-3-2-5-5-5-10z"
				fill-opacity="0.6"
			/>
		</svg>
		<div class="w-12 h-px bg-divider"></div>
	</div>

	<!-- Roadmap Preview Card -->
	<section class="w-full max-w-lg mb-16">
		<RoadmapPreview
			phase="Thaw"
			subtitle="The ice begins to crack"
			description="Grove opens its doors. The first trees take root."
			progress={33}
			href="/roadmap"
		/>
	</section>

	<!-- Feature Highlights -->
	<section class="w-full max-w-2xl mb-8">
		<h2 class="text-lg font-serif text-foreground-muted text-center mb-8">What makes Grove different</h2>

		<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<!-- Your Space -->
			<div class="glass-grove rounded-xl p-5">
				<div class="flex items-center gap-3 mb-2">
					<div class="p-2 rounded-lg bg-accent-subtle/20">
						<Leaf class="w-5 h-5 text-accent-muted" />
					</div>
					<h3 class="font-serif text-foreground">Your own subdomain</h3>
				</div>
				<p class="text-sm font-sans text-foreground-subtle leading-relaxed">
					yourname.grove.place — a corner of the internet that's truly yours.
				</p>
			</div>

			<!-- AI Protection -->
			<div class="glass-grove rounded-xl p-5">
				<div class="flex items-center gap-3 mb-2">
					<div class="p-2 rounded-lg bg-accent-subtle/20">
						<Shield class="w-5 h-5 text-accent-muted" />
					</div>
					<h3 class="font-serif text-foreground">Shade protection</h3>
				</div>
				<p class="text-sm font-sans text-foreground-subtle leading-relaxed">
					Your words are not training data. AI crawlers blocked at the gate.
				</p>
			</div>

			<!-- Community -->
			<div class="glass-grove rounded-xl p-5">
				<div class="flex items-center gap-3 mb-2">
					<div class="p-2 rounded-lg bg-accent-subtle/20">
						<Users class="w-5 h-5 text-accent-muted" />
					</div>
					<h3 class="font-serif text-foreground">Meadow community</h3>
				</div>
				<p class="text-sm font-sans text-foreground-subtle leading-relaxed">
					Optional connection without competition. No algorithms, just friends.
				</p>
			</div>

			<!-- Data Freedom -->
			<div class="glass-grove rounded-xl p-5">
				<div class="flex items-center gap-3 mb-2">
					<div class="p-2 rounded-lg bg-accent-subtle/20">
						<Download class="w-5 h-5 text-accent-muted" />
					</div>
					<h3 class="font-serif text-foreground">Your words, always</h3>
				</div>
				<p class="text-sm font-sans text-foreground-subtle leading-relaxed">
					Full data export anytime. You own everything you create here.
				</p>
			</div>
		</div>
	</section>

</main>

<!-- Footer -->
<Footer />

<style>
	/* Background color utilities that need to be scoped */
	.bg-divider { background-color: var(--color-divider); }

	/* Glass effect for Grove cards */
	.glass-grove {
		background: rgba(255, 255, 255, 0.6);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--color-divider);
	}

	:global(.dark) .glass-grove {
		background: rgba(30, 41, 59, 0.5);
	}
</style>
