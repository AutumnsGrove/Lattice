<script lang="ts">
	import { onMount } from "svelte";
	import { formatRelativeTime } from "@autumnsgrove/lattice/utils/date";
	import Button from "@autumnsgrove/lattice/ui/components/ui/Button.svelte";
	import Spinner from "@autumnsgrove/lattice/ui/components/ui/Spinner.svelte";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import GlassConfirmDialog from "@autumnsgrove/lattice/ui/components/ui/GlassConfirmDialog.svelte";
	import Skeleton from "@autumnsgrove/lattice/ui/components/ui/Skeleton.svelte";
	import GroveTerm from "@autumnsgrove/lattice/components/terminology/GroveTerm.svelte";
	import { ArborSection } from "@autumnsgrove/lattice/ui/arbor";
	import { authIcons, chromeIcons, blazeIcons } from "@autumnsgrove/prism/icons";
	import { authPath } from "@autumnsgrove/lattice/config/auth";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import { api } from "@autumnsgrove/lattice/utils";

	const Smartphone = chromeIcons.smartphone;
	const Laptop = blazeIcons.laptop;
	const Monitor = chromeIcons.monitor;

	interface Session {
		id: string;
		deviceId: string;
		deviceName: string;
		createdAt: number;
		lastActiveAt: number;
		expiresAt: number;
		ipAddress: string | null;
		userAgent: string | null;
		isCurrent?: boolean;
	}

	let sessions = $state<Session[]>([]);
	let loadingSessions = $state(true);
	let revokingSessionId = $state<string | null>(null);
	let revokingAllSessions = $state(false);
	let showRevokeAllDialog = $state(false);

	function getDeviceIcon(deviceName: string) {
		const name = deviceName.toLowerCase();
		if (name.includes("iphone") || name.includes("android") || name.includes("mobile")) {
			return Smartphone;
		}
		if (name.includes("mac") || name.includes("windows") || name.includes("linux")) {
			return Laptop;
		}
		return Monitor;
	}

	async function fetchSessions() {
		loadingSessions = true;
		try {
			const result = await api.get("/api/auth/sessions");
			sessions = result.sessions || [];
		} catch (error) {
			toast.error("Couldn't load your sessions");
			console.error("Failed to fetch sessions:", error);
			sessions = [];
		}
		loadingSessions = false;
	}

	async function revokeSession(sessionId: string) {
		revokingSessionId = sessionId;
		try {
			await api.delete(`/api/auth/sessions/${sessionId}`);
			toast.success("Session revoked");
			sessions = sessions.filter((s) => s.id !== sessionId);
		} catch (error) {
			toast.error("Couldn't revoke session");
			console.error("Revoke session error:", error);
		}
		revokingSessionId = null;
	}

	async function revokeAllSessions() {
		revokingAllSessions = true;
		try {
			const result = await api.post("/api/auth/sessions/revoke-all", { keepCurrent: true });
			toast.success(`Signed out of ${result.revokedCount || "all other"} devices`);
			await fetchSessions();
		} catch (error) {
			toast.error("Couldn't revoke sessions");
			console.error("Revoke all sessions error:", error);
		}
		revokingAllSessions = false;
		showRevokeAllDialog = false;
	}

	// Build passkey URL with redirect back to this page
	let passkeyUrl = $state(
		`${authPath("/passkey")}?redirect=${encodeURIComponent("/arbor/settings/security")}`,
	);

	onMount(() => {
		// Resolve actual URL now that window is available
		passkeyUrl = `${authPath("/passkey")}?redirect=${encodeURIComponent(window.location.href)}`;
		fetchSessions();
	});
</script>

<ArborSection
	title="Security"
	icon={authIcons.shieldCheck}
	description="Manage your passkeys and active sessions."
	backHref="/arbor/settings"
	backLabel="Settings"
>
	<!-- Passkeys -->
	<GlassCard variant="frosted" class="mb-6">
		<div class="section-header">
			<h2>
				<authIcons.key
					style="width: 1.25rem; height: 1.25rem; color: var(--user-accent, var(--color-primary)); display: inline-block; vertical-align: text-bottom; margin-right: 0.375rem;"
					aria-hidden="true"
				/>
				Passkeys
			</h2>
		</div>
		<p class="section-description">
			Sign in faster with a passkey — no password needed. Passkeys use Face ID, Touch ID, or Windows
			Hello for secure, phishing-resistant sign-in.
		</p>
		<a href={passkeyUrl} class="passkey-manage-link"> Manage Passkeys &rarr; </a>
		<p class="passkey-note">Passkeys are managed on the Grove login hub for security.</p>
	</GlassCard>

	<!-- Active Sessions -->
	<GlassCard variant="frosted" class="mb-6">
		<div class="section-header">
			<h2>Active Sessions</h2>
		</div>
		<p class="section-description">
			Devices where you're currently signed in to your <GroveTerm interactive term="grove"
				>grove</GroveTerm
			>.
		</p>

		{#if loadingSessions}
			<div class="sessions-skeleton">
				<Skeleton class="h-20 w-full rounded-lg" />
				<Skeleton class="h-20 w-full rounded-lg" />
				<Skeleton class="h-20 w-full rounded-lg" />
			</div>
		{:else if sessions.length === 0}
			<p class="sessions-empty">No other sessions found — you're only signed in here.</p>
		{:else}
			<div class="sessions-list">
				{#each sessions as session (session.id)}
					{@const DeviceIcon = getDeviceIcon(session.deviceName)}
					<div
						class="session-card"
						class:current={session.isCurrent}
						class:revoking={revokingSessionId === session.id}
					>
						<div class="session-icon" aria-hidden="true">
							<DeviceIcon size={24} />
						</div>
						<div class="session-info">
							<div class="session-header-row">
								<span class="session-name">{session.deviceName}</span>
								{#if session.isCurrent}
									<span class="session-badge">This device</span>
								{/if}
							</div>
							<div class="session-meta">
								<span>Last active: {formatRelativeTime(session.lastActiveAt)}</span>
								{#if session.ipAddress}
									<span class="session-ip">&middot; {session.ipAddress}</span>
								{/if}
							</div>
						</div>
						{#if !session.isCurrent}
							<Button
								variant="danger"
								size="sm"
								onclick={() => revokeSession(session.id)}
								disabled={revokingSessionId === session.id}
							>
								{revokingSessionId === session.id ? "Revoking..." : "Revoke"}
							</Button>
						{/if}
					</div>
				{/each}
			</div>

			{#if sessions.filter((s) => !s.isCurrent).length > 0}
				<div class="sessions-actions">
					<Button
						variant="danger"
						onclick={() => (showRevokeAllDialog = true)}
						disabled={revokingAllSessions}
					>
						{revokingAllSessions ? "Signing out..." : "Sign out of all other devices"}
					</Button>
				</div>
			{/if}
		{/if}
	</GlassCard>
</ArborSection>

<GlassConfirmDialog
	bind:open={showRevokeAllDialog}
	title="Sign Out of All Devices"
	message="This will sign you out of all other devices. You'll stay signed in on this device."
	confirmLabel="Sign Out All"
	variant="danger"
	loading={revokingAllSessions}
	onconfirm={revokeAllSessions}
/>

<style>
	.section-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.section-header h2 {
		margin: 0;
		font-size: 1.25rem;
		color: var(--color-text);
	}
	.section-description {
		margin: 0 0 1rem 0;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		line-height: 1.5;
	}

	/* Passkey styles */
	:global(.passkey-manage-link) {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.25rem;
		background: var(--color-primary);
		color: var(--color-primary-foreground);
		border-radius: var(--border-radius-small);
		font-size: 0.9rem;
		font-weight: 500;
		text-decoration: none;
		transition: background 0.15s ease;
	}
	:global(.passkey-manage-link:hover) {
		background: var(--color-primary-hover, var(--color-primary));
		opacity: 0.9;
	}
	.passkey-note {
		margin: 1rem 0 0 0;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
		font-size: 0.8rem;
		color: var(--color-text-subtle);
	}

	/* Sessions styles */
	.sessions-skeleton {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.5rem 0;
	}
	.sessions-empty {
		padding: 1.5rem;
		text-align: center;
		color: var(--color-text-muted);
		font-size: 0.9rem;
		font-style: italic;
	}
	.sessions-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	.session-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		border: 2px solid var(--color-border);
		border-radius: var(--border-radius-standard);
		transition:
			border-color 0.2s ease,
			transform 0.2s ease,
			box-shadow 0.2s ease,
			opacity 0.3s ease;
	}
	.session-card:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
	}
	:global(.dark) .session-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}
	.session-card.current {
		border-color: var(--color-primary);
		background: linear-gradient(
			135deg,
			hsl(var(--primary-color) / 0.08) 0%,
			hsl(var(--primary-color) / 0.03) 100%
		);
		box-shadow:
			0 0 0 1px hsl(var(--primary-color) / 0.1),
			0 0 20px hsl(var(--primary-color) / 0.1);
		animation: session-glow 3s ease-in-out infinite;
	}
	:global(.dark) .session-card.current {
		border-color: var(--color-primary-light);
		background: linear-gradient(
			135deg,
			hsl(var(--primary-color) / 0.12) 0%,
			hsl(var(--primary-color) / 0.05) 100%
		);
	}
	@keyframes session-glow {
		0%,
		100% {
			box-shadow:
				0 0 0 1px hsl(var(--primary-color) / 0.1),
				0 0 20px hsl(var(--primary-color) / 0.1);
		}
		50% {
			box-shadow:
				0 0 0 1px hsl(var(--primary-color) / 0.15),
				0 0 25px hsl(var(--primary-color) / 0.15);
		}
	}
	.session-card.revoking {
		opacity: 0.5;
		transform: translateX(10px);
		pointer-events: none;
	}
	.session-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		border-radius: var(--border-radius-button);
		background: linear-gradient(
			135deg,
			var(--color-surface-elevated) 0%,
			hsl(var(--primary-color) / 0.08) 100%
		);
		color: var(--color-primary);
		flex-shrink: 0;
		transition:
			transform 0.2s ease,
			background 0.2s ease;
	}
	.session-card:hover .session-icon {
		transform: scale(1.05);
	}
	:global(.dark) .session-icon {
		color: var(--color-primary-light);
	}
	.session-info {
		flex: 1;
		min-width: 0;
	}
	.session-header-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.session-name {
		font-weight: 600;
		color: var(--color-text);
	}
	.session-badge {
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.2rem 0.6rem;
		border-radius: 9999px;
		background: var(--color-badge);
		color: var(--color-badge-foreground);
		text-transform: uppercase;
		letter-spacing: 0.03em;
		box-shadow: 0 2px 4px var(--color-badge-shadow);
	}
	.session-meta {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		margin-top: 0.25rem;
	}
	.session-ip {
		opacity: 0.7;
	}
	.sessions-actions {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
	}

	@media (prefers-reduced-motion: reduce) {
		.session-card {
			transition: none;
		}
		.session-card.current {
			animation: none;
		}
		.session-card:hover {
			transform: none;
		}
		.session-card:hover .session-icon {
			transform: none;
		}
	}
</style>
