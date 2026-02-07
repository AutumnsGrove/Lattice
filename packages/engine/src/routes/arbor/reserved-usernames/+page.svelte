<script lang="ts">
	/**
	 * Reserved Usernames Admin Page
	 *
	 * Allows Grove administrators to manage reserved usernames
	 * with full audit logging for compliance.
	 */

	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		Shield,
		Plus,
		Trash2,
		Search,
		Filter,
		History,
		ChevronLeft,
		ChevronRight,
		AlertTriangle,
		Check,
		X,
		Loader2
	} from 'lucide-svelte';
	import { GlassCard, GroveTerm } from '$lib/ui';

	let { data, form } = $props();

	// Form state
	let newUsername = $state('');
	let newReason = $state<string>('system');
	let newNotes = $state('');
	let isAdding = $state(false);
	let removeUsername = $state<string | null>(null);
	let removeNotes = $state('');
	let isRemoving = $state(false);

	// Search state - synced with data.filters
	let searchQuery = $state('');
	let reasonFilter = $state('');

	// Sync search state with URL filters when data changes
	$effect(() => {
		searchQuery = data.filters.search ?? '';
		reasonFilter = data.filters.reason ?? '';
	});

	// Reason labels for display
	const reasonLabels: Record<string, string> = {
		system: 'System Reserved',
		trademark: 'Trademark',
		offensive: 'Offensive',
		taken_external: 'Taken Externally',
		custom: 'Custom'
	};

	// Reason colors for badges
	const reasonColors: Record<string, string> = {
		system: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
		trademark: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
		offensive: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
		taken_external: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
		custom: 'bg-slate-500/20 text-foreground dark:text-foreground border-slate-500/30'
	};

	// Format timestamp
	function formatDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Apply search/filter
	function applyFilters() {
		const params = new URLSearchParams();
		if (searchQuery) params.set('search', searchQuery);
		if (reasonFilter) params.set('reason', reasonFilter);
		goto(`?${params.toString()}`, { replaceState: true });
	}

	// Clear filters
	function clearFilters() {
		searchQuery = '';
		reasonFilter = '';
		goto('?', { replaceState: true });
	}

	// Pagination
	function goToPage(pageNum: number) {
		const params = new URLSearchParams(page.url.search);
		params.set('page', pageNum.toString());
		goto(`?${params.toString()}`);
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-2xl font-medium text-foreground flex items-center gap-2">
				<Shield class="w-6 h-6 text-primary" />
				Reserved Usernames
			</h1>
			<p class="text-foreground-muted mt-1">
				Manage usernames that cannot be claimed by <GroveTerm term="wanderer">wanderers</GroveTerm>
			</p>
		</div>

		<!-- Stats -->
		<div class="flex gap-4 text-sm">
			{#each Object.entries(data.stats) as [reason, count]}
				<div class="px-3 py-1.5 rounded-lg bg-white/30 dark:bg-bark-800/30">
					<span class="text-foreground-muted">{reasonLabels[reason] || reason}:</span>
					<span class="font-medium text-foreground ml-1">{count}</span>
				</div>
			{/each}
		</div>
	</div>

	<!-- Feedback Messages -->
	{#if form?.success}
		<div
			class="p-4 rounded-lg bg-success/10 border border-success/30 text-success flex items-center gap-2"
		>
			<Check size={18} />
			{form.message}
		</div>
	{/if}

	{#if form?.error}
		<div
			class="p-4 rounded-lg bg-error/10 border border-error/30 text-error flex items-center gap-2"
		>
			<AlertTriangle size={18} />
			{form.error}
		</div>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Main Content -->
		<div class="lg:col-span-2 space-y-4">
			<!-- Search and Filter -->
			<GlassCard variant="frosted" class="p-4">
				<div class="flex flex-col sm:flex-row gap-3">
					<div class="relative flex-1">
						<Search
							class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted"
						/>
						<input
							type="text"
							bind:value={searchQuery}
							onkeydown={(e) => e.key === 'Enter' && applyFilters()}
							placeholder="Search usernames..."
							class="w-full pl-9 pr-4 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 border border-white/30 dark:border-bark-700/30 text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-primary"
						/>
					</div>

					<select
						bind:value={reasonFilter}
						onchange={applyFilters}
						class="px-4 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 border border-white/30 dark:border-bark-700/30 text-foreground focus:outline-none focus:border-primary"
					>
						<option value="">All reasons</option>
						{#each data.validReasons as reason}
							<option value={reason}>{reasonLabels[reason] || reason}</option>
						{/each}
					</select>

					<button
						type="button"
						onclick={applyFilters}
						class="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
					>
						<Filter class="w-4 h-4" />
					</button>

					{#if searchQuery || reasonFilter}
						<button
							type="button"
							onclick={clearFilters}
							class="px-4 py-2 rounded-lg bg-white/50 dark:bg-bark-800/30 text-foreground-muted hover:text-foreground transition-colors"
						>
							<X class="w-4 h-4" />
						</button>
					{/if}
				</div>
			</GlassCard>

			<!-- Reserved Usernames List -->
			<GlassCard variant="frosted">
				<div class="divide-y divide-white/10 dark:divide-bark-700/30">
					{#each data.reservedUsernames as item}
						<div class="p-4 flex items-center justify-between group">
							<div class="flex items-center gap-3">
								<code class="px-2 py-1 rounded bg-white/40 dark:bg-bark-800/40 text-sm font-mono">
									{item.username}
								</code>
								<span
									class="px-2 py-0.5 text-xs rounded border {reasonColors[item.reason] ||
										reasonColors.custom}"
								>
									{reasonLabels[item.reason] || item.reason}
								</span>
							</div>

							<div class="flex items-center gap-2">
								<span class="text-xs text-foreground-subtle hidden sm:inline">
									{formatDate(item.created_at)}
								</span>

								<button
									type="button"
									onclick={() => (removeUsername = item.username)}
									class="p-1.5 rounded text-foreground-muted hover:text-error hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100"
									title="Remove reservation"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</div>
						</div>
					{:else}
						<div class="p-8 text-center text-foreground-muted">
							{#if searchQuery || reasonFilter}
								No usernames match your search
							{:else}
								No reserved usernames found
							{/if}
						</div>
					{/each}
				</div>

				<!-- Pagination -->
				{#if data.pagination.totalPages > 1}
					<div class="p-4 border-t border-white/10 dark:border-bark-700/30 flex items-center justify-between">
						<span class="text-sm text-foreground-muted">
							Showing {(data.pagination.page - 1) * data.pagination.pageSize + 1} -
							{Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.total)} of {data.pagination.total}
						</span>

						<div class="flex items-center gap-1">
							<button
								type="button"
								onclick={() => goToPage(data.pagination.page - 1)}
								disabled={data.pagination.page === 1}
								class="p-2 rounded hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<ChevronLeft class="w-4 h-4" />
							</button>

							<span class="px-3 text-sm">
								{data.pagination.page} / {data.pagination.totalPages}
							</span>

							<button
								type="button"
								onclick={() => goToPage(data.pagination.page + 1)}
								disabled={data.pagination.page === data.pagination.totalPages}
								class="p-2 rounded hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<ChevronRight class="w-4 h-4" />
							</button>
						</div>
					</div>
				{/if}
			</GlassCard>
		</div>

		<!-- Sidebar -->
		<div class="space-y-4">
			<!-- Add New -->
			<GlassCard variant="frosted">
				<h2 class="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
					<Plus class="w-5 h-5 text-primary" />
					Add Reservation
				</h2>

				<form
					method="POST"
					action="?/add"
					use:enhance={() => {
						isAdding = true;
						return async ({ update }) => {
							await update();
							isAdding = false;
							if (!form?.error) {
								newUsername = '';
								newNotes = '';
							}
						};
					}}
					class="space-y-4"
				>
					<div>
						<label for="username" class="block text-sm font-medium text-foreground mb-1">
							Username
						</label>
						<input
							type="text"
							id="username"
							name="username"
							bind:value={newUsername}
							placeholder="username-to-reserve"
							required
							class="w-full px-3 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 border border-white/30 dark:border-bark-700/30 text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-primary"
						/>
					</div>

					<div>
						<label for="reason" class="block text-sm font-medium text-foreground mb-1">
							Reason
						</label>
						<select
							id="reason"
							name="reason"
							bind:value={newReason}
							required
							class="w-full px-3 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 border border-white/30 dark:border-bark-700/30 text-foreground focus:outline-none focus:border-primary"
						>
							{#each data.validReasons as reason}
								<option value={reason}>{reasonLabels[reason] || reason}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="notes" class="block text-sm font-medium text-foreground mb-1">
							Notes <span class="text-foreground-muted">(optional)</span>
						</label>
						<textarea
							id="notes"
							name="notes"
							bind:value={newNotes}
							placeholder="Why is this being reserved?"
							rows="2"
							class="w-full px-3 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 border border-white/30 dark:border-bark-700/30 text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-primary resize-none"
						></textarea>
					</div>

					<button
						type="submit"
						disabled={isAdding || !newUsername}
						class="btn-primary w-full"
					>
						{#if isAdding}
							<Loader2 class="w-4 h-4 animate-spin" />
							Adding...
						{:else}
							<Plus class="w-4 h-4" />
							Add Reservation
						{/if}
					</button>
				</form>
			</GlassCard>

			<!-- Recent Audit Log -->
			<GlassCard variant="frosted">
				<h2 class="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
					<History class="w-5 h-5 text-primary" />
					Recent Activity
				</h2>

				<div class="space-y-3 max-h-80 overflow-y-auto">
					{#each data.auditLog as entry}
						<div class="p-2 rounded-lg bg-white/30 dark:bg-bark-800/20 text-sm">
							<div class="flex items-center gap-2">
								{#if entry.action === 'add'}
									<Plus class="w-3 h-3 text-success" />
									<span class="text-success">Added</span>
								{:else}
									<Trash2 class="w-3 h-3 text-error" />
									<span class="text-error">Removed</span>
								{/if}
								<code class="text-foreground">{entry.username}</code>
							</div>
							<div class="text-xs text-foreground-muted mt-1">
								{entry.actor_email} · {formatDate(entry.created_at)}
							</div>
							{#if entry.notes}
								<div class="text-xs text-foreground-subtle mt-1 italic">
									"{entry.notes}"
								</div>
							{/if}
						</div>
					{:else}
						<p class="text-foreground-muted text-sm">No recent activity</p>
					{/each}
				</div>
			</GlassCard>
		</div>
	</div>

	<!-- Remove Confirmation Dialog -->
	{#if removeUsername}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
		>
			<GlassCard variant="frosted" class="max-w-md mx-4">
				<h3 class="text-lg font-medium text-foreground mb-2">Remove Reservation</h3>
				<p class="text-foreground-muted mb-4">
					Are you sure you want to release <code class="px-1 py-0.5 rounded bg-white/40"
						>{removeUsername}</code
					>? This username will become available for <GroveTerm term="wanderer">wanderers</GroveTerm> to claim.
				</p>

				<form
					method="POST"
					action="?/remove"
					use:enhance={() => {
						isRemoving = true;
						return async ({ update }) => {
							await update();
							isRemoving = false;
							if (!form?.error) {
								removeUsername = null;
								removeNotes = '';
							}
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="username" value={removeUsername} />

					<div>
						<label for="remove-notes" class="block text-sm font-medium text-foreground mb-1">
							Reason for removal <span class="text-foreground-muted">(optional)</span>
						</label>
						<textarea
							id="remove-notes"
							name="notes"
							bind:value={removeNotes}
							placeholder="Why is this being released?"
							rows="2"
							class="w-full px-3 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 border border-white/30 dark:border-bark-700/30 text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-primary resize-none"
						></textarea>
					</div>

					<div class="flex gap-3">
						<button
							type="button"
							onclick={() => {
								removeUsername = null;
								removeNotes = '';
							}}
							class="flex-1 px-4 py-2 rounded-lg bg-white/50 dark:bg-bark-800/30 text-foreground hover:bg-white/60 dark:hover:bg-bark-800/40 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isRemoving}
							class="flex-1 px-4 py-2 rounded-lg bg-error text-white hover:bg-error/90 transition-colors flex items-center justify-center gap-2"
						>
							{#if isRemoving}
								<Loader2 class="w-4 h-4 animate-spin" />
								Removing...
							{:else}
								<Trash2 class="w-4 h-4" />
								Remove
							{/if}
						</button>
					</div>
				</form>
			</GlassCard>
		</div>
	{/if}
</div>
