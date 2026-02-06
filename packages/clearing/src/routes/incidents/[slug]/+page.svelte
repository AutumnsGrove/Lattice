<script lang="ts">
	/**
	 * Incident Detail Page
	 *
	 * Shows full incident details with complete timeline.
	 */
	import { Header, Footer, type NavItem } from '@autumnsgrove/groveengine/ui/chrome';
	import { cn } from '@autumnsgrove/groveengine/ui/utils';
	import { getIncidentStatusLabel } from '$lib/types/status';
	import type { IncidentStatus } from '$lib/types/status';
	import {
		ArrowLeft,
		AlertCircle,
		AlertTriangle,
		Wrench,
		ShieldAlert,
		CheckCircle,
		Search,
		Eye,
		Clock,
		Trees
	} from 'lucide-svelte';

	// Status page navigation - just a way home
	const navItems: NavItem[] = [
		{ href: 'https://grove.place', label: 'Grove', icon: Trees, external: true }
	];

	let { data } = $props();
	const incident = $derived(data.incident);

	// Type icons
	const typeIcons = {
		outage: AlertCircle,
		degraded: AlertTriangle,
		maintenance: Wrench,
		security: ShieldAlert
	};

	// Status icons for timeline
	const statusIcons: Record<IncidentStatus, typeof Search> = {
		investigating: Search,
		identified: Eye,
		monitoring: Clock,
		resolved: CheckCircle
	};

	const TypeIcon = $derived(typeIcons[incident.type as keyof typeof typeIcons] || AlertCircle);

	// Format timestamp
	function formatTime(timestamp: string): string {
		const date = new Date(timestamp);
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			timeZoneName: 'short'
		});
	}

	// Calculate duration as a derived value
	const duration = $derived(() => {
		const start = new Date(incident.started_at);
		const end = incident.resolved_at ? new Date(incident.resolved_at) : new Date();
		const diffMs = end.getTime() - start.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
		const diffHours = Math.floor(diffMins / 60);
		const remainMins = diffMins % 60;
		if (diffHours < 24) {
			return remainMins > 0 ? `${diffHours}h ${remainMins}m` : `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
		}
		const diffDays = Math.floor(diffHours / 24);
		return `${diffDays} day${diffDays !== 1 ? 's' : ''} ${diffHours % 24}h`;
	});

	// Impact label
	const impactLabels = {
		none: 'No Impact',
		minor: 'Minor Impact',
		major: 'Major Impact',
		critical: 'Critical Impact'
	};
</script>

<svelte:head>
	<title>{incident.title} - Grove Status</title>
	<meta name="description" content="Incident report: {incident.title}. Status: {getIncidentStatusLabel(incident.status)}." />
</svelte:head>

<div class="min-h-screen flex flex-col">
	<Header {navItems} brandTitle="Status" />

	<main class="flex-1 py-8 px-4 sm:px-6">
		<div class="max-w-3xl mx-auto">
			<!-- Back link -->
			<a
				href="/"
				class="inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground mb-6 transition-colors"
			>
				<ArrowLeft class="w-4 h-4" />
				Back to Status
			</a>

			<!-- Incident Header -->
			<div class="glass-card p-6 mb-8">
				<div class="flex items-start gap-4">
					<div class={cn(
						'p-3 rounded-xl flex-shrink-0',
						incident.status === 'resolved' ? 'bg-green-500/10' : 'bg-orange-500/10'
					)}>
						<TypeIcon class={cn(
							'w-6 h-6',
							incident.status === 'resolved' ? 'text-green-500' : 'text-orange-500'
						)} />
					</div>

					<div class="flex-1 min-w-0">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<h1 class="text-xl font-semibold text-foreground">{incident.title}</h1>
							<span class={cn(
								'px-3 py-1 text-sm font-medium rounded-full whitespace-nowrap',
								incident.status === 'resolved' ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
								incident.status === 'monitoring' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
								'bg-orange-500/10 text-orange-600 dark:text-orange-400'
							)}>
								{getIncidentStatusLabel(incident.status)}
							</span>
						</div>

						<!-- Metadata -->
						<div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
							<div>
								<span class="text-foreground-subtle">Started</span>
								<p class="text-foreground">{formatTime(incident.started_at)}</p>
							</div>

							{#if incident.resolved_at}
								<div>
									<span class="text-foreground-subtle">Resolved</span>
									<p class="text-foreground">{formatTime(incident.resolved_at)}</p>
								</div>
							{/if}

							<div>
								<span class="text-foreground-subtle">Duration</span>
								<p class="text-foreground">
									{duration()}
									{#if !incident.resolved_at}
										<span class="text-orange-500">(ongoing)</span>
									{/if}
								</p>
							</div>

							<div>
								<span class="text-foreground-subtle">Impact</span>
								<p class="text-foreground">{impactLabels[incident.impact as keyof typeof impactLabels]}</p>
							</div>
						</div>

						<!-- Affected components -->
						{#if incident.components.length > 0}
							<div class="mt-4">
								<span class="text-sm text-foreground-subtle">Affected Components</span>
								<div class="flex flex-wrap gap-2 mt-1.5">
									{#each incident.components as component}
										<span class="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded-full text-foreground-muted">
											{component.name}
										</span>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- Timeline -->
			<section>
				<h2 class="text-lg font-semibold text-foreground mb-4">Incident Timeline</h2>

				<div class="glass-card p-6">
					<div class="space-y-6">
						{#each incident.updates as update, i}
							{@const UpdateIcon = statusIcons[update.status as IncidentStatus] || Clock}
							<div class="flex gap-4">
								<!-- Timeline indicator -->
								<div class="flex flex-col items-center">
									<div class={cn(
										'p-2 rounded-full',
										update.status === 'resolved' ? 'bg-green-500/10' : 'bg-slate-100 dark:bg-slate-800'
									)}>
										<UpdateIcon class={cn(
											'w-5 h-5',
											update.status === 'resolved' ? 'text-green-500' : 'text-foreground-muted'
										)} />
									</div>
									{#if i < incident.updates.length - 1}
										<div class="w-0.5 flex-1 bg-slate-200 dark:bg-slate-700 my-2"></div>
									{/if}
								</div>

								<!-- Update content -->
								<div class="flex-1 pb-6">
									<div class="flex flex-wrap items-center gap-2 mb-2">
										<span class={cn(
											'font-medium',
											update.status === 'resolved' ? 'text-green-600 dark:text-green-400' : 'text-foreground'
										)}>
											{getIncidentStatusLabel(update.status as IncidentStatus)}
										</span>
										<span class="text-sm text-foreground-subtle">
											{formatTime(update.created_at)}
										</span>
									</div>
									<p class="text-foreground-muted leading-relaxed">{update.message}</p>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</section>
		</div>
	</main>

	<Footer />
</div>
