<script lang="ts">
	import { navIcons } from "@autumnsgrove/prism/icons";
	import { Select as SelectPrimitive, type WithoutChildrenOrChild } from "bits-ui";
	import { cn } from "$lib/utils";

	// svelte-ignore custom_element_props_identifier
	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<SelectPrimitive.ScrollUpButtonProps> = $props();
</script>

<SelectPrimitive.ScrollUpButton
	bind:ref
	class={cn("flex cursor-default items-center justify-center py-1", className)}
	{...restProps}
>
	<navIcons.chevronUp class="size-4" />
</SelectPrimitive.ScrollUpButton>
