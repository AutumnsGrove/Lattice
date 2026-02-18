<script lang="ts">
	import type { PageData } from "./$types";
	import { GlassCard } from "@autumnsgrove/groveengine/ui";
	import { Box } from "lucide-svelte";

	let { data }: { data: PageData } = $props();

	function formatBytes(bytes: number): string {
		if (bytes === 0) return "0 B";
		if (bytes < 1024) return bytes + " B";
		if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
		return (bytes / 1024 / 1024).toFixed(2) + " MB";
	}
</script>

<svelte:head>
	<title>Durable Objects — Vista — Grove Admin</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">Durable Objects</h1>
	<p class="text-foreground-muted font-sans mt-1">
		Active and hibernating instance counts per DO class
	</p>
</div>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
	{#each data.durableObjects as doClass}
		<GlassCard class="p-5 {doClass.awaitingInstrumentation ? 'opacity-80' : ''}">
			<div class="flex items-start justify-between mb-3">
				<div>
					<div class="flex items-center gap-2">
						<p class="text-sm font-sans font-medium text-foreground font-mono">
							{doClass.className}
						</p>
						{#if doClass.awaitingInstrumentation}
							<span
								class="text-xs font-sans px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
							>
								Awaiting instrumentation
							</span>
						{/if}
					</div>
					<p class="text-xs font-sans text-foreground-muted mt-0.5">{doClass.description}</p>
				</div>
				<Box class="w-4 h-4 text-foreground-muted shrink-0" />
			</div>

			{#if !doClass.awaitingInstrumentation}
				<div class="grid grid-cols-2 gap-3 mt-3">
					<div>
						<p class="text-xs font-sans text-foreground-muted">Active</p>
						<p class="text-sm font-sans font-medium text-grove-700 dark:text-grove-400 mt-0.5">
							{doClass.activeInstances.toLocaleString()}
						</p>
					</div>
					<div>
						<p class="text-xs font-sans text-foreground-muted">Hibernating</p>
						<p class="text-sm font-sans font-medium text-foreground mt-0.5">
							{doClass.hibernatingInstances.toLocaleString()}
						</p>
					</div>
					<div>
						<p class="text-xs font-sans text-foreground-muted">Storage</p>
						<p class="text-sm font-sans font-medium text-foreground mt-0.5">
							{formatBytes(doClass.storageBytes)}
						</p>
					</div>
					<div>
						<p class="text-xs font-sans text-foreground-muted">Total Alarms</p>
						<p class="text-sm font-sans font-medium text-foreground mt-0.5">
							{doClass.totalAlarms.toLocaleString()}
						</p>
					</div>
				</div>
			{:else}
				<p class="text-xs font-sans text-foreground-muted mt-2">
					This class hasn't reported metrics yet. Once instrumented and deployed, data will appear
					here.
				</p>
			{/if}

			<p class="text-xs font-sans text-foreground-muted mt-3 font-mono">
				{doClass.workerScriptName}
			</p>
		</GlassCard>
	{/each}
</div>
