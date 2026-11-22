<script lang="ts">
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import Spinner from "@autumnsgrove/lattice/ui/components/ui/Spinner.svelte";
	import Button from "@autumnsgrove/lattice/ui/components/ui/Button.svelte";
	import GroveTerm from "@autumnsgrove/lattice/components/terminology/GroveTerm.svelte";
	import { groveModeStore } from "@autumnsgrove/lattice/ui/stores";
	import Badge from "@autumnsgrove/lattice/ui/components/ui/Badge.svelte";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import { api, getUserDisplayName } from "@autumnsgrove/lattice/utils";
	import { GroveTour } from "@autumnsgrove/lattice/ui/onboarding";
	import { sidebarStore } from "@autumnsgrove/lattice/ui/arbor";
	import {
		actionIcons,
		authIcons,
		featureIcons,
		metricIcons,
		natureIcons,
		navIcons,
		toolIcons,
	} from "@autumnsgrove/prism/icons";

	interface DashboardStats {
		postCount: number;
		totalWords: number;
		draftCount: number;
		topTags: string[];
		accountAgeDays: number;
	}

	let { data } = $props();

	let stats = $state<DashboardStats | null>(null);
	let loading = $state(true);
	let showTutorial = $state(false);
	// Overlay is fixed-position, so it needs its own sidebar-aware inset —
	// it doesn't inherit .arbor-content's margin-left the way normal page
	// content does. Mirrors ArborPanel's own 250px/72px + mobile breakpoint.
	let sidebarCollapsed = $derived(sidebarStore.collapsed);

	async function fetchStats() {
		loading = true;
		try {
			// Use dedicated stats endpoint for better performance
			// Server calculates word count via SQL instead of fetching all content
			stats = await api.get("/api/stats");
		} catch (error) {
			toast.error("Couldn't load your dashboard stats.");
			console.error("Failed to fetch stats:", error);
			stats = {
				postCount: 0,
				totalWords: 0,
				draftCount: 0,
				topTags: [],
				accountAgeDays: 0,
			};
		}
		loading = false;
	}

	$effect(() => {
		fetchStats();
	});

	// Get display name for greeting (see docs/grove-user-identity.md)
	const userName = $derived(getUserDisplayName(data.user));

	function formatNumber(num: number) {
		if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
		if (num >= 1000) return (num / 1000).toFixed(1) + "K";
		return num.toString();
	}
</script>

<div class="max-w-screen-xl">
	<header class="mb-8 dashboard-header">
		<div>
			<div class="flex items-center gap-3 mb-2">
				<h1 class="m-0 text-3xl text-foreground">
					<GroveTerm interactive term="arbor">Dashboard</GroveTerm>
				</h1>
				<a
					href="https://grove.place/knowledge/help/wanderers-and-pathfinders"
					target="_blank"
					rel="noopener noreferrer"
					class="rooted-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
					title="You've planted your tree in the grove"
					aria-label="Learn about being Rooted in Grove"
				>
					<natureIcons.treeDeciduous class="w-3.5 h-3.5" />
					<GroveTerm interactive term="rooted">Rooted</GroveTerm>
				</a>
				{#if data.inGreenhouse}
					<span
						class="greenhouse-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
						title="You're in the greenhouse — early access to experimental features"
					>
						<natureIcons.sprout class="w-3.5 h-3.5" />
						Greenhouse
					</span>
				{/if}
			</div>
			{#if !groveModeStore.current}
				<p class="text-sm text-foreground-subtle italic mt-1 mb-0">
					(<GroveTerm term="arbor" displayOverride="grove" icon />)
				</p>
			{/if}
			<p class="m-0 text-foreground-muted text-lg">Welcome back, {userName}.</p>
		</div>
		<Button variant="secondary" onclick={() => (showTutorial = true)}>
			<navIcons.compass size={16} />
			View Tutorial
		</Button>
	</header>

	<!-- Stats Cards -->
	<div class="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 mb-8">
		<GlassCard>
			<div class="stat-card">
				<div class="stat-icon">
					<featureIcons.fileText class="w-5 h-5" />
				</div>
				<div class="stat-content">
					<span class="stat-label"><GroveTerm interactive term="bloom">Blooms</GroveTerm></span>
					{#if loading}
						<Spinner />
					{:else}
						<span class="stat-value">{stats?.postCount ?? 0}</span>
					{/if}
				</div>
			</div>
		</GlassCard>

		<GlassCard>
			<div class="stat-card">
				<div class="stat-icon">
					<featureIcons.bookOpen class="w-5 h-5" />
				</div>
				<div class="stat-content">
					<span class="stat-label">Words Written</span>
					{#if loading}
						<Spinner />
					{:else}
						<span class="stat-value">{formatNumber(stats?.totalWords ?? 0)}</span>
					{/if}
				</div>
			</div>
		</GlassCard>

		<GlassCard>
			<div class="stat-card">
				<div class="stat-icon">
					<featureIcons.tags class="w-5 h-5" />
				</div>
				<div class="stat-content">
					<span class="stat-label">Top Tags</span>
					{#if loading}
						<Spinner />
					{:else if stats?.topTags?.length}
						<div class="tag-list">
							{#each stats.topTags as tag (tag)}
								<a
									href="/garden/search?tag={encodeURIComponent(tag)}"
									class="dashboard-tag-link"
									aria-label="Filter posts by tag: {tag}"
								>
									<Badge variant="tag">{tag}</Badge>
								</a>
							{/each}
						</div>
					{:else}
						<span class="stat-value text-muted">No tags yet</span>
					{/if}
				</div>
			</div>
		</GlassCard>

		<GlassCard>
			<div class="stat-card">
				<div class="stat-icon">
					<metricIcons.clock class="w-5 h-5" />
				</div>
				<div class="stat-content">
					<span class="stat-label">Account Age</span>
					{#if loading}
						<Spinner />
					{:else}
						<span class="stat-value">{stats?.accountAgeDays ?? 0} days</span>
					{/if}
				</div>
			</div>
		</GlassCard>
	</div>

	<!-- Quick Actions -->
	<section class="mb-8">
		<h2 class="m-0 mb-4 text-xl text-foreground">Quick Actions</h2>
		<div class="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
			<a href="/arbor/garden/new" class="action-card glass-action">
				<actionIcons.plus class="w-7 h-7 text-accent-muted" />
				<span class="font-medium text-center text-sm"
					>New <GroveTerm interactive term="bloom">Bloom</GroveTerm></span
				>
			</a>
			<a href="/arbor/garden" class="action-card glass-action">
				<featureIcons.fileText class="w-7 h-7 text-accent-muted" />
				<span class="font-medium text-center text-sm"
					>Manage <GroveTerm interactive term="your-garden">Garden</GroveTerm></span
				>
			</a>
			<a href="/arbor/images" class="action-card glass-action">
				<featureIcons.image class="w-7 h-7 text-accent-muted" />
				<span class="font-medium text-center text-sm">Upload Images</span>
			</a>
			<a href="/arbor/curios" class="action-card glass-action">
				<toolIcons.amphora class="w-7 h-7 text-accent-muted" />
				<span class="font-medium text-center text-sm"
					><GroveTerm interactive term="curios">Curios</GroveTerm></span
				>
			</a>
			<a
				href="https://grove.place/canopy"
				class="action-card glass-action"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="Browse the Canopy directory (opens in new tab)"
			>
				<featureIcons.bookUser class="w-7 h-7 text-accent-muted" />
				<span class="font-medium text-center text-sm"
					><GroveTerm interactive term="canopy">Canopy</GroveTerm></span
				>
			</a>
			<a href="/arbor/settings" class="action-card glass-action">
				<actionIcons.settings class="w-7 h-7 text-accent-muted" />
				<span class="font-medium text-center text-sm">Settings</span>
			</a>
			<a
				href="/"
				class="action-card glass-action"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="View your live site (opens in new tab)"
			>
				<navIcons.globe class="w-7 h-7 text-accent-muted" />
				<span class="font-medium text-center text-sm">View Site</span>
			</a>
		</div>
	</section>
</div>

{#if showTutorial}
	<div class="tutorial-overlay" class:collapsed={sidebarCollapsed}>
		<div class="tutorial-overlay-inner">
			<GroveTour
				username={data.tenant?.subdomain}
				onComplete={() => (showTutorial = false)}
				onSkip={() => (showTutorial = false)}
			/>
		</div>
	</div>
{/if}

<style>
	.dashboard-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.tutorial-overlay {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		/* Sidebar-aware: fixed positioning ignores .arbor-content's margin-left,
		   so it needs the same 250px/72px inset ArborPanel uses, or it centers
		   across the whole viewport instead of the usable content area. */
		left: calc(250px + 0.75rem);
		z-index: 50;
		overflow-y: auto;
		background: var(--color-background);
		padding: 1.5rem 1rem;
		transition: left 0.3s ease;
	}

	.tutorial-overlay.collapsed {
		left: calc(72px + 0.75rem);
	}

	.tutorial-overlay-inner {
		max-width: 42rem;
		margin: 0 auto;
	}

	@media (max-width: 768px) {
		.tutorial-overlay,
		.tutorial-overlay.collapsed {
			left: 0;
		}
	}

	.stat-card {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
	}

	.stat-icon {
		padding: 0.5rem;
		background: var(--grove-accent-10);
		border-radius: var(--border-radius-small);
		color: var(--color-primary);
	}

	:global(.dark) .stat-icon {
		background: var(--grove-accent-15);
	}

	.stat-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.stat-value.text-muted {
		color: var(--color-text-muted);
		font-size: 0.875rem;
	}

	.tag-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.dashboard-tag-link {
		text-decoration: none;
		transition: opacity 0.15s;
	}

	.dashboard-tag-link:hover {
		opacity: 0.8;
	}

	/* Glass action cards */
	.action-card {
		padding: 1.25rem;
		border-radius: var(--border-radius-standard);
		text-decoration: none;
		color: var(--color-text);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.625rem;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	.glass-action {
		background: rgba(255, 255, 255, 0.6);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.3);
	}

	:global(.dark) .glass-action {
		background: rgba(30, 41, 59, 0.5);
		border-color: rgba(71, 85, 105, 0.3);
	}

	.action-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
	}

	:global(.dark) .action-card:hover {
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
	}

	/* Rooted badge in header */
	.rooted-badge {
		background: var(--grove-accent-15);
		color: var(--grove-accent-dark);
	}

	:global(.dark) .rooted-badge {
		color: var(--grove-accent);
	}

	/* Greenhouse badge in header */
	.greenhouse-badge {
		background: rgba(16, 185, 129, 0.15); /* accent-ok: greenhouse maturity badge */
		color: #065f46;
	}

	:global(.dark) .greenhouse-badge {
		background: rgba(16, 185, 129, 0.2); /* accent-ok: greenhouse maturity badge */
		color: #6ee7b7;
	}
</style>
