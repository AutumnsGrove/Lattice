<script>
	import { GlassCard, Waystone, GroveTerm, GroveSwap, GroveIntro } from '$lib/ui';
	import { Calendar, MapPin, Target, TreePine, Workflow, Map, Sprout, Check, Circle, CircleDot, Diamond } from 'lucide-svelte';
</script>

<div class="max-w-4xl mx-auto">
	<header class="mb-8">
		<div class="flex items-center gap-3 mb-2">
			<Calendar class="w-8 h-8 text-accent-muted" />
			<h1 class="m-0 text-3xl text-foreground"><GroveTerm term="trails">Trail</GroveTerm></h1>
			<Waystone slug="what-are-trails" label="Learn about Trails" />
		</div>
		<GroveIntro term="trails" />
		<p class="m-0 text-foreground-muted text-lg italic">The path becomes clear by walking it.</p>
	</header>

	<!-- Coming Soon Banner -->
	<GlassCard class="mb-8">
		<div class="text-center py-8">
			<div class="mb-4">
				<Sprout class="w-16 h-16 text-accent-muted mx-auto" />
			</div>
			<h2 class="text-2xl font-serif text-foreground mb-3">Coming in First Buds (Early Spring)</h2>
			<p class="text-foreground-muted max-w-2xl mx-auto">
				<GroveTerm term="trails">Trails</GroveTerm> is <GroveTerm term="grove">Grove's</GroveTerm> personal roadmap system for building in public.
				Create and share project timelines with waypoints, phases, and beautiful nature-themed presentations.
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
						<MapPin class="w-5 h-5 text-accent-muted" />
					</div>
					<div>
						<h3 class="text-sm font-medium text-foreground mb-1">Waypoints & Phases</h3>
						<p class="text-xs text-foreground-muted">Mark milestones as you complete them. Group them into phases like "Foundation", "Core Features", "Polish".</p>
					</div>
				</div>
			</GlassCard>

			<GlassCard>
				<div class="flex items-start gap-3">
					<div class="p-2 bg-accent-subtle/10 rounded-lg">
						<Target class="w-5 h-5 text-accent-muted" />
					</div>
					<div>
						<h3 class="text-sm font-medium text-foreground mb-1">Status Tracking</h3>
						<p class="text-xs text-foreground-muted"><Circle class="w-3 h-3 inline-block" /> Planned, <CircleDot class="w-3 h-3 inline-block" /> In Progress, <Check class="w-3 h-3 inline-block" /> Complete, <Diamond class="w-3 h-3 inline-block" /> Deferred—clear visual indicators of where you are.</p>
					</div>
				</div>
			</GlassCard>

			<GlassCard>
				<div class="flex items-start gap-3">
					<div class="p-2 bg-accent-subtle/10 rounded-lg">
						<TreePine class="w-5 h-5 text-accent-muted" />
					</div>
					<div>
						<h3 class="text-sm font-medium text-foreground mb-1">Nature Themes</h3>
						<p class="text-xs text-foreground-muted">Seasonal backgrounds, weather particles, and beautiful nature-themed presentations for Oak+ tiers.</p>
					</div>
				</div>
			</GlassCard>

			<GlassCard>
				<div class="flex items-start gap-3">
					<div class="p-2 bg-accent-subtle/10 rounded-lg">
						<Workflow class="w-5 h-5 text-accent-muted" />
					</div>
					<div>
						<h3 class="text-sm font-medium text-foreground mb-1">Templates</h3>
						<p class="text-xs text-foreground-muted">Pre-configured structures for content plans, project roadmaps, seasonal menus, and more.</p>
					</div>
				</div>
			</GlassCard>
		</div>
	</section>

	<!-- Example Preview -->
	<section class="mb-8">
		<h2 class="text-xl text-foreground mb-4">Example: Project Roadmap</h2>
		<GlassCard>
			<div class="space-y-6">
				<!-- Foundation Phase -->
				<div>
					<div class="flex items-center gap-2 mb-3">
						<h3 class="text-sm font-medium text-foreground uppercase tracking-wide">Foundation</h3>
						<span class="text-xs text-success inline-flex items-center gap-1"><Check class="w-3 h-3" /> Complete</span>
					</div>
					<div class="space-y-2 ml-4">
						<div class="flex items-center gap-2 text-sm text-foreground-muted">
							<Check class="w-3.5 h-3.5 text-success shrink-0" />
							<span>Set up project structure</span>
						</div>
						<div class="flex items-center gap-2 text-sm text-foreground-muted">
							<Check class="w-3.5 h-3.5 text-success shrink-0" />
							<span>Configure development environment</span>
						</div>
						<div class="flex items-center gap-2 text-sm text-foreground-muted">
							<Check class="w-3.5 h-3.5 text-success shrink-0" />
							<span>Write initial documentation</span>
						</div>
					</div>
				</div>

				<!-- Core Features Phase -->
				<div>
					<div class="flex items-center gap-2 mb-3">
						<h3 class="text-sm font-medium text-foreground uppercase tracking-wide">Core Features</h3>
						<span class="text-xs text-accent-muted inline-flex items-center gap-1"><CircleDot class="w-3 h-3" /> In Progress</span>
					</div>
					<div class="space-y-2 ml-4">
						<div class="flex items-center gap-2 text-sm text-foreground-muted">
							<Check class="w-3.5 h-3.5 text-success shrink-0" />
							<span>User authentication</span>
						</div>
						<div class="flex items-center gap-2 text-sm text-accent-muted">
							<CircleDot class="w-3.5 h-3.5 shrink-0" />
							<span>Dashboard implementation</span>
						</div>
						<div class="flex items-center gap-2 text-sm text-foreground-subtle">
							<Circle class="w-3.5 h-3.5 shrink-0" />
							<span>API endpoints</span>
						</div>
					</div>
				</div>

				<!-- Future Phase -->
				<div>
					<div class="flex items-center gap-2 mb-3">
						<h3 class="text-sm font-medium text-foreground uppercase tracking-wide">Future Dreams</h3>
						<span class="text-xs text-foreground-subtle inline-flex items-center gap-1"><Circle class="w-3 h-3" /> Planned</span>
					</div>
					<div class="space-y-2 ml-4">
						<div class="flex items-center gap-2 text-sm text-foreground-subtle">
							<Circle class="w-3.5 h-3.5 shrink-0" />
							<span>Mobile app</span>
						</div>
						<div class="flex items-center gap-2 text-sm text-foreground-subtle">
							<Circle class="w-3.5 h-3.5 shrink-0" />
							<span>Third-party integrations</span>
						</div>
					</div>
				</div>
			</div>
		</GlassCard>
	</section>

	<!-- Philosophy -->
	<GlassCard>
		<div class="flex items-start gap-4">
			<div class="p-3 bg-accent-subtle/10 rounded-lg shrink-0">
				<Map class="w-8 h-8 text-accent-muted" />
			</div>
			<div>
				<h3 class="text-lg font-serif text-foreground mb-2">Build in Public. Show the Journey.</h3>
				<p class="text-sm text-foreground-muted mb-3">
					<GroveSwap term="trails">Trails</GroveSwap> wind through the forest, marking where others have walked. They show the journey, not just the destination.
					Whether planning a creative project, outlining upcoming blog content, or tracking progress on a long-term goal,
					Trails provides a beautiful way to show where you've been, where you are, and where you're headed.
				</p>
				<p class="text-sm text-foreground-subtle italic">
					The path becomes clear by walking it.
				</p>
			</div>
		</div>
	</GlassCard>
</div>

<style>
	/* Additional styling if needed */
</style>
