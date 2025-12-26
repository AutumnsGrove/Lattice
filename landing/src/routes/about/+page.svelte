<script lang="ts">
	import EmailSignup from '$lib/components/EmailSignup.svelte';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import SEO from '$lib/components/SEO.svelte';
</script>

<SEO
	title="What is Grove? — Grove"
	description="A non-technical guide to Grove: the platform where anyone can have their own personal website and blog."
	url="/about"
/>

<main class="min-h-screen flex flex-col">
	<Header />

	<!-- Content -->
	<article class="flex-1 px-6 py-12">
		<div class="max-w-3xl mx-auto">
			<!-- Header -->
			<header class="mb-12 text-center">
				<p class="text-foreground-faint font-sans text-sm uppercase tracking-wide mb-3">A Non-Technical Guide</p>
				<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-6">What is Grove, Really?</h1>
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
					<strong class="text-accent-muted">Grove is a platform where anyone can have their own personal website and blog</strong> — like if Tumblr, Substack, and a cozy coffee shop had a baby.
				</p>

				<!-- The Neighborhood -->
				<section class="mb-12">
					<h2 class="text-2xl font-serif text-foreground mb-4">What We're Building</h2>
					<p class="text-foreground-muted font-sans leading-relaxed mb-4">
						Imagine you're building a neighborhood of tiny houses. Each person gets their own house (their website at <code>yourname.grove.place</code>), but they all share some common infrastructure — the roads, the power grid, the community center.
					</p>
					<p class="text-foreground-muted font-sans leading-relaxed">
						Grove is all of that infrastructure: the roads (how you get to any site), the power grid (keeping everything fast and reliable), the locks on the doors (making sure only you can access your stuff), and eventually the community center (where people can interact with each other).
					</p>
				</section>

				<!-- Why It's Hard -->
				<section class="mb-12">
					<h2 class="text-2xl font-serif text-foreground mb-4">Why This is Tricky</h2>
					<p class="text-foreground-muted font-sans leading-relaxed mb-6">
						The hard part isn't building one website. It's building a system that can handle thousands of websites, all at once, without breaking. Some specific challenges we've solved:
					</p>

					<div class="grid gap-6">
						<div class="card p-6">
							<h3 class="text-lg font-serif text-accent-muted mb-2">The Login Problem</h3>
							<p class="text-foreground-muted font-sans leading-relaxed">
								When you log in to one Grove site, that login should work everywhere in Grove. Getting this handoff smooth and fast was really hard. The solution: a special system that coordinates all the login stuff in one place, like a really smart bouncer who remembers every face.
							</p>
						</div>

						<div class="card p-6">
							<h3 class="text-lg font-serif text-accent-muted mb-2">The Speed Problem</h3>
							<p class="text-foreground-muted font-sans leading-relaxed">
								Every time someone visits a page, Grove used to have to look up a bunch of information from a database. That's slow when thousands of people are visiting at once. The solution: keep the most-used information ready to go, and only check the database occasionally.
							</p>
						</div>

						<div class="card p-6">
							<h3 class="text-lg font-serif text-accent-muted mb-2">The Scale Problem</h3>
							<p class="text-foreground-muted font-sans leading-relaxed">
								What works for 10 users might break with 1,000 users, and definitely breaks with 100,000. We're building systems that automatically handle more load without anyone having to do anything manually.
							</p>
						</div>
					</div>
				</section>

				<!-- The Tech (Simplified) -->
				<section class="mb-12">
					<h2 class="text-2xl font-serif text-foreground mb-4">The Tech (Simplified)</h2>
					<p class="text-foreground-muted font-sans leading-relaxed mb-4">
						Grove runs on Cloudflare's network — basically, servers all over the world that are really close to wherever you are. This makes everything fast.
					</p>
					<p class="text-foreground-muted font-sans leading-relaxed mb-4">
						We use something called <strong class="text-accent-muted">Durable Objects</strong>. Think of them like little robot helpers:
					</p>
					<ul class="space-y-3 text-foreground-muted font-sans">
						<li class="flex items-start gap-3">
							<span class="text-accent-muted mt-1">•</span>
							<span>Each robot has a specific job (handle logins for Alice, track analytics for Bob's site, etc.)</span>
						</li>
						<li class="flex items-start gap-3">
							<span class="text-accent-muted mt-1">•</span>
							<span>They wake up when needed, do their job, then go back to sleep</span>
						</li>
						<li class="flex items-start gap-3">
							<span class="text-accent-muted mt-1">•</span>
							<span>They remember everything even when sleeping</span>
						</li>
						<li class="flex items-start gap-3">
							<span class="text-accent-muted mt-1">•</span>
							<span>They can coordinate with each other</span>
						</li>
					</ul>
					<p class="text-foreground-muted font-sans leading-relaxed mt-4">
						Before this, all the information had to live in one central database, and every request had to go ask that database "hey, is this person logged in?" Now, each person basically has their own little robot that already knows the answer.
					</p>
				</section>

				<!-- Why It Matters -->
				<section class="mb-12">
					<h2 class="text-2xl font-serif text-foreground mb-4">Why Does This Matter?</h2>
					<p class="text-foreground-muted font-sans leading-relaxed mb-6">
						Most platforms that do what Grove does cost a fortune to run because they need big servers running 24/7. Grove's architecture means:
					</p>
					<ul class="space-y-3 text-foreground-muted font-sans">
						<li class="flex items-start gap-3">
							<span class="text-accent-muted mt-1">•</span>
							<span><strong>Cheap to run</strong> — Only pay for what's actually being used</span>
						</li>
						<li class="flex items-start gap-3">
							<span class="text-accent-muted mt-1">•</span>
							<span><strong>Fast everywhere</strong> — Servers near every user</span>
						</li>
						<li class="flex items-start gap-3">
							<span class="text-accent-muted mt-1">•</span>
							<span><strong>Scales infinitely</strong> — 10 users or 10 million, same system</span>
						</li>
						<li class="flex items-start gap-3">
							<span class="text-accent-muted mt-1">•</span>
							<span><strong>Private by design</strong> — Each person's data is isolated</span>
						</li>
					</ul>
				</section>

				<!-- The Vibe -->
				<section class="mb-12">
					<h2 class="text-2xl font-serif text-foreground mb-4">The Vibe</h2>
					<p class="text-foreground-muted font-sans leading-relaxed mb-4">
						Grove is meant to feel like the early internet — personal, creative, weird in a good way. Not algorithmic feeds designed to keep you scrolling. Not ads everywhere. Just your space, your words, your community.
					</p>
					<p class="text-foreground-muted font-sans leading-relaxed">
						The tech we're building is specifically designed to make this sustainable as a small business, not requiring venture capital money to keep the servers running.
					</p>
				</section>

				<!-- Closing -->
				<section class="text-center py-8 border-t border-default">
					<p class="text-foreground-subtle font-sans italic mb-2">
						Personal, creative, sustainable.
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
