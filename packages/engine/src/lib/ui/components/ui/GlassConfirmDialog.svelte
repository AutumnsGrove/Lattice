<script lang="ts">
	import type { Snippet } from "svelte";
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "$lib/ui/utils";
	import { AlertTriangle, Trash2, HelpCircle } from "lucide-svelte";
	import Button from "./Button.svelte";
	import GlassCard from "./GlassCard.svelte";
	import { DialogOverlay } from "$lib/ui/components/primitives/dialog";

	/**
	 * GlassConfirmDialog - A confirmation dialog with glassmorphism styling
	 *
	 * Built on bits-ui Dialog for accessibility (focus trap, escape-to-close, ARIA)
	 * with GlassCard providing the visual styling.
	 *
	 * Perfect for destructive actions like delete, or any action that needs user confirmation.
	 *
	 * @example Basic confirmation
	 * ```svelte
	 * <GlassConfirmDialog
	 *   bind:open={showDeleteDialog}
	 *   title="Delete Post"
	 *   message="Are you sure you want to delete this post? This cannot be undone."
	 *   confirmLabel="Delete"
	 *   variant="danger"
	 *   onconfirm={handleDelete}
	 * />
	 * ```
	 *
	 * @example Custom content
	 * ```svelte
	 * <GlassConfirmDialog bind:open={showDialog} title="Confirm Changes" onconfirm={save}>
	 *   <p>You have unsaved changes. Would you like to save them?</p>
	 * </GlassConfirmDialog>
	 * ```
	 */

	type DialogVariant = "default" | "danger" | "warning";

	interface Props {
		/** Whether the dialog is open (bindable) */
		open?: boolean;
		/** Dialog title */
		title: string;
		/** Dialog message (if not using children) */
		message?: string;
		/** Confirm button label */
		confirmLabel?: string;
		/** Cancel button label */
		cancelLabel?: string;
		/** Dialog variant (affects styling and icon) */
		variant?: DialogVariant;
		/** Whether the confirm action is loading */
		loading?: boolean;
		/** Called when user confirms */
		onconfirm?: () => void | Promise<void>;
		/** Called when user cancels or closes */
		oncancel?: () => void;
		/** Custom content (overrides message) */
		children?: Snippet;
	}

	let {
		open = $bindable(false),
		title,
		message,
		confirmLabel = "Confirm",
		cancelLabel = "Cancel",
		variant = "default",
		loading = false,
		onconfirm,
		oncancel,
		children
	}: Props = $props();

	// Variant-specific styling
	const variantConfig = {
		default: {
			icon: HelpCircle,
			iconClass: "text-accent-muted",
			confirmVariant: "primary" as const
		},
		danger: {
			icon: Trash2,
			iconClass: "text-red-500 dark:text-red-400",
			confirmVariant: "danger" as const
		},
		warning: {
			icon: AlertTriangle,
			iconClass: "text-amber-500 dark:text-amber-400",
			confirmVariant: "primary" as const
		}
	};

	const config = $derived(variantConfig[variant]);

	function handleCancel() {
		open = false;
		oncancel?.();
	}

	async function handleConfirm() {
		try {
			await onconfirm?.();
			open = false;
		} catch (error) {
			// Don't close on error - let the caller handle it
			console.error('Confirm action failed:', error);
		}
	}

	// Handle backdrop click and escape via bits-ui's onOpenChange
	function handleOpenChange(isOpen: boolean) {
		if (!isOpen && open) {
			// Dialog is being closed (escape or backdrop click)
			handleCancel();
		}
		open = isOpen;
	}
</script>

<!-- bits-ui Dialog handles: focus trap, escape key, backdrop click, ARIA, focus restoration -->
<DialogPrimitive.Root bind:open onOpenChange={handleOpenChange}>
	<DialogPrimitive.Portal>
		<!-- Overlay with blur effect -->
		<DialogOverlay />

		<!-- Dialog content - positioned and wrapped in GlassCard -->
		<DialogPrimitive.Content
			class="fixed left-[50%] top-[50%] z-grove-modal w-full max-w-md translate-x-[-50%] translate-y-[-50%] p-4 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
			aria-labelledby="confirm-dialog-title"
		>
			<GlassCard variant="frosted" class="overflow-hidden">
				<!-- Header with icon -->
				<div class="px-6 pt-6 pb-4 flex items-start gap-4">
					<div class={cn(
						"flex-shrink-0 p-3 rounded-full",
						variant === "danger" && "bg-red-100 dark:bg-red-900/30",
						variant === "warning" && "bg-amber-100 dark:bg-amber-900/30",
						variant === "default" && "bg-accent/10 dark:bg-accent/20"
					)}>
						<config.icon class={cn("w-6 h-6", config.iconClass)} />
					</div>
					<div class="flex-1 min-w-0">
						<DialogPrimitive.Title
							id="confirm-dialog-title"
							class="text-lg font-semibold text-foreground leading-tight"
						>
							{title}
						</DialogPrimitive.Title>
						{#if message && !children}
							<DialogPrimitive.Description class="mt-2 text-sm text-muted-foreground leading-relaxed">
								{message}
							</DialogPrimitive.Description>
						{/if}
						{#if children}
							<div class="mt-2 text-sm text-muted-foreground">
								{@render children()}
							</div>
						{/if}
					</div>
				</div>

				<!-- Footer with actions -->
				<div class="px-6 py-4 bg-cream-100/70 dark:bg-bark-800/30 border-t border-white/20 dark:border-bark-700/30 flex justify-end gap-3">
					<Button
						variant="ghost"
						onclick={handleCancel}
						disabled={loading}
					>
						{cancelLabel}
					</Button>
					<Button
						variant={config.confirmVariant}
						onclick={handleConfirm}
						disabled={loading}
					>
						{#if loading}
							<span class="inline-flex items-center gap-2">
								<span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
								Processing...
							</span>
						{:else}
							{confirmLabel}
						{/if}
					</Button>
				</div>
			</GlassCard>
		</DialogPrimitive.Content>
	</DialogPrimitive.Portal>
</DialogPrimitive.Root>
