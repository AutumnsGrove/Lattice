<script>
	/**
	 * Internal Apps Layout
	 *
	 * This layout wraps all internal Grove apps (domains, monitor, etc.)
	 * accessed via reserved subdomains like domains.grove.place.
	 */
	let { children, data } = $props();

	// Access app info from context (set in hooks.server.ts)
	const appContext = $derived(data.context?.type === 'app' ? data.context : null);
</script>

<!--
	Apps layout passes through to children.
	Each app (domains, monitor) has its own layout within its directory.
	This file exists primarily for route grouping.
-->
{@render children()}
