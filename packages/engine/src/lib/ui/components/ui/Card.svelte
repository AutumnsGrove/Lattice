<script lang="ts">
	import {
		Card as ShadcnCard,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent,
		CardFooter,
	} from "$lib/ui/components/primitives/card";
	import type { Snippet } from "svelte";
	import { cn } from "$lib/ui/utils";

	/**
	 * Card component wrapper providing structured layout with header, content, and footer
	 *
	 * @prop {string} [title] - Card title (renders in CardHeader with CardTitle)
	 * @prop {string} [description] - Card description (renders in CardHeader with CardDescription)
	 * @prop {boolean} [hoverable=false] - Enable hover shadow effect for interactive cards
	 * @prop {Snippet} [header] - Custom header content (overrides title/description)
	 * @prop {Snippet} [footer] - Footer content (rendered in CardFooter)
	 * @prop {Snippet} [children] - Main card content (rendered in CardContent)
	 * @prop {string} [class] - Additional CSS classes for Card root
	 *
	 * @example
	 * <Card title="Profile" description="Update your profile settings">
	 *   <p>Card content here</p>
	 * </Card>
	 *
	 * @example
	 * <Card hoverable>
	 *   {#snippet header()}
	 *     <CustomHeader />
	 *   {/snippet}
	 *   Content here
	 * </Card>
	 *
	 * @example
	 * <Card title="Actions">
	 *   {#snippet footer()}
	 *     <Button>Save</Button>
	 *   {/snippet}
	 *   Form content
	 * </Card>
	 */
	interface Props {
		title?: string;
		description?: string;
		hoverable?: boolean;
		class?: string;
		header?: Snippet;
		footer?: Snippet;
		children?: Snippet;
		[key: string]: any; // Allow any additional props to be forwarded
	}

	// svelte-ignore custom_element_props_identifier
	let {
		title,
		description,
		hoverable = false,
		class: className,
		header,
		footer,
		children,
		...restProps
	}: Props = $props();

	const cardClass = $derived(
		cn(hoverable && "hover:shadow-lg transition-shadow cursor-pointer", className),
	);
</script>

<ShadcnCard class={cardClass} {...restProps}>
	{#if header || title || description}
		<CardHeader>
			{#if header}
				{@render header()}
			{:else}
				{#if title}
					<CardTitle>{title}</CardTitle>
				{/if}
				{#if description}
					<CardDescription>{description}</CardDescription>
				{/if}
			{/if}
		</CardHeader>
	{/if}

	{#if children}
		<CardContent>
			{@render children()}
		</CardContent>
	{/if}

	{#if footer}
		<CardFooter>
			{@render footer()}
		</CardFooter>
	{/if}
</ShadcnCard>
