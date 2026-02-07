<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { GlassCard } from '@autumnsgrove/groveengine/ui';
	import { ArrowLeft } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();
	let form = $state<{ error?: string } | null>(null);
</script>

<svelte:head>
	<title>New Incident - Grove Admin</title>
</svelte:head>

<div class="mb-8">
	<a
		href="/arbor/status"
		class="inline-flex items-center gap-1 text-sm font-sans text-foreground-muted hover:text-grove-600 dark:hover:text-grove-400 transition-colors mb-4"
	>
		<ArrowLeft class="w-4 h-4" />
		Back to Status
	</a>
	<h1 class="text-2xl font-serif text-foreground">Report New Incident</h1>
</div>

{#if form?.error}
	<GlassCard class="mb-6 p-4 border-red-200 dark:border-red-800" role="alert">
		<p class="text-sm font-sans text-red-700 dark:text-red-400">{form.error}</p>
	</GlassCard>
{/if}

<GlassCard class="p-6">
	<form
		method="POST"
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'failure') {
					form = result.data as { error?: string };
				} else {
					await update();
				}
			};
		}}
		class="space-y-6"
	>
		<!-- Title -->
		<div>
			<label for="title" class="block text-sm font-sans font-medium text-foreground mb-1">
				Incident Title
			</label>
			<input
				type="text"
				id="title"
				name="title"
				required
				placeholder="e.g., CDN degraded performance in EU region"
				class="w-full px-3 py-2 border border-grove-200 dark:border-bark-600 rounded-lg text-sm font-sans bg-white dark:bg-bark-800 text-foreground focus:outline-none focus:ring-2 focus:ring-grove-500"
			/>
		</div>

		<!-- Type and Impact -->
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="type" class="block text-sm font-sans font-medium text-foreground mb-1">
					Type
				</label>
				<select
					id="type"
					name="type"
					required
					class="w-full px-3 py-2 border border-grove-200 dark:border-bark-600 rounded-lg text-sm font-sans bg-white dark:bg-bark-800 text-foreground focus:outline-none focus:ring-2 focus:ring-grove-500"
				>
					<option value="incident">Incident</option>
					<option value="outage">Outage</option>
					<option value="maintenance">Maintenance</option>
					<option value="performance">Performance</option>
				</select>
			</div>
			<div>
				<label for="impact" class="block text-sm font-sans font-medium text-foreground mb-1">
					Impact
				</label>
				<select
					id="impact"
					name="impact"
					required
					class="w-full px-3 py-2 border border-grove-200 dark:border-bark-600 rounded-lg text-sm font-sans bg-white dark:bg-bark-800 text-foreground focus:outline-none focus:ring-2 focus:ring-grove-500"
				>
					<option value="minor">Minor</option>
					<option value="major">Major</option>
					<option value="critical">Critical</option>
				</select>
			</div>
		</div>

		<!-- Initial Status -->
		<div>
			<label for="status" class="block text-sm font-sans font-medium text-foreground mb-1">
				Current Status
			</label>
			<select
				id="status"
				name="status"
				required
				class="w-full px-3 py-2 border border-grove-200 dark:border-bark-600 rounded-lg text-sm font-sans bg-white dark:bg-bark-800 text-foreground focus:outline-none focus:ring-2 focus:ring-grove-500"
			>
				<option value="investigating">Investigating</option>
				<option value="identified">Identified</option>
				<option value="monitoring">Monitoring</option>
			</select>
		</div>

		<!-- Affected Components -->
		<fieldset>
			<legend class="block text-sm font-sans font-medium text-foreground mb-2">
				Affected Components
			</legend>
			{#if data.components.length === 0}
				<p class="text-sm font-sans text-foreground-muted">No components configured</p>
			{:else}
				<div class="space-y-2">
					{#each data.components as component}
						<label class="flex items-center gap-2 cursor-pointer">
							<input
								type="checkbox"
								name="components"
								value={component.id}
								class="rounded border-grove-300 dark:border-bark-500 text-grove-600 focus:ring-grove-500"
							/>
							<span class="text-sm font-sans text-foreground">{component.name}</span>
						</label>
					{/each}
				</div>
			{/if}
		</fieldset>

		<!-- Initial Message -->
		<div>
			<label for="message" class="block text-sm font-sans font-medium text-foreground mb-1">
				Initial Update Message
			</label>
			<textarea
				id="message"
				name="message"
				required
				rows="4"
				placeholder="Describe what's happening and what we know so far..."
				class="w-full px-3 py-2 border border-grove-200 dark:border-bark-600 rounded-lg text-sm font-sans bg-white dark:bg-bark-800 text-foreground focus:outline-none focus:ring-2 focus:ring-grove-500"
			></textarea>
		</div>

		<!-- Submit -->
		<div class="flex justify-end gap-3">
			<a
				href="/arbor/status"
				class="px-4 py-2 bg-white dark:bg-bark-700 border border-grove-200 dark:border-bark-600 text-foreground rounded-lg text-sm font-sans hover:bg-grove-50 dark:hover:bg-bark-600 transition-colors"
			>
				Cancel
			</a>
			<button
				type="submit"
				class="px-4 py-2 bg-grove-600 text-white rounded-lg text-sm font-sans hover:bg-grove-700 transition-colors"
			>
				Create Incident
			</button>
		</div>
	</form>
</GlassCard>
