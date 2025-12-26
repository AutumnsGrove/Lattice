<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';

	// Components
	import Logo from '$lib/components/Logo.svelte';
	import Lantern from '$lib/components/nature/structural/Lantern.svelte';

	// Tools that integrate with Grove
	const tools = [
		{
			name: 'Forage',
			tagline: 'Domain Discovery',
			description: 'An AI-powered domain hunting tool that turns weeks of frustrating searches into hours. Tell it about your project, your vibe, your budget—and it returns a curated list of available domains that actually fit.',
			status: 'building',
			icon: '🔍',
			domain: 'forage.grove.place',
			integration: 'Available as an add-on for Evergreen tier, or standalone purchase'
		},
		{
			name: 'Outpost',
			tagline: 'On-Demand Minecraft',
			description: 'A Minecraft server that spins up when someone wants to play and shuts down when the world goes quiet. No 24/7 hosting fees for a server that sits empty. Just a place that\'s there when you need it.',
			status: 'planned',
			icon: '⛏️',
			domain: 'mc.grove.place',
			integration: 'For Grove community members'
		}
	];

	function getStatusBadge(status: string) {
		switch (status) {
			case 'live': return { text: 'Live', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' };
			case 'building': return { text: 'Building', class: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' };
			case 'planned': return { text: 'Planned', class: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
			default: return { text: status, class: 'bg-slate-100 text-slate-600' };
		}
	}
</script>

<svelte:head>
	<title>The Workshop — Grove Roadmap</title>
	<meta name="description" content="Tools being built in the Grove workshop. Domain discovery, Minecraft servers, and more." />
</svelte:head>

<main class="min-h-screen flex flex-col bg-amber-50 dark:bg-slate-900">
	<Header />

	<!-- Hero -->
	<section class="relative py-16 px-6 text-center overflow-hidden bg-gradient-to-b from-amber-100 via-amber-50 to-orange-50 dark:from-slate-800 dark:via-slate-900 dark:to-amber-950/20">
		<!-- Lanterns -->
		<div class="absolute top-8 left-[15%] opacity-60" aria-hidden="true">
			<Lantern class="w-8 h-12" variant="hanging" lit animate />
		</div>
		<div class="absolute top-12 right-[20%] opacity-50" aria-hidden="true">
			<Lantern class="w-6 h-10" variant="hanging" lit animate />
		</div>

		<div class="max-w-3xl mx-auto relative z-10">
			<a href="/roadmap" class="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground mb-6 transition-colors">
				← Back to Roadmap
			</a>
			<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">
				The Workshop
			</h1>
			<p class="text-lg text-foreground-muted max-w-xl mx-auto">
				Tools being crafted alongside Grove. Some integrate directly, some stand alone—all built with the same care.
			</p>
		</div>
	</section>

	<!-- Tools Grid -->
	<section class="flex-1 py-12 px-6">
		<div class="max-w-4xl mx-auto">
			<div class="grid gap-8 md:grid-cols-2">
				{#each tools as tool}
					{@const badge = getStatusBadge(tool.status)}
					<article class="p-6 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-amber-200 dark:border-slate-700">
						<div class="flex items-start justify-between mb-4">
							<div class="flex items-center gap-3">
								<span class="text-3xl">{tool.icon}</span>
								<div>
									<h2 class="text-xl font-serif text-foreground">{tool.name}</h2>
									<p class="text-sm text-foreground-muted">{tool.tagline}</p>
								</div>
							</div>
							<span class="px-2 py-1 rounded-full text-xs font-medium {badge.class}">
								{badge.text}
							</span>
						</div>

						<p class="text-foreground-muted mb-4 leading-relaxed">
							{tool.description}
						</p>

						<div class="pt-4 border-t border-divider space-y-2">
							<div class="flex items-center gap-2 text-sm">
								<span class="text-foreground-faint">Domain:</span>
								<code class="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-foreground-muted">{tool.domain}</code>
							</div>
							<div class="text-sm text-foreground-faint">
								{tool.integration}
							</div>
						</div>
					</article>
				{/each}
			</div>

			<!-- More tools coming -->
			<div class="text-center mt-12 p-8 rounded-xl bg-amber-100/50 dark:bg-slate-800/50 border border-dashed border-amber-300 dark:border-slate-600">
				<p class="text-foreground-muted">
					More tools are always being dreamed up in the workshop.
				</p>
				<p class="text-sm text-foreground-faint mt-2">
					Have an idea? <a href="mailto:autumnbrown23@pm.me" class="text-accent hover:underline">Let's talk</a>
				</p>
			</div>
		</div>
	</section>

	<!-- Links -->
	<section class="py-8 px-6 bg-white/50 dark:bg-slate-900/50 border-t border-divider">
		<div class="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
			<a href="/roadmap" class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-foreground-muted hover:text-foreground transition-colors">
				← Main Roadmap
			</a>
			<a href="/roadmap/beyond" class="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-foreground-muted hover:text-foreground transition-colors">
				Beyond the Grove →
			</a>
		</div>
	</section>

	<Footer />
</main>
