<script lang="ts">
	/**
	 * Pulse Public Route — Page
	 *
	 * The grove's heartbeat made visible. A clearing where you can feel
	 * the life force flowing — commits, merges, issues, releases —
	 * all in real time.
	 */

	import { Activity, HeartPulse, Zap } from "lucide-svelte";
	import { GlassCard } from "$lib/ui/components/ui";
	import { GroveDivider } from "$lib/ui/components/nature";
	import { Pulse } from "$lib/curios/pulse";
	import { toast } from "$lib/ui";

	import type {
		PulseEvent,
		PulseDailyStats,
		PulseHourlyActivity,
		PulseActiveStatus,
		PulseTodayStats,
		PulseStreak,
		PulseCurioConfig,
	} from "$lib/curios/pulse";

	interface PageData {
		isLanding: boolean;
		config: PulseCurioConfig;
		active: PulseActiveStatus;
		today: PulseTodayStats;
		streak: PulseStreak;
		events: PulseEvent[];
		dailyStats: PulseDailyStats[];
		hourlyActivity: PulseHourlyActivity[];
	}

	let { data }: { data: PageData } = $props();

	// Local state for incremental loading — captures initial events, loadMore() appends locally
	// svelte-ignore state_referenced_locally
	const initialEvents = data.events;
	let events = $state(initialEvents);
	let hasMore = $derived(initialEvents.length >= (data.config.feedMaxItems || 50));
	let offset = $derived(initialEvents.length);

	async function loadMore(): Promise<void> {
		try {
			const response = await fetch(`/api/curios/pulse?limit=50&offset=${offset}`); // csrf-ok

			if (!response.ok) throw new Error("Failed to load more");

			const result = (await response.json()) as {
				events: PulseEvent[];
				pagination: { hasMore: boolean };
			};
			events = [...events, ...result.events];
			offset += result.events.length;
			hasMore = result.pagination.hasMore;
		} catch (error) {
			toast.error("Failed to load more events");
			console.error("Load more error:", error);
		}
	}

	// Derive a warm summary line from today's data
	const todaySummary = $derived.by(() => {
		const parts: string[] = [];
		if (data.today.commits > 0)
			parts.push(`${data.today.commits} commit${data.today.commits !== 1 ? "s" : ""}`);
		if (data.today.prsMerged > 0)
			parts.push(`${data.today.prsMerged} PR${data.today.prsMerged !== 1 ? "s" : ""} merged`);
		if (data.today.issuesClosed > 0)
			parts.push(
				`${data.today.issuesClosed} issue${data.today.issuesClosed !== 1 ? "s" : ""} closed`,
			);
		if (parts.length === 0) return null;
		return parts.join(", ") + " today";
	});
</script>

<svelte:head>
	<title>{data.isLanding ? "Lattice Pulse" : "Development Pulse"}</title>
	<meta
		name="description"
		content={data.isLanding
			? "The heartbeat of Lattice — live development activity from the engine that powers Grove"
			: "Live development heartbeat — real-time activity from GitHub"}
	/>
</svelte:head>

<div class="pulse-page">
	<!-- Hero: The heartbeat of the grove -->
	<GlassCard class="pulse-page-hero">
		<div class="hero-content">
			<div class="hero-icon-ring">
				<HeartPulse size={32} strokeWidth={1.5} />
			</div>
			<div class="hero-text">
				<h1>{data.isLanding ? "Lattice Pulse" : "Development Pulse"}</h1>
				<p class="hero-subtitle">
					{#if data.isLanding}
						The heartbeat of the engine that powers Grove
					{:else}
						Live heartbeat of what's being built, right now
					{/if}
				</p>
				{#if todaySummary}
					<p class="hero-today">
						<Zap size={14} />
						{todaySummary}
					</p>
				{/if}
			</div>
		</div>
	</GlassCard>

	<!-- Seasonal divider — the forest breathes between sections -->
	<GroveDivider count={5} size="xs" gap="gap-3" />

	<!-- The Pulse itself -->
	<Pulse
		config={data.config}
		active={data.active}
		today={data.today}
		streak={data.streak}
		{events}
		dailyStats={data.dailyStats}
		hourlyActivity={data.hourlyActivity}
		{hasMore}
		onLoadMore={loadMore}
	/>

	<!-- Footer breathing room -->
	<div class="pulse-footer" aria-hidden="true">
		<Activity size={16} strokeWidth={1.5} />
		<span>Events arrive in real time via webhook</span>
	</div>
</div>

<style>
	.pulse-page {
		max-width: 900px;
		margin: 0 auto;
		padding: 1.5rem 1rem 3rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* ── Hero Card ── */

	:global(.pulse-page-hero) {
		padding: 2rem 2rem 1.75rem !important;
		border: 1px solid var(--grove-overlay-8, rgba(34, 197, 94, 0.08));
	}

	.hero-content {
		display: flex;
		align-items: flex-start;
		gap: 1.25rem;
	}

	.hero-icon-ring {
		flex-shrink: 0;
		width: 3.5rem;
		height: 3.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background: var(--grove-overlay-8, rgba(34, 197, 94, 0.08));
		color: var(--grove-600, #16a34a);
	}

	:global(.dark) .hero-icon-ring {
		background: rgba(74, 222, 128, 0.1);
		color: var(--grove-400, #4ade80);
	}

	.hero-text {
		flex: 1;
		min-width: 0;
	}

	.hero-text h1 {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-foreground, var(--color-text));
		margin: 0;
		line-height: 1.2;
	}

	.hero-subtitle {
		color: var(--color-muted-foreground, var(--color-text-muted));
		font-size: 0.95rem;
		margin: 0.375rem 0 0;
		line-height: 1.5;
	}

	.hero-today {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		margin: 0.75rem 0 0;
		padding: 0.25rem 0.625rem 0.25rem 0.5rem;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--grove-700, #15803d);
		background: var(--grove-overlay-8, rgba(34, 197, 94, 0.08));
		border-radius: 999px;
	}

	:global(.dark) .hero-today {
		color: var(--grove-300, #86efac);
		background: rgba(74, 222, 128, 0.1);
	}

	/* ── Footer ── */

	.pulse-footer {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem 0 0;
		font-size: 0.75rem;
		color: var(--color-muted-foreground, var(--color-text-muted));
		opacity: 0.6;
	}

	/* ── Responsive ── */

	@media (max-width: 640px) {
		.pulse-page {
			padding: 1rem 0.75rem 2rem;
		}

		:global(.pulse-page-hero) {
			padding: 1.5rem !important;
		}

		.hero-content {
			flex-direction: column;
			align-items: center;
			text-align: center;
			gap: 1rem;
		}

		.hero-text h1 {
			font-size: 1.5rem;
		}

		.hero-today {
			justify-content: center;
		}
	}
</style>
