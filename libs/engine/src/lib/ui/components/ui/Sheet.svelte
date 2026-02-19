<script lang="ts">
	import {
		Sheet as ShadcnSheet,
		SheetTrigger,
		SheetClose,
		SheetContent,
		SheetHeader,
		SheetTitle,
		SheetDescription,
		SheetFooter
	} from "$lib/ui/components/primitives/sheet";
	import type { Snippet } from "svelte";

	/**
	 * Sheet component wrapper for slide-out panels (drawers) from screen edges
	 *
	 * @prop {boolean} [open=false] - Sheet open state (bindable for two-way binding)
	 * @prop {string} [side="right"] - Which edge sheet slides from (left|right|top|bottom)
	 * @prop {string} [title] - Sheet title (renders in SheetHeader)
	 * @prop {string} [description] - Sheet description (renders in SheetHeader)
	 * @prop {Snippet} [trigger] - Trigger element to open sheet (renders in SheetTrigger)
	 * @prop {Snippet} [footer] - Footer content (rendered in SheetFooter)
	 * @prop {Snippet} [children] - Main sheet content
	 *
	 * @example
	 * <Sheet bind:open={isOpen} side="right" title="Settings">
	 *   <SettingsForm />
	 *   {#snippet footer()}
	 *     <Button onclick={() => isOpen = false}>Close</Button>
	 *   {/snippet}
	 * </Sheet>
	 *
	 * @example
	 * <Sheet side="left">
	 *   {#snippet trigger()}
	 *     <Button>Open Menu</Button>
	 *   {/snippet}
	 *   <Navigation />
	 * </Sheet>
	 *
	 * @example
	 * <Sheet bind:open={showCart} side="right" title="Shopping Cart" description="Review your items">
	 *   <CartItems />
	 * </Sheet>
	 */
	interface Props {
		open?: boolean;
		side?: "left" | "right" | "top" | "bottom";
		title?: string;
		description?: string;
		trigger?: Snippet;
		footer?: Snippet;
		children?: Snippet;
	}

	let {
		open = $bindable(false),
		side = "right",
		title,
		description,
		trigger,
		footer,
		children
	}: Props = $props();
</script>

<ShadcnSheet bind:open>
	{#if trigger}
		<SheetTrigger>
			{@render trigger()}
		</SheetTrigger>
	{/if}

	<SheetContent {side}>
		{#if title || description}
			<SheetHeader>
				{#if title}
					<SheetTitle>{title}</SheetTitle>
				{/if}
				{#if description}
					<SheetDescription>{description}</SheetDescription>
				{/if}
			</SheetHeader>
		{/if}

		{#if children}
			<div class="py-4">
				{@render children()}
			</div>
		{/if}

		{#if footer}
			<SheetFooter>
				{@render footer()}
			</SheetFooter>
		{/if}
	</SheetContent>
</ShadcnSheet>
