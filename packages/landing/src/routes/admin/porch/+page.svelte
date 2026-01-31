<script lang="ts">
	import { GlassCard } from '@autumnsgrove/groveengine/ui';
	import { MessageCircle, Clock, CheckCircle, Search, Filter, ArrowRight } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let statusFilter = $state<'all' | 'open' | 'pending' | 'resolved'>('all');

	const statusConfig = {
		open: { label: 'Open', icon: MessageCircle, color: 'text-blue-600 bg-blue-100', borderColor: 'border-blue-200' },
		pending: { label: 'Pending', icon: Clock, color: 'text-amber-600 bg-amber-100', borderColor: 'border-amber-200' },
		resolved: { label: 'Resolved', icon: CheckCircle, color: 'text-green-600 bg-green-100', borderColor: 'border-green-200' },
	} as const;

	const categoryLabels: Record<string, string> = {
		billing: 'Billing',
		technical: 'Technical',
		account: 'Account',
		hello: 'Just saying hi',
		other: 'Other',
	};

	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		});
	}

	const filteredVisits = $derived(
		data.visits.filter((visit) => {
			// Status filter
			if (statusFilter !== 'all' && visit.status !== statusFilter) {
				return false;
			}
			// Search filter
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				return (
					visit.subject.toLowerCase().includes(query) ||
					visit.visit_number.toLowerCase().includes(query) ||
					(visit.guest_email?.toLowerCase().includes(query) ?? false) ||
					(visit.guest_name?.toLowerCase().includes(query) ?? false)
				);
			}
			return true;
		})
	);
</script>

<svelte:head>
	<title>Porch - Admin</title>
</svelte:head>

<div class="max-w-5xl mx-auto">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-serif text-foreground mb-2">The Porch</h1>
		<p class="text-foreground-muted font-sans">Support conversations with Wanderers</p>
	</div>

	<!-- Stats -->
	<div class="grid grid-cols-3 gap-4 mb-6">
		<GlassCard class="text-center py-4">
			<div class="text-2xl font-bold text-blue-600">{data.stats.open}</div>
			<div class="text-sm text-foreground-muted font-sans">Open</div>
		</GlassCard>
		<GlassCard class="text-center py-4">
			<div class="text-2xl font-bold text-amber-600">{data.stats.pending}</div>
			<div class="text-sm text-foreground-muted font-sans">Pending</div>
		</GlassCard>
		<GlassCard class="text-center py-4">
			<div class="text-2xl font-bold text-green-600">{data.stats.resolved}</div>
			<div class="text-sm text-foreground-muted font-sans">Resolved</div>
		</GlassCard>
	</div>

	<!-- Filters -->
	<GlassCard class="mb-6">
		<div class="flex flex-col sm:flex-row gap-4">
			<!-- Search -->
			<div class="flex-1 relative">
				<label for="search-visits" class="sr-only">Search visits</label>
				<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" aria-hidden="true" />
				<input
					type="search"
					id="search-visits"
					bind:value={searchQuery}
					placeholder="Search visits..."
					class="w-full pl-10 pr-4 py-2 rounded-lg border border-grove-200 bg-white/50 text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-grove-500 focus:border-transparent font-sans text-sm"
				/>
			</div>

			<!-- Status Filter -->
			<div class="flex items-center gap-2">
				<Filter class="w-4 h-4 text-foreground/40" aria-hidden="true" />
				<label for="status-filter" class="sr-only">Filter by status</label>
				<select
					id="status-filter"
					bind:value={statusFilter}
					class="px-3 py-2 rounded-lg border border-grove-200 bg-white/50 text-foreground font-sans text-sm focus:outline-none focus:ring-2 focus:ring-grove-500"
				>
					<option value="all">All visits</option>
					<option value="open">Open</option>
					<option value="pending">Pending</option>
					<option value="resolved">Resolved</option>
				</select>
			</div>
		</div>
	</GlassCard>

	<!-- Visits List -->
	{#if filteredVisits.length === 0}
		<GlassCard class="text-center py-12">
			<MessageCircle class="w-12 h-12 mx-auto text-foreground/20 mb-4" />
			<p class="text-foreground-muted font-sans">
				{searchQuery || statusFilter !== 'all'
					? 'No visits match your filters.'
					: 'No visits yet. The porch is quiet.'}
			</p>
		</GlassCard>
	{:else}
		<div class="space-y-3">
			{#each filteredVisits as visit}
				{@const config = statusConfig[visit.status as keyof typeof statusConfig] || statusConfig.open}
				<a href="/admin/porch/{visit.id}" class="block">
					<GlassCard class="hover:border-grove-300 transition-colors {config.borderColor}">
						<div class="flex items-start gap-4">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-1 flex-wrap">
									<span class="text-xs font-mono text-foreground/50">{visit.visit_number}</span>
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-sans {config.color}">
										<svelte:component this={config.icon} class="w-3 h-3" />
										{config.label}
									</span>
									<span class="text-xs text-foreground/40 px-2 py-0.5 rounded bg-foreground/5">
										{categoryLabels[visit.category] || visit.category}
									</span>
								</div>
								<h3 class="font-serif text-foreground truncate">{visit.subject}</h3>
								<p class="text-sm text-foreground-muted font-sans mt-1">
									{visit.guest_name || visit.guest_email || 'Authenticated user'} &middot; {formatDate(visit.created_at)}
									{#if visit.message_count > 1}
										&middot; {visit.message_count} messages
									{/if}
								</p>
							</div>
							<ArrowRight class="w-5 h-5 text-foreground/30 flex-shrink-0 mt-2" />
						</div>
					</GlassCard>
				</a>
			{/each}
		</div>
	{/if}
</div>
