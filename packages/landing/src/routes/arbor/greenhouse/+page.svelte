<script lang="ts">
	import { GreenhouseAdminPanel } from "@autumnsgrove/groveengine/grafts/greenhouse";
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import type { PageData, ActionData } from "./$types";

	let { data, form }: { data: PageData; form: ActionData } = $props();

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

	// Loading states
	let enrollLoading = $state(false);
	let loadingFlagId = $state<string | undefined>(undefined);

	// Handle enrollment through enhanced form
	function handleEnroll(tenantId: string, notes: string) {
		enrollLoading = true;
		enrollTenantId = tenantId;
		enrollNotes = notes;
		requestAnimationFrame(() => {
			enrollFormRef?.requestSubmit();
		});
	}

	// Handle toggle through enhanced form
	function handleToggle(tenantId: string, enabled: boolean) {
		toggleTenantId = tenantId;
		toggleEnabled = enabled.toString();
		requestAnimationFrame(() => {
			toggleFormRef?.requestSubmit();
		});
	}

	// Handle remove through enhanced form
	function handleRemove(tenantId: string) {
		removeTenantId = tenantId;
		requestAnimationFrame(() => {
			removeFormRef?.requestSubmit();
		});
	}

	// Handle cultivate through enhanced form
	function handleCultivate(flagId: string) {
		loadingFlagId = flagId;
		cultivateFlagId = flagId;
		requestAnimationFrame(() => {
			cultivateFormRef?.requestSubmit();
		});
	}

	// Handle prune through enhanced form
	function handlePrune(flagId: string) {
		loadingFlagId = flagId;
		pruneFlagId = flagId;
		requestAnimationFrame(() => {
			pruneFormRef?.requestSubmit();
		});
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
			await invalidateAll();
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
			await invalidateAll();
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
			await invalidateAll();
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
			await invalidateAll();
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
			await invalidateAll();
		};
	}}
	class="hidden"
>
	<input type="hidden" name="flagId" value={pruneFlagId} />
</form>

<svelte:head>
	<title>Greenhouse - Admin</title>
</svelte:head>

<GreenhouseAdminPanel
	tenants={data.tenants}
	tenantNames={data.tenantNames}
	availableTenants={data.availableTenants}
	featureFlags={data.featureFlags}
	onEnroll={handleEnroll}
	onToggle={handleToggle}
	onRemove={handleRemove}
	onCultivate={handleCultivate}
	onPrune={handlePrune}
	{enrollLoading}
	{loadingFlagId}
	formResult={form ?? undefined}
/>
