<script lang="ts">
	import { Dialog as SheetPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";

	// svelte-ignore custom_element_props_identifier
	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: SheetPrimitive.OverlayProps = $props();

	export { className as class };
</script>

<SheetPrimitive.Overlay
	bind:ref
	class={cn(
		"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-grove-overlay bg-black/50 backdrop-blur-sm",
		className,
	)}
	{...restProps}
/>
