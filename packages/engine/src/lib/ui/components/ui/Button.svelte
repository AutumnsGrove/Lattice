<script lang="ts">
	import { Button as ShadcnButton } from "$lib/ui/components/primitives/button";
	import type { Snippet } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "link" | "default" | "outline";
	type ButtonSize = "sm" | "md" | "lg" | "icon";

	/**
	 * Button component wrapper around shadcn-svelte Button
	 *
	 * @prop {ButtonVariant} [variant="primary"] - Button style variant (primary|secondary|danger|ghost|link)
	 * @prop {ButtonSize} [size="md"] - Button size (sm|md|lg)
	 * @prop {boolean} [disabled=false] - Whether button is disabled
	 * @prop {Function} [onclick] - Click handler function
	 * @prop {string} [href] - Optional link href (renders as anchor element)
	 * @prop {string} [class] - Additional CSS classes to apply
	 * @prop {Snippet} [children] - Button content (text/icons/etc)
	 * @prop {HTMLButtonElement} [ref] - Reference to the underlying button element (bindable)
	 *
	 * @example
	 * <Button variant="primary" size="lg">Save Changes</Button>
	 *
	 * @example
	 * <Button variant="danger" onclick={() => handleDelete()}>Delete</Button>
	 *
	 * @example
	 * <Button variant="ghost" href="/settings">Settings</Button>
	 */
	interface Props extends Omit<HTMLButtonAttributes, "class"> {
		variant?: ButtonVariant;
		size?: ButtonSize;
		disabled?: boolean;
		href?: string;
		class?: string;
		children?: Snippet;
		ref?: HTMLButtonElement | null;
	}

	let {
		variant = "primary",
		size = "md",
		disabled = false,
		class: className,
		children,
		ref = $bindable(null),
		...restProps
	}: Props = $props();

	// Map our simplified variants to shadcn variants
	const variantMap: Record<ButtonVariant, "default" | "secondary" | "destructive" | "ghost" | "link" | "outline"> = {
		primary: "default",
		secondary: "secondary",
		danger: "destructive",
		ghost: "ghost",
		link: "link",
		default: "default",
		outline: "outline"
	};

	// Map our size variants to shadcn sizes
	const sizeMap: Record<ButtonSize, "sm" | "default" | "lg" | "icon"> = {
		sm: "sm",
		md: "default",
		lg: "lg",
		icon: "icon"
	};

	const shadcnVariant = $derived(variantMap[variant]);
	const shadcnSize = $derived(sizeMap[size]);
</script>

<ShadcnButton
	bind:ref={ref}
	variant={shadcnVariant}
	size={shadcnSize}
	disabled={disabled}
	class={className}
	{...restProps}
>
	{@render children?.()}
</ShadcnButton>
