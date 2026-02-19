<script>
	/**
	 * Tenant Blog Layout
	 *
	 * This layout wraps all tenant-specific blog routes.
	 * The tenant context is available via the parent layout's data.
	 */
	/** @type {{ children: import('svelte').Snippet, data: any }} */
	let { children, data } = $props();

	// Access tenant info from context (set in hooks.server.ts)
	const tenant = $derived(data.context?.type === 'tenant' ? data.context.tenant : null);
</script>

<!--
	Tenant layout passes through to children.
	The parent root layout handles the actual layout switching.
	This file exists primarily for route grouping and potential
	tenant-specific data loading in +layout.server.ts.
-->
{@render children()}
