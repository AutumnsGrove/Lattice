<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { GlassComparisonTable } from '@autumnsgrove/groveengine/ui';
	import SEO from '$lib/components/SEO.svelte';
	import { ArrowLeft } from 'lucide-svelte';

	let { data } = $props();

	// Competitor comparison data — hand-curated for honesty
	const comparisonColumns = [
		{ name: 'Grove', highlighted: true },
		{ name: 'Bear Blog', href: 'https://bearblog.dev' },
		{ name: 'Substack', href: 'https://substack.com' },
		{ name: 'WordPress', href: 'https://wordpress.com' },
		{ name: 'Ghost', href: 'https://ghost.org' },
		{ name: 'Tumblr', href: 'https://tumblr.com' }
	];

	const comparisonRows = [
		{
			feature: 'Custom subdomain included',
			description: 'Your own yourname.platform.tld',
			values: { 'Grove': true, 'Bear Blog': true, 'Substack': true, 'WordPress': true, 'Ghost': false, 'Tumblr': true }
		},
		{
			feature: '100-year domain guarantee',
			description: 'Content preserved after you stop paying',
			values: { 'Grove': true, 'Bear Blog': false, 'Substack': false, 'WordPress': false, 'Ghost': false, 'Tumblr': false }
		},
		{
			feature: 'AI crawler protection',
			description: 'Blocks bots from scraping your writing',
			values: { 'Grove': true, 'Bear Blog': false, 'Substack': false, 'WordPress': 'Plugin', 'Ghost': false, 'Tumblr': false }
		},
		{
			feature: 'No algorithms or engagement metrics',
			values: { 'Grove': true, 'Bear Blog': true, 'Substack': false, 'WordPress': true, 'Ghost': 'Partial', 'Tumblr': false }
		},
		{
			feature: 'Full data export',
			description: 'Download everything in standard formats',
			values: { 'Grove': true, 'Bear Blog': true, 'Substack': 'Partial', 'WordPress': true, 'Ghost': true, 'Tumblr': 'Partial' }
		},
		{
			feature: 'Community features',
			values: { 'Grove': 'Meadow', 'Bear Blog': false, 'Substack': 'Notes', 'WordPress': 'Plugin', 'Ghost': 'Members', 'Tumblr': 'Dashboard' }
		},
		{
			feature: 'Open source / indie web aligned',
			values: { 'Grove': true, 'Bear Blog': 'Partial', 'Substack': false, 'WordPress': true, 'Ghost': true, 'Tumblr': false }
		},
		{
			feature: 'Pricing starts at',
			values: { 'Grove': 'Free — $8/mo', 'Bear Blog': 'Free', 'Substack': 'Free', 'WordPress': 'Free', 'Ghost': '$9/mo', 'Tumblr': 'Free' }
		}
	];
</script>

<SEO
	title="How Grove Compares — Grove"
	description="Honest, feature-level comparison between Grove and other blogging platforms. Where others do it well, we say so."
	url="/compare"
/>

<Header user={data.user} signInHref="https://plant.grove.place" signInLabel="Sign up" />

<main class="min-h-screen flex flex-col items-center px-6 py-12">
	<!-- Back link -->
	<div class="w-full max-w-4xl mb-8">
		<a
			href="/"
			class="inline-flex items-center gap-2 text-sm font-sans text-foreground-subtle hover:text-accent-muted transition-colors"
		>
			<ArrowLeft class="w-4 h-4" aria-hidden="true" />
			Back to Grove
		</a>
	</div>

	<!-- Comparison Table -->
	<section class="w-full max-w-4xl mb-16" aria-labelledby="comparison-heading">
		<GlassComparisonTable
			columns={comparisonColumns}
			rows={comparisonRows}
			title="How Grove Compares"
			description="Honest, feature-level comparison with other platforms. Where others do it well, we say so."
			highlightColumn="Grove"
		/>
	</section>

	<!-- Context note -->
	<div class="w-full max-w-2xl mb-16">
		<p class="text-foreground-subtle text-sm font-sans text-center leading-relaxed">
			This comparison is hand-curated and updated as platforms change.
			If something's wrong, <a href="/contact" class="text-accent-muted hover:text-accent transition-colors underline underline-offset-2">let us know</a>.
		</p>
	</div>
</main>

<Footer />
