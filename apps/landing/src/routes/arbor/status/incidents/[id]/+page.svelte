<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { GlassCard } from '@autumnsgrove/lattice/ui';
	import { ArrowLeft, Clock, AlertCircle, CheckCircle2 } from '@lucide/svelte';

	let { data }: { data: PageData } = $props();
	let form = $state<{ error?: string; success?: boolean; resolved?: boolean } | null>(null);

	const impactColors: Record<string, string> = {
		critical: 'bg-error-bg text-error',
		major: 'bg-warning-bg text-warning',
		minor: 'bg-info-bg text-info'
	};

	const statusColors: Record<string, string> = {
		investigating: 'bg-error-bg text-error',
		identified: 'bg-warning-bg text-warning',
		monitoring: 'bg-info-bg text-info',
		resolved: 'bg-success-bg text-success'
	};

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	let isResolved = $derived(data.incident.resolved_at !== null);
</script>

<svelte:head>
	<title>{data.incident.title} - Grove Admin</title>
</svelte:head>

<div class="mb-8">
	<a
		href="/arbor/status"
		class="inline-flex items-center gap-1 text-sm font-sans text-foreground-muted hover:text-primary transition-colors mb-4"
	>
		<ArrowLeft class="w-4 h-4" />
		Back to Status
	</a>

	<!-- Incident Header -->
	<div class="flex items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-serif text-foreground">{data.incident.title}</h1>
			<div class="flex items-center gap-2 mt-2">
				<span class="text-xs font-sans px-2 py-1 rounded {impactColors[data.incident.impact] || ''}">
					{data.incident.impact}
				</span>
				<span class="text-xs font-sans px-2 py-1 rounded {statusColors[data.incident.status] || ''}">
					{data.incident.status}
				</span>
				<span class="text-xs font-sans text-foreground-muted">
					{data.incident.type} · Started {formatDate(data.incident.started_at)}
				</span>
			</div>
		</div>
		{#if !isResolved}
			<form method="POST" action="?/resolve" use:enhance>
				<button
					type="submit"
					class="px-4 py-2 bg-success text-success-foreground rounded-lg text-sm font-sans hover:bg-success/90 transition-colors flex items-center gap-2"
				>
					<CheckCircle2 class="w-4 h-4" />
					Resolve
				</button>
			</form>
		{:else}
			<div class="flex items-center gap-2 px-3 py-2 bg-success-bg rounded-lg">
				<CheckCircle2 class="w-4 h-4 text-success" />
				<span class="text-sm font-sans text-success">Resolved</span>
			</div>
		{/if}
	</div>
</div>

<!-- Affected Components -->
{#if data.affectedComponents.length > 0}
	<GlassCard class="mb-6 p-4">
		<h2 class="text-sm font-sans font-medium text-foreground mb-2">Affected Components</h2>
		<div class="flex flex-wrap gap-2">
			{#each data.affectedComponents as component}
				<span
					class="text-xs font-sans px-2 py-1 rounded bg-surface-subtle text-foreground"
				>
					{component.name}
				</span>
			{/each}
		</div>
	</GlassCard>
{/if}

{#if form?.error}
	<GlassCard class="mb-6 p-4 border-error" role="alert">
		<p class="text-sm font-sans text-error">{form.error}</p>
	</GlassCard>
{/if}

<!-- Post Update Form (only if not resolved) -->
{#if !isResolved}
	<GlassCard class="mb-6 p-4">
		<h2 class="text-sm font-sans font-medium text-foreground mb-3">Post Update</h2>
		<form
			method="POST"
			action="?/addUpdate"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'failure') {
						form = result.data as { error?: string };
					} else {
						form = null;
						await update();
					}
				};
			}}
			class="space-y-3"
		>
			<label for="update-status" class="sr-only">Update status</label>
			<select
				id="update-status"
				name="status"
				required
				class="w-full px-3 py-2 border border-border rounded-lg text-sm font-sans bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
			>
				<option value="investigating">Investigating</option>
				<option value="identified">Identified</option>
				<option value="monitoring">Monitoring</option>
			</select>
			<label for="update-message" class="sr-only">Update message</label>
			<textarea
				id="update-message"
				name="message"
				required
				rows="3"
				placeholder="Update on the current situation..."
				class="w-full px-3 py-2 border border-border rounded-lg text-sm font-sans bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
			></textarea>
			<div class="flex justify-end">
				<button
					type="submit"
					class="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-sans hover:bg-primary/90 transition-colors"
				>
					Post Update
				</button>
			</div>
		</form>
	</GlassCard>
{/if}

<!-- Update Timeline -->
<section>
	<h2 class="text-lg font-serif text-foreground mb-4">Timeline</h2>
	{#if data.updates.length === 0}
		<GlassCard class="text-center py-8">
			<Clock class="w-12 h-12 mx-auto mb-3 text-foreground/20" />
			<p class="text-foreground-muted font-sans">No updates yet</p>
		</GlassCard>
	{:else}
		<ol class="space-y-0">
			{#each data.updates as update, i}
				<li class="relative pl-8 pb-6 {i < data.updates.length - 1 ? 'border-l-2 border-border ml-2' : 'ml-2'}">
					<!-- Timeline dot -->
					<div class="absolute -left-[5px] top-1 w-3 h-3 rounded-full {update.status === 'resolved' ? 'bg-success' : 'bg-primary'}"></div>

					<div class="ml-4">
						<div class="flex items-center gap-2 mb-1">
							<span class="text-xs font-sans px-2 py-0.5 rounded {statusColors[update.status] || 'bg-surface-subtle text-foreground-muted'}">
								{update.status}
							</span>
							<span class="text-xs font-sans text-foreground-muted">
								{formatDate(update.created_at)}
							</span>
						</div>
						<p class="text-sm font-sans text-foreground whitespace-pre-wrap">{update.message}</p>
					</div>
			</li>
			{/each}
		</ol>
	{/if}
</section>
