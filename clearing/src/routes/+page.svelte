<script lang="ts">
	/**
	 * Grove Clearing - Status Page
	 *
	 * A clearing in the forest where you can see what's happening.
	 * Public-facing status page showing platform health, incidents, and uptime.
	 */
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import GlassStatusBanner from '$lib/components/GlassStatusBanner.svelte';
	import GlassStatusCard from '$lib/components/GlassStatusCard.svelte';
	import GlassUptimeBar from '$lib/components/GlassUptimeBar.svelte';
	import IncidentCard from '$lib/components/IncidentCard.svelte';
	import ScheduledMaintenanceCard from '$lib/components/ScheduledMaintenanceCard.svelte';
	import {
		Activity,
		History,
		Calendar,
		ChevronDown,
		BarChart3
	} from 'lucide-svelte';

	let { data } = $props();

	// Group incidents by date for the history section
	const incidentsByDate = $derived(() => {
		const groups = new Map<string, typeof data.recentIncidents>();

		for (const incident of data.recentIncidents) {
			const date = new Date(incident.started_at).toLocaleDateString('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric'
			});

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
	<Header />

	<main class="flex-1 py-8 px-4 sm:px-6">
		<div class="max-w-4xl mx-auto space-y-8">
			<!-- Overall Status Banner -->
			<GlassStatusBanner
				status={data.status}
				lastUpdated={data.updatedAt}
			/>

			<!-- Active Incidents (if any) -->
			{#if data.activeIncidents.length > 0}
				<section>
					<h2 class="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
						<Activity class="w-5 h-5 text-orange-500" />
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
				<section>
					<h2 class="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
						<Calendar class="w-5 h-5 text-blue-500" />
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
			<section>
				<h2 class="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
					<Activity class="w-5 h-5 text-grove-600 dark:text-grove-400" />
					System Status
				</h2>

				<div class="grid gap-3 sm:grid-cols-2">
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

			<!-- Uptime History -->
			<section>
				<h2 class="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
					<BarChart3 class="w-5 h-5 text-grove-600 dark:text-grove-400" />
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
			<section>
				<h2 class="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
					<History class="w-5 h-5 text-foreground-muted" />
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
