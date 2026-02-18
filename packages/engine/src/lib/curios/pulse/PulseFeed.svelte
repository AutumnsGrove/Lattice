<script lang="ts">
	import type { PulseEvent } from "./index";
	import {
		getEventDisplayKey,
		formatRelativeTime,
		EVENT_TYPE_CONFIG,
		PULSE_EVENT_TYPES,
	} from "./index";
	import {
		GitCommit,
		GitMerge,
		GitPullRequest,
		CircleDot,
		CircleCheck,
		Tag,
		CheckCircle,
		XCircle,
		Star,
		GitFork,
		GitBranch,
		Trash2,
	} from "lucide-svelte";

	interface Props {
		events: PulseEvent[];
		hasMore?: boolean;
		onLoadMore?: () => void;
	}

	let { events, hasMore = false, onLoadMore }: Props = $props();

	// Filter state
	let activeFilters = $state<Set<string>>(new Set());

	const filteredEvents = $derived(
		activeFilters.size === 0 ? events : events.filter((e) => activeFilters.has(e.eventType)),
	);

	function toggleFilter(type: string) {
		const next = new Set(activeFilters);
		if (next.has(type)) {
			next.delete(type);
		} else {
			next.add(type);
		}
		activeFilters = next;
	}

	// Map event types to Lucide components
	const iconMap: Record<string, typeof GitCommit> = {
		"git-commit": GitCommit,
		"git-merge": GitMerge,
		"git-pull-request": GitPullRequest,
		"circle-dot": CircleDot,
		"circle-check": CircleCheck,
		tag: Tag,
		"check-circle": CheckCircle,
		"x-circle": XCircle,
		star: Star,
		"git-fork": GitFork,
		"git-branch": GitBranch,
		"trash-2": Trash2,
	};

	function getIcon(eventType: string, action: string | null, data?: Record<string, unknown>) {
		const key = getEventDisplayKey(eventType, action, data);
		const config = EVENT_TYPE_CONFIG[key] ?? EVENT_TYPE_CONFIG[eventType];
		return iconMap[config?.icon ?? "git-commit"] ?? GitCommit;
	}

	function getColor(eventType: string, action: string | null, data?: Record<string, unknown>) {
		const key = getEventDisplayKey(eventType, action, data);
		const config = EVENT_TYPE_CONFIG[key] ?? EVENT_TYPE_CONFIG[eventType];
		return config?.color ?? "var(--color-text-muted)";
	}

	function getLabel(eventType: string, action: string | null, data?: Record<string, unknown>) {
		const key = getEventDisplayKey(eventType, action, data);
		const config = EVENT_TYPE_CONFIG[key] ?? EVENT_TYPE_CONFIG[eventType];
		return config?.label ?? eventType;
	}

	// Unique event types present in the feed
	const availableTypes = $derived(
		[...new Set(events.map((e) => e.eventType))].filter((t) =>
			PULSE_EVENT_TYPES.includes(t as any),
		),
	);
</script>

<div class="pulse-feed" role="feed" aria-label="Development event feed">
	<!-- Filter chips -->
	{#if availableTypes.length > 1}
		<div class="filter-chips" role="group" aria-label="Filter events by type">
			{#each availableTypes as type}
				<button
					class="filter-chip {activeFilters.has(type) ? 'active' : ''}"
					onclick={() => toggleFilter(type)}
					aria-pressed={activeFilters.has(type)}
				>
					{EVENT_TYPE_CONFIG[type]?.label ?? type}
				</button>
			{/each}
			{#if activeFilters.size > 0}
				<button class="filter-chip clear" onclick={() => (activeFilters = new Set())}>
					Clear
				</button>
			{/if}
		</div>
	{/if}

	<!-- Event list -->
	<div class="events-list">
		{#each filteredEvents as event (event.id)}
			{@const EventIcon = getIcon(event.eventType, event.action, event.data)}
			<article
				class="event-item"
				aria-label="{getLabel(event.eventType, event.action, event.data)} in {event.repoName}"
			>
				<div
					class="event-icon"
					style="color: {getColor(event.eventType, event.action, event.data)}"
				>
					<EventIcon size={18} />
				</div>

				<div class="event-content">
					<div class="event-header">
						<span
							class="event-type"
							style="color: {getColor(event.eventType, event.action, event.data)}"
						>
							{getLabel(event.eventType, event.action, event.data)}
						</span>
						<span class="event-repo">{event.repoName}</span>
						<time class="event-time" datetime={new Date(event.occurredAt * 1000).toISOString()}>
							{formatRelativeTime(event.occurredAt)}
						</time>
					</div>

					{#if event.title}
						<p class="event-title">{event.title}</p>
					{/if}

					<div class="event-meta">
						<span class="event-actor">{event.actor}</span>
						{#if event.ref}
							<span class="event-ref">{event.ref}</span>
						{/if}
					</div>
				</div>
			</article>
		{:else}
			<p class="empty-feed">
				{activeFilters.size > 0
					? "No events match the current filter."
					: "No events yet. Push some code!"}
			</p>
		{/each}
	</div>

	{#if hasMore && onLoadMore}
		<div class="load-more">
			<button class="load-more-btn" onclick={onLoadMore}> Show more </button>
		</div>
	{/if}
</div>

<style>
	.pulse-feed {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.filter-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.filter-chip {
		padding: 0.375rem 0.75rem;
		font-size: 0.8rem;
		border-radius: 999px;
		border: 1px solid var(--grove-overlay-12);
		background: var(--grove-overlay-4);
		color: var(--color-text-muted);
		cursor: pointer;
		transition: all 0.15s;
	}

	.filter-chip:hover {
		background: var(--grove-overlay-8);
	}

	.filter-chip.active {
		background: rgba(var(--color-primary-rgb), 0.1);
		border-color: rgba(var(--color-primary-rgb), 0.3);
		color: var(--color-primary);
	}

	.filter-chip.clear {
		border-style: dashed;
		font-style: italic;
	}

	.events-list {
		display: flex;
		flex-direction: column;
	}

	.event-item {
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem 0;
		border-bottom: 1px solid var(--grove-overlay-4);
	}

	.event-item:last-child {
		border-bottom: none;
	}

	.event-icon {
		flex-shrink: 0;
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--grove-overlay-4);
		border-radius: 50%;
	}

	.event-content {
		flex: 1;
		min-width: 0;
	}

	.event-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.event-type {
		font-size: 0.8rem;
		font-weight: 600;
	}

	.event-repo {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		background: var(--grove-overlay-4);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	.event-time {
		font-size: 0.75rem;
		color: var(--color-text-muted);
		margin-left: auto;
	}

	.event-title {
		font-size: 0.85rem;
		color: var(--color-text);
		margin: 0.25rem 0 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.event-meta {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.event-actor {
		font-size: 0.75rem;
		color: var(--color-text-muted);
	}

	.event-ref {
		font-size: 0.7rem;
		color: var(--color-text-muted);
		background: var(--grove-overlay-4);
		padding: 0.0625rem 0.25rem;
		border-radius: 0.25rem;
		font-family: monospace;
	}

	.empty-feed {
		text-align: center;
		color: var(--color-text-muted);
		padding: 2rem 0;
		font-size: 0.9rem;
	}

	.load-more {
		text-align: center;
		padding-top: 0.5rem;
	}

	.load-more-btn {
		padding: 0.5rem 1.5rem;
		font-size: 0.85rem;
		color: var(--color-primary);
		background: rgba(var(--color-primary-rgb), 0.08);
		border: 1px solid rgba(var(--color-primary-rgb), 0.2);
		border-radius: var(--border-radius-standard);
		cursor: pointer;
		transition: background 0.15s;
	}

	.load-more-btn:hover {
		background: rgba(var(--color-primary-rgb), 0.15);
	}
</style>
