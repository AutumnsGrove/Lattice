<script lang="ts">
	import { Skeleton as ShadcnSkeleton } from "$lib/ui/components/primitives/skeleton";
	import type { HTMLAttributes } from "svelte/elements";

	/**
	 * Skeleton component wrapper for loading placeholders
	 * Creates animated gray rectangles that indicate loading content
	 *
	 * @prop {string} [class] - CSS classes to customize size/shape (e.g., "h-12 w-12 rounded-full")
	 *
	 * @example
	 * <Skeleton class="h-4 w-full" />
	 *
	 * @example
	 * <Skeleton class="h-12 w-12 rounded-full" />
	 *
	 * @example
	 * <div class="flex flex-col gap-2">
	 *   <Skeleton class="h-6 w-3/4" />
	 *   <Skeleton class="h-4 w-full" />
	 *   <Skeleton class="h-4 w-5/6" />
	 * </div>
	 */
	interface Props extends HTMLAttributes<HTMLDivElement> {
		class?: string;
	}

	// svelte-ignore custom_element_props_identifier
	let { class: className, ...restProps }: Props = $props();
</script>

<ShadcnSkeleton class={className} {...restProps} />
