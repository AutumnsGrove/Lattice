<script>
	/**
	 * DomainCheckerModal — Accessible modal wrapper for DomainChecker
	 *
	 * Built on bits-ui Dialog for accessibility (focus trap, escape-to-close,
	 * ARIA, focus restoration) with GlassCard styling, matching the pattern
	 * used by GlassConfirmDialog.
	 *
	 * @prop {boolean} open - Whether the modal is open (bindable)
	 * @prop {string} username - Current user's subdomain
	 * @prop {string} userTier - Current tier key
	 * @prop {() => void} [onclose] - Called when modal closes
	 */

	import { Dialog as DialogPrimitive } from "bits-ui";
	import GlassCard from "$lib/ui/components/ui/GlassCard.svelte";
	import Button from "$lib/ui/components/ui/Button.svelte";
	import { DialogOverlay } from "$lib/ui/components/primitives/dialog";
	import DomainChecker from "./DomainChecker.svelte";

	/** @type {{ open?: boolean; username: string; userTier: string; onclose?: () => void }} */
	let { open = $bindable(false), username, userTier, onclose } = $props();

	function handleClose() {
		open = false;
		onclose?.();
	}

	/** @param {boolean} isOpen */
	function handleOpenChange(isOpen) {
		if (!isOpen && open) {
			handleClose();
		}
		open = isOpen;
	}
</script>

<DialogPrimitive.Root bind:open onOpenChange={handleOpenChange}>
	<DialogPrimitive.Portal>
		<DialogOverlay />

		<DialogPrimitive.Content
			class="fixed left-[50%] top-[50%] z-grove-modal w-full max-w-md translate-x-[-50%] translate-y-[-50%] p-4 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
			aria-labelledby="domain-checker-title"
		>
			<GlassCard variant="frosted" class="overflow-hidden">
				<div class="px-6 pt-6 pb-2">
					<DialogPrimitive.Title id="domain-checker-title" class="sr-only">
						Check Domain Availability
					</DialogPrimitive.Title>

					<DomainChecker {username} {userTier} variant="modal" />
				</div>

				<div
					class="px-6 py-4 mt-2 bg-cream-100/70 dark:bg-bark-800/30 border-t border-white/20 dark:border-bark-700/30 flex justify-end"
				>
					<Button variant="ghost" onclick={handleClose}>Close</Button>
				</div>
			</GlassCard>
		</DialogPrimitive.Content>
	</DialogPrimitive.Portal>
</DialogPrimitive.Root>
