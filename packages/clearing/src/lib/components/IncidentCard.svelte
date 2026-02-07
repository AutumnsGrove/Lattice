<script lang="ts">
	/**
	 * IncidentCard - Display an incident with its timeline
	 *
	 * Shows incident title, status, affected components, and timeline of updates.
	 */
	import { cn } from '@autumnsgrove/groveengine/ui/utils';
	import { formatTime, formatDuration } from '$lib/utils/date';
	import type { IncidentStatus, IncidentType, StatusUpdate, StatusComponent } from '$lib/types/status';
	import { getIncidentStatusLabel } from '$lib/types/status';
	import {
		AlertCircle,
		AlertTriangle,
		Wrench,
		ShieldAlert,
		CheckCircle,
		Search,
		Eye,
		Clock
	} from 'lucide-svelte';

	interface Props {
		title: string;
		slug: string;
		status: IncidentStatus;
		type: IncidentType;
		startedAt: string;
		resolvedAt?: string | null;
		components: StatusComponent[];
		updates: StatusUpdate[];
		expanded?: boolean;
		class?: string;
	}

	let {
		title,
		slug,
		status,
		type,
		startedAt,
		resolvedAt,
		components,
		updates,
		expanded = false,
		class: className
	}: Props = $props();

	let isExpanded = $state(expanded);

	// Type icons
	const typeIcons = {
		outage: AlertCircle,
		degraded: AlertTriangle,
		maintenance: Wrench,
		security: ShieldAlert
	};

	// Status icons for timeline
	const statusIcons = {
		investigating: Search,
		identified: Eye,
		monitoring: Clock,
		resolved: CheckCircle
	};

	const TypeIcon = $derived(typeIcons[type]);
	const duration = $derived(formatDuration(startedAt, resolvedAt));
</script>

<article class={cn('glass-card overflow-hidden', className)}>
	<!-- Header -->
	<button
		type="button"
		onclick={() => isExpanded = !isExpanded}
		class="w-full p-4 text-left flex items-start gap-3 hover:bg-white/20 dark:hover:bg-bark-800/20 transition-colors"
	>
		<div class={cn(
			'p-2 rounded-lg flex-shrink-0',
			status === 'resolved' ? 'bg-green-500/10' : 'bg-orange-500/10'
		)}>
			<TypeIcon class={cn(
				'w-5 h-5',
				status === 'resolved' ? 'text-green-500' : 'text-orange-500'
			)} />
		</div>

		<div class="flex-1 min-w-0">
			<div class="flex items-start justify-between gap-2">
				<h3 class="font-medium text-foreground">{title}</h3>
				<span class={cn(
					'px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap',
					status === 'resolved' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
					status === 'monitoring' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
					'bg-orange-500/10 text-orange-600 dark:text-orange-400'
				)}>
					{getIncidentStatusLabel(status)}
				</span>
			</div>

			<div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-foreground-muted">
				<span>{formatTime(startedAt)}</span>
				{#if resolvedAt}
					<span class="text-foreground-subtle">Resolved in {duration}</span>
				{:else}
					<span class="text-orange-500">Ongoing ({duration})</span>
				{/if}
			</div>

			{#if components.length > 0}
				<div class="flex flex-wrap gap-1.5 mt-2">
					{#each components as component}
						<span class="px-2 py-0.5 text-xs bg-cream-100 dark:bg-bark-800 rounded text-foreground-muted">
							{component.name}
						</span>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Expand indicator -->
		<svg
			class={cn(
				'w-5 h-5 text-foreground-subtle transition-transform flex-shrink-0',
				isExpanded && 'rotate-180'
			)}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<polyline points="6 9 12 15 18 9"></polyline>
		</svg>
	</button>

	<!-- Timeline (expandable) -->
	{#if isExpanded && updates.length > 0}
		<div class="border-t border-white/20 dark:border-bark-700/30 p-4">
			<h4 class="text-sm font-medium text-foreground-muted mb-4">Timeline</h4>

			<div class="space-y-4">
				{#each updates as update}
					{@const UpdateIcon = statusIcons[update.status as IncidentStatus] || Clock}
					<div class="flex gap-3">
						<div class="flex flex-col items-center">
							<div class={cn(
								'p-1.5 rounded-full',
								update.status === 'resolved' ? 'bg-green-500/10' : 'bg-cream-100 dark:bg-bark-800'
							)}>
								<UpdateIcon class={cn(
									'w-4 h-4',
									update.status === 'resolved' ? 'text-green-500' : 'text-foreground-muted'
								)} />
							</div>
							{#if updates.indexOf(update) < updates.length - 1}
								<div class="w-px flex-1 bg-cream-200 dark:bg-bark-700 my-1"></div>
							{/if}
						</div>

						<div class="flex-1 pb-4">
							<div class="flex items-center gap-2 mb-1">
								<span class="text-sm font-medium text-foreground">
									{getIncidentStatusLabel(update.status as IncidentStatus)}
								</span>
								<span class="text-xs text-foreground-subtle">
									{formatTime(update.created_at)}
								</span>
							</div>
							<p class="text-sm text-foreground-muted">{update.message}</p>
						</div>
					</div>
				{/each}
			</div>

			<a
				href="/incidents/{slug}"
				class="inline-flex items-center gap-1.5 mt-2 text-sm text-grove-600 dark:text-grove-400 hover:underline"
			>
				View full incident report
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M5 12h14M12 5l7 7-7 7" />
				</svg>
			</a>
		</div>
	{/if}
</article>
