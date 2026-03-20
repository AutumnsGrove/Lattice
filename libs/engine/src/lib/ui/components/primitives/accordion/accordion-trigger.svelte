<script lang="ts">
	import { Accordion as AccordionPrimitive, type WithoutChild } from "bits-ui";
	import { navIcons } from "@autumnsgrove/prism/icons";
	import { cn } from "$lib/ui/utils";

	// svelte-ignore custom_element_props_identifier
	let {
		ref = $bindable(null),
		class: className,
		level = 3,
		children,
		...restProps
	}: WithoutChild<AccordionPrimitive.TriggerProps> & {
		level?: AccordionPrimitive.HeaderProps["level"];
	} = $props();
</script>

<AccordionPrimitive.Header {level} class="flex">
	<AccordionPrimitive.Trigger
		bind:ref
		class={cn(
			"flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
			className,
		)}
		{...restProps}
	>
		{@render children?.()}
		<navIcons.chevronDown class="size-4 shrink-0 transition-transform duration-200" />
	</AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>
