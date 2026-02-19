<script lang="ts">
	/**
	 * GreenhouseEnrollDialog - Modal for enrolling tenants in greenhouse
	 *
	 * Provides a form to select a tenant and add optional notes
	 * when enrolling them in the greenhouse program.
	 *
	 * @example Basic usage
	 * ```svelte
	 * <GreenhouseEnrollDialog
	 *   open={showDialog}
	 *   availableTenants={data.availableTenants}
	 *   onClose={() => showDialog = false}
	 *   onEnroll={handleEnroll}
	 * />
	 * ```
	 */

	import type { GreenhouseEnrollDialogProps } from "./types.js";
	import { Dialog, Button } from "$lib/ui";
	import { Sprout } from "lucide-svelte";

	let {
		open,
		availableTenants,
		onClose,
		onEnroll,
		loading = false,
		class: className = "",
	}: GreenhouseEnrollDialogProps = $props();

	// Local dialog state that syncs with prop
	// svelte-ignore state_referenced_locally
	let dialogOpen = $state(open);

	// Sync prop -> local state
	$effect(() => {
		dialogOpen = open;
	});

	// When dialog closes via Dialog component, call onClose
	$effect(() => {
		if (!dialogOpen && open) {
			onClose();
		}
	});

	// Form state
	let selectedTenantId = $state("");
	let notes = $state("");

	// Get sorted tenant entries for the select
	const tenantEntries = $derived(
		Object.entries(availableTenants).sort((a, b) => a[1].localeCompare(b[1])),
	);

	const hasAvailableTenants = $derived(tenantEntries.length > 0);
	const canSubmit = $derived(selectedTenantId !== "" && !loading);

	function handleSubmit(event: Event) {
		event.preventDefault();
		if (canSubmit) {
			onEnroll(selectedTenantId, notes);
			// Reset form on submit
			selectedTenantId = "";
			notes = "";
		}
	}

	function handleClose() {
		// Reset form on close
		selectedTenantId = "";
		notes = "";
		dialogOpen = false;
	}
</script>

<Dialog
	bind:open={dialogOpen}
	title="Enroll in Greenhouse"
	description="Give a tenant early access to experimental features."
>
	{#snippet header()}
		<div class="dialog-header">
			<div class="icon-wrapper">
				<Sprout class="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
			</div>
			<h2 class="text-xl font-serif text-slate-800 dark:text-slate-100">Enroll in Greenhouse</h2>
			<p class="text-sm text-slate-600 dark:text-slate-400 mt-1">
				Give a tenant early access to experimental features.
			</p>
		</div>
	{/snippet}

	<!-- Form -->
	{#if hasAvailableTenants}
		<form onsubmit={handleSubmit} class="dialog-form">
			<!-- Tenant select -->
			<div class="form-group">
				<label for="tenant-select" class="form-label"> Select Tenant </label>
				<select
					id="tenant-select"
					bind:value={selectedTenantId}
					class="form-select"
					disabled={loading}
					aria-required="true"
				>
					<option value="">Choose a tenant...</option>
					{#each tenantEntries as [id, name]}
						<option value={id}>{name}</option>
					{/each}
				</select>
			</div>

			<!-- Notes textarea -->
			<div class="form-group">
				<label for="notes-input" class="form-label">
					Notes <span class="text-slate-500 dark:text-slate-400">(optional)</span>
				</label>
				<textarea
					id="notes-input"
					bind:value={notes}
					class="form-textarea"
					placeholder="Why is this tenant being enrolled? Any special considerations?"
					rows="3"
					disabled={loading}
				></textarea>
			</div>

			<!-- Actions -->
			<div class="dialog-actions">
				<Button variant="secondary" onclick={handleClose} disabled={loading}>Cancel</Button>
				<Button type="submit" variant="primary" disabled={!canSubmit}>
					{#if loading}
						Enrolling...
					{:else}
						Enroll Tenant
					{/if}
				</Button>
			</div>
		</form>
	{:else}
		<div class="empty-state">
			<p class="text-slate-600 dark:text-slate-400 text-center">
				All tenants are already enrolled in the greenhouse program!
			</p>
			<div class="dialog-actions">
				<Button variant="secondary" onclick={handleClose}>Close</Button>
			</div>
		</div>
	{/if}
</Dialog>

<style>
	.dialog-header {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	.icon-wrapper {
		width: 48px;
		height: 48px;
		margin: 0 auto 1rem;
		background: rgba(16, 185, 129, 0.1);
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	:global(.dark) .icon-wrapper {
		background: rgba(16, 185, 129, 0.15);
	}

	.dialog-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text, #1f2937);
	}

	:global(.dark) .form-label {
		color: var(--color-text-light, #f3f4f6);
	}

	.form-select,
	.form-textarea {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 1px solid var(--color-border, #e5e7eb);
		border-radius: var(--border-radius-standard, 8px);
		background: var(--color-surface, white);
		color: var(--color-text, #1f2937);
		font-size: 0.875rem;
		transition:
			border-color 0.2s,
			box-shadow 0.2s;
	}

	.form-select:focus,
	.form-textarea:focus {
		outline: none;
		border-color: var(--color-primary, #059669);
		box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
	}

	:global(.dark) .form-select,
	:global(.dark) .form-textarea {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
		color: #f3f4f6;
	}

	:global(.dark) .form-select:focus,
	:global(.dark) .form-textarea:focus {
		border-color: var(--color-primary-light, #10b981);
		box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
	}

	.form-textarea {
		resize: vertical;
		min-height: 80px;
	}

	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border, #e5e7eb);
	}

	:global(.dark) .dialog-actions {
		border-color: rgba(255, 255, 255, 0.1);
	}

	.empty-state {
		padding: 1rem 0;
	}
</style>
