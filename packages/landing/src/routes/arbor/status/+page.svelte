<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { GlassCard } from '@autumnsgrove/groveengine/ui';
	import {
		CheckCircle2,
		AlertTriangle,
		AlertCircle,
		XCircle,
		Wrench,
		Plus,
		Clock,
		ChevronRight
	} from 'lucide-svelte';
	import type { ComponentType } from 'svelte';

	let { data }: { data: PageData } = $props();

	// Status display config
	const statusConfig: Record<
		string,
		{ label: string; color: string; bg: string; icon: ComponentType }
	> = {
		operational: {
			label: 'Operational',
			color: 'text-green-700 dark:text-green-400',
			bg: 'bg-green-100 dark:bg-green-900/30',
			icon: CheckCircle2
		},
		degraded: {
			label: 'Degraded',
			color: 'text-amber-700 dark:text-amber-400',
			bg: 'bg-amber-100 dark:bg-amber-900/30',
			icon: AlertTriangle
		},
		partial_outage: {
			label: 'Partial Outage',
			color: 'text-orange-700 dark:text-orange-400',
			bg: 'bg-orange-100 dark:bg-orange-900/30',
			icon: AlertCircle
		},
		major_outage: {
			label: 'Major Outage',
			color: 'text-red-700 dark:text-red-400',
			bg: 'bg-red-100 dark:bg-red-900/30',
			icon: XCircle
		},
		maintenance: {
			label: 'Maintenance',
			color: 'text-blue-700 dark:text-blue-400',
			bg: 'bg-blue-100 dark:bg-blue-900/30',
			icon: Wrench
		}
	};

	const impactColors: Record<string, string> = {
		critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
		major: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
		minor: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
		none: 'bg-cream-100 dark:bg-bark-700 text-foreground-muted dark:text-cream-300'
	};

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatRelative(dateStr: string): string {
		const diff = Date.now() - new Date(dateStr).getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		return formatDate(dateStr);
	}
</script>

<svelte:head>
	<title>Status - Grove Admin</title>
</svelte:head>

<!-- Header -->
<div class="mb-8 flex items-center justify-between">
	<div>
		<h1 class="text-2xl font-serif text-foreground">Service Status</h1>
		<p class="text-foreground-muted font-sans mt-1">
			{data.components.length} components ·
			{data.incidents.length} active incident{data.incidents.length !== 1 ? 's' : ''}
		</p>
	</div>
	<a
		href="/arbor/status/incidents/new"
		class="inline-flex items-center gap-2 px-4 py-2 bg-grove-600 text-white rounded-lg text-sm font-sans hover:bg-grove-700 transition-colors"
	>
		<Plus class="w-4 h-4" />
		New Incident
	</a>
</div>

<!-- Overall Status Banner -->
<GlassCard
	class="mb-8 p-6 {data.allOperational
		? 'border-green-200 dark:border-green-800'
		: 'border-amber-200 dark:border-amber-800'}"
>
	<div class="flex items-center gap-3">
		{#if data.allOperational}
			<CheckCircle2 class="w-8 h-8 text-green-600 dark:text-green-400" />
			<div>
				<div class="text-lg font-serif text-green-700 dark:text-green-400">
					All Systems Operational
				</div>
				<div class="text-sm font-sans text-foreground-muted">
					Everything is running smoothly
				</div>
			</div>
		{:else}
			<AlertTriangle class="w-8 h-8 text-amber-600 dark:text-amber-400" />
			<div>
				<div class="text-lg font-serif text-amber-700 dark:text-amber-400">
					Some Systems Affected
				</div>
				<div class="text-sm font-sans text-foreground-muted">
					{data.incidents.length} active incident{data.incidents.length !== 1 ? 's' : ''}
				</div>
			</div>
		{/if}
	</div>
</GlassCard>

<!-- Active Incidents -->
{#if data.incidents.length > 0}
	<section class="mb-8">
		<h2 class="text-lg font-serif text-foreground mb-4">Active Incidents</h2>
		<div class="space-y-3">
			{#each data.incidents as incident}
				<a href="/arbor/status/incidents/{incident.id}" class="block group">
					<GlassCard class="p-4 hover:bg-grove-50/50 dark:hover:bg-bark-700/30 transition-colors">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<span
									class="text-xs font-sans px-2 py-1 rounded {impactColors[incident.impact] ||
										impactColors.none}"
								>
									{incident.impact}
								</span>
								<div>
									<div class="text-sm font-sans font-medium text-foreground group-hover:text-grove-600 dark:group-hover:text-grove-400 transition-colors">
										{incident.title}
									</div>
									<div class="text-xs font-sans text-foreground-muted">
										{incident.type} · {formatRelative(incident.started_at)}
									</div>
								</div>
							</div>
							<ChevronRight
								class="w-4 h-4 text-foreground-muted group-hover:text-grove-600 dark:group-hover:text-grove-400 transition-colors"
							/>
						</div>
					</GlassCard>
				</a>
			{/each}
		</div>
	</section>
{/if}

<!-- Component Status Grid -->
<section class="mb-8">
	<h2 class="text-lg font-serif text-foreground mb-4">Components</h2>
	{#if data.components.length === 0}
		<GlassCard class="text-center py-8">
			<Wrench class="w-12 h-12 mx-auto mb-3 text-foreground/20" />
			<p class="text-foreground-muted font-sans">No components configured</p>
		</GlassCard>
	{:else}
		<div class="overflow-hidden rounded-xl border border-grove-200 dark:border-bark-700">
			<div class="divide-y divide-grove-100 dark:divide-bark-700/50">
				{#each data.components as component}
					{@const config = statusConfig[component.current_status] || statusConfig.operational}
					{@const StatusIcon = config.icon}
					<div
						class="flex items-center justify-between px-6 py-4 bg-white dark:bg-bark-800/30"
					>
						<div class="flex items-center gap-3">
							<StatusIcon class="w-5 h-5 {config.color}" />
							<div>
								<div class="text-sm font-sans font-medium text-foreground">
									{component.name}
								</div>
								{#if component.description}
									<div class="text-xs font-sans text-foreground-muted">
										{component.description}
									</div>
								{/if}
							</div>
						</div>
						<form method="POST" action="?/updateComponentStatus" use:enhance class="flex items-center gap-2">
							<input type="hidden" name="slug" value={component.slug} />
							<select
								name="status"
								aria-label="Update status for {component.name}"
								class="text-xs font-sans px-2 py-1 rounded border border-grove-200 dark:border-bark-600 bg-white dark:bg-bark-800 text-foreground"
								value={component.current_status}
								onchange={(e) => e.currentTarget.form?.requestSubmit()}
							>
								<option value="operational">Operational</option>
								<option value="degraded">Degraded</option>
								<option value="partial_outage">Partial Outage</option>
								<option value="major_outage">Major Outage</option>
								<option value="maintenance">Maintenance</option>
							</select>
						</form>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>

<!-- Scheduled Maintenance -->
{#if data.scheduled.length > 0}
	<section>
		<h2 class="text-lg font-serif text-foreground mb-4">Scheduled Maintenance</h2>
		<div class="space-y-3">
			{#each data.scheduled as maintenance}
				<GlassCard class="p-4">
					<div class="flex items-start gap-3">
						<Clock class="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
						<div>
							<div class="text-sm font-sans font-medium text-foreground">
								{maintenance.title}
							</div>
							{#if maintenance.description}
								<div class="text-xs font-sans text-foreground-muted mt-1">
									{maintenance.description}
								</div>
							{/if}
							<div class="text-xs font-sans text-foreground-muted mt-2">
								{formatDate(maintenance.scheduled_start)} — {formatDate(maintenance.scheduled_end)}
							</div>
						</div>
						<span
							class="ml-auto text-xs font-sans px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shrink-0"
						>
							{maintenance.status}
						</span>
					</div>
				</GlassCard>
			{/each}
		</div>
	</section>
{/if}
