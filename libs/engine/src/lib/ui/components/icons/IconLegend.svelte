<script>
	import CollapsibleSection from '../ui/CollapsibleSection.svelte';

	/** @type {{ iconsUsed?: string[] }} */
	let { iconsUsed = [] } = $props();

	// Map icon keys to their semantic meanings and display names
	/** @type {Record<string, { name: string, meaning: string }>} */
	const iconMeanings = {
		stovetop: { name: 'Stovetop', meaning: 'Cook on stove/pan' },
		mix: { name: 'Mix', meaning: 'Mix/stir in bowl' },
		spicy: { name: 'Spicy', meaning: 'Spicy/hot indicator' },
		chop: { name: 'Chop', meaning: 'Chop/prep ingredients' },
		simmer: { name: 'Simmer', meaning: 'Simmer/wait' },
		chill: { name: 'Chill', meaning: 'Refrigerate/chill' },
		serve: { name: 'Serve', meaning: 'Plate/serve' },
		boil: { name: 'Boil', meaning: 'Boil in pot' },
		bake: { name: 'Bake', meaning: 'Oven/bake' },
		marinate: { name: 'Marinate', meaning: 'Marinate/rest' },
		blend: { name: 'Blend', meaning: 'Blend/puree' },
		season: { name: 'Season', meaning: 'Season/salt' },
		grill: { name: 'Grill', meaning: 'Grill/BBQ' },
		steam: { name: 'Steam', meaning: 'Steam' },
		knead: { name: 'Knead', meaning: 'Knead dough' }
	};
</script>

{#if iconsUsed && iconsUsed.length > 0}
	<CollapsibleSection title="Icon Legend">
		<div class="legend-content">
			{#each iconsUsed as iconKey (iconKey)}
				{#if iconMeanings[iconKey]}
					<div class="legend-item">
						<img
							src="/icons/instruction/{iconKey}.webp"
							alt={iconMeanings[iconKey].name}
							class="legend-icon"
						/>
						<div class="legend-text">
							<span class="icon-name">{iconMeanings[iconKey].name}</span>
							<span class="icon-meaning">{iconMeanings[iconKey].meaning}</span>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	</CollapsibleSection>
{/if}

<style>
	.legend-content {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 0.75rem;
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.legend-icon {
		width: 24px;
		height: 24px;
		flex-shrink: 0;
	}
	.legend-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.icon-name {
		font-weight: 500;
		font-size: 0.85rem;
		color: #333;
	}
	.icon-meaning {
		font-size: 0.75rem;
		color: #666;
	}
	@media (max-width: 640px) {
		.legend-content {
			grid-template-columns: 1fr;
		}
	}
</style>
