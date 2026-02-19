<script lang="ts">
	/**
	 * TenantGreenhouseSection - Greenhouse enrollment controls for a single tenant
	 *
	 * Shows enrollment status and provides enroll/unenroll/toggle/notes actions.
	 * Used on the tenant detail admin page.
	 */

	import type { TenantGreenhouseSectionProps } from "./types.js";
	import { GlassCard } from "../../ui/index.js";
	import GreenhouseToggle from "./GreenhouseToggle.svelte";
	import { Sprout, Trash2 } from "lucide-svelte";

	let {
		greenhouse,
		onEnroll,
		onUnenroll,
		onToggle,
		onUpdateNotes,
		loading = false,
		class: className = "",
	}: TenantGreenhouseSectionProps = $props();

	let enrollNotes = $state("");
	let editingNotes = $state(false);
	let editNotesValue = $state("");
	let confirmRemove = $state(false);

	function handleEnroll() {
		onEnroll(enrollNotes);
		enrollNotes = "";
	}

	function startEditNotes() {
		editNotesValue = greenhouse?.notes || "";
		editingNotes = true;
	}

	function saveNotes() {
		onUpdateNotes(editNotesValue);
		editingNotes = false;
	}

	function handleRemove() {
		if (!confirmRemove) {
			confirmRemove = true;
			return;
		}
		onUnenroll();
		confirmRemove = false;
	}

	const enrolledDate = $derived(
		greenhouse?.enrolledAt
			? new Date(greenhouse.enrolledAt).toLocaleDateString("en-US", {
					month: "long",
					day: "numeric",
					year: "numeric",
				})
			: null,
	);
</script>

<GlassCard class="p-6 {className}">
	<div class="flex items-center gap-2 mb-4">
		<Sprout class="w-5 h-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
		<h3 class="text-lg font-serif text-foreground">Greenhouse Program</h3>
	</div>

	{#if !greenhouse}
		<!-- Not enrolled -->
		<p class="text-sm font-sans text-foreground-muted mb-4">
			This tenant is not enrolled in the Greenhouse program. Enroll them to grant early access
			to experimental features.
		</p>

		<div class="space-y-3">
			<label class="block">
				<span class="text-sm font-sans text-foreground-muted">Notes (optional)</span>
				<input
					type="text"
					bind:value={enrollNotes}
					placeholder="Why are they being enrolled?"
					class="mt-1 w-full px-3 py-2 text-sm font-sans rounded-lg border border-border/50 bg-white/50 dark:bg-cream-100/10 text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-grove-500/30"
				/>
			</label>
			<button
				type="button"
				onclick={handleEnroll}
				disabled={loading}
				class="px-4 py-2 text-sm font-sans font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
			>
				{loading ? "Enrolling..." : "Enroll in Greenhouse"}
			</button>
		</div>
	{:else}
		<!-- Enrolled -->
		<div class="space-y-4">
			<!-- Status + Toggle -->
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<span
						class="text-xs font-sans px-2 py-1 rounded {greenhouse.enabled
							? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
							: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}"
					>
						{greenhouse.enabled ? "Active" : "Paused"}
					</span>
					{#if enrolledDate}
						<span class="text-xs font-sans text-foreground-muted">
							Enrolled {enrolledDate}
						</span>
					{/if}
				</div>
				<GreenhouseToggle
					enabled={greenhouse.enabled}
					tenantId={greenhouse.tenantId}
					disabled={loading}
					onToggle={(_, enabled) => onToggle(enabled)}
				/>
			</div>

			{#if greenhouse.enrolledBy}
				<div class="text-xs font-sans text-foreground-muted">
					Enrolled by {greenhouse.enrolledBy}
				</div>
			{/if}

			<!-- Notes -->
			<div>
				{#if editingNotes}
					<div class="space-y-2">
						<input
							type="text"
							bind:value={editNotesValue}
							aria-label="Enrollment notes"
							class="w-full px-3 py-2 text-sm font-sans rounded-lg border border-border/50 bg-white/50 dark:bg-cream-100/10 text-foreground focus:outline-none focus:ring-2 focus:ring-grove-500/30"
						/>
						<div class="flex gap-2">
							<button
								type="button"
								onclick={saveNotes}
								disabled={loading}
								class="px-3 py-1.5 text-xs font-sans font-medium rounded-lg bg-grove-600 text-white hover:bg-grove-700 disabled:opacity-50 transition-colors"
							>
								Save
							</button>
							<button
								type="button"
								onclick={() => (editingNotes = false)}
								class="px-3 py-1.5 text-xs font-sans font-medium rounded-lg text-foreground-muted hover:bg-grove-100 dark:hover:bg-cream-100/10 transition-colors"
							>
								Cancel
							</button>
						</div>
					</div>
				{:else}
					<div class="flex items-start justify-between gap-2">
						<div class="text-sm font-sans text-foreground-muted">
							{#if greenhouse.notes}
								<span class="text-foreground-subtle text-xs">Notes:</span>
								{greenhouse.notes}
							{:else}
								<span class="text-foreground-subtle italic">No notes</span>
							{/if}
						</div>
						<button
							type="button"
							onclick={startEditNotes}
							aria-label="Edit enrollment notes"
							class="text-xs font-sans text-grove-600 dark:text-grove-400 hover:text-grove-700 dark:hover:text-grove-300 shrink-0"
						>
							Edit
						</button>
					</div>
				{/if}
			</div>

			<!-- Remove -->
			<div class="pt-3 border-t border-border/30">
				<button
					type="button"
					onclick={handleRemove}
					disabled={loading}
					class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium rounded-lg {confirmRemove
						? 'bg-red-600 text-white hover:bg-red-700'
						: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'} disabled:opacity-50 transition-colors"
				>
					<Trash2 class="w-3.5 h-3.5" aria-hidden="true" />
					{#if confirmRemove}
						Confirm Remove
					{:else}
						Remove from Greenhouse
					{/if}
				</button>
				{#if confirmRemove}
					<button
						type="button"
						onclick={() => (confirmRemove = false)}
						class="ml-2 text-xs font-sans text-foreground-muted hover:text-foreground"
					>
						Cancel
					</button>
				{/if}
			</div>
		</div>
	{/if}
</GlassCard>
