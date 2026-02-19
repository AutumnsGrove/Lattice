<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0

  GroveLogo wrapper for Terrarium palette
  Re-exports the current Logo component with Terrarium-compatible props
-->
<script lang="ts">
	import Logo from '../../ui/Logo.svelte';
	import type { Season } from '$lib/ui/types/season';

	interface Props {
		animate?: boolean;
		class?: string;
		season?: Season;
	}

	let { animate = false, class: className, season = 'summer' }: Props = $props();
</script>

<Logo
	size={64}
	class={className}
	{season}
	background={false}
	interactive={animate}
	rotation={-12}
/>
