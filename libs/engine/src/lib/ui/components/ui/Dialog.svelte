<script lang="ts">
	import {
		Dialog as ShadcnDialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter
	} from "$lib/ui/components/primitives/dialog";
	import type { Snippet } from "svelte";

	/**
	 * Dialog (modal) component wrapper for displaying overlay content
	 *
	 * @prop {boolean} [open=false] - Dialog open state (bindable for two-way binding)
	 * @prop {string} [title] - Dialog title (renders in DialogHeader)
	 * @prop {string} [description] - Dialog description (renders in DialogHeader)
	 * @prop {Snippet} [header] - Custom header content (overrides title/description)
	 * @prop {Snippet} [footer] - Footer content (rendered in DialogFooter)
	 * @prop {Snippet} [children] - Main dialog content
	 *
	 * @example
	 * <Dialog bind:open={isOpen} title="Confirm Delete" description="This action cannot be undone">
	 *   <p>Are you sure?</p>
	 *   {#snippet footer()}
	 *     <Button onclick={() => isOpen = false}>Cancel</Button>
	 *   {/snippet}
	 * </Dialog>
	 *
	 * @example
	 * <Dialog bind:open={showProfile}>
	 *   {#snippet header()}
	 *     <CustomHeader />
	 *   {/snippet}
	 *   <ProfileForm />
	 * </Dialog>
	 *
	 * @example
	 * <Dialog bind:open={modalOpen} title="Settings">
	 *   <SettingsPanel />
	 * </Dialog>
	 */
	interface Props {
		open?: boolean;
		title?: string;
		description?: string;
		header?: Snippet;
		footer?: Snippet;
		children?: Snippet;
	}

	let {
		open = $bindable(false),
		title,
		description,
		header,
		footer,
		children
	}: Props = $props();
</script>

<ShadcnDialog bind:open>
	<DialogContent>
		{#if header || title || description}
			<DialogHeader>
				{#if header}
					{@render header()}
				{:else}
					{#if title}
						<DialogTitle>{title}</DialogTitle>
					{/if}
					{#if description}
						<DialogDescription>{description}</DialogDescription>
					{/if}
				{/if}
			</DialogHeader>
		{/if}

		{#if children}
			<div class="py-4">
				{@render children()}
			</div>
		{/if}

		{#if footer}
			<DialogFooter>
				{@render footer()}
			</DialogFooter>
		{/if}
	</DialogContent>
</ShadcnDialog>
