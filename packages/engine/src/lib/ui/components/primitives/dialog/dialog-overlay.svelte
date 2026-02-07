<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "$lib/utils";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: DialogPrimitive.OverlayProps = $props();
</script>

<DialogPrimitive.Overlay
	bind:ref
	class={cn(
		"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
		// Warmer overlay with subtle green/nature tint
		"fixed inset-0 z-grove-overlay bg-bark-900/60 dark:bg-black/70 backdrop-blur-sm",
		className
	)}
	{...restProps}
/>
