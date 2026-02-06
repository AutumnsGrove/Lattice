<script lang="ts">
	/**
	 * Grove Clearing - Status Page
	 *
	 * A clearing in the forest where you can see what's happening.
	 * Public-facing status page showing platform health, incidents, and uptime.
	 */
	import { Header, Footer, type NavItem } from '@autumnsgrove/groveengine/ui/chrome';
	import { GroveIntro } from '@autumnsgrove/groveengine/ui';
	import GlassStatusBanner from '$lib/components/GlassStatusBanner.svelte';
	import GlassStatusCard from '$lib/components/GlassStatusCard.svelte';
	import GlassUptimeBar from '$lib/components/GlassUptimeBar.svelte';
	import GlassBackupStatus from '$lib/components/GlassBackupStatus.svelte';
	import IncidentCard from '$lib/components/IncidentCard.svelte';
	import ScheduledMaintenanceCard from '$lib/components/ScheduledMaintenanceCard.svelte';
	import { formatDateFull } from '$lib/utils/date';
	import {
		Activity,
		History,
		Calendar,
		ChevronDown,
		BarChart3,
		FlaskConical,
		Trees
	} from 'lucide-svelte';

	// Status page navigation - just a way home (no grove.place footer sections)
	const navItems: NavItem[] = [
		{ href: 'https://grove.place', label: 'Grove', icon: Trees, external: true }
	];
	const resourceLinks: never[] = [];
	const connectLinks: never[] = [];

	let { data } = $props();

	// Group incidents by date for the history section
	const incidentsByDate = $derived(() => {
		const groups = new Map<string, typeof data.recentIncidents>();

		for (const incident of data.recentIncidents) {
			const date = formatDateFull(incident.started_at);

			if (!groups.has(date)) {
				groups.set(date, []);
			}
			groups.get(date)!.push(incident);
		}

		return groups;
	});

	// Track which sections are expanded
	let showAllComponents = $state(false);
	let showUptimeDetails = $state(false);
</script>

<svelte:head>
	<title>Grove Status</title>
	<meta name="description" content="Current status of Grove platform services. Check for outages, incidents, and scheduled maintenance." />
</svelte:head>

<div class="min-h-screen flex flex-col">
	<Header {navItems} {resourceLinks} {connectLinks} brandTitle="Status" showLogo />

	<main class="flex-1 py-8 px-4 sm:px-6" aria-label="Status page content">
		<div class="max-w-4xl mx-auto space-y-8">
			<GroveIntro term="clearing" />

			<!-- Mock data indicator for development -->
			{#if data.isMockData}
				<div class="flex items-center justify-center gap-2 py-2 px-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-700 dark:text-amber-300" role="alert">
					<FlaskConical class="w-4 h-4" aria-hidden="true" />
					<span>Showing demo data — database not connected</span>
				</div>
			{/if}

			<!-- Overall Status Banner -->
			<GlassStatusBanner
				status={data.status}
				lastUpdated={data.updatedAt}
			/>

			<!-- Active Incidents (if any) -->
			{#if data.activeIncidents.length > 0}
				<section aria-labelledby="active-incidents-heading">
					<h2 id="active-incidents-heading" class="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
						<Activity class="w-5 h-5 text-orange-500" aria-hidden="true" />
						Active Incidents
					</h2>

					<div class="space-y-4">
						{#each data.activeIncidents as incident}
							<IncidentCard
								title={incident.title}
								slug={incident.slug}
								status={incident.status}
								type={incident.type}
								startedAt={incident.started_at}
								resolvedAt={incident.resolved_at}
								components={incident.components}
								updates={incident.updates}
								expanded={true}
							/>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Scheduled Maintenance (if any) -->
			{#if data.scheduledMaintenance.length > 0}
				<section aria-labelledby="scheduled-maintenance-heading">
					<h2 id="scheduled-maintenance-heading" class="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
						<Calendar class="w-5 h-5 text-blue-500" aria-hidden="true" />
						Scheduled Maintenance
					</h2>

					<div class="space-y-4">
						{#each data.scheduledMaintenance as maintenance}
							{@const affectedComponents = data.components.filter(c =>
								maintenance.components.includes(c.id)
							)}
							<ScheduledMaintenanceCard
								{maintenance}
								components={affectedComponents}
							/>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Component Status Grid -->
			<section aria-labelledby="system-status-heading">
				<h2 id="system-status-heading" class="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
					<Activity class="w-5 h-5 text-grove-600 dark:text-grove-400" aria-hidden="true" />
					System Status
				</h2>

				<div class="grid gap-3 sm:grid-cols-2" role="list" aria-label="Platform component statuses">
					{#each showAllComponents ? data.components : data.components.slice(0, 4) as component}
						<GlassStatusCard
							name={component.name}
							description={component.description}
							status={component.current_status}
						/>
					{/each}
				</div>

				{#if data.components.length > 4}
					<button
						type="button"
						onclick={() => showAllComponents = !showAllComponents}
						class="mt-3 w-full py-2 text-sm text-foreground-muted hover:text-foreground flex items-center justify-center gap-1 transition-colors"
					>
						{showAllComponents ? 'Show fewer' : `Show all ${data.components.length} components`}
						<ChevronDown class="w-4 h-4 transition-transform {showAllComponents ? 'rotate-180' : ''}" />
					</button>
				{/if}
			</section>

			<!-- Data Protection (Backup Status) -->
			{#if data.backupStatus}
				<GlassBackupStatus backupStatus={data.backupStatus} />
			{/if}

			<!-- Uptime History -->
			<section aria-labelledby="uptime-history-heading">
				<h2 id="uptime-history-heading" class="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
					<BarChart3 class="w-5 h-5 text-grove-600 dark:text-grove-400" aria-hidden="true" />
					90-Day Uptime
				</h2>

				<div class="space-y-4">
					{#each showUptimeDetails ? data.uptimeHistory : data.uptimeHistory.slice(0, 3) as history}
						<GlassUptimeBar
							componentName={history.componentName}
							days={history.days}
							uptimePercentage={history.uptimePercentage}
						/>
					{/each}
				</div>

				{#if data.uptimeHistory.length > 3}
					<button
						type="button"
						onclick={() => showUptimeDetails = !showUptimeDetails}
						class="mt-3 w-full py-2 text-sm text-foreground-muted hover:text-foreground flex items-center justify-center gap-1 transition-colors"
					>
						{showUptimeDetails ? 'Show fewer' : `Show all ${data.uptimeHistory.length} components`}
						<ChevronDown class="w-4 h-4 transition-transform {showUptimeDetails ? 'rotate-180' : ''}" />
					</button>
				{/if}
			</section>

			<!-- Past Incidents -->
			<section aria-labelledby="past-incidents-heading">
				<h2 id="past-incidents-heading" class="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
					<History class="w-5 h-5 text-foreground-muted" aria-hidden="true" />
					Past Incidents (30 days)
				</h2>

				{#if data.recentIncidents.length === 0}
					<div class="glass-card p-8 text-center">
						<p class="text-foreground-muted">
							No incidents in the past 30 days. All systems have been running smoothly.
						</p>
					</div>
				{:else}
					<div class="space-y-6">
						{#each [...incidentsByDate()] as [date, incidents]}
							<div>
								<h3 class="text-sm font-medium text-foreground-muted mb-3">{date}</h3>
								<div class="space-y-3">
									{#each incidents as incident}
										<IncidentCard
											title={incident.title}
											slug={incident.slug}
											status={incident.status}
											type={incident.type}
											startedAt={incident.started_at}
											resolvedAt={incident.resolved_at}
											components={incident.components}
											updates={incident.updates}
										/>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</section>
		</div>
	</main>

	<Footer />
</div>
