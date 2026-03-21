<script lang="ts">
	import { navIcons } from "@autumnsgrove/prism/icons";
	import { Select as SelectPrimitive, type WithoutChildrenOrChild } from "bits-ui";
	import { cn } from "$lib/ui/utils";

	// svelte-ignore custom_element_props_identifier
	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<SelectPrimitive.ScrollDownButtonProps> = $props();
</script>

<SelectPrimitive.ScrollDownButton
	bind:ref
	class={cn("flex cursor-default items-center justify-center py-1", className)}
	{...restProps}
>
	<navIcons.chevronDown class="size-4" />
</SelectPrimitive.ScrollDownButton>
