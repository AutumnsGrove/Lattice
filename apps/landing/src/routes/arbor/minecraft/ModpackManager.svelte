<script lang="ts">
	/**
	 * Modpack Manager - List, upload, and delete server mods
	 *
	 * Uses client-side fetch to Heartwood via the arbor API proxy pattern.
	 * Mod operations go through the same heartwoodFetch path as the server load.
	 */

	import { invalidateAll } from '$app/navigation';
	import { GlassCard } from '@autumnsgrove/lattice/ui';
	import {
		Package,
		Upload,
		Trash2,
		AlertTriangle,
		Loader2,
		FileBox,
		X
	} from '@lucide/svelte';

	interface Props {
		serverRunning: boolean;
	}

	let { serverRunning }: Props = $props();

	let mods = $state<{ filename: string; size: number; modified?: string }[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let uploading = $state(false);
	let deleting = $state<string | null>(null);
	let showDeleteAllConfirm = $state(false);
	let deletingAll = $state(false);
	let dragOver = $state(false);
	let fileInput = $state<HTMLInputElement | null>(null);

	async function loadMods() {
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/minecraft/mods', { credentials: 'include' }); // csrf-ok
			if (res.ok) {
				const data = await res.json() as any;
				mods = data.mods || [];
			} else {
				error = 'Failed to load mods';
			}
		} catch {
			error = 'Failed to connect to server';
		}
		loading = false;
	}

	async function uploadMod(file: File) {
		uploading = true;
		error = null;
		try {
			const res = await fetch('/api/minecraft/mods/upload', { // csrf-ok
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/octet-stream',
					'X-Filename': file.name
				},
				body: file
			});
			if (res.ok) {
				await loadMods();
			} else {
				const data = await res.json().catch(() => ({})) as any;
				error = data.error || 'Failed to upload mod';
			}
		} catch {
			error = 'Failed to upload mod';
		}
		uploading = false;
	}

	async function deleteMod(filename: string) {
		deleting = filename;
		error = null;
		try {
			const res = await fetch(`/api/minecraft/mods/${encodeURIComponent(filename)}`, { // csrf-ok
				method: 'DELETE',
				credentials: 'include'
			});
			if (res.ok) {
				await loadMods();
			} else {
				error = 'Failed to delete mod';
			}
		} catch {
			error = 'Failed to delete mod';
		}
		deleting = null;
	}

	async function deleteAllMods() {
		deletingAll = true;
		error = null;
		try {
			const res = await fetch('/api/minecraft/mods', { // csrf-ok
				method: 'DELETE',
				credentials: 'include',
				headers: { 'X-Confirm-Delete': 'true' }
			});
			if (res.ok) {
				showDeleteAllConfirm = false;
				await loadMods();
			} else {
				error = 'Failed to delete all mods';
			}
		} catch {
			error = 'Failed to delete all mods';
		}
		deletingAll = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragOver = false;
		const files = event.dataTransfer?.files;
		if (files?.[0]) {
			uploadMod(files[0]);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files?.[0]) {
			uploadMod(input.files[0]);
			input.value = '';
		}
	}

	function formatSize(bytes: number): string {
		if (!bytes) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
	}

	// Load mods on mount
	$effect(() => {
		loadMods();
	});
</script>

<section>
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-lg font-serif text-foreground">Modpack Manager</h2>
		{#if mods.length > 0}
			<button
				type="button"
				onclick={() => (showDeleteAllConfirm = true)}
				class="text-xs font-sans text-error hover:text-error/90"
			>
				Delete All Mods
			</button>
		{/if}
	</div>

	{#if error}
		<GlassCard class="mb-4 p-4 border-error" role="alert">
			<div class="flex items-center gap-2">
				<AlertTriangle class="w-4 h-4 text-error shrink-0" />
				<p class="text-sm font-sans text-error">{error}</p>
			</div>
		</GlassCard>
	{/if}

	<!-- Delete All Confirmation -->
	{#if showDeleteAllConfirm}
		<GlassCard class="mb-4 p-4 border-error" role="alertdialog" aria-label="Confirm delete all mods">
			<div class="flex items-center gap-2 mb-3">
				<AlertTriangle class="w-5 h-5 text-error" />
				<span class="text-sm font-sans font-medium text-error">
					Delete all {mods.length} mods?
				</span>
			</div>
			<p class="text-xs font-sans text-foreground-muted mb-3">
				This cannot be undone. The server {serverRunning ? 'should be restarted' : 'will need a restart'} for changes to take effect.
			</p>
			<div class="flex gap-2">
				<button
					type="button"
					onclick={deleteAllMods}
					disabled={deletingAll}
					class="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg text-xs font-sans hover:bg-destructive/90 transition-colors disabled:opacity-50"
				>
					{deletingAll ? 'Deleting...' : 'Yes, Delete All'}
				</button>
				<button
					type="button"
					onclick={() => (showDeleteAllConfirm = false)}
					class="px-3 py-1.5 bg-surface border border-border text-foreground rounded-lg text-xs font-sans hover:bg-surface-hover transition-colors"
				>
					Cancel
				</button>
			</div>
		</GlassCard>
	{/if}

	<!-- Upload Area -->
	<div
		role="button"
		tabindex="0"
		aria-label="Drop a .jar mod file here or click to browse"
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		onclick={() => fileInput?.click()}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				fileInput?.click();
			}
		}}
		class="mb-4 border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
			{dragOver
			? 'border-primary bg-primary/5'
			: 'border-border hover:border-primary/50'}"
	>
		{#if uploading}
			<Loader2 class="w-8 h-8 mx-auto mb-2 text-grove-500 animate-spin" />
			<p class="text-sm font-sans text-foreground-muted">Uploading...</p>
		{:else}
			<Upload class="w-8 h-8 mx-auto mb-2 text-foreground-muted" />
			<p class="text-sm font-sans text-foreground-muted">
				Drop a .jar file here or click to browse
			</p>
		{/if}
	</div>
	<input
		bind:this={fileInput}
		type="file"
		accept=".jar"
		class="hidden"
		onchange={handleFileSelect}
	/>

	<!-- Mod List -->
	{#if loading}
		<GlassCard class="text-center py-8">
			<Loader2 class="w-8 h-8 mx-auto mb-2 text-foreground-muted animate-spin" />
			<p class="text-sm font-sans text-foreground-muted">Loading mods...</p>
		</GlassCard>
	{:else if mods.length === 0}
		<GlassCard class="text-center py-8">
			<Package class="w-12 h-12 mx-auto mb-3 text-foreground/20" />
			<p class="text-foreground-muted font-sans">No mods installed</p>
		</GlassCard>
	{:else}
		<div class="overflow-hidden rounded-xl border border-border">
			<div class="divide-y divide-divider">
				{#each mods as mod}
					<div
						class="flex items-center justify-between px-4 py-3 bg-surface"
					>
						<div class="flex items-center gap-3">
							<FileBox class="w-4 h-4 text-foreground-muted shrink-0" />
							<div>
								<div class="text-sm font-sans text-foreground">{mod.filename}</div>
								<div class="text-xs font-sans text-foreground-muted">
									{formatSize(mod.size)}
								</div>
							</div>
						</div>
						<button
							type="button"
							onclick={() => deleteMod(mod.filename)}
							disabled={deleting === mod.filename}
							class="p-1.5 text-foreground-muted hover:text-error transition-colors disabled:opacity-50"
							aria-label="Delete {mod.filename}"
						>
							{#if deleting === mod.filename}
								<Loader2 class="w-4 h-4 animate-spin" />
							{:else}
								<Trash2 class="w-4 h-4" />
							{/if}
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</section>
