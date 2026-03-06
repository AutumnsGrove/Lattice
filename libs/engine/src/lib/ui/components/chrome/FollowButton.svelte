<script lang="ts">
	import { UserPlus, UserCheck, UserMinus } from "lucide-svelte";
	import GlassButton from "$lib/ui/components/ui/GlassButton.svelte";
	import { lanternStore } from "$lib/ui/stores/lantern.svelte";
	import { api } from "$lib/utils/api";

	interface Props {
		/** The tenant ID of the grove owner */
		tenantId: string;
		/** The subdomain of the grove (used for the POST body) */
		subdomain: string;
		/** Display name of the grove owner */
		name: string;
	}

	let { tenantId, subdomain, name }: Props = $props();

	let loading = $state(false);
	let active = $state(false);
	let error = $state("");

	let isFollowing = $derived(lanternStore.friends.some((f) => f.tenantId === tenantId));

	// Clear error after a delay
	$effect(() => {
		if (!error) return;
		const timeout = setTimeout(() => (error = ""), 4000);
		return () => clearTimeout(timeout);
	});

	async function handleFollow() {
		if (loading) return;
		loading = true;
		error = "";
		try {
			const result = await api.post<{
				friend: { tenantId: string; name: string; subdomain: string; source: string };
			}>("/api/lantern/friends", { friendSubdomain: subdomain });
			if (result?.friend) {
				lanternStore.addFriend(result.friend);
			}
		} catch {
			error = "Could not follow. Try again.";
		} finally {
			loading = false;
		}
	}

	async function handleUnfollow() {
		if (loading) return;
		loading = true;
		error = "";
		try {
			await api.delete(`/api/lantern/friends/${tenantId}`);
			lanternStore.removeFriend(tenantId);
		} catch {
			error = "Could not unfollow. Try again.";
		} finally {
			loading = false;
			active = false;
		}
	}

	function handleClick() {
		if (isFollowing) {
			handleUnfollow();
		} else {
			handleFollow();
		}
	}

	// "active" mirrors hover AND focus — keyboard users see the unfollow state too
	let icon = $derived(isFollowing ? (active ? UserMinus : UserCheck) : UserPlus);
	let label = $derived(
		loading
			? "Loading..."
			: isFollowing
				? active
					? `Unfollow ${name}`
					: `Following ${name}`
				: `Follow ${name}`,
	);
	let displayText = $derived(isFollowing ? (active ? "Unfollow" : "Following") : "Follow");
	let variant = $derived<"accent" | "outline">(isFollowing ? "outline" : "accent");
</script>

<span class="follow-button-inline">
	<GlassButton
		{variant}
		size="sm"
		disabled={loading}
		onclick={handleClick}
		onmouseenter={() => (active = true)}
		onmouseleave={() => (active = false)}
		onfocusin={() => (active = true)}
		onfocusout={() => (active = false)}
		aria-label={label}
		aria-pressed={isFollowing}
		class="follow-pill"
	>
		{#if loading}
			<span class="follow-spinner" aria-hidden="true"></span>
		{:else}
			{@const Icon = icon}
			<Icon size={16} aria-hidden="true" />
		{/if}
		<span class="follow-text">{displayText}</span>
	</GlassButton>

	{#if error}
		<span class="follow-error" role="alert" aria-live="assertive">
			{error}
		</span>
	{/if}
</span>

<style>
	.follow-button-inline {
		display: inline-flex;
		align-items: center;
		position: relative;
	}

	.follow-button-inline :global(.follow-pill) {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		min-height: 44px;
		min-width: 44px;
		padding: 0.5rem 1rem;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
		cursor: pointer;
	}

	.follow-text {
		line-height: 1;
	}

	.follow-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: follow-spin 0.6s linear infinite;
	}

	.follow-error {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 50%;
		transform: translateX(-50%);
		background: hsl(var(--destructive, 0 84% 60%));
		color: white;
		padding: 0.375rem 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.8125rem;
		white-space: nowrap;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	@keyframes follow-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.follow-spinner {
			animation: follow-pulse 1s ease-in-out infinite;
		}

		@keyframes follow-pulse {
			0%,
			100% {
				opacity: 0.4;
			}
			50% {
				opacity: 1;
			}
		}

		.follow-button-inline :global(.follow-pill) {
			transition: none;
		}
	}
</style>
