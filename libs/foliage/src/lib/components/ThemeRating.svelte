<script lang="ts">
	// ThemeRating.svelte
	// Star rating component for theme ratings with interactive and read-only modes

	interface Props {
		rating: number;
		readonly?: boolean;
		onChange?: (rating: 1 | 2 | 3 | 4 | 5) => void;
	}

	let { rating = 0, readonly = false, onChange }: Props = $props();

	// Local state for interactive mode
	let hoveredRating = $state<number | null>(null);
	let focusedIndex = $state<number | null>(null);

	// Display rating (hover preview or actual rating)
	let displayRating = $derived(hoveredRating ?? rating);

	// Calculate star display state for each position (1-5)
	function getStarState(position: number): "full" | "half" | "empty" {
		const effectiveRating = displayRating;
		if (effectiveRating >= position) {
			return "full";
		} else if (effectiveRating >= position - 0.5 && effectiveRating < position) {
			return "half";
		} else {
			return "empty";
		}
	}

	// Handle star click
	function handleStarClick(starRating: 1 | 2 | 3 | 4 | 5) {
		if (readonly) return;
		onChange?.(starRating);
	}

	// Handle keyboard navigation
	function handleKeydown(event: KeyboardEvent, currentIndex: number) {
		if (readonly) return;

		let newIndex = currentIndex;

		switch (event.key) {
			case "ArrowLeft":
			case "ArrowDown":
				event.preventDefault();
				newIndex = Math.max(0, currentIndex - 1);
				focusedIndex = newIndex;
				break;
			case "ArrowRight":
			case "ArrowUp":
				event.preventDefault();
				newIndex = Math.min(4, currentIndex + 1);
				focusedIndex = newIndex;
				break;
			case "Enter":
			case " ":
				event.preventDefault();
				handleStarClick((currentIndex + 1) as 1 | 2 | 3 | 4 | 5);
				break;
			case "Home":
				event.preventDefault();
				focusedIndex = 0;
				break;
			case "End":
				event.preventDefault();
				focusedIndex = 4;
				break;
		}
	}

	// Format rating for screen readers
	function formatRatingForAria(rating: number): string {
		if (rating === 0) return "No rating";
		const wholeStars = Math.floor(rating);
		const hasHalfStar = rating % 1 >= 0.5;

		if (hasHalfStar) {
			return `${wholeStars} and a half out of 5 stars`;
		}
		return `${wholeStars} out of 5 stars`;
	}

	// Get unique ID for gradient (for half stars)
	let componentId = $state(`rating-${Math.random().toString(36).substr(2, 9)}`);
</script>

<div
	class="theme-rating"
	role={readonly ? "img" : "radiogroup"}
	aria-label={readonly ? formatRatingForAria(rating) : "Rate from 1 to 5 stars"}
	class:interactive={!readonly}
	class:readonly
>
	{#each [1, 2, 3, 4, 5] as starPosition, index}
		{@const starState = getStarState(starPosition)}
		{@const starRating = starPosition as 1 | 2 | 3 | 4 | 5}

		{#if readonly}
			<!-- Read-only star display -->
			{#if starState === "full"}
				<svg class="star filled" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path
						d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
					></path>
				</svg>
			{:else if starState === "half"}
				<svg class="star half" viewBox="0 0 24 24" aria-hidden="true">
					<defs>
						<linearGradient id="half-{componentId}">
							<stop offset="50%" stop-color="#f59e0b" />
							<stop offset="50%" stop-color="#d1d5db" />
						</linearGradient>
					</defs>
					<path
						fill="url(#half-{componentId})"
						stroke="none"
						d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
					></path>
				</svg>
			{:else}
				<svg
					class="star empty"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path
						d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
					></path>
				</svg>
			{/if}
		{:else}
			<!-- Interactive star button -->
			<button
				type="button"
				class="star-button"
				class:filled={starState === "full"}
				class:focused={focusedIndex === index}
				onclick={() => handleStarClick(starRating)}
				onmouseenter={() => (hoveredRating = starRating)}
				onmouseleave={() => (hoveredRating = null)}
				onfocus={() => (focusedIndex = index)}
				onblur={() => (focusedIndex = null)}
				onkeydown={(e) => handleKeydown(e, index)}
				aria-label="{starRating} {starRating === 1 ? 'star' : 'stars'}"
				aria-checked={rating === starRating}
				role="radio"
				tabindex={index === 0 || focusedIndex === index ? 0 : -1}
			>
				<svg
					class="star"
					class:filled={starState === "full"}
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path
						fill={starState === "full" ? "currentColor" : "none"}
						stroke={starState === "empty" ? "currentColor" : "none"}
						stroke-width={starState === "empty" ? "2" : "0"}
						d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
					></path>
				</svg>
			</button>
		{/if}
	{/each}
</div>

<style>
	.theme-rating {
		display: inline-flex;
		gap: 0.125rem;
		align-items: center;
	}

	/* Read-only mode */
	.theme-rating.readonly {
		pointer-events: none;
	}

	.star {
		width: 1rem;
		height: 1rem;
		transition: color 0.15s ease;
	}

	.star.filled {
		color: #f59e0b;
	}

	.star.empty {
		color: #d1d5db;
	}

	.star.half {
		color: #f59e0b;
	}

	/* Interactive mode */
	.theme-rating.interactive {
		gap: 0.25rem;
	}

	.star-button {
		padding: 0;
		margin: 0;
		background: none;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.25rem;
		transition:
			transform 0.15s ease,
			opacity 0.15s ease;
		position: relative;
	}

	.star-button:hover {
		transform: scale(1.15);
	}

	.star-button:focus {
		outline: none;
	}

	.star-button.focused {
		outline: 2px solid var(--color-accent, #16a34a);
		outline-offset: 2px;
		border-radius: 0.25rem;
	}

	.star-button:active {
		transform: scale(1.05);
	}

	.star-button .star {
		color: #d1d5db;
		transition:
			color 0.15s ease,
			transform 0.15s ease;
	}

	.star-button .star.filled {
		color: #f59e0b;
	}

	.star-button:hover .star {
		color: #f59e0b;
	}

	/* Ensure proper focus visibility */
	.star-button:focus-visible {
		outline: 2px solid var(--color-accent, #16a34a);
		outline-offset: 2px;
	}
</style>
