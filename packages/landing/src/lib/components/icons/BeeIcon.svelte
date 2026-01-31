<!--
  Bee Icon - Wrapper for @lucide/lab bee icon
  Used for Swarm feature indicators in workshop/beyond pages
-->
<script lang="ts">
	import { Icon } from 'lucide-svelte';
	import { bee } from '@lucide/lab';

	interface Props {
		class?: string;
	}

	let { class: className = '' }: Props = $props();
</script>

<Icon iconNode={bee} class={className} aria-hidden="true" />
