<script lang="ts">
	// @ts-nocheck - Accordion wrapper using collapsible prop that exists at runtime but not in bits-ui types
	import {
		Accordion as ShadcnAccordion,
		AccordionItem,
		AccordionTrigger,
		AccordionContent
	} from "$lib/ui/components/primitives/accordion";
	import type { Snippet } from "svelte";

	interface AccordionItemConfig {
		value: string;
		title: string;
		content?: string;
		disabled?: boolean;
	}

	/**
	 * Accordion component wrapper for collapsible content sections
	 *
	 * @prop {AccordionItemConfig[]} items - Array of accordion items with value, title, optional content and disabled flag
	 * @prop {string} [type="single"] - Accordion behavior: "single" (one open) or "multiple" (many open)
	 * @prop {boolean} [collapsible=false] - Allow closing all items (only for type="single")
	 * @prop {Snippet<[AccordionItemConfig]>} [contentSnippet] - Custom content renderer (receives item data)
	 * @prop {string} [class] - Additional CSS classes for Accordion root
	 *
	 * @example
	 * <Accordion items={[
	 *   { value: "faq1", title: "What is this?", content: "This is an FAQ" },
	 *   { value: "faq2", title: "How does it work?", content: "Very well!" }
	 * ]} type="single" collapsible />
	 *
	 * @example
	 * <Accordion items={sections} type="multiple">
	 *   {#snippet contentSnippet(item)}
	 *     <DetailedContent data={item} />
	 *   {/snippet}
	 * </Accordion>
	 *
	 * @example
	 * <Accordion items={helpTopics} type="single" class="w-full" />
	 */
	interface Props {
		items: AccordionItemConfig[];
		type?: "single" | "multiple";
		collapsible?: boolean;
		class?: string;
		contentSnippet?: Snippet<[item: AccordionItemConfig]>;
	}

	let {
		items,
		type = "single",
		collapsible = false,
		class: className,
		contentSnippet
	}: Props = $props();

	const accordionType = $derived(type === "single" ? "single" : "multiple");
</script>

<!-- @ts-expect-error collapsible prop exists at runtime but not in bits-ui types -->
<ShadcnAccordion type={accordionType} {collapsible} class={className}>
	{#each items as item (item.value)}
		<AccordionItem value={item.value} disabled={item.disabled ?? false}>
			<AccordionTrigger>{item.title}</AccordionTrigger>
			<AccordionContent>
				{#if contentSnippet}
					{@render contentSnippet(item)}
				{:else if item.content}
					{item.content}
				{/if}
			</AccordionContent>
		</AccordionItem>
	{/each}
</ShadcnAccordion>
