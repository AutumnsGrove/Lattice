<script lang="ts">
	/**
	 * PasskeyButton - Redirects to login hub for WebAuthn passkey login
	 *
	 * All WebAuthn ceremonies must run on login.grove.place (single origin).
	 * This button redirects there with a return URL so the user comes back
	 * after authenticating.
	 *
	 * @example
	 * ```svelte
	 * <PasskeyButton returnTo="/dashboard" />
	 * ```
	 */

	import type { PasskeyButtonProps } from "./types.js";
	import GlassButton from "$lib/ui/components/ui/GlassButton.svelte";
	import ProviderIcon from "./ProviderIcon.svelte";

	let {
		returnTo = "/arbor",
		onSuccess,
		onError,
		size = "lg",
		class: className = "",
	}: PasskeyButtonProps = $props();

	function handleClick() {
		const returnUrl = encodeURIComponent(returnTo);
		window.location.href = `https://login.grove.place/?redirect=${returnUrl}`;
	}
</script>

<div class="passkey-button-wrapper {className}">
	<GlassButton
		variant="default"
		{size}
		onclick={handleClick}
		class="w-full justify-start gap-3"
	>
		<ProviderIcon provider="passkey" size={20} />
		<span>Continue with Passkey</span>
	</GlassButton>
</div>
