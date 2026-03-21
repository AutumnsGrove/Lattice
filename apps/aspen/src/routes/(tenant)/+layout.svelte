<script lang="ts">
	import type { Snippet } from "svelte";
	import type { AppContext } from "../../app.d.ts";

	/**
	 * Tenant Blog Layout
	 *
	 * This layout wraps all tenant-specific blog routes.
	 * The tenant context is available via the parent layout's data.
	 */
	interface Props {
		children: Snippet;
		data: {
			context?: AppContext;
			[key: string]: unknown;
		};
	}

	let { children, data }: Props = $props();

	// Access tenant info from context (set in hooks.server.ts)
	const tenant = $derived(data.context?.type === "tenant" ? data.context.tenant : null);
</script>

<!--
	Tenant layout passes through to children.
	The parent root layout handles the actual layout switching.
	This file exists primarily for route grouping and potential
	tenant-specific data loading in +layout.server.ts.
-->
{@render children()}
