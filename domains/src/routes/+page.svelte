<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Forage — AI-Powered Domain Discovery</title>
	<meta name="description" content="Find the perfect domain name with AI-powered search using DeepSeek v3.2 via OpenRouter. Before you can plant, you have to search—walk the forest floor looking for what fits." />
</svelte:head>

<main class="min-h-screen flex flex-col">
	<!-- Hero Section -->
	<section class="flex-1 flex flex-col items-center justify-center px-6 py-16">
		<!-- Logo/Brand -->
		<div class="mb-6">
			<svg
				class="w-20 h-20 text-domain-600"
				viewBox="0 0 100 100"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<!-- Globe with search element -->
				<circle cx="50" cy="50" r="35" stroke="currentColor" stroke-width="3" fill="none" opacity="0.2" />
				<ellipse cx="50" cy="50" rx="35" ry="15" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3" />
				<ellipse cx="50" cy="50" rx="15" ry="35" stroke="currentColor" stroke-width="2" fill="none" opacity="0.3" />
				<circle cx="50" cy="50" r="20" fill="currentColor" fill-opacity="0.15" />
				<circle cx="50" cy="50" r="10" fill="currentColor" />
				<!-- Search magnifier -->
				<circle cx="68" cy="68" r="12" stroke="currentColor" stroke-width="3" fill="white" />
				<line x1="77" y1="77" x2="88" y2="88" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
			</svg>
		</div>

		<!-- Title -->
		<h1 class="text-4xl md:text-5xl font-serif text-bark mb-3 text-center">Forage</h1>

		<!-- Tagline -->
		<p class="text-xl md:text-2xl text-bark/70 font-serif italic mb-8 text-center">
			before you can plant, you have to search
		</p>

		<!-- Decorative divider -->
		<div class="flex items-center gap-4 mb-8">
			<div class="w-12 h-px bg-domain-300"></div>
			<svg class="w-4 h-4 text-domain-400" viewBox="0 0 20 20" fill="currentColor">
				<circle cx="10" cy="10" r="4" />
			</svg>
			<div class="w-12 h-px bg-domain-300"></div>
		</div>

		<!-- Description -->
		<div class="max-w-xl text-center mb-12 space-y-4">
			<p class="text-bark/70 font-sans leading-relaxed">
				Finding the perfect domain doesn't have to take weeks. Tell Forage about your project, your vibe,
				your budget—and it returns a curated list of available domains that actually fit. Walk the forest
				floor, looking for something worth bringing home.
			</p>
			<p class="text-bark/60 font-sans text-sm">
				Powered by DeepSeek v3.2 via OpenRouter for zero-data-retention compliance. Real-time availability checks and smart scoring.
			</p>
		</div>

		<!-- How It Works -->
		<div class="grid md:grid-cols-3 gap-6 max-w-3xl mb-12">
			<div class="card p-6 text-center">
				<div class="w-12 h-12 mx-auto mb-4 text-domain-600">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-full h-full">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
					</svg>
				</div>
				<h3 class="font-serif text-bark mb-2">AI Generation</h3>
				<p class="text-bark/60 font-sans text-sm">
					Creative domain suggestions powered by DeepSeek v3.2, based on your brand, vibe, and preferences
				</p>
			</div>

			<div class="card p-6 text-center">
				<div class="w-12 h-12 mx-auto mb-4 text-grove-600">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-full h-full">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<h3 class="font-serif text-bark mb-2">Availability Check</h3>
				<p class="text-bark/60 font-sans text-sm">
					Real-time RDAP verification against global registries
				</p>
			</div>

			<div class="card p-6 text-center">
				<div class="w-12 h-12 mx-auto mb-4 text-amber-600">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="w-full h-full">
						<path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
					</svg>
				</div>
				<h3 class="font-serif text-bark mb-2">Smart Scoring</h3>
				<p class="text-bark/60 font-sans text-sm">
					Each domain rated on pronounceability, memorability, and brand fit
				</p>
			</div>
		</div>

		<!-- CTA / Login -->
		{#if data.user}
			<a href="/admin" class="btn-primary">
				Open Dashboard
			</a>
		{:else}
			<a href="/admin/login" class="btn-primary">
				Admin Login
			</a>
		{/if}
	</section>

	<!-- Footer -->
	<footer class="py-8 text-center">
		<div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-sans text-bark/50 mb-4">
			<a href="https://grove.place" class="hover:text-domain-600 transition-colors">
				Grove
			</a>
			<span class="text-domain-300">·</span>
			<a href="https://grove.place/vision" class="hover:text-domain-600 transition-colors">
				Vision
			</a>
			<span class="text-domain-300">·</span>
			<a href="https://grove.place/pricing" class="hover:text-domain-600 transition-colors">
				Pricing
			</a>
			<span class="text-domain-300">·</span>
			<a href="https://grove.place/legal" class="hover:text-domain-600 transition-colors">
				Legal
			</a>
		</div>
		<div class="text-xs text-bark/40 font-sans">
			Part of the Grove ecosystem
		</div>
	</footer>
</main>
