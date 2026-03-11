<script lang="ts">
	import Spinner from "$lib/ui/components/ui/Spinner.svelte";
	import { ChevronDown, ChevronUp, Check, X } from "@lucide/svelte";

	interface ChangePreview {
		domain: string;
		field: string;
		from: unknown;
		to: unknown;
		description: string;
	}

	interface Props {
		changes: ChangePreview[];
		requestId: string;
		atmosphereUsed?: string;
		applied: boolean;
		cancelled?: boolean;
		isApplying: boolean;
		onApply: () => void;
		onCancel: () => void;
	}

	let {
		changes,
		requestId,
		atmosphereUsed,
		applied,
		cancelled = false,
		isApplying,
		onApply,
		onCancel,
	}: Props = $props();

	let expanded = $state(false);

	/** Group changes by top-level domain name */
	const grouped = $derived.by(() => {
		const groups = new Map<string, ChangePreview[]>();
		for (const change of changes) {
			// "foliage.accent" → "Accent"
			const parts = change.domain.split(".");
			const label = parts.length > 1 ? capitalize(parts[1]) : capitalize(parts[0]);
			const existing = groups.get(label) || [];
			existing.push(change);
			groups.set(label, existing);
		}
		return groups;
	});

	const domainCount = $derived(grouped.size);
	const previewChanges = $derived(changes.slice(0, 4));
	const hasMore = $derived(changes.length > 4);

	function capitalize(s: string): string {
		return s.charAt(0).toUpperCase() + s.slice(1);
	}

	function formatValue(val: unknown): string {
		if (val === null || val === undefined) return "(not set)";
		if (typeof val === "boolean") return val ? "on" : "off";
		return String(val);
	}

	function isColor(val: unknown): boolean {
		// Strict hex validation: only #rgb or #rrggbb — prevents CSS injection via style binding
		return typeof val === "string" && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(val);
	}
</script>

<div class="change-card" class:applied class:cancelled>
	{#if applied && !cancelled}
		<div class="applied-badge" role="status" aria-live="polite">
			<Check size={12} aria-hidden="true" />
			Applied
		</div>
	{:else if cancelled}
		<div class="cancelled-badge" role="status" aria-live="polite">
			<X size={12} aria-hidden="true" />
			Cancelled
		</div>
	{/if}

	<div class="card-summary">
		<span class="summary-text">
			{changes.length} change{changes.length === 1 ? "" : "s"} across {domainCount} domain{domainCount ===
			1
				? ""
				: "s"}
			{#if atmosphereUsed}
				<span class="atmosphere-tag">{atmosphereUsed}</span>
			{/if}
		</span>
	</div>

	{#if !expanded}
		<ul class="preview-list">
			{#each previewChanges as change (`${change.domain}.${change.field}`)}
				<li class="preview-item">
					<span class="preview-label">{change.description}</span>
					{#if isColor(change.to)}
						<span
							class="color-swatch"
							style="background-color: {change.to}"
							aria-label="Color: {change.to}"
							title={String(change.to)}
						></span>
					{/if}
				</li>
			{/each}
			{#if hasMore}
				<li class="preview-more">
					<button
						type="button"
						class="expand-btn"
						aria-expanded={expanded}
						onclick={() => (expanded = true)}
					>
						+ {changes.length - 4} more...
					</button>
				</li>
			{/if}
		</ul>
	{:else}
		<div class="expanded-list">
			{#each [...grouped.entries()] as [domainLabel, domainChanges] (domainLabel)}
				<div class="domain-group">
					<h4 class="domain-label">{domainLabel}</h4>
					{#each domainChanges as change (`${change.domain}.${change.field}`)}
						<div class="change-row">
							<span class="field-name">{change.field}:</span>
							<span class="value-from">
								<span class="sr-only">from </span>{formatValue(change.from)}
							</span>
							<span class="value-arrow" aria-hidden="true">&rarr;</span>
							<span class="value-to">
								<span class="sr-only">to </span>{formatValue(change.to)}
								{#if isColor(change.to)}
									<span
										class="color-swatch inline"
										style="background-color: {change.to}"
										aria-label="Color: {change.to}"
										title={String(change.to)}
									></span>
								{/if}
							</span>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	{/if}

	{#if !applied && !cancelled}
		<div class="card-actions">
			{#if expanded}
				<button
					type="button"
					class="collapse-btn"
					aria-expanded={expanded}
					onclick={() => (expanded = false)}
				>
					<ChevronUp size={14} aria-hidden="true" />
					Collapse
				</button>
			{:else if !hasMore}
				<button
					type="button"
					class="expand-btn-alt"
					aria-expanded={expanded}
					onclick={() => (expanded = true)}
				>
					<ChevronDown size={14} aria-hidden="true" />
					Details
				</button>
			{/if}

			<div class="action-buttons">
				<button type="button" class="btn-cancel" onclick={onCancel} disabled={isApplying}>
					Cancel
				</button>
				<button type="button" class="btn-apply" onclick={onApply} disabled={isApplying}>
					{#if isApplying}
						<Spinner />
						Applying...
					{:else}
						Apply All
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.change-card {
		position: relative;
		border-radius: 0.5rem;
		padding: 0.75rem;
		background: rgba(88, 28, 135, 0.08);
		border: 1px solid rgba(124, 58, 237, 0.18);
		box-shadow: inset 0 1px 0 rgba(139, 92, 246, 0.06);
	}

	.change-card.applied {
		opacity: 0.7;
		box-shadow: none;
	}

	.change-card.cancelled {
		opacity: 0.5;
		box-shadow: none;
	}

	.applied-badge,
	.cancelled-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.6875rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.125rem 0.5rem;
		border-radius: 9999px;
		margin-bottom: 0.5rem;
	}

	.applied-badge {
		background: rgba(34, 197, 94, 0.15);
		color: rgb(74, 222, 128);
	}

	.cancelled-badge {
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.5);
	}

	.card-summary {
		margin-bottom: 0.5rem;
	}

	.summary-text {
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.7);
	}

	.atmosphere-tag {
		display: inline-block;
		padding: 0.0625rem 0.375rem;
		border-radius: 0.25rem;
		background: rgba(88, 28, 135, 0.25);
		color: rgb(167, 139, 250);
		font-size: 0.6875rem;
		margin-left: 0.25rem;
		letter-spacing: 0.02em;
	}

	.preview-list {
		list-style: none;
		padding: 0;
		margin: 0 0 0.5rem;
	}

	.preview-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.125rem 0;
		font-size: 0.8125rem;
		color: rgba(255, 255, 255, 0.6);
	}

	.preview-item::before {
		content: "▸";
		color: rgba(124, 58, 237, 0.5);
		flex-shrink: 0;
	}

	.preview-more {
		list-style: none;
		padding: 0.125rem 0;
	}

	.color-swatch {
		display: inline-block;
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 0.125rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
		flex-shrink: 0;
	}

	.color-swatch.inline {
		margin-left: 0.25rem;
		vertical-align: middle;
	}

	.expanded-list {
		margin-bottom: 0.5rem;
	}

	.domain-group {
		margin-bottom: 0.5rem;
	}

	.domain-group:last-child {
		margin-bottom: 0;
	}

	.domain-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin: 0 0 0.25rem;
	}

	.change-row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.125rem 0 0.125rem 0.75rem;
		font-size: 0.8125rem;
	}

	.field-name {
		color: rgba(255, 255, 255, 0.5);
	}

	.value-from {
		color: rgba(255, 255, 255, 0.35);
		text-decoration: line-through;
	}

	.value-arrow {
		color: rgba(124, 58, 237, 0.5);
		font-size: 0.75rem;
	}

	.value-to {
		color: rgba(255, 255, 255, 0.8);
	}

	.card-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}

	.expand-btn,
	.expand-btn-alt,
	.collapse-btn {
		background: none;
		border: none;
		color: rgba(167, 139, 250, 0.7);
		font-size: 0.75rem;
		font-family: inherit;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem 0.25rem;
		min-height: 44px;
	}

	.expand-btn:hover,
	.expand-btn-alt:hover,
	.collapse-btn:hover {
		color: rgb(167, 139, 250);
	}

	.expand-btn:focus-visible,
	.expand-btn-alt:focus-visible,
	.collapse-btn:focus-visible {
		outline: 2px solid rgb(167, 139, 250);
		outline-offset: 2px;
		border-radius: 0.25rem;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
		margin-left: auto;
	}

	.btn-cancel {
		padding: 0.625rem 1rem;
		min-height: 44px;
		border-radius: 0.375rem;
		border: 1px solid rgba(255, 255, 255, 0.15);
		background: transparent;
		color: rgba(255, 255, 255, 0.6);
		font-size: 0.8125rem;
		font-family: inherit;
		cursor: pointer;
	}

	.btn-cancel:hover {
		border-color: rgba(255, 255, 255, 0.3);
		color: white;
	}

	.btn-cancel:focus-visible {
		outline: 2px solid rgb(167, 139, 250);
		outline-offset: 2px;
	}

	.btn-cancel:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-apply {
		padding: 0.625rem 1rem;
		min-height: 44px;
		border-radius: 0.375rem;
		border: none;
		background: linear-gradient(135deg, rgba(124, 58, 237, 0.7), rgba(139, 92, 246, 0.6));
		color: white;
		font-size: 0.8125rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		box-shadow: 0 0 16px rgba(124, 58, 237, 0.2);
	}

	.btn-apply:hover:not(:disabled) {
		background: linear-gradient(135deg, rgba(124, 58, 237, 0.85), rgba(139, 92, 246, 0.75));
		box-shadow: 0 0 24px rgba(124, 58, 237, 0.3);
	}

	.btn-apply:active:not(:disabled) {
		transform: scale(0.98);
	}

	.btn-apply:focus-visible {
		outline: 2px solid rgb(167, 139, 250);
		outline-offset: 2px;
	}

	.btn-apply:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		box-shadow: none;
	}

	/* Screen reader only utility */
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	@media (prefers-reduced-motion: no-preference) {
		.btn-cancel {
			transition: all 0.15s ease;
		}

		.btn-apply {
			transition:
				background 0.15s ease,
				box-shadow 0.2s ease,
				opacity 0.15s ease,
				transform 0.1s ease;
		}
	}
</style>
