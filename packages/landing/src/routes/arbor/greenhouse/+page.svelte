<script lang="ts">
	import { CultivateFlagTable } from '@autumnsgrove/lattice/grafts/greenhouse';
	import { GlassCard } from '@autumnsgrove/lattice/ui';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		Sprout,
		Users,
		CheckCircle,
		XCircle,
		Leaf,
		ArrowRight
	} from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Form references for cultivate/prune
	let cultivateFormRef = $state<HTMLFormElement | null>(null);
	let pruneFormRef = $state<HTMLFormElement | null>(null);

	// Hidden input values
	let cultivateFlagId = $state('');
	let pruneFlagId = $state('');

	// Loading states
	let loadingFlagId = $state<string | undefined>(undefined);

	function handleFlagToggle(flagId: string, enabled: boolean) {
		loadingFlagId = flagId;
		if (enabled) {
			cultivateFlagId = flagId;
			requestAnimationFrame(() => cultivateFormRef?.requestSubmit());
		} else {
			pruneFlagId = flagId;
			requestAnimationFrame(() => pruneFormRef?.requestSubmit());
		}
	}

	function enhanceCallback() {
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			loadingFlagId = undefined;
			await invalidateAll();
		};
	}
</script>

<!-- Hidden forms -->
<form
	bind:this={cultivateFormRef}
	method="POST"
	action="?/cultivate"
	use:enhance={enhanceCallback}
	class="hidden"
	aria-hidden="true"
>
	<input type="hidden" name="flagId" value={cultivateFlagId} />
</form>

<form
	bind:this={pruneFormRef}
	method="POST"
	action="?/prune"
	use:enhance={enhanceCallback}
	class="hidden"
	aria-hidden="true"
>
	<input type="hidden" name="flagId" value={pruneFlagId} />
</form>

<svelte:head>
	<title>Greenhouse - Admin</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<h2 class="flex items-center gap-2 text-2xl font-serif text-foreground mb-1">
			<Sprout class="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
			Greenhouse
		</h2>
		<p class="text-sm font-sans text-foreground-muted">
			Manage feature flag cultivation for the entire Grove
		</p>
	</div>

	<!-- Action result message -->
	{#if form?.success}
		<GlassCard class="p-4">
			<div class="flex items-center gap-2 text-sm font-sans">
				<CheckCircle class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
				<span class="text-foreground">{form.message || 'Action completed'}</span>
			</div>
		</GlassCard>
	{:else if form?.error}
		<GlassCard class="p-4">
			<div class="flex items-center gap-2 text-sm font-sans">
				<XCircle class="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
				<span class="text-red-700 dark:text-red-400">{form.error}</span>
			</div>
		</GlassCard>
	{/if}

	<!-- Enrollment Stats -->
	<div class="grid grid-cols-2 gap-4">
		<GlassCard class="p-4 text-center">
			<div class="text-2xl font-serif text-emerald-600 dark:text-emerald-400">
				{data.enrolledCount}
			</div>
			<div class="flex items-center justify-center gap-1.5 text-sm font-sans text-foreground-muted">
				<Users class="w-4 h-4" />
				Enrolled
			</div>
		</GlassCard>
		<GlassCard class="p-4 text-center">
			<div class="text-2xl font-serif text-green-600 dark:text-green-400">
				{data.activeCount}
			</div>
			<div class="flex items-center justify-center gap-1.5 text-sm font-sans text-foreground-muted">
				<CheckCircle class="w-4 h-4" />
				Active
			</div>
		</GlassCard>
	</div>

	<!-- Info card: enrollment moved -->
	<GlassCard class="p-4">
		<div class="flex items-start gap-3">
			<div
				class="shrink-0 w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center"
			>
				<Sprout class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
			</div>
			<div>
				<h3 class="text-sm font-sans font-medium text-foreground mb-1">
					Per-tenant enrollment has moved
				</h3>
				<p class="text-sm font-sans text-foreground-muted mb-2">
					Enroll, toggle, and manage individual tenants from their detail page. This page
					now focuses on global feature flag management.
				</p>
				<a
					href="/arbor/tenants"
					class="inline-flex items-center gap-1 text-sm font-sans text-grove-600 dark:text-grove-400 hover:text-grove-700 dark:hover:text-grove-300"
				>
					Go to Tenants
					<ArrowRight class="w-3.5 h-3.5" />
				</a>
			</div>
		</div>
	</GlassCard>

	<!-- Cultivate Mode -->
	<div class="pt-4 border-t border-border/30">
		<div class="mb-4">
			<div class="flex items-center gap-2 mb-1">
				<Leaf class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
				<h3 class="text-lg font-serif text-foreground">Cultivate Mode</h3>
			</div>
			<p class="text-sm font-sans text-foreground-muted">
				Toggle features globally for all Groves
			</p>
		</div>

		<CultivateFlagTable
			flags={data.featureFlags}
			onToggle={handleFlagToggle}
			{loadingFlagId}
		/>
	</div>
</div>
