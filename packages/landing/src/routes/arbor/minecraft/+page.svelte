<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { GlassCard } from '@autumnsgrove/groveengine/ui';
	import {
		Play,
		Square,
		RefreshCw,
		Terminal,
		UserPlus,
		UserMinus,
		Clock,
		Globe,
		HardDrive,
		Users,
		Wifi,
		WifiOff,
		AlertCircle,
		Loader2,
		Package,
		Map
	} from 'lucide-svelte';
	import ModpackManager from './ModpackManager.svelte';
	import WorldManager from './WorldManager.svelte';

	let { data }: { data: PageData } = $props();
	let form = $state<{
		error?: string;
		success?: boolean;
		action?: string;
		response?: string;
	} | null>(null);

	let commandInput = $state('');
	let newWhitelistUser = $state('');
	let selectedRegion = $state('eu');
	let activeTab = $state<'controls' | 'mods' | 'world'>('controls');

	const stateConfig: Record<
		string,
		{ label: string; color: string; bg: string; pulse: boolean }
	> = {
		RUNNING: {
			label: 'Running',
			color: 'text-green-700 dark:text-green-400',
			bg: 'bg-green-100 dark:bg-green-900/30',
			pulse: false
		},
		IDLE: {
			label: 'Idle',
			color: 'text-foreground-muted dark:text-cream-300',
			bg: 'bg-cream-100 dark:bg-bark-700',
			pulse: false
		},
		PROVISIONING: {
			label: 'Starting...',
			color: 'text-amber-700 dark:text-amber-400',
			bg: 'bg-amber-100 dark:bg-amber-900/30',
			pulse: true
		},
		SUSPENDED: {
			label: 'Suspended',
			color: 'text-red-700 dark:text-red-400',
			bg: 'bg-red-100 dark:bg-red-900/30',
			pulse: false
		},
		TERMINATING: {
			label: 'Stopping...',
			color: 'text-orange-700 dark:text-orange-400',
			bg: 'bg-orange-100 dark:bg-orange-900/30',
			pulse: true
		},
		UNKNOWN: {
			label: 'Unknown',
			color: 'text-foreground-subtle dark:text-cream-400',
			bg: 'bg-cream-100 dark:bg-bark-700',
			pulse: false
		}
	};

	let serverState = $derived(stateConfig[data.serverStatus.state] || stateConfig.UNKNOWN);
	let isRunning = $derived(data.serverStatus.state === 'RUNNING');
	let isTransitioning = $derived(
		data.serverStatus.state === 'PROVISIONING' || data.serverStatus.state === 'TERMINATING'
	);

	function formatDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	function formatBytes(bytes: number): string {
		if (!bytes) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
	}

	function formatCost(cents: number): string {
		return `$${(cents / 100).toFixed(2)}`;
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Auto-refresh when server is active
	$effect(() => {
		if (isRunning || isTransitioning) {
			const interval = setInterval(() => {
				invalidateAll();
			}, 30000);
			return () => clearInterval(interval);
		}
	});
</script>

<svelte:head>
	<title>Minecraft - Grove Admin</title>
</svelte:head>

<!-- Header -->
<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">Minecraft Server</h1>
	<p class="text-foreground-muted font-sans mt-1">
		Manage the Grove community Minecraft server
	</p>
</div>

{#if form?.error}
	<GlassCard class="mb-6 p-4 border-red-200 dark:border-red-800" role="alert">
		<div class="flex items-center gap-2">
			<AlertCircle class="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
			<p class="text-sm font-sans text-red-700 dark:text-red-400">{form.error}</p>
		</div>
	</GlassCard>
{/if}

{#if form?.success && form?.action === 'command'}
	<GlassCard class="mb-6 p-4 border-green-200 dark:border-green-800" role="status">
		<p class="text-sm font-sans text-green-700 dark:text-green-400">
			{form.response || 'Command sent'}
		</p>
	</GlassCard>
{/if}

<!-- Server Status Card -->
<GlassCard class="mb-6 p-6">
	<div class="flex items-center justify-between mb-4">
		<div class="flex items-center gap-3">
			{#if isRunning}
				<Wifi class="w-6 h-6 text-green-600 dark:text-green-400" />
			{:else if isTransitioning}
				<Loader2 class="w-6 h-6 text-amber-600 dark:text-amber-400 animate-spin" />
			{:else}
				<WifiOff class="w-6 h-6 text-foreground-subtle dark:text-cream-500" />
			{/if}
			<div>
				<div class="text-lg font-serif text-foreground">Server Status</div>
				<span class="text-xs font-sans px-2 py-1 rounded {serverState.bg} {serverState.color}">
					{serverState.label}
				</span>
			</div>
		</div>

		<!-- Start/Stop Controls -->
		<div class="flex items-center gap-2">
			{#if !isRunning && !isTransitioning}
				<form method="POST" action="?/start" use:enhance>
					<input type="hidden" name="region" value={selectedRegion} />
					<div class="flex items-center gap-2">
						<select
							bind:value={selectedRegion}
							aria-label="Select server region"
							class="text-xs font-sans px-2 py-1.5 rounded border border-grove-200 dark:border-bark-600 bg-white dark:bg-bark-800 text-foreground"
						>
							<option value="eu">EU</option>
							<option value="us">US</option>
						</select>
						<button
							type="submit"
							class="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-sans hover:bg-green-700 transition-colors"
						>
							<Play class="w-4 h-4" />
							Start
						</button>
					</div>
				</form>
			{:else if isRunning}
				<form method="POST" action="?/stop" use:enhance>
					<button
						type="submit"
						class="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-sans hover:bg-red-700 transition-colors"
					>
						<Square class="w-4 h-4" />
						Stop
					</button>
				</form>
			{/if}
		</div>
	</div>

	<!-- Status Details (when running) -->
	{#if isRunning}
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-grove-200 dark:border-bark-700">
			{#if data.serverStatus.players}
				<div class="text-center">
					<Users class="w-4 h-4 mx-auto mb-1 text-foreground-muted" />
					<div class="text-lg font-serif text-foreground">
						{data.serverStatus.players.online}/{data.serverStatus.players.max}
					</div>
					<div class="text-xs font-sans text-foreground-muted">Players</div>
				</div>
			{/if}
			{#if data.serverStatus.region}
				<div class="text-center">
					<Globe class="w-4 h-4 mx-auto mb-1 text-foreground-muted" />
					<div class="text-lg font-serif text-foreground uppercase">
						{data.serverStatus.region}
					</div>
					<div class="text-xs font-sans text-foreground-muted">Region</div>
				</div>
			{/if}
			{#if data.serverStatus.ttl}
				<div class="text-center">
					<Clock class="w-4 h-4 mx-auto mb-1 text-foreground-muted" />
					<div class="text-lg font-serif text-foreground">
						{formatDuration(data.serverStatus.ttl)}
					</div>
					<div class="text-xs font-sans text-foreground-muted">Auto-shutdown</div>
				</div>
			{/if}
			{#if data.serverStatus.worldSize}
				<div class="text-center">
					<HardDrive class="w-4 h-4 mx-auto mb-1 text-foreground-muted" />
					<div class="text-lg font-serif text-foreground">
						{formatBytes(data.serverStatus.worldSize)}
					</div>
					<div class="text-xs font-sans text-foreground-muted">World Size</div>
				</div>
			{/if}
		</div>

		<!-- Online Players List -->
		{#if data.serverStatus.players && data.serverStatus.players.list.length > 0}
			<div class="mt-4 pt-4 border-t border-grove-200 dark:border-bark-700">
				<div class="text-xs font-sans text-foreground-muted mb-2">Online Players</div>
				<div class="flex flex-wrap gap-2">
					{#each data.serverStatus.players.list as player}
						<span class="text-xs font-sans px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
							{player}
						</span>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Session Cost -->
		{#if data.serverStatus.sessionCost}
			<div class="mt-4 pt-4 border-t border-grove-200 dark:border-bark-700 flex items-center justify-between">
				<span class="text-sm font-sans text-foreground-muted">Session Cost</span>
				<span class="text-sm font-sans text-foreground font-medium">
					{formatCost(data.serverStatus.sessionCost)}
				</span>
			</div>
		{/if}

		<!-- Last Backup + Manual Sync -->
		<div class="mt-4 pt-4 border-t border-grove-200 dark:border-bark-700 flex items-center justify-between">
			<div class="text-sm font-sans text-foreground-muted">
				Last backup:
				{data.serverStatus.lastBackup ? formatDate(data.serverStatus.lastBackup) : 'Never'}
			</div>
			<form method="POST" action="?/sync" use:enhance>
				<button
					type="submit"
					class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans text-grove-600 dark:text-grove-400 border border-grove-200 dark:border-bark-600 rounded-lg hover:bg-grove-50 dark:hover:bg-bark-700 transition-colors"
				>
					<RefreshCw class="w-3 h-3" />
					Sync Now
				</button>
			</form>
		</div>
	{/if}
</GlassCard>

<!-- Tab Navigation -->
<div class="flex gap-1 mb-6 border-b border-grove-200 dark:border-bark-700" role="tablist">
	<button
		type="button"
		onclick={() => (activeTab = 'controls')}
		role="tab"
		aria-selected={activeTab === 'controls'}
		aria-controls="controls-panel"
		class="px-4 py-2 text-sm font-sans transition-colors {activeTab === 'controls'
			? 'text-grove-600 dark:text-grove-400 border-b-2 border-grove-600 dark:border-grove-400'
			: 'text-foreground-muted hover:text-foreground'}"
	>
		Controls
	</button>
	<button
		type="button"
		onclick={() => (activeTab = 'mods')}
		role="tab"
		aria-selected={activeTab === 'mods'}
		aria-controls="mods-panel"
		class="px-4 py-2 text-sm font-sans transition-colors flex items-center gap-1.5 {activeTab === 'mods'
			? 'text-grove-600 dark:text-grove-400 border-b-2 border-grove-600 dark:border-grove-400'
			: 'text-foreground-muted hover:text-foreground'}"
	>
		<Package class="w-3.5 h-3.5" />
		Mods
	</button>
	<button
		type="button"
		onclick={() => (activeTab = 'world')}
		role="tab"
		aria-selected={activeTab === 'world'}
		aria-controls="world-panel"
		class="px-4 py-2 text-sm font-sans transition-colors flex items-center gap-1.5 {activeTab === 'world'
			? 'text-grove-600 dark:text-grove-400 border-b-2 border-grove-600 dark:border-grove-400'
			: 'text-foreground-muted hover:text-foreground'}"
	>
		<Map class="w-3.5 h-3.5" />
		World
	</button>
</div>

{#if activeTab === 'controls'}
	<!-- Whitelist Management -->
	<section class="mb-6" id="controls-panel">
		<h2 class="text-lg font-serif text-foreground mb-4">Whitelist</h2>
		<GlassCard class="p-4">
			<!-- Add Player -->
			<form
				method="POST"
				action="?/whitelistAdd"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'failure') {
							form = result.data as any;
						} else {
							newWhitelistUser = '';
							form = null;
							await update();
						}
					};
				}}
				class="flex gap-2 mb-4"
			>
				<input
					type="text"
					name="username"
					bind:value={newWhitelistUser}
					placeholder="Minecraft username"
					aria-label="Minecraft username"
					class="flex-1 px-3 py-2 border border-grove-200 dark:border-bark-600 rounded-lg text-sm font-sans bg-white dark:bg-bark-800 text-foreground focus:outline-none focus:ring-2 focus:ring-grove-500"
				/>
				<button
					type="submit"
					class="inline-flex items-center gap-1 px-4 py-2 bg-grove-600 text-white rounded-lg text-sm font-sans hover:bg-grove-700 transition-colors"
				>
					<UserPlus class="w-4 h-4" />
					Add
				</button>
			</form>

			<!-- Whitelist Entries -->
			{#if data.whitelist.length === 0}
				<p class="text-sm font-sans text-foreground-muted text-center py-4">
					No players whitelisted
				</p>
			{:else}
				<div class="divide-y divide-grove-100 dark:divide-bark-700/50">
					{#each data.whitelist as entry}
						<div class="flex items-center justify-between py-2">
							<span class="text-sm font-sans text-foreground">{entry.username}</span>
							<form method="POST" action="?/whitelistRemove" use:enhance>
								<input type="hidden" name="username" value={entry.username} />
								<button
									type="submit"
									class="p-1 text-foreground-muted hover:text-red-600 dark:hover:text-red-400 transition-colors"
									aria-label="Remove {entry.username}"
								>
									<UserMinus class="w-4 h-4" />
								</button>
							</form>
						</div>
					{/each}
				</div>
			{/if}
		</GlassCard>
	</section>

	<!-- Console Command -->
	{#if isRunning}
		<section class="mb-6">
			<h2 class="text-lg font-serif text-foreground mb-4">Console</h2>
			<GlassCard class="p-4">
				<form
					method="POST"
					action="?/command"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'failure') {
								form = result.data as any;
							} else if (result.type === 'success') {
								form = result.data as any;
								commandInput = '';
							}
							await update();
						};
					}}
					class="flex gap-2"
				>
					<div class="relative flex-1">
						<Terminal
							class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted"
						/>
						<input
							type="text"
							name="command"
							bind:value={commandInput}
							placeholder="Enter server command..."
							aria-label="Server command"
							class="w-full pl-10 pr-4 py-2 border border-grove-200 dark:border-bark-600 rounded-lg text-sm font-mono bg-white dark:bg-bark-800 text-foreground focus:outline-none focus:ring-2 focus:ring-grove-500"
						/>
					</div>
					<button
						type="submit"
						class="px-4 py-2 bg-grove-600 text-white rounded-lg text-sm font-sans hover:bg-grove-700 transition-colors"
					>
						Send
					</button>
				</form>
				<p class="text-xs font-sans text-foreground-muted mt-2">
					Blocked commands: stop, restart, kill, ban-ip, op, deop, pardon-ip
				</p>
			</GlassCard>
		</section>
	{/if}

	<!-- Session History -->
	<section>
		<h2 class="text-lg font-serif text-foreground mb-4">Session History</h2>
		{#if data.history.length === 0}
			<GlassCard class="text-center py-8">
				<Clock class="w-12 h-12 mx-auto mb-3 text-foreground/20" />
				<p class="text-foreground-muted font-sans">No sessions recorded</p>
			</GlassCard>
		{:else}
			<div class="overflow-hidden rounded-xl border border-grove-200 dark:border-bark-700">
				<div class="overflow-x-auto">
					<table class="w-full" aria-label="Session history">
						<thead
							class="bg-grove-50 dark:bg-bark-800/50 border-b border-grove-200 dark:border-bark-700"
						>
							<tr>
								<th
									scope="col"
									class="text-left px-4 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase"
								>
									Started
								</th>
								<th
									scope="col"
									class="text-left px-4 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase"
								>
									Region
								</th>
								<th
									scope="col"
									class="text-left px-4 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase"
								>
									Duration
								</th>
								<th
									scope="col"
									class="text-left px-4 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase"
								>
									Peak
								</th>
								<th
									scope="col"
									class="text-left px-4 py-3 text-xs font-sans font-semibold text-foreground-muted uppercase"
								>
									Cost
								</th>
							</tr>
						</thead>
						<tbody
							class="divide-y divide-grove-100 dark:divide-bark-700/50 bg-white dark:bg-bark-800/30"
						>
							{#each data.history as session}
								<tr>
									<td class="px-4 py-3 text-sm font-sans text-foreground">
										{formatDate(session.started_at)}
									</td>
									<td class="px-4 py-3">
										<span class="text-xs font-sans uppercase text-foreground-muted">
											{session.region}
										</span>
									</td>
									<td class="px-4 py-3 text-sm font-sans text-foreground">
										{session.duration ? formatDuration(session.duration) : '—'}
									</td>
									<td class="px-4 py-3 text-sm font-sans text-foreground">
										{session.peak_players ?? '—'}
									</td>
									<td class="px-4 py-3 text-sm font-sans text-foreground">
										{session.cost ? formatCost(session.cost) : '—'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</section>
{:else if activeTab === 'mods'}
	<div id="mods-panel">
		<ModpackManager serverRunning={isRunning} />
	</div>
{:else if activeTab === 'world'}
	<div id="world-panel">
		<WorldManager serverRunning={isRunning} />
	</div>
{/if}
