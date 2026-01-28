<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown
  Licensed under AGPL-3.0

  GroveLogo wrapper for Terrarium palette
  Re-exports LogoArchive with Terrarium-compatible props
-->
<script lang="ts">
	import LogoArchive from '../LogoArchive.svelte';

	interface Props {
		animate?: boolean;
		class?: string;
	}

	let { animate = false, class: className = 'w-16 h-20' }: Props = $props();
</script>

<LogoArchive {animate} class={className} />
