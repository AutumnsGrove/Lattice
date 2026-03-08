<script lang="ts">
	import type { PageData } from './$types';
	import { GlassCard } from '@autumnsgrove/lattice/ui';
	import { Search, Users, HardDrive, FileText, ChevronRight } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');

	let filteredTenants = $derived(
		searchQuery.trim()
			? data.tenants.filter(
					(t: any) =>
						t.subdomain.toLowerCase().includes(searchQuery.toLowerCase()) ||
						t.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
						t.email.toLowerCase().includes(searchQuery.toLowerCase())
				)
			: data.tenants
	);

	const planConfig: Record<string, { label: string; color: string; bg: string }> = {
		wanderer: {
			label: 'Wanderer',
			color: 'text-muted-foreground dark:text-muted-foreground',
			bg: 'bg-muted dark:bg-muted/30'
		},
		seedling: {
			label: 'Seedling',
			color: 'text-success dark:text-success',
			bg: 'bg-success-bg dark:bg-success-bg/30'
		},
		sapling: {
			label: 'Sapling',
			color: 'text-info dark:text-info',
			bg: 'bg-info-bg dark:bg-info-bg/30'
		},
		oak: {
			label: 'Oak',
			color: 'text-warning dark:text-warning',
			bg: 'bg-warning-bg dark:bg-warning-bg/30'
		},
		evergreen: {
			label: 'Evergreen',
			color: 'text-success dark:text-success',
			bg: 'bg-success-bg dark:bg-success-bg/30'
		}
	};

	function formatStorage(bytes: number): string {
		if (bytes === 0) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatRelative(timestamp: number): string {
		const diff = Date.now() - timestamp * 1000;
		const days = Math.floor(diff / 86400000);
		if (days < 1) return 'Today';
		if (days < 7) return `${days}d ago`;
		if (days < 30) return `${Math.floor(days / 7)}w ago`;
		return formatDate(timestamp);
	}
</script>

<svelte:head>
	<title>Tenants - Grove Admin</title>
</svelte:head>

<!-- Header -->
<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">Tenants</h1>
	<p class="text-foreground-muted font-sans mt-1">
		{data.stats.total} total · {data.stats.active} active
	</p>
</div>

<!-- Stats Cards -->
<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
	<GlassCard class="p-4 text-center">
		<Users class="w-5 h-5 mx-auto mb-1 text-foreground-muted" />
		<div class="text-2xl font-serif text-foreground">{data.stats.total}</div>
		<div class="text-sm text-foreground-muted font-sans">Total</div>
	</GlassCard>
	<GlassCard class="p-4 text-center">
		<FileText class="w-5 h-5 mx-auto mb-1 text-foreground-muted" />
		<div class="text-2xl font-serif text-foreground">{data.stats.total_posts}</div>
		<div class="text-sm text-foreground-muted font-sans">Posts</div>
	</GlassCard>
	<GlassCard class="p-4 text-center">
		<HardDrive class="w-5 h-5 mx-auto mb-1 text-foreground-muted" />
		<div class="text-2xl font-serif text-foreground">{formatStorage(data.stats.total_storage)}</div>
		<div class="text-sm text-foreground-muted font-sans">Storage</div>
	</GlassCard>
	<GlassCard class="p-4 text-center">
		{@const paid = data.stats.seedling + data.stats.sapling + data.stats.oak + data.stats.evergreen}
		{@const pct = data.stats.total > 0 ? Math.round((paid / data.stats.total) * 100) : 0}
		<div class="flex justify-center gap-1 mb-1">
			{#each ['wanderer', 'seedling', 'sapling', 'oak', 'evergreen'] as plan}
				{@const count = data.stats[plan as keyof typeof data.stats]}
				{#if typeof count === 'number' && count > 0}
					<span class="text-xs font-sans px-1.5 py-0.5 rounded {planConfig[plan]?.bg} {planConfig[plan]?.color}">
						{count}
					</span>
				{/if}
			{/each}
		</div>
		<div class="text-sm text-foreground-muted font-sans">
			{pct}% subscribed
		</div>
	</GlassCard>
</div>

<!-- Search -->
<div class="mb-6">
	<div class="relative">
		<label for="tenant-search" class="sr-only">Search tenants</label>
		<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
		<input
			id="tenant-search"
			type="text"
			bind:value={searchQuery}
			placeholder="Search by subdomain, name, or email..."
			class="w-full pl-10 pr-4 py-2 border border-border dark:border-border rounded-lg text-sm font-sans bg-white dark:bg-cream-100 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
		/>
	</div>
</div>

<!-- Tenant Table -->
{#if filteredTenants.length === 0}
	<GlassCard class="text-center py-12">
		<Users class="w-16 h-16 mx-auto mb-4 text-foreground/20" />
		<p class="text-foreground-muted font-sans">
			{searchQuery ? 'No tenants match your search' : 'No tenants yet'}
		</p>
	</GlassCard>
{:else}
	<div class="overflow-hidden rounded-xl border border-border dark:border-border">
		<div class="overflow-x-auto">
			<table class="w-full" aria-label="Tenant list">
				<thead
					class="bg-surface-subtle dark:bg-cream-100/50 border-b border-border dark:border-border"
				>
					<tr>
						<th
							scope="col"
							class="text-left px-6 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase tracking-wider"
						>
							Subdomain
						</th>
						<th
							scope="col"
							class="text-left px-6 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase tracking-wider"
						>
							Name
						</th>
						<th
							scope="col"
							class="text-left px-6 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase tracking-wider"
						>
							Plan
						</th>
						<th
							scope="col"
							class="text-left px-6 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase tracking-wider"
						>
							Posts
						</th>
						<th
							scope="col"
							class="text-left px-6 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase tracking-wider"
						>
							Storage
						</th>
						<th
							scope="col"
							class="text-left px-6 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase tracking-wider"
						>
							Created
						</th>
						<th
							scope="col"
							class="text-left px-6 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase tracking-wider"
						>
							Status
						</th>
						<th scope="col" class="w-8">
							<span class="sr-only">Details</span>
						</th>
					</tr>
				</thead>
				<tbody
					class="divide-y divide-border dark:divide-border/50 bg-white dark:bg-cream-100/30"
				>
					{#each filteredTenants as tenant (tenant.id)}
						{@const plan = planConfig[tenant.plan] || planConfig.seedling}
						<tr class="group">
							<td class="px-6 py-4">
								<a
									href="/arbor/tenants/{tenant.id}"
									class="text-sm font-sans font-medium text-primary dark:text-primary hover:text-primary dark:hover:text-primary"
								>
									{tenant.subdomain}
								</a>
							</td>
							<td class="px-6 py-4">
								<div class="text-sm font-sans text-foreground">{tenant.display_name}</div>
								<div class="text-xs font-sans text-foreground-muted">{tenant.email}</div>
							</td>
							<td class="px-6 py-4">
								<span class="text-xs font-sans px-2 py-1 rounded {plan.bg} {plan.color}">
									{plan.label}
								</span>
							</td>
							<td class="px-6 py-4">
								<span class="text-sm font-sans text-foreground">{tenant.post_count}</span>
							</td>
							<td class="px-6 py-4">
								<span class="text-sm font-sans text-foreground-muted">
									{formatStorage(tenant.storage_used)}
								</span>
							</td>
							<td class="px-6 py-4">
								<span class="text-sm font-sans text-foreground-muted">
									{formatRelative(tenant.created_at)}
								</span>
							</td>
							<td class="px-6 py-4">
								{#if tenant.active}
									<span
										class="text-xs font-sans bg-success-bg dark:bg-success-bg/30 text-success dark:text-success px-2 py-1 rounded"
									>
										Active
									</span>
								{:else}
									<span
										class="text-xs font-sans bg-error-bg dark:bg-error-bg/30 text-error dark:text-error px-2 py-1 rounded"
									>
										Suspended
									</span>
								{/if}
							</td>
							<td class="px-6 py-4">
								<a
									href="/arbor/tenants/{tenant.id}"
									class="text-foreground-muted group-hover:text-primary dark:group-hover:text-primary transition-colors"
									aria-label="View {tenant.subdomain} details"
								>
									<ChevronRight class="w-4 h-4" />
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}
