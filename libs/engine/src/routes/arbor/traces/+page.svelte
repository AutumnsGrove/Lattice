<script lang="ts">
	/**
	 * Traces Admin Page
	 *
	 * View and manage feedback submitted via the Trace component.
	 * Features stats cards, filtering, and mark-as-read functionality.
	 */

	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import {
		MessageSquare,
		ThumbsUp,
		ThumbsDown,
		Filter,
		Eye,
		EyeOff,
		Archive,
		ChevronLeft,
		ChevronRight,
		Check,
		AlertTriangle,
		Loader2,
		X,
		MapPin,
	} from "lucide-svelte";
	import { GlassCard } from "$lib/ui";

	let { data, form } = $props();

	// Filter state - synced with URL params
	let voteFilter = $state("");
	let unreadOnly = $state(false);
	let sourceFilter = $state("");

	// Sync with data.filters when data changes
	$effect(() => {
		voteFilter = data.filters.vote ?? "";
		unreadOnly = data.filters.unreadOnly ?? false;
		sourceFilter = data.filters.source ?? "";
	});

	// Loading states
	let markingRead = $state<string | null>(null);
	let archiving = $state<string | null>(null);
	let markingAllRead = $state(false);

	// Format relative timestamp
	function formatRelativeTime(timestamp: number): string {
		const now = Math.floor(Date.now() / 1000);
		const diff = now - timestamp;

		if (diff < 60) return "Just now";
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;

		return new Date(timestamp * 1000).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	}

	// Format full timestamp
	function formatFullDate(timestamp: number): string {
		return new Date(timestamp * 1000).toLocaleString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	// Apply filters
	function applyFilters() {
		const params = new URLSearchParams();
		if (voteFilter) params.set("vote", voteFilter);
		if (unreadOnly) params.set("unread", "true");
		if (sourceFilter) params.set("source", sourceFilter);
		goto(`?${params.toString()}`, { replaceState: true });
	}

	// Clear filters
	function clearFilters() {
		voteFilter = "";
		unreadOnly = false;
		sourceFilter = "";
		goto("?", { replaceState: true });
	}

	// Pagination
	function goToPage(pageNum: number) {
		const params = new URLSearchParams(page.url.search);
		params.set("page", pageNum.toString());
		goto(`?${params.toString()}`);
	}

	// Calculate satisfaction rate
	const satisfactionRate = $derived(
		data.stats.total > 0
			? Math.round((data.stats.upvotes / data.stats.total) * 100)
			: 0,
	);
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-2xl font-medium text-foreground flex items-center gap-2">
				<MessageSquare class="w-6 h-6 text-grove-600 dark:text-grove-400" />
				Traces
			</h1>
			<p class="text-foreground-muted mt-1">Feedback from across Grove</p>
		</div>

		<!-- Mark all read button -->
		{#if data.stats.unread > 0}
			<form
				method="POST"
				action="?/markAllRead"
				use:enhance={() => {
					markingAllRead = true;
					return async ({ update }) => {
						await update();
						markingAllRead = false;
					};
				}}
			>
				<button
					type="submit"
					disabled={markingAllRead}
					class="px-4 py-2 rounded-lg bg-grove-600 hover:bg-grove-700 text-white transition-colors flex items-center gap-2"
				>
					{#if markingAllRead}
						<Loader2 class="w-4 h-4 animate-spin" />
					{:else}
						<Check class="w-4 h-4" />
					{/if}
					Mark all read
				</button>
			</form>
		{/if}
	</div>

	<!-- Feedback Messages -->
	{#if form?.success && form?.message}
		<div
			class="p-4 rounded-lg bg-grove-100 dark:bg-grove-900/30 border border-grove-300 dark:border-grove-700 text-grove-700 dark:text-grove-300 flex items-center gap-2"
		>
			<Check size={18} />
			{form.message}
		</div>
	{/if}

	{#if form?.error}
		<div
			class="p-4 rounded-lg bg-rose-100 dark:bg-rose-900/30 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 flex items-center gap-2"
		>
			<AlertTriangle size={18} />
			{form.error}
		</div>
	{/if}

	<!-- Stats Cards -->
	<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
		<GlassCard variant="muted" class="p-4 text-center">
			<div class="text-3xl font-bold text-foreground">{data.stats.total}</div>
			<div class="text-sm text-foreground-muted">Total Traces</div>
		</GlassCard>

		<GlassCard variant="muted" class="p-4 text-center">
			<div class="text-3xl font-bold text-grove-600 dark:text-grove-400 flex items-center justify-center gap-1">
				<ThumbsUp class="w-6 h-6" />
				{data.stats.upvotes}
			</div>
			<div class="text-sm text-foreground-muted">Helpful</div>
		</GlassCard>

		<GlassCard variant="muted" class="p-4 text-center">
			<div class="text-3xl font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1">
				<ThumbsDown class="w-6 h-6" />
				{data.stats.downvotes}
			</div>
			<div class="text-sm text-foreground-muted">Not Helpful</div>
		</GlassCard>

		<GlassCard variant="muted" class="p-4 text-center">
			<div class="text-3xl font-bold text-foreground">
				{satisfactionRate}%
			</div>
			<div class="text-sm text-foreground-muted">Satisfaction</div>
		</GlassCard>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Main Content -->
		<div class="lg:col-span-2 space-y-4">
			<!-- Filters -->
			<GlassCard variant="frosted" class="p-4">
				<div class="flex flex-col sm:flex-row gap-3">
					<!-- Vote filter -->
					<select
						bind:value={voteFilter}
						onchange={applyFilters}
						class="px-4 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 border border-white/30 dark:border-bark-700/30 text-foreground focus:outline-none focus:border-grove-500"
					>
						<option value="">All votes</option>
						<option value="up">👍 Helpful only</option>
						<option value="down">👎 Not helpful only</option>
					</select>

					<!-- Source filter -->
					<input
						type="text"
						bind:value={sourceFilter}
						onkeydown={(e) => e.key === "Enter" && applyFilters()}
						placeholder="Filter by source path..."
						class="flex-1 px-4 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 border border-white/30 dark:border-bark-700/30 text-foreground placeholder:text-foreground-faint focus:outline-none focus:border-grove-500"
					/>

					<!-- Unread toggle -->
					<button
						type="button"
						onclick={() => {
							unreadOnly = !unreadOnly;
							applyFilters();
						}}
						class="px-4 py-2 rounded-lg transition-colors flex items-center gap-2 {unreadOnly
							? 'bg-grove-600 text-white'
							: 'bg-white/50 dark:bg-bark-800/30 text-foreground-muted hover:text-foreground'}"
					>
						{#if unreadOnly}
							<EyeOff class="w-4 h-4" />
						{:else}
							<Eye class="w-4 h-4" />
						{/if}
						Unread ({data.stats.unread})
					</button>

					<button
						type="button"
						onclick={applyFilters}
						class="px-4 py-2 rounded-lg bg-grove-600 text-white hover:bg-grove-700 transition-colors"
					>
						<Filter class="w-4 h-4" />
					</button>

					{#if voteFilter || unreadOnly || sourceFilter}
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

			<!-- Traces List -->
			<GlassCard variant="frosted">
				<div class="divide-y divide-white/10 dark:divide-bark-700/30">
					{#each data.traces as trace}
						<div
							class="p-4 group {trace.read_at ? 'opacity-70' : ''}"
						>
							<div class="flex items-start gap-4">
								<!-- Vote indicator -->
								<div
									class="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl {trace.vote ===
									'up'
										? 'bg-grove-100 dark:bg-grove-900/30'
										: 'bg-rose-100 dark:bg-rose-900/30'}"
								>
									{trace.vote === "up" ? "👍" : "👎"}
								</div>

								<!-- Content -->
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 flex-wrap">
										<code
											class="px-2 py-0.5 rounded bg-white/40 dark:bg-bark-800/40 text-sm font-mono text-foreground"
										>
											{trace.source_path}
										</code>

										{#if !trace.read_at}
											<span
												class="px-2 py-0.5 text-xs rounded-full bg-grove-100 dark:bg-grove-900/50 text-grove-700 dark:text-grove-300"
											>
												New
											</span>
										{/if}
									</div>

									{#if trace.comment}
										<p class="mt-2 text-foreground italic">
											"{trace.comment}"
										</p>
									{/if}

									<div class="mt-2 text-xs text-foreground-subtle flex items-center gap-2">
										<span title={formatFullDate(trace.created_at)}>
											{formatRelativeTime(trace.created_at)}
										</span>
									</div>
								</div>

								<!-- Actions -->
								<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
									{#if !trace.read_at}
										<form
											method="POST"
											action="?/markRead"
											use:enhance={() => {
												markingRead = trace.id;
												return async ({ update }) => {
													await update();
													markingRead = null;
												};
											}}
										>
											<input type="hidden" name="id" value={trace.id} />
											<button
												type="submit"
												disabled={markingRead === trace.id}
												class="p-2 rounded text-foreground-muted hover:text-grove-600 hover:bg-grove-100 dark:hover:bg-grove-900/30 transition-colors"
												title="Mark as read"
											>
												{#if markingRead === trace.id}
													<Loader2 class="w-4 h-4 animate-spin" />
												{:else}
													<Eye class="w-4 h-4" />
												{/if}
											</button>
										</form>
									{/if}

									<form
										method="POST"
										action="?/archive"
										use:enhance={() => {
											archiving = trace.id;
											return async ({ update }) => {
												await update();
												archiving = null;
											};
										}}
									>
										<input type="hidden" name="id" value={trace.id} />
										<button
											type="submit"
											disabled={archiving === trace.id}
											class="p-2 rounded text-foreground-muted hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
											title="Archive"
										>
											{#if archiving === trace.id}
												<Loader2 class="w-4 h-4 animate-spin" />
											{:else}
												<Archive class="w-4 h-4" />
											{/if}
										</button>
									</form>
								</div>
							</div>
						</div>
					{:else}
						<div class="p-8 text-center text-foreground-muted">
							{#if voteFilter || unreadOnly || sourceFilter}
								No traces match your filters
							{:else}
								No traces yet. Add <code class="px-1 py-0.5 rounded bg-white/40">&lt;Trace /&gt;</code> to your pages to start collecting feedback.
							{/if}
						</div>
					{/each}
				</div>

				<!-- Pagination -->
				{#if data.pagination.totalPages > 1}
					<div
						class="p-4 border-t border-white/10 dark:border-bark-700/30 flex items-center justify-between"
					>
						<span class="text-sm text-foreground-muted">
							Showing {(data.pagination.page - 1) * data.pagination.pageSize + 1} -
							{Math.min(
								data.pagination.page * data.pagination.pageSize,
								data.pagination.total,
							)} of {data.pagination.total}
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

		<!-- Sidebar: By Location -->
		<div class="space-y-4">
			<GlassCard variant="frosted">
				<h2
					class="text-lg font-medium text-foreground mb-4 flex items-center gap-2 px-4 pt-4"
				>
					<MapPin class="w-5 h-5 text-grove-600 dark:text-grove-400" />
					By Location
				</h2>

				<div class="divide-y divide-white/10 dark:divide-bark-700/30">
					{#each data.sourceStats as source}
						{@const rate =
							source.total > 0
								? Math.round((source.upvotes / source.total) * 100)
								: 0}
						<button
							type="button"
							onclick={() => {
								sourceFilter = source.source_path;
								applyFilters();
							}}
							class="w-full p-3 text-left hover:bg-white/30 dark:hover:bg-bark-800/20 transition-colors"
						>
							<div class="flex items-center justify-between">
								<code class="text-sm font-mono text-foreground truncate">
									{source.source_path}
								</code>
								<span class="text-sm text-foreground-muted ml-2">
									{source.total}
								</span>
							</div>
							<div class="mt-2 flex items-center gap-2 text-xs">
								<span class="text-grove-600 dark:text-grove-400">
									👍 {source.upvotes}
								</span>
								<span class="text-rose-600 dark:text-rose-400">
									👎 {source.downvotes}
								</span>
								<span class="text-foreground-subtle">
									({rate}% positive)
								</span>
							</div>
						</button>
					{:else}
						<div class="p-4 text-sm text-foreground-muted">
							No location data yet
						</div>
					{/each}
				</div>
			</GlassCard>

			<!-- Quick Stats -->
			<GlassCard variant="muted" class="p-4">
				<h3 class="text-sm font-medium text-foreground mb-3">Quick Stats</h3>
				<dl class="space-y-2 text-sm">
					<div class="flex justify-between">
						<dt class="text-foreground-muted">With comments</dt>
						<dd class="text-foreground font-medium">{data.stats.withComments}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-foreground-muted">Unread</dt>
						<dd class="text-foreground font-medium">{data.stats.unread}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-foreground-muted">Unique sources</dt>
						<dd class="text-foreground font-medium">{data.sourceStats.length}</dd>
					</div>
				</dl>
			</GlassCard>
		</div>
	</div>
</div>
