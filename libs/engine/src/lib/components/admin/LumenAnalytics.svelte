<script lang="ts">
	import GlassCard from "$lib/ui/components/ui/GlassCard.svelte";
	import { phaseIcons, metricIcons, featureIcons, stateIcons, toolIcons } from "@autumnsgrove/prism/icons";
	import type { Component } from "svelte";

	interface LumenTaskStat {
		task: string;
		count: number;
		input_tokens: number;
		output_tokens: number;
		total_cost: number;
		avg_latency: number;
	}

	interface LumenRecentRequest {
		id: number;
		task: string;
		model: string;
		provider: string;
		input_tokens: number;
		output_tokens: number;
		cost: number;
		latency_ms: number;
		cached: number;
		created_at: string;
	}

	interface ProviderStat {
		provider: string;
		count: number;
		total_cost: number;
	}

	interface Props {
		today: LumenTaskStat[];
		week: LumenTaskStat[];
		recent: LumenRecentRequest[];
		providers: ProviderStat[];
	}

	let { today, week, recent, providers }: Props = $props();

	// Task display names and icons
	// brand-color: intentional — task type color coding
	const taskInfo: Record<string, { name: string; icon: Component; color: string }> = {
		moderation: { name: "Moderation", icon: stateIcons.checkCircle, color: "text-emerald-600" },
		generation: { name: "Generation", icon: phaseIcons.sparkles, color: "text-violet-600" },
		summary: { name: "Summary", icon: featureIcons.layers, color: "text-blue-600" },
		embedding: { name: "Embedding", icon: featureIcons.database, color: "text-amber-600" },
		chat: { name: "Chat", icon: metricIcons.activity, color: "text-rose-600" },
		image: { name: "Image", icon: phaseIcons.zap, color: "text-pink-600" },
		code: { name: "Code", icon: toolIcons.vista, color: "text-cyan-600" },
		transcription: { name: "Transcription", icon: metricIcons.barChart, color: "text-indigo-600" },
	};

	// Format currency
	function formatCost(cost: number): string {
		if (cost < 0.01) return "<$0.01";
		return `$${cost.toFixed(2)}`;
	}

	// Format number with commas
	function formatNumber(num: number): string {
		return num.toLocaleString();
	}

	// Format latency
	function formatLatency(ms: number): string {
		if (ms < 1000) return `${Math.round(ms)}ms`;
		return `${(ms / 1000).toFixed(1)}s`;
	}

	// Format relative time
	function timeAgo(timestamp: string): string {
		const date = new Date(timestamp);
		const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
		if (seconds < 60) return "just now";
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		return `${Math.floor(seconds / 86400)}d ago`;
	}

	// Calculate totals
	let todayTotal = $derived(today.reduce((sum, t) => sum + t.count, 0));
	let todayCost = $derived(today.reduce((sum, t) => sum + t.total_cost, 0));
	let weekTotal = $derived(week.reduce((sum, t) => sum + t.count, 0));
	let weekCost = $derived(week.reduce((sum, t) => sum + t.total_cost, 0));
</script>

<div class="space-y-6">
	<!-- Overview Cards -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
		<GlassCard variant="frosted" class="p-4">
			<div class="flex items-center gap-3">
				<div class="p-2 rounded-lg bg-accent-subtle">
					<phaseIcons.sparkles class="w-5 h-5 text-accent" />
				</div>
				<div>
					<p class="text-sm text-foreground-subtle">Today's Requests</p>
					<p class="text-2xl font-semibold text-foreground">{formatNumber(todayTotal)}</p>
				</div>
			</div>
		</GlassCard>

		<GlassCard variant="frosted" class="p-4">
			<div class="flex items-center gap-3">
				<div class="p-2 rounded-lg bg-success-bg">
					<metricIcons.coins class="w-5 h-5 text-success" />
				</div>
				<div>
					<p class="text-sm text-foreground-subtle">Today's Cost</p>
					<p class="text-2xl font-semibold text-foreground">{formatCost(todayCost)}</p>
				</div>
			</div>
		</GlassCard>

		<GlassCard variant="frosted" class="p-4">
			<div class="flex items-center gap-3">
				<div class="p-2 rounded-lg bg-info-bg">
					<metricIcons.trending class="w-5 h-5 text-info" />
				</div>
				<div>
					<p class="text-sm text-foreground-subtle">7-Day Requests</p>
					<p class="text-2xl font-semibold text-foreground">{formatNumber(weekTotal)}</p>
				</div>
			</div>
		</GlassCard>

		<GlassCard variant="frosted" class="p-4">
			<div class="flex items-center gap-3">
				<div class="p-2 rounded-lg bg-warning-bg">
					<metricIcons.coins class="w-5 h-5 text-warning" />
				</div>
				<div>
					<p class="text-sm text-foreground-subtle">7-Day Cost</p>
					<p class="text-2xl font-semibold text-foreground">{formatCost(weekCost)}</p>
				</div>
			</div>
		</GlassCard>
	</div>

	<!-- Task Breakdown -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Today's Stats -->
		<GlassCard
			variant="default"
			class="p-6"
			title="Today's Usage by Task"
			icon={metricIcons.activity}
			iconClass="text-foreground-subtle"
		>
			{#if today.length === 0}
				<div class="text-center py-8 text-foreground-subtle">
					<stateIcons.warning class="w-8 h-8 mx-auto mb-2 opacity-50" />
					<p>No requests today</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each today as stat (stat.task)}
						{@const info = taskInfo[stat.task] || {
							name: stat.task,
							icon: phaseIcons.zap,
							color: "text-foreground-muted",
						}}
						{@const Icon = info.icon}
						<div class="flex items-center justify-between p-3 rounded-lg bg-surface/50">
							<div class="flex items-center gap-3">
								<Icon class="w-4 h-4 {info.color}" />
								<span class="font-medium text-foreground">{info.name}</span>
							</div>
							<div class="flex items-center gap-4 text-sm text-foreground-subtle">
								<span>{formatNumber(stat.count)} req</span>
								<span class="text-foreground-muted">|</span>
								<span>{formatCost(stat.total_cost)}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</GlassCard>

		<!-- Provider Breakdown -->
		<GlassCard
			variant="default"
			class="p-6"
			title="Provider Usage (7 Days)"
			icon={featureIcons.database}
			iconClass="text-foreground-subtle"
		>
			{#if providers.length === 0}
				<div class="text-center py-8 text-foreground-subtle">
					<stateIcons.warning class="w-8 h-8 mx-auto mb-2 opacity-50" />
					<p>No provider data</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each providers as provider (provider.provider)}
						<div class="flex items-center justify-between p-3 rounded-lg bg-surface/50">
							<div class="flex items-center gap-3">
								<div class="w-2 h-2 rounded-full bg-grove-500"></div>
								<span class="font-medium text-foreground capitalize">{provider.provider}</span>
							</div>
							<div class="flex items-center gap-4 text-sm text-foreground-subtle">
								<span>{formatNumber(provider.count)} req</span>
								<span class="text-foreground-muted">|</span>
								<span>{formatCost(provider.total_cost)}</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</GlassCard>
	</div>

	<!-- Recent Requests -->
	<GlassCard
		variant="default"
		class="p-6"
		title="Recent Requests"
		icon={metricIcons.clock}
		iconClass="text-foreground-subtle"
	>
		{#if recent.length === 0}
			<div class="text-center py-8 text-foreground-subtle">
				<stateIcons.warning class="w-8 h-8 mx-auto mb-2 opacity-50" />
				<p>No recent requests</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-b border-grove-200 dark:border-grove-700">
							<th class="text-left py-2 px-3 text-foreground-subtle font-medium">Task</th>
							<th class="text-left py-2 px-3 text-foreground-subtle font-medium">Model</th>
							<th class="text-left py-2 px-3 text-foreground-subtle font-medium">Provider</th>
							<th class="text-right py-2 px-3 text-foreground-subtle font-medium">Tokens</th>
							<th class="text-right py-2 px-3 text-foreground-subtle font-medium">Cost</th>
							<th class="text-right py-2 px-3 text-foreground-subtle font-medium">Latency</th>
							<th class="text-right py-2 px-3 text-foreground-subtle font-medium">Time</th>
						</tr>
					</thead>
					<tbody>
						{#each recent.slice(0, 20) as request (request.id)}
							{@const info = taskInfo[request.task] || {
								name: request.task,
								icon: phaseIcons.zap,
								color: "text-foreground-muted",
							}}
							{@const Icon = info.icon}
							<tr
								class="border-b border-grove-100 dark:border-grove-800 last:border-0 hover:bg-surface/30 transition-colors"
							>
								<td class="py-3 px-3">
									<div class="flex items-center gap-2">
										<Icon class="w-4 h-4 {info.color}" />
										<span class="text-foreground">{info.name}</span>
										{#if request.cached}
											<span
												class="text-[10px] px-1.5 py-0.5 rounded-full bg-warning-bg text-warning-foreground"
												>cached</span
											>
										{/if}
									</div>
								</td>
								<td class="py-3 px-3 text-foreground-subtle">{request.model}</td>
								<td class="py-3 px-3 text-foreground-subtle capitalize">{request.provider}</td>
								<td class="py-3 px-3 text-right text-foreground-subtle">
									{formatNumber(request.input_tokens + request.output_tokens)}
								</td>
								<td class="py-3 px-3 text-right text-foreground-subtle"
									>{formatCost(request.cost)}</td
								>
								<td class="py-3 px-3 text-right text-foreground-subtle"
									>{formatLatency(request.latency_ms)}</td
								>
								<td class="py-3 px-3 text-right text-foreground-muted"
									>{timeAgo(request.created_at)}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</GlassCard>
</div>
