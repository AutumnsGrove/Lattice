<script>
	import { GlassCard, Waystone, GroveTerm, GroveIntro } from '$lib/ui';
	import { BarChart3, TrendingUp, Heart, Eye, Users, Calendar, Sprout, Leaf, TreePine } from 'lucide-svelte';
</script>

<div class="max-w-4xl mx-auto">
	<header class="mb-8">
		<div class="flex items-center gap-3 mb-2">
			<BarChart3 class="w-8 h-8 text-accent-muted" />
			<h1 class="m-0 text-3xl text-foreground"><GroveTerm term="rings">Rings</GroveTerm></h1>
			<Waystone slug="what-is-rings" label="Learn about Rings" />
		</div>
		<GroveIntro term="rings" />
		<p class="m-0 text-foreground-muted text-lg italic">Count the rings and you learn the story.</p>
	</header>

	<!-- Coming Soon Banner -->
	<GlassCard class="mb-8">
		<div class="text-center py-8">
			<div class="mb-4">
				<Sprout class="w-16 h-16 text-accent-muted mx-auto" />
			</div>
			<h2 class="text-2xl font-serif text-foreground mb-3">Coming in Full Bloom (Early Summer)</h2>
			<p class="text-foreground-muted max-w-2xl mx-auto">
				<GroveTerm term="rings">Rings</GroveTerm> is <GroveTerm term="grove">Grove's</GroveTerm> private analytics system designed for writers, not marketers.
				Meaningful insights without the anxiety of real-time dashboards.
			</p>
		</div>
	</GlassCard>

	<!-- Feature Preview -->
	<section class="mb-8">
		<h2 class="text-xl text-foreground mb-4">What to Expect</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			<GlassCard>
				<div class="flex items-start gap-3">
					<div class="p-2 bg-accent-subtle/10 rounded-lg">
						<Eye class="w-5 h-5 text-accent-muted" />
					</div>
					<div>
						<h3 class="text-sm font-medium text-foreground mb-1">24-Hour Delayed Stats</h3>
						<p class="text-xs text-foreground-muted">No real-time dopamine hits. Publish a post, come back tomorrow to see how it did.</p>
					</div>
				</div>
			</GlassCard>

			<GlassCard>
				<div class="flex items-start gap-3">
					<div class="p-2 bg-accent-subtle/10 rounded-lg">
						<TrendingUp class="w-5 h-5 text-accent-muted" />
					</div>
					<div>
						<h3 class="text-sm font-medium text-foreground mb-1">Resonance Indicators</h3>
						<p class="text-xs text-foreground-muted">Positive signals like <Sprout class="inline w-3.5 h-3.5 text-accent-muted" /> Sparked Interest, <Leaf class="inline w-3.5 h-3.5 text-accent-muted" /> Really Resonated, <TreePine class="inline w-3.5 h-3.5 text-accent-muted" /> Community Favorite.</p>
					</div>
				</div>
			</GlassCard>

			<GlassCard>
				<div class="flex items-start gap-3">
					<div class="p-2 bg-accent-subtle/10 rounded-lg">
						<Heart class="w-5 h-5 text-accent-muted" />
					</div>
					<div>
						<h3 class="text-sm font-medium text-foreground mb-1">Writer Wellness</h3>
						<p class="text-xs text-foreground-muted">Digest Mode and Focus Periods help you step away from metrics when you need to create.</p>
					</div>
				</div>
			</GlassCard>

			<GlassCard>
				<div class="flex items-start gap-3">
					<div class="p-2 bg-accent-subtle/10 rounded-lg">
						<Users class="w-5 h-5 text-accent-muted" />
					</div>
					<div>
						<h3 class="text-sm font-medium text-foreground mb-1">Meaningful Metrics</h3>
						<p class="text-xs text-foreground-muted">Engaged Readers, Return Readers, Deep Reads—metrics that matter for writers.</p>
					</div>
				</div>
			</GlassCard>
		</div>
	</section>

	<!-- Philosophy -->
	<GlassCard>
		<div class="flex items-start gap-4">
			<div class="p-3 bg-accent-subtle/10 rounded-lg shrink-0">
				<TreePine class="w-8 h-8 text-accent-muted" />
			</div>
			<div>
				<h3 class="text-lg font-serif text-foreground mb-2">Private by Default. Delayed by Design.</h3>
				<p class="text-sm text-foreground-muted mb-3">
					Count the rings of a tree and you learn its story. Each ring records a season:
					growth in plenty, resilience through hardship, the quiet accumulation of years.
					Rings are internal. Private. You only see them when you look closely at your own tree.
				</p>
				<p class="text-sm text-foreground-subtle italic">
					Your growth reflected back to you, not performed for others.
				</p>
			</div>
		</div>
	</GlassCard>
</div>

<style>
	/* Additional styling if needed */
</style>
