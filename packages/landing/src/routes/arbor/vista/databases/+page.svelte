<script lang="ts">
	import type { PageData } from "./$types";
	import { GlassCard } from "@autumnsgrove/groveengine/ui";
	import { Database, Info } from "lucide-svelte";

	let { data }: { data: PageData } = $props();

	function formatBytes(bytes: number): string {
		if (bytes === 0) return "0 B";
		if (bytes < 1024) return bytes + " B";
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
		return (bytes / 1024 / 1024).toFixed(2) + " MB";
	}

	function formatRelativeTime(epochSeconds: number): string {
		const diffMs = Date.now() - epochSeconds * 1000;
		const minutes = Math.floor(diffMs / 60000);
		const hours = Math.floor(diffMs / 3600000);
		if (minutes < 1) return "Just now";
		if (minutes < 60) return `${minutes}m ago`;
		return `${hours}h ago`;
	}
</script>

<svelte:head>
	<title>Databases — Vista — Grove Admin</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">Databases</h1>
	<p class="text-foreground-muted font-sans mt-1">D1 database sizes and operation counts</p>
</div>

{#if !data.collectionTokenConfigured}
	<GlassCard class="mb-6 p-5 border-amber-200 dark:border-amber-800">
		<div class="flex items-start gap-3">
			<Info class="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
			<p class="text-sm font-sans text-amber-700 dark:text-amber-400">
				Vista is ready — connect your Cloudflare API token to start seeing live metrics.
			</p>
		</div>
	</GlassCard>
{/if}

{#if !data.databases || data.databases.length === 0}
	<GlassCard class="p-8 text-center">
		<Database class="w-12 h-12 mx-auto mb-3 text-foreground/20" />
		<p class="text-foreground-muted font-sans">
			{data.collectionTokenConfigured
				? "No database metrics collected yet — check back after the next collection run."
				: "Database metrics will appear here once the CF observability token is connected."}
		</p>
	</GlassCard>
{:else}
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		{#each data.databases as db}
			<GlassCard class="p-5">
				<div class="flex items-start justify-between mb-3">
					<div>
						<p class="text-sm font-sans font-medium text-foreground font-mono">{db.databaseName}</p>
						<p class="text-xs font-sans text-foreground-muted mt-0.5 font-mono">{db.databaseId}</p>
					</div>
					<Database class="w-4 h-4 text-foreground-muted shrink-0" />
				</div>
				<div class="grid grid-cols-3 gap-3 mt-3">
					<div>
						<p class="text-xs font-sans text-foreground-muted">Size</p>
						<p class="text-sm font-sans font-medium text-foreground mt-0.5">
							{formatBytes(db.sizeBytes)}
						</p>
					</div>
					<div>
						<p class="text-xs font-sans text-foreground-muted">Rows Read</p>
						<p class="text-sm font-sans font-medium text-foreground mt-0.5">
							{db.rowsRead.toLocaleString()}
						</p>
					</div>
					<div>
						<p class="text-xs font-sans text-foreground-muted">Rows Written</p>
						<p class="text-sm font-sans font-medium text-foreground mt-0.5">
							{db.rowsWritten.toLocaleString()}
						</p>
					</div>
				</div>
				<p class="text-xs font-sans text-foreground-muted mt-3">
					Last recorded {formatRelativeTime(db.recordedAt)}
				</p>
			</GlassCard>
		{/each}
	</div>
{/if}
