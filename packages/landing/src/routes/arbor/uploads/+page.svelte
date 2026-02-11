<script lang="ts">
	import { UploadManagementPanel } from "@autumnsgrove/groveengine/grafts/uploads";
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import type { PageData, ActionData } from "./$types";

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Form references for programmatic submission with enhance
	let unsuspendFormRef = $state<HTMLFormElement | null>(null);
	let suspendFormRef = $state<HTMLFormElement | null>(null);

	// Hidden input values for forms
	let unsuspendTenantId = $state("");
	let suspendTenantId = $state("");

	// Handle unsuspend through enhanced form
	function handleUnsuspend(tenantId: string) {
		unsuspendTenantId = tenantId;
		requestAnimationFrame(() => {
			unsuspendFormRef?.requestSubmit();
		});
	}

	// Handle suspend through enhanced form
	function handleSuspend(tenantId: string) {
		suspendTenantId = tenantId;
		requestAnimationFrame(() => {
			suspendFormRef?.requestSubmit();
		});
	}
</script>

<!-- Hidden forms with progressive enhancement -->
<form
	bind:this={unsuspendFormRef}
	method="POST"
	action="?/unsuspend"
	use:enhance={() => {
		return async ({ update }) => {
			await update();
			await invalidateAll();
		};
	}}
	class="hidden"
>
	<input type="hidden" name="tenantId" value={unsuspendTenantId} />
</form>

<form
	bind:this={suspendFormRef}
	method="POST"
	action="?/suspend"
	use:enhance={() => {
		return async ({ update }) => {
			await update();
			await invalidateAll();
		};
	}}
	class="hidden"
>
	<input type="hidden" name="tenantId" value={suspendTenantId} />
</form>

<svelte:head>
	<title>Uploads - Admin</title>
</svelte:head>

<UploadManagementPanel
	tenants={data.tenants}
	tenantNames={data.tenantNames}
	onSuspend={handleSuspend}
	onUnsuspend={handleUnsuspend}
	formResult={form ?? undefined}
/>
