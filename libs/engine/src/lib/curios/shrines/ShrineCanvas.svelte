<script lang="ts">
	/**
	 * ShrineCanvas — Renders a single shrine's spatial canvas
	 *
	 * Displays positioned content items within a decorative frame.
	 * Supports parallax depth effect on hover (respects prefers-reduced-motion).
	 */

	import { Heart, Star, Flame, Sparkles, Trophy, Flower2, type Icon } from "lucide-svelte";
	import type { ShrineContentItem, ShrineSize, FrameStyle } from "./index";
	import { SIZE_DIMENSIONS } from "./index";

	interface Props {
		items: ShrineContentItem[];
		size: ShrineSize;
		frameStyle: FrameStyle;
		title: string;
	}

	let { items, size, frameStyle, title }: Props = $props();

	let dimensions = $derived(SIZE_DIMENSIONS[size]);
	let mouseX = $state(0.5);
	let mouseY = $state(0.5);
	let isHovering = $state(false);

	// Respect prefers-reduced-motion
	let prefersReducedMotion = $state(false);
	if (typeof window !== "undefined") {
		prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	}

	function handleMouseMove(e: MouseEvent) {
		if (prefersReducedMotion) return;
		const target = e.currentTarget as HTMLElement;
		const rect = target.getBoundingClientRect();
		mouseX = (e.clientX - rect.left) / rect.width;
		mouseY = (e.clientY - rect.top) / rect.height;
	}

	function handleMouseEnter() {
		isHovering = true;
	}

	function handleMouseLeave() {
		isHovering = false;
		mouseX = 0.5;
		mouseY = 0.5;
	}

	/** Maps icon name strings to Lucide components */
	const ICON_MAP: Record<string, typeof Icon> = {
		Heart,
		Star,
		Flame,
		Sparkles,
		Trophy,
		Flower2,
	};

	function getParallaxOffset(depth: number): string {
		if (!isHovering || prefersReducedMotion) return "translate(0, 0)";
		const offsetX = (mouseX - 0.5) * depth * 8;
		const offsetY = (mouseY - 0.5) * depth * 8;
		return `translate(${offsetX}px, ${offsetY}px)`;
	}

	function getDepthForIndex(index: number): number {
		// Alternate depth layers: items at different "distances"
		return 0.5 + (index % 3) * 0.5;
	}
</script>

<div
	class="shrine-canvas frame-{frameStyle}"
	style="width: {dimensions.width}px; height: {dimensions.height}px;"
	role="img"
	aria-label="Shrine: {title}"
	onmousemove={handleMouseMove}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
>
	{#each items as item, i}
		{@const depth = getDepthForIndex(i)}
		<div
			class="shrine-item item-{item.type}"
			style="
				left: {item.x}%;
				top: {item.y}%;
				transform: {getParallaxOffset(depth)};
			"
		>
			{#if item.type === "text"}
				<span class="item-text" class:serif={item.data.font === "serif"}>
					{item.data.text ?? ""}
				</span>
			{:else if item.type === "icon"}
				{@const IconComponent = ICON_MAP[item.data.icon as string]}
				{#if IconComponent}
					<IconComponent size={size === "small" ? 18 : size === "medium" ? 24 : 32} />
				{:else}
					<Heart size={size === "small" ? 18 : size === "medium" ? 24 : 32} />
				{/if}
			{:else if item.type === "date"}
				<time class="item-date" datetime={item.data.date as string}>
					{new Date((item.data.date as string) + "T12:00:00").toLocaleDateString("en-US", {
						year: "numeric",
						month: "long",
						day: "numeric",
					})}
				</time>
			{:else if item.type === "quote"}
				<blockquote class="item-quote">
					<p>{item.data.text ?? ""}</p>
					{#if item.data.attribution}
						<cite>{item.data.attribution}</cite>
					{/if}
				</blockquote>
			{:else if item.type === "decoration"}
				<span class="item-decoration decoration-{item.data.style ?? 'sparkle'}"></span>
			{/if}
		</div>
	{/each}

	{#if items.length === 0}
		<div class="empty-shrine">
			<Heart size={20} />
		</div>
	{/if}
</div>

<style>
	/* ==========================================================================
	   Canvas — The sacred space
	   ========================================================================== */
	.shrine-canvas {
		position: relative;
		overflow: hidden;
		border-radius: 12px;
		background: var(--grove-overlay-4, rgba(0, 0, 0, 0.04));
		transition: box-shadow 0.3s ease;
	}
	.shrine-canvas:hover {
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
	}
	:global(.dark) .shrine-canvas {
		background: var(--grove-overlay-8, rgba(255, 255, 255, 0.04));
	}
	:global(.dark) .shrine-canvas:hover {
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
	}

	/* ==========================================================================
	   Frame Styles — Tier 1: Subtle themed borders
	   ========================================================================== */
	.frame-wood {
		border: 3px solid #8b6914;
		border-radius: 8px;
		box-shadow: inset 0 0 8px rgba(139, 105, 20, 0.1);
	}
	:global(.dark) .frame-wood {
		border-color: #a0822c;
		box-shadow: inset 0 0 8px rgba(160, 130, 44, 0.15);
	}

	.frame-stone {
		border: 3px solid #8a8a8a;
		border-radius: 6px;
		box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.08);
	}
	:global(.dark) .frame-stone {
		border-color: #6b6b6b;
		box-shadow: inset 0 0 6px rgba(255, 255, 255, 0.05);
	}

	.frame-crystal {
		border: 2px solid transparent;
		background-clip: padding-box;
		box-shadow:
			0 0 0 2px rgba(147, 130, 220, 0.3),
			inset 0 0 12px rgba(147, 130, 220, 0.08);
		border-radius: 12px;
	}
	:global(.dark) .frame-crystal {
		box-shadow:
			0 0 0 2px rgba(167, 150, 240, 0.25),
			inset 0 0 12px rgba(167, 150, 240, 0.1);
	}

	.frame-floral {
		border: 2px solid #c4a0b0;
		border-radius: 14px;
		box-shadow: inset 0 0 10px rgba(196, 160, 176, 0.1);
	}
	:global(.dark) .frame-floral {
		border-color: #9b7888;
		box-shadow: inset 0 0 10px rgba(155, 120, 136, 0.12);
	}

	.frame-cosmic {
		border: 2px solid #4a3070;
		border-radius: 10px;
		box-shadow:
			inset 0 0 15px rgba(74, 48, 112, 0.1),
			0 0 8px rgba(74, 48, 112, 0.05);
	}
	:global(.dark) .frame-cosmic {
		border-color: #6b4a9a;
		box-shadow:
			inset 0 0 15px rgba(107, 74, 154, 0.15),
			0 0 8px rgba(107, 74, 154, 0.1);
	}

	.frame-minimal {
		border: 1px solid var(--grove-overlay-12, rgba(0, 0, 0, 0.08));
		border-radius: 12px;
	}
	:global(.dark) .frame-minimal {
		border-color: var(--grove-overlay-12, rgba(255, 255, 255, 0.08));
	}

	/* ==========================================================================
	   Items — Positioned content
	   ========================================================================== */
	.shrine-item {
		position: absolute;
		transform-origin: center;
		transition: transform 0.15s ease-out;
		pointer-events: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		/* Offset so items are centered on their x/y coordinate */
		translate: -50% -50%;
	}

	/* Text items */
	.item-text {
		font-size: 0.8rem;
		color: var(--color-text, #333);
		text-align: center;
		max-width: 80%;
		line-height: 1.4;
		white-space: nowrap;
	}
	.item-text.serif {
		font-family: "Georgia", "Times New Roman", serif;
		font-style: italic;
	}
	:global(.dark) .item-text {
		color: var(--bark, #f5f2ea);
	}

	/* Icon items */
	.item-icon {
		color: var(--color-primary, #2c5f2d);
	}
	:global(.dark) .item-icon {
		color: var(--grove-500, #4ade80);
	}

	/* Date items */
	.item-date {
		font-size: 0.7rem;
		font-weight: 500;
		color: var(--color-text-muted, #666);
		background: var(--grove-overlay-4, rgba(0, 0, 0, 0.04));
		padding: 0.15rem 0.5rem;
		border-radius: 999px;
		white-space: nowrap;
		letter-spacing: 0.02em;
	}
	:global(.dark) .item-date {
		background: var(--grove-overlay-8, rgba(255, 255, 255, 0.06));
		color: var(--bark-700, #ccb59c);
	}

	/* Quote items */
	.item-quote {
		max-width: 85%;
		text-align: center;
		margin: 0;
		padding: 0;
	}
	.item-quote p {
		font-size: 0.75rem;
		font-style: italic;
		color: var(--color-text, #333);
		line-height: 1.4;
		margin: 0;
	}
	.item-quote cite {
		display: block;
		font-size: 0.65rem;
		color: var(--color-text-muted, #666);
		margin-top: 0.2rem;
		font-style: normal;
	}
	:global(.dark) .item-quote p {
		color: var(--bark, #f5f2ea);
	}
	:global(.dark) .item-quote cite {
		color: var(--bark-700, #ccb59c);
	}

	/* Decoration items */
	.item-decoration {
		display: block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		opacity: 0.5;
	}
	.decoration-glow {
		background: radial-gradient(circle, rgba(255, 200, 100, 0.6), transparent);
		width: 20px;
		height: 20px;
		border-radius: 50%;
		filter: blur(3px);
	}
	.decoration-sparkle {
		background: var(--grove-500, #4ade80);
		width: 6px;
		height: 6px;
		box-shadow: 0 0 4px var(--grove-500, #4ade80);
	}
	.decoration-flower {
		background: #c4a0b0;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		box-shadow: 0 0 3px rgba(196, 160, 176, 0.4);
	}

	/* Empty shrine */
	.empty-shrine {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-muted, #999);
		opacity: 0.3;
	}
</style>
