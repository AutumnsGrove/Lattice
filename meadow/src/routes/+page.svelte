<script lang="ts">
	import EmailSignup from '$lib/components/EmailSignup.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { Logo } from '@autumnsgrove/groveengine/ui';
	import SEO from '$lib/components/SEO.svelte';
	import { Header, type NavItem } from '@autumnsgrove/groveengine/ui/chrome';
	import { seasonStore } from '@autumnsgrove/groveengine/ui/stores';
	import { Trees, Users, Heart, Calendar, Zap, Sprout, ArrowRight } from 'lucide-svelte';

	// Minimal navigation - just a way home
	const navItems: NavItem[] = [
		{ href: 'https://grove.place', label: 'Grove', icon: Trees, external: true }
	];

	// Toggle season on logo click
	function handleLogoClick() {
		seasonStore.cycle();
	}
</script>

<SEO
	title="Meadow — Social feed for Grove blogs"
	description="A chronological feed connecting Grove blogs. No algorithms, no public metrics, no viral mechanics. Just authentic connection."
	url="/"
/>

<Header {navItems} brandTitle="Meadow" />

<main class="min-h-screen flex flex-col items-center justify-center px-6 py-12">
	<!-- Logo/Brand -->
	<div class="mb-8">
		<button
			onclick={handleLogoClick}
			class="transition-transform hover:scale-110 active:scale-95"
			aria-label="Toggle season theme"
			title="Click to change season"
		>
			<Logo size={96} season={$seasonStore} />
		</button>
	</div>

	<!-- Title -->
	<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-2 text-center">Meadow</h1>

	<!-- Tagline -->
	<p class="text-xl md:text-2xl text-foreground-muted font-serif italic mb-4 text-center">
		Where the forest opens up
	</p>

	<!-- Subtagline -->
	<p class="text-base md:text-lg text-foreground-subtle font-sans max-w-lg text-center mb-8 leading-relaxed">
		A chronological feed connecting Grove blogs. No algorithms deciding what you see. No public metrics breeding anxiety. Just people, sharing, in the order they posted.
	</p>

	<!-- Coming Soon Notice -->
	<div class="w-full max-w-md mb-8">
		<div class="glass-grove rounded-xl p-4 border-l-4 border-accent-muted">
			<p class="text-foreground font-sans text-sm leading-relaxed">
				<span class="font-medium">Meadow launches in Phase 3 —</span> After the blog engine is live and people are writing. For now, this is a glimpse of what's coming.
			</p>
		</div>
	</div>

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

	<!-- What is Meadow? Section -->
	<section class="w-full max-w-2xl mb-12">
		<h2 class="text-2xl md:text-3xl font-serif text-foreground mb-6 text-center">
			What is Meadow?
		</h2>
		<div class="glass-grove rounded-xl p-6 border border-divider">
			<p class="text-base md:text-lg text-foreground-muted font-sans leading-relaxed mb-4">
				Think of it as the clearing in the forest. When you step out from under the dense canopy of your own blog, you can see what others in the Grove are writing.
			</p>
			<p class="text-base md:text-lg text-foreground-muted font-sans leading-relaxed mb-4">
				Posts flow chronologically. You can vote (only you see the scores). You can react with emojis (only the author sees who reacted). You can bookmark for later.
			</p>
			<p class="text-base md:text-lg text-foreground-muted font-sans leading-relaxed">
				No one's performing for virality. No one's chasing engagement. Just... connection.
			</p>
		</div>
	</section>

	<!-- How It Works Section -->
	<section class="w-full max-w-2xl mb-12">
		<h2 class="text-2xl md:text-3xl font-serif text-foreground mb-6 text-center">
			How it works
		</h2>
		<div class="grid gap-4 md:grid-cols-2">
			<!-- Opt-in -->
			<div class="glass-grove rounded-xl p-5 border border-divider">
				<div class="flex items-start gap-3 mb-3">
					<Users class="w-6 h-6 text-accent-muted flex-shrink-0 mt-0.5" />
					<h3 class="text-lg font-serif text-foreground">Blog owners opt-in</h3>
				</div>
				<p class="text-sm md:text-base text-foreground-muted font-sans leading-relaxed">
					You choose which posts to share to the feed. Your blog, your control.
				</p>
			</div>

			<!-- Chronological -->
			<div class="glass-grove rounded-xl p-5 border border-divider">
				<div class="flex items-start gap-3 mb-3">
					<Calendar class="w-6 h-6 text-accent-muted flex-shrink-0 mt-0.5" />
					<h3 class="text-lg font-serif text-foreground">Chronological feed</h3>
				</div>
				<p class="text-sm md:text-base text-foreground-muted font-sans leading-relaxed">
					Posts appear in the order they were published. What was posted, not what an algorithm thinks you'll click.
				</p>
			</div>

			<!-- Private Voting -->
			<div class="glass-grove rounded-xl p-5 border border-divider">
				<div class="flex items-start gap-3 mb-3">
					<Zap class="w-6 h-6 text-accent-muted flex-shrink-0 mt-0.5" />
					<h3 class="text-lg font-serif text-foreground">Vote privately</h3>
				</div>
				<p class="text-sm md:text-base text-foreground-muted font-sans leading-relaxed">
					Upvote posts you love. Only you see your vote scores. No public rankings.
				</p>
			</div>

			<!-- Author Reactions -->
			<div class="glass-grove rounded-xl p-5 border border-divider">
				<div class="flex items-start gap-3 mb-3">
					<Heart class="w-6 h-6 text-accent-muted flex-shrink-0 mt-0.5" />
					<h3 class="text-lg font-serif text-foreground">React authentically</h3>
				</div>
				<p class="text-sm md:text-base text-foreground-muted font-sans leading-relaxed">
					Send emoji reactions. Only the author sees who reacted. Encouragement without performance.
				</p>
			</div>
		</div>
	</section>

	<!-- Why Meadow Exists Section -->
	<section class="w-full max-w-2xl mb-12">
		<h2 class="text-2xl md:text-3xl font-serif text-foreground mb-6 text-center">
			Why Meadow exists
		</h2>
		<div class="glass-grove rounded-xl p-6 border border-divider">
			<p class="text-base md:text-lg text-foreground-muted font-sans leading-relaxed mb-4">
				Because social media broke something fundamental: it turned human connection into a competition. Public metrics. Algorithmic feeds. Viral mechanics.
			</p>
			<p class="text-base md:text-lg text-foreground-muted font-sans leading-relaxed mb-4">
				Meadow remembers what "social" actually means. Your encouragement goes to the author, not the crowd. Your feed shows what was posted, not what an algorithm thinks you'll click.
			</p>
			<p class="text-base md:text-lg text-accent-text font-sans leading-relaxed italic">
				It's social media that doesn't make you feel like shit.
			</p>
		</div>
	</section>

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

	<!-- Early Access Signup -->
	<section class="w-full max-w-md mb-12">
		<h2 class="text-2xl md:text-3xl font-serif text-foreground mb-4 text-center">
			Join the waitlist
		</h2>
		<p class="text-base text-foreground-muted font-sans text-center mb-6 leading-relaxed">
			Be notified when Meadow launches. No spam, just a heads up when it's ready.
		</p>
		<EmailSignup />
	</section>

	<!-- Link to Grove -->
	<div class="text-center mb-12">
		<p class="text-foreground-muted text-base font-sans leading-relaxed mb-4">
			While you're waiting, explore Grove
		</p>
		<div class="flex flex-col sm:flex-row items-center justify-center gap-4">
			<a
				href="https://grove.place"
				class="btn-primary inline-flex items-center gap-2 text-base"
			>
				Visit Grove
				<Sprout class="w-4 h-4" />
			</a>
			<a
				href="https://plant.grove.place"
				class="btn-secondary inline-flex items-center gap-2 text-base"
			>
				Plant Your Blog
				<ArrowRight class="w-4 h-4" />
			</a>
		</div>
	</div>
</main>

<Footer />
