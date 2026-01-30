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

	// Handle enrollment through form action
	function handleEnroll(tenantId: string, notes: string) {
		// We'll submit via form action
		enrollLoading = true;

		// Create and submit a form programmatically
		const formEl = document.createElement("form");
		formEl.method = "POST";
		formEl.action = "?/enroll";

		const tenantInput = document.createElement("input");
		tenantInput.type = "hidden";
		tenantInput.name = "tenantId";
		tenantInput.value = tenantId;
		formEl.appendChild(tenantInput);

		const notesInput = document.createElement("input");
		notesInput.type = "hidden";
		notesInput.name = "notes";
		notesInput.value = notes;
		formEl.appendChild(notesInput);

		document.body.appendChild(formEl);
		formEl.submit();
	}

	// Handle toggle through form action
	function handleToggle(tenantId: string, enabled: boolean) {
		const formEl = document.createElement("form");
		formEl.method = "POST";
		formEl.action = "?/toggle";

		const tenantInput = document.createElement("input");
		tenantInput.type = "hidden";
		tenantInput.name = "tenantId";
		tenantInput.value = tenantId;
		formEl.appendChild(tenantInput);

		const enabledInput = document.createElement("input");
		enabledInput.type = "hidden";
		enabledInput.name = "enabled";
		enabledInput.value = enabled.toString();
		formEl.appendChild(enabledInput);

		document.body.appendChild(formEl);
		formEl.submit();
	}

	// Handle remove through form action
	function handleRemove(tenantId: string) {
		if (!confirm("Remove this tenant from the greenhouse program?")) {
			return;
		}

		const formEl = document.createElement("form");
		formEl.method = "POST";
		formEl.action = "?/remove";

		const tenantInput = document.createElement("input");
		tenantInput.type = "hidden";
		tenantInput.name = "tenantId";
		tenantInput.value = tenantId;
		formEl.appendChild(tenantInput);

		document.body.appendChild(formEl);
		formEl.submit();
	}

	// Handle cultivate/prune toggle
	function handleFlagToggle(flagId: string, enabled: boolean) {
		loadingFlagId = flagId;

		const formEl = document.createElement("form");
		formEl.method = "POST";
		formEl.action = enabled ? "?/cultivate" : "?/prune";

		const flagInput = document.createElement("input");
		flagInput.type = "hidden";
		flagInput.name = "flagId";
		flagInput.value = flagId;
		formEl.appendChild(flagInput);

		document.body.appendChild(formEl);
		formEl.submit();
	}
</script>

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
