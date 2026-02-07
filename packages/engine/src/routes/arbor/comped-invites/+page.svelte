<script lang="ts">
	/**
	 * Comped Invites Admin Page
	 *
	 * Allows Grove administrators to create comped invites for friends,
	 * family, beta testers, and other special accounts. When someone
	 * with a comped invite signs up, they skip payment entirely.
	 */

	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		Gift,
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
		Loader2,
		Mail,
		CheckCircle,
		Clock
	} from 'lucide-svelte';
	import { GlassCard, GroveTerm } from '$lib/ui';

	let { data, form } = $props();

	// Form state
	let newEmail = $state('');
	let newTier = $state<string>('seedling');
	let newInviteType = $state<'beta' | 'comped'>('beta');
	let newMessage = $state('');
	let newNotes = $state('');
	let isAdding = $state(false);
	let revokeInvite = $state<{ id: string; email: string } | null>(null);
	let revokeNotes = $state('');
	let isRevoking = $state(false);

	// Search state
	let searchQuery = $state('');
	let statusFilter = $state('');
	let typeFilter = $state('');

	// Sync search state with URL filters when data changes
	$effect(() => {
		searchQuery = data.filters.search ?? '';
		statusFilter = data.filters.status ?? '';
		typeFilter = data.filters.type ?? '';
	});

	// Tier display names
	const tierLabels: Record<string, string> = {
		seedling: 'Seedling',
		sapling: 'Sapling',
		oak: 'Oak',
		evergreen: 'Evergreen'
	};

	// Tier colors for badges
	const tierColors: Record<string, string> = {
		seedling: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
		sapling: 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30',
		oak: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
		evergreen: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
	};

	// Invite type labels and colors
	const typeLabels: Record<string, string> = {
		beta: 'Beta',
		comped: 'Comped'
	};
	const typeColors: Record<string, string> = {
		beta: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
		comped: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30'
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
		if (statusFilter) params.set('status', statusFilter);
		if (typeFilter) params.set('type', typeFilter);
		goto(`?${params.toString()}`, { replaceState: true });
	}

	// Clear filters
	function clearFilters() {
		searchQuery = '';
		statusFilter = '';
		typeFilter = '';
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
				<Gift class="w-6 h-6 text-primary" />
				Comped Invites
			</h1>
			<p class="text-foreground-muted mt-1">
				Pre-approve friends and family for free premium accounts
			</p>
		</div>

		<!-- Stats -->
		<div class="flex flex-wrap gap-3 text-sm">
			<div class="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
				<span class="text-blue-700 dark:text-blue-300">Beta:</span>
				<span class="font-medium text-foreground">{data.stats.beta}</span>
			</div>
			<div class="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center gap-2">
				<span class="text-purple-700 dark:text-purple-300">Comped:</span>
				<span class="font-medium text-foreground">{data.stats.comped}</span>
			</div>
			<div class="px-3 py-1.5 rounded-lg bg-white/30 dark:bg-bark-800/30 flex items-center gap-2">
				<Clock class="w-4 h-4 text-yellow-400" />
				<span class="text-foreground-muted">Pending:</span>
				<span class="font-medium text-foreground">{data.stats.pending}</span>
			</div>
			<div class="px-3 py-1.5 rounded-lg bg-white/30 dark:bg-bark-800/30 flex items-center gap-2">
				<CheckCircle class="w-4 h-4 text-green-400" />
				<span class="text-foreground-muted">Used:</span>
				<span class="font-medium text-foreground">{data.stats.used}</span>
			</div>
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
							placeholder="Search by email..."
							class="w-full pl-9 pr-4 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 border border-white/30 dark:border-bark-700/30 text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-primary"
						/>
					</div>

					<select
						bind:value={typeFilter}
						onchange={applyFilters}
						class="px-4 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 border border-white/30 dark:border-bark-700/30 text-foreground focus:outline-none focus:border-primary"
					>
						<option value="">All types</option>
						<option value="beta">Beta</option>
						<option value="comped">Comped</option>
					</select>

					<select
						bind:value={statusFilter}
						onchange={applyFilters}
						class="px-4 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 border border-white/30 dark:border-bark-700/30 text-foreground focus:outline-none focus:border-primary"
					>
						<option value="">All status</option>
						<option value="pending">Pending</option>
						<option value="used">Used</option>
					</select>

					<button
						type="button"
						onclick={applyFilters}
						class="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
					>
						<Filter class="w-4 h-4" />
					</button>

					{#if searchQuery || statusFilter || typeFilter}
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

			<!-- Invites List -->
			<GlassCard variant="frosted">
				<div class="divide-y divide-white/10 dark:divide-bark-700/30">
					{#each data.invites as invite}
						<div class="p-4 flex items-center justify-between group">
							<div class="flex items-center gap-3 min-w-0">
								<div class="flex-shrink-0">
									{#if invite.used_at}
										<div class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
											<CheckCircle class="w-4 h-4 text-green-400" />
										</div>
									{:else}
										<div class="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
											<Clock class="w-4 h-4 text-yellow-400" />
										</div>
									{/if}
								</div>
								<div class="min-w-0">
									<div class="flex items-center gap-2 flex-wrap">
										<span class="font-medium text-foreground truncate">{invite.email}</span>
										<span
											class="px-2 py-0.5 text-xs rounded border {typeColors[invite.invite_type] ||
												typeColors.beta}"
										>
											{typeLabels[invite.invite_type] || invite.invite_type}
										</span>
										<span
											class="px-2 py-0.5 text-xs rounded border {tierColors[invite.tier] ||
												tierColors.seedling}"
										>
											{tierLabels[invite.tier] || invite.tier}
										</span>
									</div>
									<div class="text-xs text-foreground-subtle mt-0.5">
										{#if invite.used_at}
											Used {formatDate(invite.used_at)}
										{:else}
											Created {formatDate(invite.created_at)} by {invite.invited_by}
										{/if}
									</div>
									{#if invite.custom_message}
										<div class="text-xs text-foreground-muted mt-1 italic truncate">
											"{invite.custom_message}"
										</div>
									{/if}
								</div>
							</div>

							<div class="flex items-center gap-2 flex-shrink-0">
								{#if !invite.used_at}
									<button
										type="button"
										onclick={() => (revokeInvite = { id: invite.id, email: invite.email })}
										class="p-1.5 rounded text-foreground-muted hover:text-error hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100"
										title="Revoke invite"
									>
										<Trash2 class="w-4 h-4" />
									</button>
								{/if}
							</div>
						</div>
					{:else}
						<div class="p-8 text-center text-foreground-muted">
							{#if searchQuery || statusFilter}
								No invites match your search
							{:else}
								No comped invites yet. Create one to get started!
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
			<!-- Create New Invite -->
			<GlassCard variant="frosted">
				<h2 class="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
					<Plus class="w-5 h-5 text-primary" />
					Create Invite
				</h2>

				<form
					method="POST"
					action="?/create"
					use:enhance={() => {
						isAdding = true;
						return async ({ update }) => {
							await update();
							isAdding = false;
							if (!form?.error) {
								newEmail = '';
								newMessage = '';
								newNotes = '';
							}
						};
					}}
					class="space-y-4"
				>
					<div>
						<label for="email" class="block text-sm font-medium text-foreground mb-1">
							Email Address
						</label>
						<div class="relative">
							<Mail class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
							<input
								type="email"
								id="email"
								name="email"
								bind:value={newEmail}
								placeholder="friend@example.com"
								required
								class="w-full pl-9 pr-3 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 border border-white/30 dark:border-bark-700/30 text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-primary"
							/>
						</div>
					</div>

					<!-- Invite Type -->
					<div>
						<label class="block text-sm font-medium text-foreground mb-2">
							Invite Type
						</label>
						<div class="flex gap-3">
							<label class="flex items-center gap-2 cursor-pointer">
								<input
									type="radio"
									name="invite_type"
									value="beta"
									bind:group={newInviteType}
									class="w-4 h-4 text-blue-500 border-white/30 focus:ring-blue-500"
								/>
								<span class="text-sm text-foreground">Beta Tester</span>
							</label>
							<label class="flex items-center gap-2 cursor-pointer">
								<input
									type="radio"
									name="invite_type"
									value="comped"
									bind:group={newInviteType}
									class="w-4 h-4 text-purple-500 border-white/30 focus:ring-purple-500"
								/>
								<span class="text-sm text-foreground">Comped</span>
							</label>
						</div>
						<p class="text-xs text-foreground-muted mt-1">
							{#if newInviteType === 'beta'}
								Beta testers get free access now, should convert to paid later.
							{:else}
								Comped <GroveTerm term="wanderer">wanderers</GroveTerm> are free forever (special cases like EU tax issues).
							{/if}
						</p>
					</div>

					<div>
						<label for="tier" class="block text-sm font-medium text-foreground mb-1">
							Tier
						</label>
						<select
							id="tier"
							name="tier"
							bind:value={newTier}
							required
							class="w-full px-3 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 border border-white/30 dark:border-bark-700/30 text-foreground focus:outline-none focus:border-primary"
						>
							{#each data.validTiers as tier}
								<option value={tier}>{tierLabels[tier] || tier}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="custom_message" class="block text-sm font-medium text-foreground mb-1">
							Welcome Message <span class="text-foreground-muted">(optional)</span>
						</label>
						<textarea
							id="custom_message"
							name="custom_message"
							bind:value={newMessage}
							placeholder="A personal message shown when they sign up..."
							rows="2"
							class="w-full px-3 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 border border-white/30 dark:border-bark-700/30 text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-primary resize-none"
						></textarea>
					</div>

					<div>
						<label for="notes" class="block text-sm font-medium text-foreground mb-1">
							Internal Notes <span class="text-foreground-muted">(optional)</span>
						</label>
						<input
							type="text"
							id="notes"
							name="notes"
							bind:value={newNotes}
							placeholder="Why are we comping them?"
							class="w-full px-3 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 border border-white/30 dark:border-bark-700/30 text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-primary"
						/>
					</div>

					<button
						type="submit"
						disabled={isAdding || !newEmail}
						class="btn-primary w-full"
					>
						{#if isAdding}
							<Loader2 class="w-4 h-4 animate-spin" />
							Creating...
						{:else}
							<Gift class="w-4 h-4" />
							Create Invite
						{/if}
					</button>
				</form>
			</GlassCard>

			<!-- Recent Activity -->
			<GlassCard variant="frosted">
				<h2 class="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
					<History class="w-5 h-5 text-primary" />
					Recent Activity
				</h2>

				<div class="space-y-3 max-h-80 overflow-y-auto">
					{#each data.auditLog as entry}
						<div class="p-2 rounded-lg bg-white/30 dark:bg-bark-800/20 text-sm">
							<div class="flex items-center gap-2 flex-wrap">
								{#if entry.action === 'create'}
									<Plus class="w-3 h-3 text-success" />
									<span class="text-success">Created</span>
								{:else if entry.action === 'use'}
									<CheckCircle class="w-3 h-3 text-blue-400" />
									<span class="text-blue-400">Used</span>
								{:else}
									<Trash2 class="w-3 h-3 text-error" />
									<span class="text-error">Revoked</span>
								{/if}
								<span class="text-foreground truncate">{entry.email}</span>
								{#if entry.invite_type}
									<span class="px-1.5 py-0.5 text-xs rounded {typeColors[entry.invite_type]}">
										{typeLabels[entry.invite_type]}
									</span>
								{/if}
								<span class="px-1.5 py-0.5 text-xs rounded {tierColors[entry.tier]}">
									{tierLabels[entry.tier]}
								</span>
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

	<!-- Revoke Confirmation Dialog -->
	{#if revokeInvite}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
		>
			<GlassCard variant="frosted" class="max-w-md mx-4">
				<h3 class="text-lg font-medium text-foreground mb-2">Revoke Invite</h3>
				<p class="text-foreground-muted mb-4">
					Are you sure you want to revoke the invite for <span class="font-medium text-foreground">{revokeInvite.email}</span>?
					They will need a new invite to sign up for free.
				</p>

				<form
					method="POST"
					action="?/revoke"
					use:enhance={() => {
						isRevoking = true;
						return async ({ update }) => {
							await update();
							isRevoking = false;
							if (!form?.error) {
								revokeInvite = null;
								revokeNotes = '';
							}
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="invite_id" value={revokeInvite.id} />

					<div>
						<label for="revoke-notes" class="block text-sm font-medium text-foreground mb-1">
							Reason <span class="text-foreground-muted">(optional)</span>
						</label>
						<input
							type="text"
							id="revoke-notes"
							name="notes"
							bind:value={revokeNotes}
							placeholder="Why are we revoking this?"
							class="w-full px-3 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 border border-white/30 dark:border-bark-700/30 text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-primary"
						/>
					</div>

					<div class="flex gap-3">
						<button
							type="button"
							onclick={() => {
								revokeInvite = null;
								revokeNotes = '';
							}}
							class="flex-1 px-4 py-2 rounded-lg bg-white/50 dark:bg-bark-800/30 text-foreground hover:bg-white/60 dark:hover:bg-bark-800/40 transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isRevoking}
							class="flex-1 px-4 py-2 rounded-lg bg-error text-white hover:bg-error/90 transition-colors flex items-center justify-center gap-2"
						>
							{#if isRevoking}
								<Loader2 class="w-4 h-4 animate-spin" />
								Revoking...
							{:else}
								<Trash2 class="w-4 h-4" />
								Revoke
							{/if}
						</button>
					</div>
				</form>
			</GlassCard>
		</div>
	{/if}
</div>
