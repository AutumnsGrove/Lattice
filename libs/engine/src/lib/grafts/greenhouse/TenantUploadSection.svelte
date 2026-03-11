<script lang="ts">
	/**
	 * TenantUploadSection - Upload suspension toggle for a single tenant
	 *
	 * Shows whether uploads are active or suspended and provides a toggle.
	 * Used on the tenant detail admin page.
	 */

	import type { TenantUploadSectionProps } from "./types.js";
	import { GlassCard } from "../../ui/index.js";
	import { Upload } from "@lucide/svelte";

	let {
		suspended,
		onToggle,
		loading = false,
		class: className = "",
	}: TenantUploadSectionProps = $props();
</script>

<GlassCard class="p-6 {className}">
	<div class="flex items-center gap-2 mb-4">
		<Upload class="w-5 h-5 text-foreground-muted" aria-hidden="true" />
		<h3 class="text-lg font-serif text-foreground">Upload Access</h3>
	</div>

	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			{#if suspended}
				<span
					class="text-xs font-sans px-2 py-1 rounded bg-warning-bg text-warning-foreground"
				>
					Uploads Suspended
				</span>
				<span class="text-sm font-sans text-foreground-muted">
					This tenant cannot upload media files.
				</span>
			{:else}
				<span
					class="text-xs font-sans px-2 py-1 rounded bg-success-bg text-success-foreground"
				>
					Uploads Active
				</span>
				<span class="text-sm font-sans text-foreground-muted">
					This tenant can upload media files.
				</span>
			{/if}
		</div>

		<button
			type="button"
			onclick={() => onToggle(!suspended)}
			disabled={loading}
			class="px-4 py-2 text-sm font-sans font-medium rounded-lg transition-colors disabled:opacity-50 {suspended
				? 'bg-primary text-primary-foreground hover:bg-grove-700'
				: 'bg-warning text-white hover:bg-warning-muted'}"
		>
			{#if loading}
				Updating...
			{:else if suspended}
				Enable Uploads
			{:else}
				Suspend Uploads
			{/if}
		</button>
	</div>
</GlassCard>
