<script lang="ts">
	/**
	 * LoginRedirectButton — One-line redirect to the login hub
	 *
	 * Drop this anywhere to get a "Sign in with Grove" button that sends
	 * the user to login.grove.place with the correct callback URL. After
	 * authentication, the user is redirected back to the current site.
	 *
	 * This is the correct way to trigger login from any Grove property
	 * that isn't login.grove.place itself. Do NOT use LoginGraft outside
	 * the login hub — it makes same-origin API calls that fail cross-origin.
	 *
	 * @example Basic usage
	 * ```svelte
	 * <LoginRedirectButton />
	 * ```
	 *
	 * @example Custom return path
	 * ```svelte
	 * <LoginRedirectButton returnTo="/profile" />
	 * ```
	 *
	 * @example Custom label and style
	 * ```svelte
	 * <LoginRedirectButton label="Get Started" variant="accent" size="lg" />
	 * ```
	 */

	import { browser } from "$app/environment";
	import type { ComponentProps } from "svelte";
	import { buildLoginUrl } from "./config.js";
	import GlassButton from "$lib/ui/components/ui/GlassButton.svelte";
	import Logo from "$lib/ui/components/ui/Logo.svelte";

	type GlassButtonProps = ComponentProps<typeof GlassButton>;

	interface Props {
		/** Where to send the user after authentication (default: "/arbor") */
		returnTo?: string;
		/** The callback path on the current origin (default: "/auth/callback") */
		callbackPath?: string;
		/** Button label (default: "Sign in with Grove") */
		label?: string;
		/** GlassButton variant (synced with GlassButton's type) */
		variant?: GlassButtonProps["variant"];
		/** Button size (synced with GlassButton's type) */
		size?: GlassButtonProps["size"];
		/** Show the Grove logo icon */
		showLogo?: boolean;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		returnTo = "/arbor",
		callbackPath = "/auth/callback",
		label = "Sign in with Grove",
		variant = "default",
		size = "lg",
		showLogo = true,
		class: className = "",
	}: Props = $props();

	/**
	 * Build the full login hub URL with callback.
	 * Requires browser context for window.location.origin.
	 */
	const loginUrl = $derived.by(() => {
		if (!browser) return "#";
		const callbackUrl = `${window.location.origin}${callbackPath}?returnTo=${encodeURIComponent(returnTo)}`;
		return buildLoginUrl(callbackUrl);
	});
</script>

<GlassButton
	{variant}
	{size}
	href={loginUrl}
	class="inline-flex items-center justify-center gap-2.5 {className}"
>
	{#if showLogo}
		<Logo size={size === "lg" ? "sm" : "xs"} background={size === "lg"} />
	{/if}
	<span>{label}</span>
</GlassButton>
