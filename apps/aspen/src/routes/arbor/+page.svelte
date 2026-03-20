<script lang="ts">
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import Spinner from "@autumnsgrove/lattice/ui/components/ui/Spinner.svelte";
	import GroveTerm from "@autumnsgrove/lattice/components/terminology/GroveTerm.svelte";
	import BetaBadge from "@autumnsgrove/lattice/ui/components/ui/BetaBadge.svelte";
	import BetaWelcomeDialog from "@autumnsgrove/lattice/ui/components/ui/BetaWelcomeDialog.svelte";
	import { groveModeStore } from "@autumnsgrove/lattice/ui/stores";
	import Badge from "@autumnsgrove/lattice/ui/components/ui/Badge.svelte";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import { api, getUserDisplayName } from "@autumnsgrove/lattice/utils";
	import {
		actionIcons,
		authIcons,
		blazeIcons,
		featureIcons,
		metricIcons,
		natureIcons,
		navIcons,
		toolIcons,
	} from "@autumnsgrove/prism/icons";

	/**
	 * @typedef {Object} DashboardStats
	 * @property {number} postCount
	 * @property {number} totalWords
	 * @property {number} draftCount
	 * @property {string[]} topTags
	 * @property {number} accountAgeDays
	 */

	let { data } = $props();

	/** @type {DashboardStats | null} */
	let stats = $state(null);
	let loading = $state(true);

	// Current roadmap phase config
	const currentPhase = {
		key: "thaw",
		title: "Thaw",
		subtitle: "The ice begins to crack",
		description: "Grove opens its doors. The first trees take root.",
		progress: 33,
	};

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

	/** @param {number} num */
	function formatNumber(num) {
		if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
		if (num >= 1000) return (num / 1000).toFixed(1) + "K";
		return num.toString();
	}
</script>

<div class="max-w-screen-xl">
	<header class="mb-8">
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
			{#if data.isBeta}
				<BetaBadge />
			{/if}
		</div>
		{#if !groveModeStore.current}
			<p class="text-sm text-foreground-subtle italic mt-1 mb-0">
				(<GroveTerm term="arbor" displayOverride="grove" icon />)
			</p>
		{/if}
		<p class="m-0 text-foreground-muted text-lg">Welcome back, {userName}.</p>
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
			<a href="/arbor/analytics" class="action-card glass-action">
				<metricIcons.barChart class="w-7 h-7 text-accent-muted" />
				<span class="font-medium text-center text-sm"
					>View <GroveTerm interactive term="rings">Rings</GroveTerm></span
				>
			</a>
			<a href="/arbor/curios" class="action-card glass-action">
				<toolIcons.amphora class="w-7 h-7 text-accent-muted" />
				<span class="font-medium text-center text-sm"
					><GroveTerm interactive term="curios">Curios</GroveTerm></span
				>
			</a>
			<a
				href="https://grove.place/meadow"
				class="action-card glass-action"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="Browse the Meadow feed (opens in new tab)"
			>
				<authIcons.users class="w-7 h-7 text-accent-muted" />
				<span class="font-medium text-center text-sm"
					><GroveTerm interactive term="meadow">Meadow</GroveTerm></span
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

	<!-- Roadmap Preview -->
	<section>
		<a
			href="https://grove.place/roadmap"
			target="_blank"
			rel="noopener noreferrer"
			aria-label="View Grove roadmap (opens in new tab)"
			class="roadmap-card glass-roadmap"
		>
			<div class="roadmap-header">
				<div class="roadmap-badge">
					<blazeIcons.megaphone class="w-4 h-4" />
					<span>What's New in the Grove</span>
				</div>
				<navIcons.arrowRight
					class="w-5 h-5 text-foreground-subtle group-hover:text-accent-muted transition-colors"
				/>
			</div>

			<div class="roadmap-content">
				<div class="roadmap-phase">
					<div class="phase-indicator">
						<navIcons.mapPin class="w-4 h-4 text-accent-muted" />
						<span class="text-xs uppercase tracking-wide text-foreground-subtle">Currently</span>
					</div>
					<h3 class="text-xl font-serif text-foreground">{currentPhase.title}</h3>
					<p class="text-sm text-foreground-muted italic">{currentPhase.subtitle}</p>
				</div>

				<!-- Progress bar -->
				<div class="progress-container">
					<div class="progress-bar">
						<div class="progress-fill" style="width: {currentPhase.progress}%"></div>
					</div>
				</div>

				<p class="text-sm text-foreground-subtle">{currentPhase.description}</p>
			</div>
		</a>
	</section>
</div>

{#if data.isBeta}
	<BetaWelcomeDialog autoShow {userName} feedbackUrl="https://grove.place/feedback" />
{/if}

<style>
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

	/* Roadmap card */
	.roadmap-card {
		display: block;
		padding: 1.5rem;
		border-radius: var(--border-radius-standard);
		text-decoration: none;
		color: var(--color-text);
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	.glass-roadmap {
		background: linear-gradient(135deg, var(--grove-accent-10), var(--grove-accent-5));
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--grove-accent-20);
	}

	:global(.dark) .glass-roadmap {
		background: linear-gradient(135deg, var(--grove-accent-15), var(--grove-accent-8));
		border-color: var(--grove-accent-25);
	}

	.roadmap-card:hover {
		transform: scale(1.01);
		box-shadow: 0 8px 32px var(--grove-accent-15);
	}

	.roadmap-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.roadmap-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.375rem 0.75rem;
		background: var(--grove-accent-15);
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--grove-accent-dark);
	}

	:global(.dark) .roadmap-badge {
		color: var(--grove-accent);
	}

	.roadmap-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.roadmap-phase {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.phase-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.progress-container {
		margin: 0.25rem 0;
	}

	.progress-bar {
		height: 0.5rem;
		background: rgba(0, 0, 0, 0.1);
		border-radius: 9999px;
		overflow: hidden;
	}

	:global(.dark) .progress-bar {
		background: rgba(255, 255, 255, 0.1);
	}

	.progress-fill {
		height: 100%;
		background: var(--grove-accent-dark);
		border-radius: 9999px;
		transition: width 0.5s ease;
	}

	:global(.dark) .progress-fill {
		background: var(--grove-accent);
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
