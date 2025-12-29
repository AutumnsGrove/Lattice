<script lang="ts">
	import type { Snippet } from "svelte";
	import { cn } from "$lib/ui/utils";
	import { fade, scale } from "svelte/transition";
	import { AlertTriangle, Trash2, HelpCircle } from "lucide-svelte";
	import Button from "./Button.svelte";

	/**
	 * GlassConfirmDialog - A confirmation dialog with glassmorphism styling
	 *
	 * Perfect for destructive actions like delete, or any action that needs user confirmation.
	 * Features a glass-effect card over a blurred overlay.
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

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Escape") {
			handleCancel();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		// Only close if clicking the backdrop itself, not the dialog
		if (event.target === event.currentTarget) {
			handleCancel();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop with glass effect -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		onclick={handleBackdropClick}
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirm-dialog-title"
		transition:fade={{ duration: 150 }}
	>
		<!-- Dark overlay with blur -->
		<div
			class="absolute inset-0 bg-black/50 dark:bg-black/60 backdrop-blur-sm"
			aria-hidden="true"
		></div>

		<!-- Dialog card -->
		<div
			class={cn(
				"relative z-10 w-full max-w-md",
				"bg-white/80 dark:bg-slate-900/80",
				"backdrop-blur-xl",
				"border border-white/40 dark:border-slate-700/40",
				"rounded-2xl shadow-2xl",
				"overflow-hidden"
			)}
			transition:scale={{ duration: 150, start: 0.95 }}
		>
			<!-- Header with icon -->
			<div class="px-6 pt-6 pb-4 flex items-start gap-4">
				<div class={cn(
					"flex-shrink-0 p-3 rounded-full",
					variant === "danger" && "bg-red-100 dark:bg-red-900/30",
					variant === "warning" && "bg-amber-100 dark:bg-amber-900/30",
					variant === "default" && "bg-accent/10 dark:bg-accent/20"
				)}>
					<svelte:component this={config.icon} class={cn("w-6 h-6", config.iconClass)} />
				</div>
				<div class="flex-1 min-w-0">
					<h3
						id="confirm-dialog-title"
						class="text-lg font-semibold text-foreground leading-tight"
					>
						{title}
					</h3>
					{#if message && !children}
						<p class="mt-2 text-sm text-muted-foreground leading-relaxed">
							{message}
						</p>
					{/if}
					{#if children}
						<div class="mt-2 text-sm text-muted-foreground">
							{@render children()}
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer with actions -->
			<div class="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-white/20 dark:border-slate-700/30 flex justify-end gap-3">
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
		</div>
	</div>
{/if}
