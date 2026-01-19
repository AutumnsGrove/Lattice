<script lang="ts">
	import { Header, Footer, seasonStore } from '@autumnsgrove/groveengine/ui/chrome';
	import SEO from '$lib/components/SEO.svelte';
	import { Logo } from '@autumnsgrove/groveengine/ui/nature';
	import { Mail, ExternalLink, Heart, Compass } from 'lucide-svelte';
</script>

<SEO
	title="Contact — Grove"
	description="Get in touch with Autumn, the creator of Grove. One person, one vision, building something meaningful."
	url="/contact"
/>

<Header />

<main class="min-h-screen flex flex-col items-center px-6 py-16">
	<div class="max-w-2xl w-full">
		<!-- Header -->
		<div class="text-center mb-12">
			<div class="mb-6">
				<Logo class="w-16 h-16 mx-auto" season={$seasonStore} />
			</div>
			<h1 class="text-3xl md:text-4xl font-serif text-foreground mb-3">Hello there</h1>
			<p class="text-lg text-foreground-muted font-sans mb-4">
				I'm Autumn, and I built Grove.
			</p>
			<a
				href="/knowledge/help/wanderers-and-pathfinders"
				class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-subtle/20 text-sm text-accent-muted hover:bg-accent-subtle/30 hover:text-accent transition-colors"
				title="The grove keeper who finds and shows the way"
				aria-label="Learn about the Wayfinder role"
			>
				<Compass class="w-3.5 h-3.5" />
				<span>Wayfinder</span>
			</a>
		</div>

		<!-- Personal note -->
		<div class="glass-contact rounded-2xl p-8 mb-10">
			<!-- Profile photo -->
			<div class="w-32 h-32 mx-auto mb-6">
				<img
					src="https://cdn.grove.place/profile-mjxaqbpu.jpeg"
					alt="Autumn, creator of Grove"
					class="w-full h-full rounded-full object-cover border-2 border-accent-subtle shadow-sm"
				/>
			</div>

			<div class="prose prose-grove max-w-none text-center">
				<p class="text-foreground-muted font-sans leading-relaxed mb-4">
					Grove started as a vision and a dream—a quiet corner of the internet where words could grow without being harvested. Where community means connection, not competition. Where your writing belongs to you.
				</p>
				<p class="text-foreground-muted font-sans leading-relaxed mb-4">
					I'm literally one girl building all of this. Every line of code, every design decision, every word you read here—that's me.
				</p>
				<p class="text-foreground-muted font-sans leading-relaxed">
					I'm damn proud of what we're growing here. And I'd love to hear from you.
				</p>
			</div>
		</div>

		<!-- Contact options -->
		<div class="space-y-4 mb-12">
			<h2 class="text-lg font-serif text-foreground text-center mb-6">Get in touch</h2>

			<!-- Email -->
			<a
				href="mailto:autumn@grove.place"
				class="flex items-center gap-4 p-4 rounded-xl border border-default bg-surface hover:bg-surface-hover transition-colors group"
			>
				<div class="p-3 rounded-lg bg-accent-subtle/20">
					<Mail class="w-5 h-5 text-accent-muted" />
				</div>
				<div class="flex-1">
					<p class="font-sans font-medium text-foreground group-hover:text-accent-muted transition-colors">Email me</p>
					<p class="text-sm text-foreground-subtle">autumn@grove.place</p>
				</div>
			</a>

			<!-- Blog -->
			<a
				href="https://autumnsgrove.com/blog"
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center gap-4 p-4 rounded-xl border border-default bg-surface hover:bg-surface-hover transition-colors group"
			>
				<div class="p-3 rounded-lg bg-accent-subtle/20">
					<ExternalLink class="w-5 h-5 text-accent-muted" />
				</div>
				<div class="flex-1">
					<p class="font-sans font-medium text-foreground group-hover:text-accent-muted transition-colors">Read my blog</p>
					<p class="text-sm text-foreground-subtle">Development updates, thoughts, and stories</p>
				</div>
			</a>
		</div>

		<!-- Closing note -->
		<div class="text-center">
			<p class="text-sm text-foreground-subtle font-sans flex items-center justify-center gap-2">
				Built with <Heart class="w-4 h-4 text-accent-muted" /> and a lot of tea
			</p>
		</div>
	</div>
</main>

<Footer />

<style>
	.glass-contact {
		background: rgba(255, 255, 255, 0.6);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--color-divider);
	}

	:global(.dark) .glass-contact {
		background: rgba(30, 41, 59, 0.5);
	}
</style>
