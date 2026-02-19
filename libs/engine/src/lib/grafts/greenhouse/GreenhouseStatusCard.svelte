<script lang="ts">
	/**
	 * GreenhouseStatusCard - Display tenant greenhouse enrollment status
	 *
	 * Shows a tenant whether they're enrolled in the greenhouse program
	 * and what that means for their access to experimental features.
	 *
	 * @example Basic usage
	 * ```svelte
	 * <GreenhouseStatusCard inGreenhouse={true} enrolledAt={new Date()} />
	 * ```
	 */

	import type { GreenhouseStatusCardProps } from "./types.js";
	import GlassCard from "$lib/ui/components/ui/GlassCard.svelte";
	import { Sprout, Sparkles } from "lucide-svelte";

	let {
		inGreenhouse,
		enrolledAt,
		notes,
		footer,
		class: className = "",
	}: GreenhouseStatusCardProps = $props();

	// Format the enrollment date
	const formattedDate = $derived(
		enrolledAt
			? enrolledAt.toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric",
				})
			: null
	);
</script>

<GlassCard variant="default" class="greenhouse-status-card {className}">
	{#snippet children()}
		<div class="flex items-start gap-4">
			<!-- Icon -->
			<div
				class="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center {inGreenhouse
					? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
					: 'bg-grove-100 text-grove-600 dark:bg-grove-900/30 dark:text-grove-400'}"
			>
				{#if inGreenhouse}
					<Sprout class="w-6 h-6" />
				{:else}
					<Sparkles class="w-6 h-6" />
				{/if}
			</div>

			<!-- Content -->
			<div class="flex-1 min-w-0">
				<h3 class="text-lg font-semibold" style="color: var(--color-text)">
					{#if inGreenhouse}
						Greenhouse Member
					{:else}
						Standard Access
					{/if}
				</h3>

				<p class="text-sm mt-1" style="color: var(--color-text-muted)">
					{#if inGreenhouse}
						You're part of Grove's greenhouse program! You'll get early access
						to experimental features before they're released to everyone.
					{:else}
						You're using the stable release of Grove. Features are thoroughly
						tested before reaching you.
					{/if}
				</p>

				{#if inGreenhouse && formattedDate}
					<p class="text-xs mt-2" style="color: var(--color-text-subtle)">
						Enrolled since {formattedDate}
					</p>
				{/if}

				{#if inGreenhouse && notes}
					<div
						class="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800/30"
					>
						<p class="text-sm text-emerald-700 dark:text-emerald-300">
							{notes}
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Footer slot -->
		{#if footer}
			<div
				class="mt-4 pt-4 border-t border-grove-200 dark:border-grove-700/50"
			>
				{@render footer()}
			</div>
		{/if}
	{/snippet}
</GlassCard>
