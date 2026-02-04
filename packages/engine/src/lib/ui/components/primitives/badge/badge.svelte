<script lang="ts">
	import type { WithElementRef } from "bits-ui";
	import type { HTMLAnchorAttributes } from "svelte/elements";
	import { cn } from "$lib/utils";
	import { badgeVariants, type BadgeVariant } from "./badge-variants";

	let {
		ref = $bindable(null),
		href,
		class: className,
		variant = "default",
		children,
		onclick,
		...restProps
	}: WithElementRef<HTMLAnchorAttributes> & {
		variant?: BadgeVariant;
		onclick?: (e: MouseEvent) => void;
	} = $props();

	// Determine element type: button for interactive, anchor for links, span for static
	const elementType = $derived(onclick ? "button" : href ? "a" : "span");
</script>

<svelte:element
	this={elementType}
	bind:this={ref}
	{href}
	{onclick}
	type={elementType === "button" ? "button" : undefined}
	class={cn(badgeVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</svelte:element>
