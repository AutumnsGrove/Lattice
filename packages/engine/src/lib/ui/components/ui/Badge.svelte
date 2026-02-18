<script lang="ts">
	import { Badge as ShadcnBadge } from "$lib/ui/components/primitives/badge";
	import type { Snippet } from "svelte";

	type BadgeVariant = "default" | "secondary" | "destructive" | "tag";

	/**
	 * Badge component wrapper for displaying small labels, tags, or status indicators
	 *
	 * @prop {BadgeVariant} [variant="default"] - Badge style variant (default|secondary|destructive|tag)
	 * @prop {string} [class] - Additional CSS classes to apply
	 * @prop {Snippet} [children] - Badge content (typically short text)
	 *
	 * @example
	 * <Badge variant="default">New</Badge>
	 *
	 * @example
	 * <Badge variant="destructive">Error</Badge>
	 *
	 * @example
	 * <Badge variant="tag">TypeScript</Badge>
	 */
	interface Props {
		variant?: BadgeVariant;
		class?: string;
		children?: Snippet;
		onclick?: (e: MouseEvent) => void;
		[key: string]: unknown;
	}

	// svelte-ignore custom_element_props_identifier
	let { variant = "default", class: className, children, onclick, ...restProps }: Props = $props();

	// Map tag variant to secondary styling
	const variantMap: Record<BadgeVariant, "default" | "secondary" | "destructive"> = {
		default: "default",
		secondary: "secondary",
		destructive: "destructive",
		tag: "secondary",
	};

	const shadcnVariant = $derived(variantMap[variant]);
</script>

<ShadcnBadge variant={shadcnVariant} class={className} {onclick} {...restProps}>
	{@render children?.()}
</ShadcnBadge>
