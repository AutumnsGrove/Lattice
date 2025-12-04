<script lang="ts">
	import { Toaster } from "svelte-sonner";

	interface Props {
		position?:
			| "top-left"
			| "top-center"
			| "top-right"
			| "bottom-left"
			| "bottom-center"
			| "bottom-right";
		theme?: "light" | "dark" | "system";
	}

	let { position = "bottom-right", theme = "system" }: Props = $props();
</script>

<Toaster {position} {theme} />
