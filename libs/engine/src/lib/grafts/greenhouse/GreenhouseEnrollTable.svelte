<script lang="ts">
	/**
	 * GreenhouseEnrollTable - Table of enrolled greenhouse tenants
	 *
	 * Displays a list of tenants enrolled in the greenhouse program,
	 * with options to toggle status, view notes, and remove tenants.
	 *
	 * @example Basic usage
	 * ```svelte
	 * <GreenhouseEnrollTable
	 *   tenants={data.tenants}
	 *   tenantNames={data.tenantNames}
	 *   onToggle={handleToggle}
	 *   onRemove={handleRemove}
	 * />
	 * ```
	 */

	import type { GreenhouseEnrollTableProps } from "./types.js";
	import type { GreenhouseTenant } from "../../feature-flags/types.js";
	import GreenhouseToggle from "./GreenhouseToggle.svelte";
	import { Trash2, FileEdit, Sprout } from "lucide-svelte";

	let {
		tenants,
		tenantNames = {},
		showToggle = true,
		showNotes = true,
		showRemove = true,
		onToggle,
		onRemove,
		onEditNotes,
		class: className = "",
	}: GreenhouseEnrollTableProps = $props();

	// Get display name for a tenant
	function getDisplayName(tenantId: string): string {
		return tenantNames[tenantId] || tenantId;
	}

	// Format date for display
	function formatDate(date: Date): string {
		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	}

	function handleToggle(tenantId: string, enabled: boolean) {
		onToggle?.(tenantId, enabled);
	}

	function handleRemove(tenant: GreenhouseTenant) {
		onRemove?.(tenant.tenantId);
	}

	function handleEditNotes(tenant: GreenhouseTenant) {
		onEditNotes?.(tenant.tenantId);
	}
</script>

<div class="greenhouse-enroll-table {className}">
	{#if tenants.length === 0}
		<div class="empty-state">
			<Sprout class="w-12 h-12 text-grove-400 mx-auto mb-3" />
			<p class="text-slate-600 dark:text-slate-400 text-center">
				No tenants enrolled in the greenhouse program yet.
			</p>
		</div>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full" aria-label="Greenhouse enrolled tenants">
				<thead>
					<tr class="border-b border-grove-200 dark:border-grove-700/50">
						<th scope="col" class="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
							Tenant
						</th>
						<th scope="col" class="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
							Enrolled
						</th>
						{#if showToggle}
							<th scope="col" class="text-center py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
								Status
							</th>
						{/if}
						{#if showNotes}
							<th scope="col" class="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
								Notes
							</th>
						{/if}
						{#if showRemove}
							<th scope="col" class="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
								Actions
							</th>
						{/if}
					</tr>
				</thead>
				<tbody>
					{#each tenants as tenant (tenant.tenantId)}
						<tr class="border-b border-grove-100 dark:border-grove-800/30 hover:bg-grove-50 dark:hover:bg-grove-900/20 transition-colors">
							<th scope="row" class="py-3 px-4 font-normal text-left">
								<span class="font-medium text-slate-800 dark:text-slate-100">
									{getDisplayName(tenant.tenantId)}
								</span>
								<span class="block text-xs text-slate-500 dark:text-slate-500 font-mono">
									{tenant.tenantId}
								</span>
							</th>
							<td class="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
								{formatDate(tenant.enrolledAt)}
								{#if tenant.enrolledBy}
									<span class="block text-xs text-slate-500 dark:text-slate-500">
										by {tenant.enrolledBy}
									</span>
								{/if}
							</td>
							{#if showToggle}
								<td class="py-3 px-4 text-center">
									<GreenhouseToggle
										tenantId={tenant.tenantId}
										enabled={tenant.enabled}
										onToggle={handleToggle}
									/>
								</td>
							{/if}
							{#if showNotes}
								<td class="py-3 px-4">
									{#if tenant.notes}
										<p class="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
											{tenant.notes}
										</p>
									{:else}
										<span class="text-xs text-slate-400 dark:text-slate-600 italic">
											No notes
										</span>
									{/if}
								</td>
							{/if}
							{#if showRemove}
								<td class="py-3 px-4 text-right">
									<div class="flex items-center justify-end gap-2">
										{#if onEditNotes}
											<button
												type="button"
												onclick={() => handleEditNotes(tenant)}
												class="p-2 text-slate-400 hover:text-grove-600 dark:text-slate-500 dark:hover:text-grove-400 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grove-500 focus-visible:ring-offset-2"
												aria-label="Edit notes for {getDisplayName(tenant.tenantId)}"
											>
												<FileEdit class="w-4 h-4" />
											</button>
										{/if}
										<button
											type="button"
											onclick={() => handleRemove(tenant)}
											class="p-2 text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
											aria-label="Remove {getDisplayName(tenant.tenantId)} from greenhouse"
										>
											<Trash2 class="w-4 h-4" />
										</button>
									</div>
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.greenhouse-enroll-table {
		background: rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-radius: var(--border-radius-standard, 12px);
		border: 1px solid rgba(22, 101, 52, 0.1);
		overflow: hidden;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
	}

	:global(.dark) .greenhouse-enroll-table {
		background: rgba(30, 41, 59, 0.7);
		border-color: rgba(255, 255, 255, 0.1);
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -2px rgba(0, 0, 0, 0.15);
	}

	.empty-state {
		padding: 3rem 2rem;
	}

	table {
		border-collapse: collapse;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
