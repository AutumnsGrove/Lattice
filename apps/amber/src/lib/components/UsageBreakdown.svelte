<script lang="ts">
	import type { UsageBreakdown } from "$types";
	import Icon from "./Icons.svelte";

	interface Props {
		breakdown: UsageBreakdown[];
		totalBytes: number;
	}

	let { breakdown, totalBytes }: Props = $props();

	function formatBytes(bytes: number): string {
		if (bytes === 0) return "0 B";
		const k = 1024;
		const sizes = ["B", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	}

	const productLabels: Record<string, string> = {
		blog: "Blog",
		ivy: "Email (Ivy)",
		profile: "Profile",
		themes: "Themes",
	};

	// Group by product
	const byProduct = $derived(() => {
		const grouped: Record<string, { bytes: number; file_count: number; categories: string[] }> = {};

		for (const item of breakdown) {
			if (!grouped[item.product]) {
				grouped[item.product] = { bytes: 0, file_count: 0, categories: [] };
			}
			grouped[item.product].bytes += item.bytes;
			grouped[item.product].file_count += item.file_count;
			if (!grouped[item.product].categories.includes(item.category)) {
				grouped[item.product].categories.push(item.category);
			}
		}

		return Object.entries(grouped)
			.map(([product, data]) => ({
				product,
				...data,
				percentage: totalBytes > 0 ? (data.bytes / totalBytes) * 100 : 0,
			}))
			.sort((a, b) => b.bytes - a.bytes);
	});
</script>

<div class="usage-breakdown">
	<h3>Usage by Product</h3>

	{#if byProduct().length === 0}
		<p class="empty-text">No files uploaded yet.</p>
	{:else}
		<div class="product-list">
			{#each byProduct() as item}
				<div class="product-row" data-product={item.product}>
					<div class="product-header">
						<div class="product-info">
							<div class="product-icon">
								<Icon name="folder" size={18} />
							</div>
							<span class="product-name">{productLabels[item.product] || item.product}</span>
						</div>
						<div class="product-stats">
							<span class="product-size">{formatBytes(item.bytes)}</span>
							<span class="product-count">({item.file_count} files)</span>
						</div>
					</div>

					<div class="progress-track">
						<div class="progress-bar" style="width: {item.percentage}%"></div>
					</div>

					{#if item.categories.length > 0}
						<div class="category-tags">
							{#each item.categories as category}
								<span class="tag">{category}</span>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.usage-breakdown {
		padding: var(--space-4);
	}

	.usage-breakdown h3 {
		font-size: var(--text-lg);
		font-weight: var(--font-semibold);
		color: var(--color-text-primary);
		margin-bottom: var(--space-4);
	}

	.empty-text {
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
	}

	.product-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.product-row {
		padding: var(--space-3);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-lg);
	}

	.product-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-2);
	}

	.product-info {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.product-icon {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-primary-muted);
		color: var(--color-primary);
		border-radius: var(--radius-md);
	}

	/* Product-specific colors */
	.product-row[data-product="blog"] .product-icon {
		background: var(--color-info-muted);
		color: var(--color-info);
	}

	.product-row[data-product="ivy"] .product-icon {
		background: rgba(168, 85, 247, 0.15);
		color: #a855f7;
	}

	.product-row[data-product="profile"] .product-icon {
		background: var(--color-success-muted);
		color: var(--color-success);
	}

	.product-row[data-product="themes"] .product-icon {
		background: var(--color-primary-muted);
		color: var(--color-primary);
	}

	.product-name {
		font-weight: var(--font-medium);
		color: var(--color-text-primary);
	}

	.product-stats {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.product-size {
		font-weight: var(--font-medium);
		color: var(--color-text-primary);
	}

	.product-count {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	.progress-track {
		width: 100%;
		height: 6px;
		background: var(--color-border-subtle);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		background: var(--color-primary);
		border-radius: var(--radius-full);
		transition: width 0.3s ease;
	}

	/* Product-specific progress colors */
	.product-row[data-product="blog"] .progress-bar {
		background: var(--color-info);
	}

	.product-row[data-product="ivy"] .progress-bar {
		background: #a855f7;
	}

	.product-row[data-product="profile"] .progress-bar {
		background: var(--color-success);
	}

	.product-row[data-product="themes"] .progress-bar {
		background: var(--color-primary);
	}

	.category-tags {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-2);
		flex-wrap: wrap;
	}

	.tag {
		font-size: var(--text-xs);
		padding: 2px var(--space-2);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-full);
		color: var(--color-text-tertiary);
	}
</style>
