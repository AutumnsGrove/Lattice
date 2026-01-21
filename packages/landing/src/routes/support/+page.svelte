<script lang="ts">
	import { Header, Footer, seasonStore } from '@autumnsgrove/groveengine/ui/chrome';
	import SEO from '$lib/components/SEO.svelte';
	import { Logo } from '@autumnsgrove/groveengine/ui/nature';
	import { Coffee, Heart, TreePine, Sparkles } from 'lucide-svelte';
</script>

<SEO
	title="Support Grove"
	description="Help keep Grove growing. No investors, no venture capital—just one person building something meaningful."
	url="/support"
/>

<Header />

<main class="min-h-screen flex flex-col items-center px-6 py-16">
	<div class="max-w-2xl w-full">
		<!-- Header -->
		<div class="text-center mb-12">
			<div class="mb-6">
				<Logo class="w-16 h-16 mx-auto" season={$seasonStore} />
			</div>
			<h1 class="text-3xl md:text-4xl font-serif text-foreground mb-3">Support Grove</h1>
			<p class="text-lg text-foreground-muted font-sans">
				Help keep the forest growing.
			</p>
		</div>

		<!-- The pitch -->
		<div class="glass-support rounded-2xl p-8 mb-10">
			<div class="prose prose-grove max-w-none text-center">
				<p class="text-foreground-muted font-sans leading-relaxed mb-4">
					Grove doesn't have investors. No venture capital. No pressure to grow at all costs or sell your data to make the numbers work.
				</p>
				<p class="text-foreground-muted font-sans leading-relaxed mb-4">
					It's just me, building something I believe in.
				</p>
				<p class="text-foreground-muted font-sans leading-relaxed">
					If Grove resonates with you, if you believe in quiet corners of the internet, queer-friendly spaces, and words that belong to the people who write them, you can support the vision directly.
				</p>
			</div>
		</div>

		<!-- Ko-fi Widget -->
		<div class="mb-12">
			<div class="kofi-widget-container rounded-2xl overflow-hidden shadow-sm border border-default">
				<iframe
					id="kofiframe"
					src="https://ko-fi.com/autumnsgrove/?hidefeed=true&widget=true&embed=true&preview=true"
					class="w-full border-none"
					height="712"
					title="Support Autumn on Ko-fi"
				></iframe>
			</div>
			<p class="text-sm text-foreground-subtle mt-4 text-center">
				One-time support, no account needed.
			</p>
		</div>

		<!-- Fallback link for those who block iframes -->
		<noscript>
			<div class="text-center mb-12">
				<a
					href="https://ko-fi.com/autumnsgrove"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-accent text-accent-foreground hover:bg-accent-hover transition-colors font-sans font-medium text-lg shadow-sm hover:shadow-md"
				>
					<Coffee class="w-5 h-5" />
					<span>Buy me a coffee on Ko-fi</span>
				</a>
			</div>
		</noscript>

		<!-- What support means -->
		<div class="space-y-4 mb-12">
			<h2 class="text-lg font-serif text-foreground text-center mb-6">What your support goes toward</h2>

			<div class="grid gap-4">
				<div class="flex items-start gap-4 p-4 rounded-xl border border-default bg-surface">
					<div class="p-2 rounded-lg bg-accent-subtle/20 mt-0.5">
						<TreePine class="w-4 h-4 text-accent-muted" />
					</div>
					<div>
						<p class="font-sans font-medium text-foreground">Keeping the servers running</p>
						<p class="text-sm text-foreground-subtle">Hosting, databases, CDN, and all the infrastructure that keeps Grove online.</p>
					</div>
				</div>

				<div class="flex items-start gap-4 p-4 rounded-xl border border-default bg-surface">
					<div class="p-2 rounded-lg bg-accent-subtle/20 mt-0.5">
						<Sparkles class="w-4 h-4 text-accent-muted" />
					</div>
					<div>
						<p class="font-sans font-medium text-foreground">Building new features</p>
						<p class="text-sm text-foreground-subtle">More time to code means more features, faster. Federation, galleries, and everything on the roadmap.</p>
					</div>
				</div>

				<div class="flex items-start gap-4 p-4 rounded-xl border border-default bg-surface">
					<div class="p-2 rounded-lg bg-accent-subtle/20 mt-0.5">
						<Heart class="w-4 h-4 text-accent-muted" />
					</div>
					<div>
						<p class="font-sans font-medium text-foreground">Sustaining the dream</p>
						<p class="text-sm text-foreground-subtle">Every coffee helps me spend more time on Grove and less time worrying about whether I can keep doing this.</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Already a subscriber note -->
		<div class="text-center mb-10 p-6 rounded-xl bg-surface-subtle border border-default">
			<p class="text-foreground-muted font-sans text-sm leading-relaxed">
				Already have a Grove subscription? <span class="text-foreground">You're already supporting the dream.</span> Thank you for being rooted with us.
			</p>
		</div>

		<!-- Closing note -->
		<div class="text-center">
			<p class="text-sm text-foreground-subtle font-sans italic">
				Every bit helps. Every kind word, too.
			</p>
		</div>
	</div>
</main>

<Footer />

<style>
	.glass-support {
		background: rgba(255, 255, 255, 0.6);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--color-divider);
	}

	:global(.dark) .glass-support {
		background: rgba(30, 41, 59, 0.5);
	}

	.kofi-widget-container {
		background: #f9f9f9;
	}

	/* Ko-fi widget has a fixed light theme, so we add a subtle frame */
	:global(.dark) .kofi-widget-container {
		background: #f9f9f9;
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
	}
</style>
