<script lang="ts">
	import { GlassCard } from '$lib/ui';
	import {
		Wind,
		Send,
		Check,
		AlertTriangle,
		Clock,
		TrendingUp,
		Hash,
		AlertCircle,
		CheckCircle2,
		XCircle,
		Activity
	} from 'lucide-svelte';

	interface Broadcast {
		id: string;
		content: string;
		platforms: string;
		status: string;
		tenant: string;
		created_at: number;
	}

	interface Stats {
		byStatus: Array<{ status: string; count: number }>;
		byPlatform: Record<string, number>;
		total: number;
	}

	interface Props {
		broadcasts: Broadcast[];
		stats: Stats | null;
	}

	let { broadcasts, stats }: Props = $props();

	// Status display info
	const statusInfo: Record<string, { label: string; icon: typeof Check; color: string; bgColor: string }> = {
		delivered: { 
			label: 'Delivered', 
			icon: CheckCircle2, 
			color: 'text-emerald-600 dark:text-emerald-400',
			bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
		},
		partial: { 
			label: 'Partial', 
			icon: AlertCircle, 
			color: 'text-amber-600 dark:text-amber-400',
			bgColor: 'bg-amber-100 dark:bg-amber-900/30'
		},
		failed: { 
			label: 'Failed', 
			icon: XCircle, 
			color: 'text-red-600 dark:text-red-400',
			bgColor: 'bg-red-100 dark:bg-red-900/30'
		},
	};

	// Platform icons/colors
	const platformInfo: Record<string, { color: string; bgColor: string }> = {
		bluesky: { color: 'text-blue-500', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
		mastodon: { color: 'text-purple-500', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
		devto: { color: 'text-black dark:text-white', bgColor: 'bg-gray-100 dark:bg-gray-800' },
	};

	// Format relative time
	function timeAgo(timestamp: number): string {
		const seconds = Math.floor((Date.now() - timestamp) / 1000);
		if (seconds < 60) return 'just now';
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		return `${Math.floor(seconds / 86400)}d ago`;
	}

	// Parse platforms from JSON
	function parsePlatforms(platformsJson: string): string[] {
		try {
			return JSON.parse(platformsJson) as string[];
		} catch {
			return [];
		}
	}
</script>

<div class="space-y-6">
	<!-- Overview Stats -->
	{#if stats}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
			<GlassCard variant="frosted" class="p-4">
				<div class="flex items-center gap-3">
					<div class="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
						<Wind class="w-5 h-5 text-blue-600 dark:text-blue-400" />
					</div>
					<div>
						<p class="text-sm text-foreground-subtle">7-Day Broadcasts</p>
						<p class="text-2xl font-semibold text-foreground">{stats.total.toLocaleString()}</p>
					</div>
				</div>
			</GlassCard>

			{#each stats.byStatus as stat (stat.status)}
				{@const info = statusInfo[stat.status] || { label: stat.status, icon: Activity, color: 'text-gray-600', bgColor: 'bg-gray-100' }}
				{@const Icon = info.icon}
				<GlassCard variant="frosted" class="p-4">
					<div class="flex items-center gap-3">
						<div class="p-2 rounded-lg {info.bgColor}">
							<Icon class="w-5 h-5 {info.color}" />
						</div>
						<div>
							<p class="text-sm text-foreground-subtle">{info.label}</p>
							<p class="text-2xl font-semibold text-foreground">{stat.count.toLocaleString()}</p>
						</div>
					</div>
				</GlassCard>
			{/each}
		</div>
	{/if}

	<!-- Platform Breakdown -->
	{#if stats && Object.keys(stats.byPlatform).length > 0}
		<GlassCard variant="default" class="p-6">
			<h3 class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
				<TrendingUp class="w-5 h-5 text-foreground-subtle" />
				Platform Breakdown (Recent)
			</h3>
			<div class="flex flex-wrap gap-3">
				{#each Object.entries(stats.byPlatform) as [platform, count] (platform)}
					{@const info = platformInfo[platform] || { color: 'text-gray-600', bgColor: 'bg-gray-100' }}
					<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full {info.bgColor}">
						<span class="font-medium {info.color} capitalize">{platform}</span>
						<span class="text-foreground-subtle">{count}</span>
					</div>
				{/each}
			</div>
		</GlassCard>
	{/if}

	<!-- Recent Broadcasts -->
	<GlassCard variant="default" class="p-6">
		<h3 class="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
			<Clock class="w-5 h-5 text-foreground-subtle" />
			Recent Broadcasts
		</h3>
		{#if broadcasts.length === 0}
			<div class="text-center py-8 text-foreground-subtle">
				<AlertTriangle class="w-8 h-8 mx-auto mb-2 opacity-50" />
				<p>No recent broadcasts</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each broadcasts.slice(0, 20) as broadcast (broadcast.id)}
					{@const platforms = parsePlatforms(broadcast.platforms)}
					{@const status = statusInfo[broadcast.status] || { label: broadcast.status, icon: Activity, color: 'text-gray-600', bgColor: 'bg-gray-100' }}
					{@const StatusIcon = status.icon}
					<div class="p-4 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-grove-100 dark:border-grove-800">
						<p class="text-foreground text-sm whitespace-pre-wrap break-words mb-3">
							{broadcast.content}
						</p>
						<div class="flex items-center justify-between flex-wrap gap-2">
							<div class="flex items-center gap-2">
								{#each platforms as platform (platform)}
									{@const pInfo = platformInfo[platform] || { color: 'text-gray-600', bgColor: 'bg-gray-100' }}
									<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs {pInfo.bgColor}">
										<span class="w-1.5 h-1.5 rounded-full {pInfo.color}"></span>
										<span class="capitalize {pInfo.color}">{platform}</span>
									</span>
								{/each}
							</div>
							<div class="flex items-center gap-3 text-xs text-foreground-subtle">
								<span class="inline-flex items-center gap-1 {status.color}">
									<StatusIcon class="w-3 h-3" />
									{status.label}
								</span>
								<span class="text-foreground-muted">|</span>
								<span>{timeAgo(broadcast.created_at)}</span>
								{#if broadcast.tenant}
									<span class="text-foreground-muted">|</span>
									<span class="text-foreground-muted">{broadcast.tenant}</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</GlassCard>
</div>
