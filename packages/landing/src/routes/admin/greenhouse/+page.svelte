<script lang="ts">
	import { GlassCard, Button } from "@autumnsgrove/groveengine/ui";
	import {
		GreenhouseEnrollTable,
		GreenhouseEnrollDialog,
		CultivateFlagTable,
	} from "@autumnsgrove/groveengine/grafts/greenhouse";
	import { Sprout, Plus, Users, CheckCircle, XCircle, Leaf } from "lucide-svelte";
	import { enhance } from "$app/forms";
	import type { PageData, ActionData } from "./$types";

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Dialog state
	let showEnrollDialog = $state(false);
	let enrollLoading = $state(false);

	// Stats
	const totalEnrolled = $derived(data.tenants.length);
	const activeCount = $derived(data.tenants.filter((t) => t.enabled).length);
	const disabledCount = $derived(totalEnrolled - activeCount);

	// Cultivate mode state
	let loadingFlagId = $state<string | undefined>(undefined);

	// Form references for programmatic submission with enhance
	let enrollFormRef = $state<HTMLFormElement | null>(null);
	let toggleFormRef = $state<HTMLFormElement | null>(null);
	let removeFormRef = $state<HTMLFormElement | null>(null);
	let cultivateFormRef = $state<HTMLFormElement | null>(null);
	let pruneFormRef = $state<HTMLFormElement | null>(null);

	// Hidden input values for forms
	let enrollTenantId = $state("");
	let enrollNotes = $state("");
	let toggleTenantId = $state("");
	let toggleEnabled = $state("");
	let removeTenantId = $state("");
	let cultivateFlagId = $state("");
	let pruneFlagId = $state("");

	// Handle enrollment through enhanced form
	function handleEnroll(tenantId: string, notes: string) {
		enrollLoading = true;
		enrollTenantId = tenantId;
		enrollNotes = notes;
		showEnrollDialog = false;
		requestAnimationFrame(() => {
			enrollFormRef?.requestSubmit();
		});
	}

	// Handle toggle through enhanced form
	function handleToggle(tenantId: string, enabled: boolean) {
		toggleTenantId = tenantId;
		toggleEnabled = enabled.toString();
		// Use requestAnimationFrame to ensure state is updated before submit
		requestAnimationFrame(() => {
			toggleFormRef?.requestSubmit();
		});
	}

	// Handle remove through enhanced form
	function handleRemove(tenantId: string) {
		if (!confirm("Remove this tenant from the greenhouse program?")) {
			return;
		}
		removeTenantId = tenantId;
		requestAnimationFrame(() => {
			removeFormRef?.requestSubmit();
		});
	}

	// Handle cultivate/prune toggle through enhanced forms
	function handleFlagToggle(flagId: string, enabled: boolean) {
		loadingFlagId = flagId;
		if (enabled) {
			cultivateFlagId = flagId;
			requestAnimationFrame(() => {
				cultivateFormRef?.requestSubmit();
			});
		} else {
			pruneFlagId = flagId;
			requestAnimationFrame(() => {
				pruneFormRef?.requestSubmit();
			});
		}
	}
</script>

<!-- Hidden forms with progressive enhancement -->
<form
	bind:this={enrollFormRef}
	method="POST"
	action="?/enroll"
	use:enhance={() => {
		return async ({ update }) => {
			await update();
			enrollLoading = false;
		};
	}}
	class="hidden"
>
	<input type="hidden" name="tenantId" value={enrollTenantId} />
	<input type="hidden" name="notes" value={enrollNotes} />
</form>

<form
	bind:this={toggleFormRef}
	method="POST"
	action="?/toggle"
	use:enhance={() => {
		return async ({ update }) => {
			await update();
		};
	}}
	class="hidden"
>
	<input type="hidden" name="tenantId" value={toggleTenantId} />
	<input type="hidden" name="enabled" value={toggleEnabled} />
</form>

<form
	bind:this={removeFormRef}
	method="POST"
	action="?/remove"
	use:enhance={() => {
		return async ({ update }) => {
			await update();
		};
	}}
	class="hidden"
>
	<input type="hidden" name="tenantId" value={removeTenantId} />
</form>

<form
	bind:this={cultivateFormRef}
	method="POST"
	action="?/cultivate"
	use:enhance={() => {
		return async ({ update }) => {
			await update();
			loadingFlagId = undefined;
		};
	}}
	class="hidden"
>
	<input type="hidden" name="flagId" value={cultivateFlagId} />
</form>

<form
	bind:this={pruneFormRef}
	method="POST"
	action="?/prune"
	use:enhance={() => {
		return async ({ update }) => {
			await update();
			loadingFlagId = undefined;
		};
	}}
	class="hidden"
>
	<input type="hidden" name="flagId" value={pruneFlagId} />
</form>

<svelte:head>
	<title>Greenhouse - Admin</title>
</svelte:head>

<div class="max-w-5xl mx-auto">
	<!-- Header -->
	<div class="flex items-start justify-between mb-8">
		<div>
			<h1 class="text-2xl font-serif text-foreground mb-2">Greenhouse</h1>
			<p class="text-foreground-muted font-sans">
				Manage early access to experimental features
			</p>
		</div>
		<Button
			variant="primary"
			onclick={() => (showEnrollDialog = true)}
			class="flex items-center gap-2"
		>
			<Plus class="w-4 h-4" />
			Enroll Tenant
		</Button>
	</div>

	<!-- Action result message -->
	{#if form?.success}
		<GlassCard class="mb-6 border-green-200 bg-green-50/50">
			<div class="flex items-center gap-3 text-green-700">
				<CheckCircle class="w-5 h-5" />
				<span class="font-sans">{form.message}</span>
			</div>
		</GlassCard>
	{:else if form?.error}
		<GlassCard class="mb-6 border-red-200 bg-red-50/50">
			<div class="flex items-center gap-3 text-red-700">
				<XCircle class="w-5 h-5" />
				<span class="font-sans">{form.error}</span>
			</div>
		</GlassCard>
	{/if}

	<!-- Stats -->
	<div class="grid grid-cols-3 gap-4 mb-6">
		<GlassCard class="text-center py-4">
			<div class="text-2xl font-bold text-emerald-600">{totalEnrolled}</div>
			<div class="text-sm text-foreground-muted font-sans">Total Enrolled</div>
		</GlassCard>
		<GlassCard class="text-center py-4">
			<div class="text-2xl font-bold text-green-600">{activeCount}</div>
			<div class="text-sm text-foreground-muted font-sans">Active</div>
		</GlassCard>
		<GlassCard class="text-center py-4">
			<div class="text-2xl font-bold text-amber-600">{disabledCount}</div>
			<div class="text-sm text-foreground-muted font-sans">Disabled</div>
		</GlassCard>
	</div>

	<!-- Info Card -->
	<GlassCard class="mb-6">
		<div class="flex items-start gap-4">
			<div
				class="shrink-0 w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"
			>
				<Sprout class="w-5 h-5 text-emerald-600" />
			</div>
			<div>
				<h3 class="font-serif text-foreground mb-1">
					About the Greenhouse Program
				</h3>
				<p class="text-sm text-foreground-muted font-sans">
					Greenhouse tenants get early access to features marked as
					<code class="px-1 py-0.5 bg-foreground/5 rounded text-xs"
						>greenhouse_only</code
					>. When a feature is ready for general release, set its
					<code class="px-1 py-0.5 bg-foreground/5 rounded text-xs"
						>greenhouse_only</code
					>
					flag to 0 and add normal targeting rules.
				</p>
			</div>
		</div>
	</GlassCard>

	<!-- Tenants Table -->
	<GreenhouseEnrollTable
		tenants={data.tenants}
		tenantNames={data.tenantNames}
		onToggle={handleToggle}
		onRemove={handleRemove}
	/>

	<!-- Cultivate Mode Section -->
	<div class="mt-12 pt-8 border-t border-border/50">
		<div class="mb-6">
			<div class="flex items-center gap-2 mb-2">
				<Leaf class="w-5 h-5 text-emerald-600" />
				<h2 class="text-xl font-serif text-foreground">Cultivate Mode</h2>
			</div>
			<p class="text-foreground-muted font-sans">
				Toggle features globally for all Groves
			</p>
		</div>

		<!-- Quick Actions Info -->
		<GlassCard class="mb-6">
			<div class="flex items-start gap-4">
				<div
					class="shrink-0 w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"
				>
					<Sprout class="w-5 h-5 text-emerald-600" />
				</div>
				<div>
					<h3 class="font-serif text-foreground mb-1">Quick Actions</h3>
					<ul class="text-sm text-foreground-muted font-sans space-y-1">
						<li>
							<strong class="text-emerald-600">Cultivate</strong> = enable for everyone
							(flag rules are evaluated)
						</li>
						<li>
							<strong class="text-foreground-muted">Prune</strong> = disable for everyone
							(flag returns default value)
						</li>
					</ul>
				</div>
			</div>
		</GlassCard>

		<!-- Feature Flags Table -->
		<CultivateFlagTable
			flags={data.featureFlags}
			onToggle={handleFlagToggle}
			{loadingFlagId}
		/>
	</div>
</div>

<!-- Enroll Dialog -->
<GreenhouseEnrollDialog
	open={showEnrollDialog}
	availableTenants={data.availableTenants}
	onClose={() => (showEnrollDialog = false)}
	onEnroll={handleEnroll}
	loading={enrollLoading}
/>
