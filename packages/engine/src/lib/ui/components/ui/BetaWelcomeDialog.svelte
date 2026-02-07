<script lang="ts">
	import type { Snippet } from "svelte";
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { cn } from "$lib/ui/utils";
	import { FlaskConical, MessageSquare, ExternalLink } from "lucide-svelte";
	import Button from "./Button.svelte";
	import GlassCard from "./GlassCard.svelte";
	import { DialogOverlay } from "$lib/ui/components/primitives/dialog";
	import { browser } from "$app/environment";

	/**
	 * BetaWelcomeDialog - A warm welcome dialog for beta testers
	 *
	 * Shows once per browser session (localStorage) when a beta user first visits
	 * their admin panel. Explains the beta program and links to feedback.
	 *
	 * Uses the same bits-ui Dialog foundation as GlassConfirmDialog for
	 * accessibility (focus trap, escape-to-close, ARIA).
	 *
	 * @example Auto-show for beta users (recommended)
	 * ```svelte
	 * <BetaWelcomeDialog
	 *   autoShow={data.isBeta}
	 *   userName="Autumn"
	 *   feedbackUrl="https://grove.place/feedback"
	 * />
	 * ```
	 *
	 * @example Manual control
	 * ```svelte
	 * <BetaWelcomeDialog
	 *   bind:open={showBetaWelcome}
	 *   userName="Autumn"
	 * />
	 * ```
	 *
	 * @example With custom content
	 * ```svelte
	 * <BetaWelcomeDialog autoShow={data.isBeta} userName="Friend">
	 *   <p>Custom welcome message here.</p>
	 * </BetaWelcomeDialog>
	 * ```
	 */

	const STORAGE_KEY = "grove-beta-welcome-seen";

	interface Props {
		/** Whether the dialog is open (bindable) */
		open?: boolean;
		/** Auto-open on mount if user hasn't seen it yet (manages localStorage internally) */
		autoShow?: boolean;
		/** The user's display name for a personal greeting */
		userName?: string;
		/** URL for the feedback form */
		feedbackUrl?: string;
		/** Called when the dialog is dismissed */
		ondismiss?: () => void;
		/** Custom content (overrides default message) */
		children?: Snippet;
	}

	let {
		open = $bindable(false),
		autoShow = false,
		userName = "Wanderer",
		feedbackUrl = "https://grove.place/feedback",
		ondismiss,
		children,
	}: Props = $props();

	// Auto-show: open dialog on mount if localStorage key is absent
	$effect(() => {
		if (autoShow && browser) {
			try {
				if (!localStorage.getItem(STORAGE_KEY)) {
					open = true;
				}
			} catch {
				// Storage unavailable — show anyway to be safe
				open = true;
			}
		}
	});

	/**
	 * Check if this dialog has been shown before.
	 * Returns true if the user has NOT seen it yet.
	 */
	export function shouldShow(): boolean {
		if (!browser) return false;
		try {
			return !localStorage.getItem(STORAGE_KEY);
		} catch {
			return true;
		}
	}

	function markSeen() {
		if (!browser) return;
		try {
			localStorage.setItem(STORAGE_KEY, new Date().toISOString());
		} catch {
			// Storage unavailable — dialog may show again next time
		}
	}

	function handleDismiss() {
		markSeen();
		open = false;
		ondismiss?.();
	}

	function handleOpenChange(isOpen: boolean) {
		if (!isOpen && open) {
			handleDismiss();
		}
		open = isOpen;
	}
</script>

<DialogPrimitive.Root bind:open onOpenChange={handleOpenChange}>
	<DialogPrimitive.Portal>
		<DialogOverlay />

		<DialogPrimitive.Content
			class="fixed left-[50%] top-[50%] z-grove-modal w-full max-w-lg translate-x-[-50%] translate-y-[-50%] p-4 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
			aria-labelledby="beta-welcome-title"
		>
			<GlassCard variant="frosted" class="overflow-hidden">
				<!-- Header with beta icon -->
				<div class="px-6 pt-6 pb-4 flex items-start gap-4">
					<div class="flex-shrink-0 p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
						<FlaskConical class="w-6 h-6 text-blue-600 dark:text-blue-400" />
					</div>
					<div class="flex-1 min-w-0">
						<DialogPrimitive.Title
							id="beta-welcome-title"
							class="text-lg font-semibold text-foreground leading-tight"
						>
							Welcome to the beta, {userName}.
						</DialogPrimitive.Title>
					</div>
				</div>

				<!-- Body -->
				<div class="px-6 pb-4">
					{#if children}
						<div class="text-sm text-muted-foreground leading-relaxed">
							{@render children()}
						</div>
					{:else}
						<div class="text-sm text-muted-foreground leading-relaxed space-y-3">
							<p>
								You're one of the first wanderers to explore Grove. Thank you for being here
								 -- it genuinely means a lot.
							</p>
							<p>
								Things will be rough around the edges. Pages might break, features might
								shift, and there will be moments where something just doesn't work yet.
								That's expected. You're seeing Grove while it's still growing.
							</p>
							<p>
								If you run into something broken or have thoughts on how things feel,
								we'd love to hear from you.
							</p>
						</div>
					{/if}

					<!-- Feedback link -->
					<a
						href={feedbackUrl}
						target="_blank"
						rel="noopener noreferrer"
						class={cn(
							"mt-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium",
							"bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
							"border border-blue-200 dark:border-blue-800/40",
							"hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors",
						)}
					>
						<MessageSquare class="w-4 h-4 flex-shrink-0" />
						<span>Share feedback</span>
						<ExternalLink class="w-3.5 h-3.5 ml-auto opacity-50" />
					</a>
				</div>

				<!-- Footer -->
				<div class="px-6 py-4 bg-cream-100/70 dark:bg-bark-800/30 border-t border-white/20 dark:border-bark-700/30 flex justify-end">
					<Button
						variant="primary"
						onclick={handleDismiss}
					>
						Let's go
					</Button>
				</div>
			</GlassCard>
		</DialogPrimitive.Content>
	</DialogPrimitive.Portal>
</DialogPrimitive.Root>
