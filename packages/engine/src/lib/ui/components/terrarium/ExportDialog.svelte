<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published
  by the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program. If not, see <https://www.gnu.org/licenses/>.
-->

<script lang="ts">
	import { X, Loader2, Download } from 'lucide-svelte';
	import { cn } from '$lib/ui/utils';
	import GlassCard from '$lib/ui/components/ui/GlassCard.svelte';
	import GlassButton from '$lib/ui/components/ui/GlassButton.svelte';

	/**
	 * Terrarium Export Dialog
	 *
	 * Modal dialog for exporting scenes as PNG images.
	 * Provides scale and background options with estimated file size.
	 */

	interface Props {
		open: boolean;
		sceneName: string;
		onClose: () => void;
		onExport: (options: { scale: number; includeBackground: boolean }) => Promise<void>;
	}

	let { open = $bindable(), sceneName, onClose, onExport }: Props = $props();

	let scale = $state(2);
	let includeBackground = $state(true);
	let isExporting = $state(false);

	let dialogElement: HTMLDivElement | null = $state(null);
	let firstFocusableElement: HTMLElement | null = $state(null);
	let lastFocusableElement: HTMLElement | null = $state(null);

	// Scale options
	const scaleOptions = [
		{ value: 1, label: '1x (Original)' },
		{ value: 2, label: '2x (Retina)' },
		{ value: 3, label: '3x (High-res)' }
	];

	// Estimated dimensions and file size
	const estimatedWidth = $derived(1200 * scale);
	const estimatedHeight = $derived(800 * scale);
	const estimatedSizeMB = $derived(
		((estimatedWidth * estimatedHeight * 4) / (1024 * 1024) * 0.3).toFixed(1)
	);

	// Handle escape key
	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;

		if (e.key === 'Escape') {
			e.preventDefault();
			handleClose();
		} else if (e.key === 'Tab') {
			// Focus trap
			if (!firstFocusableElement || !lastFocusableElement) return;

			if (e.shiftKey) {
				// Shift+Tab
				if (document.activeElement === firstFocusableElement) {
					e.preventDefault();
					lastFocusableElement.focus();
				}
			} else {
				// Tab
				if (document.activeElement === lastFocusableElement) {
					e.preventDefault();
					firstFocusableElement.focus();
				}
			}
		}
	}

	// Handle close
	function handleClose() {
		if (!isExporting) {
			onClose();
		}
	}

	// Handle export
	async function handleExport() {
		if (isExporting) return;

		isExporting = true;
		try {
			await onExport({ scale, includeBackground });
			onClose();
		} catch (error) {
			console.error('Export failed:', error);
		} finally {
			isExporting = false;
		}
	}

	// Update focusable elements when dialog opens
	$effect(() => {
		if (open && dialogElement) {
			const focusableSelector =
				'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
			const focusableElements = dialogElement.querySelectorAll(focusableSelector);

			if (focusableElements.length > 0) {
				firstFocusableElement = focusableElements[0] as HTMLElement;
				lastFocusableElement = focusableElements[
					focusableElements.length - 1
				] as HTMLElement;

				// Focus first element after a tick
				setTimeout(() => {
					firstFocusableElement?.focus();
				}, 0);
			}
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<div
		class={cn(
			'fixed inset-0 z-grove-modal',
			'bg-black/50 backdrop-blur-sm',
			'flex items-center justify-center p-4',
			'animate-in fade-in duration-200'
		)}
		onclick={(e) => {
			if (e.target === e.currentTarget) handleClose();
		}}
		role="presentation"
	>
		<!-- Dialog -->
		<div bind:this={dialogElement} role="dialog" aria-modal="true" aria-labelledby="export-title">
			<GlassCard variant="frosted" class="w-full max-w-lg">
				{#snippet header()}
					<div class="flex items-center justify-between">
						<div>
							<h2 id="export-title" class="text-xl font-semibold text-foreground">
								Export Scene
							</h2>
							<p class="text-sm text-muted-foreground mt-1">
								Export "{sceneName}" as PNG
							</p>
						</div>
						<button
							onclick={handleClose}
							disabled={isExporting}
							class={cn(
								'inline-flex items-center justify-center',
								'h-8 w-8 rounded-lg',
								'text-muted-foreground hover:text-foreground',
								'hover:bg-white/60 dark:hover:bg-grove-950/25',
								'transition-colors duration-200',
								'disabled:opacity-50 disabled:pointer-events-none',
								'[&_svg]:w-4 [&_svg]:h-4'
							)}
							aria-label="Close dialog"
						>
							<X />
						</button>
					</div>
				{/snippet}

				<!-- Options -->
				<div class="space-y-6">
					<!-- Scale Selection -->
					<div>
						<label for="scale-select" class="block text-sm font-medium text-foreground mb-2">
							Export Scale
						</label>
						<select
							id="scale-select"
							bind:value={scale}
							disabled={isExporting}
							class={cn(
								'w-full h-10 px-3 rounded-lg',
								'bg-white/80 dark:bg-grove-950/25',
								'border border-white/40 dark:border-grove-800/25',
								'text-foreground text-sm',
								'hover:bg-white/75 dark:hover:bg-grove-950/35',
								'transition-all duration-200',
								'backdrop-blur-md',
								'focus:outline-none focus:ring-2 focus:ring-accent/50',
								'disabled:opacity-50 disabled:pointer-events-none',
								'cursor-pointer'
							)}
						>
							{#each scaleOptions as option}
								<option value={option.value}>{option.label}</option>
							{/each}
						</select>
					</div>

					<!-- Include Background -->
					<div class="flex items-center gap-3">
						<input
							id="include-background"
							type="checkbox"
							bind:checked={includeBackground}
							disabled={isExporting}
							class={cn(
								'h-4 w-4 rounded',
								'border border-white/40 dark:border-grove-800/25',
								'bg-white/80 dark:bg-grove-950/25',
								'text-accent focus:ring-accent/50',
								'disabled:opacity-50 disabled:pointer-events-none',
								'cursor-pointer'
							)}
						/>
						<label
							for="include-background"
							class="text-sm font-medium text-foreground cursor-pointer"
						>
							Include background
						</label>
					</div>

					<!-- Estimated File Info -->
					<div
						class={cn(
							'p-4 rounded-lg',
							'bg-white/60 dark:bg-grove-950/20',
							'border border-white/30 dark:border-grove-800/20'
						)}
					>
						<h3 class="text-sm font-medium text-foreground mb-2">Estimated Output</h3>
						<dl class="space-y-1 text-sm">
							<div class="flex justify-between">
								<dt class="text-muted-foreground">Dimensions:</dt>
								<dd class="font-medium text-foreground">
									{estimatedWidth} × {estimatedHeight}px
								</dd>
							</div>
							<div class="flex justify-between">
								<dt class="text-muted-foreground">File size:</dt>
								<dd class="font-medium text-foreground">~{estimatedSizeMB} MB</dd>
							</div>
							<div class="flex justify-between">
								<dt class="text-muted-foreground">Format:</dt>
								<dd class="font-medium text-foreground">PNG</dd>
							</div>
						</dl>
					</div>

					<!-- Export Progress -->
					{#if isExporting}
						<div
							class={cn(
								'flex items-center gap-3 p-4 rounded-lg',
								'bg-accent/10 dark:bg-accent/5',
								'border border-accent/30 dark:border-accent/20'
							)}
						>
							<Loader2 class="w-5 h-5 text-accent animate-spin" />
							<div>
								<p class="text-sm font-medium text-foreground">Exporting...</p>
								<p class="text-xs text-muted-foreground mt-0.5">
									This may take a few seconds
								</p>
							</div>
						</div>
					{/if}
				</div>

				{#snippet footer()}
					<div class="flex items-center justify-end gap-3">
						<GlassButton variant="ghost" onclick={handleClose} disabled={isExporting}>
							Cancel
						</GlassButton>
						<GlassButton
							variant="accent"
							onclick={handleExport}
							disabled={isExporting}
							class="min-w-[120px]"
						>
							{#if isExporting}
								<Loader2 class="w-4 h-4 animate-spin" />
								<span>Exporting...</span>
							{:else}
								<Download />
								<span>Export</span>
							{/if}
						</GlassButton>
					</div>
				{/snippet}
			</GlassCard>
		</div>
	</div>
{/if}
