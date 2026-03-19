<script lang="ts">
	import '../app.css';
	import { themeStore } from '@autumnsgrove/lattice/ui/stores';
	import { GroveMessages } from '@autumnsgrove/lattice/ui';
	import { CurioCursorsLayer, CurioAmbientLayer } from '@autumnsgrove/lattice/ui/content/curios';
	import VineBackground from '@autumnsgrove/lattice/ui/components/nature/VineBackground.svelte';

	let { children, data } = $props();

	// With Svelte 5 runes, stores are reactive $state values that initialize automatically.
	// Access themeStore.resolvedTheme directly - no need for $effect initialization.
</script>

<div class="min-h-screen relative">
	<VineBackground />
	{#if data?.messages?.length}
		<GroveMessages messages={data.messages} centered={true} />
	{/if}
	{@render children()}
</div>

<!-- Global curio layers — site-wide cosmetic effects -->
<CurioCursorsLayer />
<CurioAmbientLayer />
