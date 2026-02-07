<script lang="ts">
	/**
	 * World Manager - World info, backups, and reset
	 *
	 * Uses client-side fetch to Heartwood for world and backup operations.
	 */

	import { GlassCard } from '@autumnsgrove/groveengine/ui';
	import {
		Map,
		Download,
		RotateCcw,
		AlertTriangle,
		Loader2,
		HardDrive,
		Clock,
		Trash2
	} from 'lucide-svelte';

	interface Props {
		serverRunning: boolean;
	}

	let { serverRunning }: Props = $props();

	interface WorldInfo {
		size?: number;
		seed?: string;
		lastModified?: string;
	}

	interface Backup {
		id: string;
		created_at: string;
		size: number;
		type?: string;
	}

	let worldInfo = $state<WorldInfo>({});
	let backups = $state<Backup[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let restoring = $state<string | null>(null);
	let showResetConfirm = $state(false);
	let resetting = $state(false);

	async function loadData() {
		loading = true;
		error = null;

		try {
			const [worldRes, backupsRes] = await Promise.all([
				fetch('/api/minecraft/world', { credentials: 'include' }).catch(() => null), // csrf-ok
				fetch('/api/minecraft/backups?limit=10', { credentials: 'include' }).catch( // csrf-ok
					() => null
				)
			]);

			if (worldRes?.ok) {
				const data = await worldRes.json() as any;
				worldInfo = data.world || data;
			}

			if (backupsRes?.ok) {
				const data = await backupsRes.json() as any;
				backups = data.backups || [];
			}
		} catch {
			error = 'Failed to load world data';
		}

		loading = false;
	}

	async function restoreBackup(backupId: string) {
		restoring = backupId;
		error = null;
		try {
			const res = await fetch(`/api/minecraft/backups/${backupId}/restore`, { // csrf-ok
				method: 'POST',
				credentials: 'include',
				headers: { 'X-Confirm-Restore': 'true' }
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({})) as any;
				error = data.error || 'Failed to restore backup';
			}
		} catch {
			error = 'Failed to restore backup';
		}
		restoring = null;
	}

	async function downloadBackup(backupId: string) {
		try {
			const res = await fetch(`/api/minecraft/backups/${backupId}/download`, { // csrf-ok
				credentials: 'include'
			});
			if (res.ok) {
				const blob = await res.blob();
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `backup-${backupId}.tar.gz`;
				a.click();
				URL.revokeObjectURL(url);
			} else {
				error = 'Failed to download backup';
			}
		} catch {
			error = 'Failed to download backup';
		}
	}

	async function resetWorld() {
		resetting = true;
		error = null;
		try {
			const res = await fetch('/api/minecraft/world', { // csrf-ok
				method: 'DELETE',
				credentials: 'include',
				headers: { 'X-Confirm-Delete': 'true' }
			});
			if (res.ok) {
				showResetConfirm = false;
				await loadData();
			} else {
				const data = await res.json().catch(() => ({})) as any;
				error = data.error || 'Failed to reset world';
			}
		} catch {
			error = 'Failed to reset world';
		}
		resetting = false;
	}

	function formatSize(bytes: number): string {
		if (!bytes) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Load data on mount
	$effect(() => {
		loadData();
	});
</script>

<section>
	<h2 class="text-lg font-serif text-foreground mb-4">World Manager</h2>

	{#if error}
		<GlassCard class="mb-4 p-4 border-red-200 dark:border-red-800" role="alert">
			<div class="flex items-center gap-2">
				<AlertTriangle class="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
				<p class="text-sm font-sans text-red-700 dark:text-red-400">{error}</p>
			</div>
		</GlassCard>
	{/if}

	{#if loading}
		<GlassCard class="text-center py-8">
			<Loader2 class="w-8 h-8 mx-auto mb-2 text-foreground-muted animate-spin" />
			<p class="text-sm font-sans text-foreground-muted">Loading world data...</p>
		</GlassCard>
	{:else}
		<!-- World Info -->
		<GlassCard class="mb-6 p-4">
			<h3 class="text-sm font-sans font-medium text-foreground mb-3 flex items-center gap-2">
				<Map class="w-4 h-4 text-foreground-muted" />
				World Info
			</h3>
			<div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm font-sans">
				{#if worldInfo.size}
					<div>
						<div class="text-foreground-muted">Size</div>
						<div class="text-foreground font-medium flex items-center gap-1">
							<HardDrive class="w-3.5 h-3.5 text-foreground-muted" />
							{formatSize(worldInfo.size)}
						</div>
					</div>
				{/if}
				{#if worldInfo.seed}
					<div>
						<div class="text-foreground-muted">Seed</div>
						<div class="text-foreground font-mono text-xs">{worldInfo.seed}</div>
					</div>
				{/if}
				{#if worldInfo.lastModified}
					<div>
						<div class="text-foreground-muted">Last Modified</div>
						<div class="text-foreground">{formatDate(worldInfo.lastModified)}</div>
					</div>
				{/if}
			</div>
		</GlassCard>

		<!-- Backups -->
		<div class="mb-6">
			<h3 class="text-sm font-sans font-medium text-foreground mb-3">Backups</h3>
			{#if backups.length === 0}
				<GlassCard class="text-center py-6">
					<Clock class="w-8 h-8 mx-auto mb-2 text-foreground/20" />
					<p class="text-sm font-sans text-foreground-muted">No backups available</p>
				</GlassCard>
			{:else}
				<div class="overflow-hidden rounded-xl border border-grove-200 dark:border-bark-700">
					<div class="divide-y divide-grove-100 dark:divide-bark-700/50">
						{#each backups as backup}
							<div
								class="flex items-center justify-between px-4 py-3 bg-white dark:bg-bark-800/30"
							>
								<div>
									<div class="text-sm font-sans text-foreground">
										{formatDate(backup.created_at)}
									</div>
									<div class="text-xs font-sans text-foreground-muted">
										{formatSize(backup.size)}
										{#if backup.type}
											· {backup.type}
										{/if}
									</div>
								</div>
								<div class="flex items-center gap-1">
									<button
										type="button"
										onclick={() => downloadBackup(backup.id)}
										class="p-1.5 text-foreground-muted hover:text-grove-600 dark:hover:text-grove-400 transition-colors"
										aria-label="Download backup from {formatDate(backup.created_at)}"
									>
										<Download class="w-4 h-4" />
									</button>
									<button
										type="button"
										onclick={() => restoreBackup(backup.id)}
										disabled={restoring === backup.id || serverRunning}
										class="p-1.5 text-foreground-muted hover:text-amber-600 dark:hover:text-amber-400 transition-colors disabled:opacity-50"
										title={serverRunning
											? 'Stop the server before restoring'
											: 'Restore this backup'}
										aria-label="Restore backup from {formatDate(backup.created_at)}"
									>
										{#if restoring === backup.id}
											<Loader2 class="w-4 h-4 animate-spin" />
										{:else}
											<RotateCcw class="w-4 h-4" />
										{/if}
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Reset World (Danger Zone) -->
		<GlassCard class="p-4 border-red-200 dark:border-red-800/50">
			<div class="flex items-center gap-2 mb-3">
				<AlertTriangle class="w-4 h-4 text-red-600 dark:text-red-400" />
				<h3 class="text-sm font-sans font-medium text-red-700 dark:text-red-400">
					Danger Zone
				</h3>
			</div>

			{#if showResetConfirm}
			<div role="alertdialog" aria-label="Confirm world reset">
				<p class="text-xs font-sans text-foreground-muted mb-3">
					This will permanently delete the current world. A backup will be created first.
					The server {serverRunning ? 'must be stopped' : 'should be stopped'} before resetting.
				</p>
				<div class="flex gap-2">
					<button
						type="button"
						onclick={resetWorld}
						disabled={resetting || serverRunning}
						class="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-sans hover:bg-red-700 transition-colors disabled:opacity-50"
					>
						{#if resetting}
							<Loader2 class="w-3 h-3 inline animate-spin mr-1" />
							Resetting...
						{:else}
							Yes, Reset World
						{/if}
					</button>
					<button
						type="button"
						onclick={() => (showResetConfirm = false)}
						class="px-3 py-1.5 bg-white dark:bg-bark-700 border border-grove-200 dark:border-bark-600 text-foreground rounded-lg text-xs font-sans hover:bg-grove-50 dark:hover:bg-bark-600 transition-colors"
					>
						Cancel
					</button>
				</div>
			</div>
			{:else}
				<div class="flex items-center justify-between">
					<div>
						<div class="text-sm font-sans text-foreground">Reset World</div>
						<div class="text-xs font-sans text-foreground-muted">
							Delete the current world and start fresh
						</div>
					</div>
					<button
						type="button"
						onclick={() => (showResetConfirm = true)}
						disabled={serverRunning}
						class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-sans text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
						title={serverRunning ? 'Stop the server first' : 'Reset world'}
					>
						<Trash2 class="w-3 h-3" />
						Reset
					</button>
				</div>
			{/if}
		</GlassCard>
	{/if}
</section>
