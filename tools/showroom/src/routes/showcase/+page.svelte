<script lang="ts">
	import { onMount } from "svelte";

	let componentPath = $state("");
	let scenarioName = $state("default");
	let propsOverride = $state<Record<string, unknown> | null>(null);
	let Component = $state<any>(null);
	let fixture = $state<any>(null);
	let error = $state<string | null>(null);
	let mounted = $state(false);

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		componentPath = params.get("component") || "";
		scenarioName = params.get("scenario") || "default";

		const propsParam = params.get("props");
		if (propsParam) {
			try {
				propsOverride = JSON.parse(propsParam);
			} catch {
				error = `Invalid props JSON: ${propsParam}`;
				return;
			}
		}

		if (componentPath) {
			await mountComponent();
		}
	});

	async function mountComponent() {
		try {
			error = null;

			// 1. Tell the Vite plugin to mount this component
			const mountRes = await fetch(
				`/api/showroom/mount?component=${encodeURIComponent(componentPath)}`,
			);
			const mountData = await mountRes.json();

			if (!mountRes.ok) {
				error = mountData.error || `Failed to mount: ${mountRes.status}`;
				return;
			}

			// 2. Load the fixture data (if any)
			try {
				const fixtureRes = await fetch(
					`/api/showroom/fixture?component=${encodeURIComponent(componentPath)}`,
				);
				if (fixtureRes.ok) {
					fixture = await fixtureRes.json();
				}
			} catch {
				fixture = null;
			}

			// 3. Dynamically import the component via the proxy module
			const mod = await import(/* @vite-ignore */ `/@showroom-component-proxy.js?t=${Date.now()}`);
			Component = mod.default;
			mounted = true;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		}
	}

	let resolvedProps = $derived.by(() => {
		if (propsOverride) return propsOverride;
		if (fixture?.scenarios?.[scenarioName]?.props) {
			return fixture.scenarios[scenarioName].props;
		}
		return {};
	});
</script>

<div
	id="showroom-stage"
	class="min-h-screen flex items-center justify-center p-8"
	data-component={componentPath}
	data-scenario={scenarioName}
	data-mounted={mounted ? "true" : "false"}
>
	{#if error}
		<div class="text-red-500 text-center space-y-2 max-w-lg" data-showroom-error>
			<p class="font-medium">Mount failed</p>
			<p class="text-sm opacity-80">{error}</p>
		</div>
	{:else if !componentPath}
		<div class="text-foreground-subtle text-center space-y-2">
			<p class="text-lg">No component specified</p>
			<p class="text-sm">
				Use <code class="bg-surface px-1 rounded">?component=path/to/Component.svelte</code>
			</p>
		</div>
	{:else if !mounted}
		<div class="text-foreground-subtle animate-pulse">Mounting...</div>
	{:else if Component}
		<div id="showroom-component" data-ready="true">
			<Component {...resolvedProps} />
		</div>
	{/if}
</div>
