<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import { GlassCard } from '@autumnsgrove/groveengine/ui';
	import {
		Fingerprint,
		Shield,
		Link2,
		Plus,
		Trash2,
		Copy,
		Check,
		Loader2,
		AlertTriangle,
		Key,
		RefreshCw
	} from '@autumnsgrove/groveengine/ui/icons';
	import { base64urlToBuffer, bufferToBase64url } from '@autumnsgrove/groveengine/utils';

	// Type definitions
	interface Passkey {
		id: string;
		name: string | null;
		createdAt: string;
		lastUsedAt: string | null;
	}

	interface TwoFactorStatus {
		enabled: boolean;
		enabledAt: string | null;
		backupCodesRemaining: number;
	}

	interface LinkedAccount {
		provider: string;
		email: string | null;
		linkedAt: string;
	}

	interface PasskeyRegisterOptions {
		challenge: string;
		user: { id: string };
		[key: string]: unknown;
	}

	interface PageData {
		user: { id: string; email: string } | null;
		passkeys: Passkey[];
		twoFactorStatus: TwoFactorStatus;
		linkedAccounts: LinkedAccount[];
	}

	interface FormResult {
		success?: boolean;
		error?: string;
		action?: string;
		qrCodeUrl?: string;
		secret?: string;
		backupCodes?: string[];
	}

	let { data, form }: { data: PageData; form: FormResult | null } = $props();

	// State for passkey registration
	let isAddingPasskey = $state(false);
	let passkeyName = $state('');
	let passkeyError = $state<string | null>(null);

	// State for 2FA setup flow
	let twoFactorSetupStep = $state<'idle' | 'qr' | 'verify' | 'backup'>('idle');
	let twoFactorSecret = $state<string | null>(null);
	let twoFactorQrCode = $state<string | null>(null);
	let backupCodes = $state<string[]>([]);
	let verifyCode = $state('');
	let disableCode = $state('');
	let showDisableConfirm = $state(false);
	let copiedBackupCodes = $state(false);

	// Check if WebAuthn is supported
	let webAuthnSupported = $derived(
		browser &&
			window.PublicKeyCredential !== undefined &&
			typeof window.PublicKeyCredential === 'function'
	);

	// Provider display info
	const providerInfo: Record<string, { name: string; color: string; icon: string }> = {
		google: { name: 'Google', color: '#4285F4', icon: 'G' },
		discord: { name: 'Discord', color: '#5865F2', icon: 'D' }
	};

	// Handle form results
	$effect(() => {
		if (form?.success) {
			if (form.action === 'enableTwoFactor' && form.qrCodeUrl) {
				twoFactorSetupStep = 'qr';
				twoFactorSecret = form.secret ?? null;
				twoFactorQrCode = form.qrCodeUrl ?? null;
			} else if (form.action === 'verifyTwoFactor' && form.backupCodes) {
				twoFactorSetupStep = 'backup';
				backupCodes = form.backupCodes;
			} else if (form.action === 'disableTwoFactor') {
				showDisableConfirm = false;
				disableCode = '';
				invalidateAll();
			} else if (form.action === 'generateBackupCodes' && form.backupCodes) {
				backupCodes = form.backupCodes;
				twoFactorSetupStep = 'backup';
			} else if (form.action === 'deletePasskey') {
				invalidateAll();
			}
		}
	});

	// Copy backup codes to clipboard
	async function copyBackupCodes() {
		if (!backupCodes.length) return;
		await navigator.clipboard.writeText(backupCodes.join('\n'));
		copiedBackupCodes = true;
		setTimeout(() => (copiedBackupCodes = false), 2000);
	}

	// Add a new passkey
	async function addPasskey() {
		if (!browser || !webAuthnSupported) return;

		isAddingPasskey = true;
		passkeyError = null;

		try {
			// Get registration options from the server
			const optionsRes = await fetch('/api/account/passkey/register-options', {
				method: 'POST'
			});

			if (!optionsRes.ok) {
				throw new Error('Failed to get registration options');
			}

			const options = (await optionsRes.json()) as PasskeyRegisterOptions;

			// Convert base64url strings to ArrayBuffer for WebAuthn API
			const publicKeyOptions = {
				...options,
				challenge: base64urlToBuffer(options.challenge),
				user: {
					...options.user,
					id: base64urlToBuffer(options.user.id)
				}
			} as PublicKeyCredentialCreationOptions;

			// Create the credential
			const credential = (await navigator.credentials.create({
				publicKey: publicKeyOptions
			})) as PublicKeyCredential;

			if (!credential) {
				throw new Error('Failed to create credential');
			}

			const response = credential.response as AuthenticatorAttestationResponse;

			// Send to server for verification
			const verifyRes = await fetch('/api/account/passkey/verify-registration', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: credential.id,
					rawId: bufferToBase64url(credential.rawId),
					response: {
						attestationObject: bufferToBase64url(response.attestationObject),
						clientDataJSON: bufferToBase64url(response.clientDataJSON)
					},
					type: credential.type,
					name: passkeyName || undefined
				})
			});

			if (!verifyRes.ok) {
				const errorData = (await verifyRes.json()) as { message?: string };
				throw new Error(errorData.message || 'Failed to register passkey');
			}

			// Reset state and refresh data
			passkeyName = '';
			invalidateAll();
		} catch (err) {
			passkeyError = err instanceof Error ? err.message : 'Failed to add passkey';
		} finally {
			isAddingPasskey = false;
		}
	}

	// Format date
	function formatDate(dateString: string | null): string {
		if (!dateString) return 'Never';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="animate-fade-in max-w-2xl mx-auto px-4 py-8">
	<!-- Header -->
	<div class="text-center mb-8">
		<h1 class="text-2xl md:text-3xl font-medium text-foreground mb-2">Account Settings</h1>
		<p class="text-foreground-muted">Manage your security settings and connected accounts.</p>
	</div>

	<div class="space-y-6">
		<!-- Passkeys Section -->
		<GlassCard variant="frosted">
			<div class="flex items-center gap-3 mb-4">
				<div class="p-2 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/30">
					<Fingerprint class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
				</div>
				<div>
					<h2 class="font-medium text-foreground">Passkeys</h2>
					<p class="text-sm text-foreground-muted">
						Sign in securely with your fingerprint, face, or device PIN
					</p>
				</div>
			</div>

			{#if !webAuthnSupported}
				<div
					class="p-3 rounded-lg bg-amber-100/50 dark:bg-amber-900/30 border border-amber-200/50 dark:border-amber-700/30 flex items-start gap-2"
				>
					<AlertTriangle class="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
					<p class="text-sm text-amber-800 dark:text-amber-200">
						Your browser doesn't support passkeys. Try using a modern browser like Chrome, Safari,
						or Edge.
					</p>
				</div>
			{:else}
				<!-- Existing passkeys -->
				{#if data.passkeys && data.passkeys.length > 0}
					<div class="space-y-2 mb-4">
						{#each data.passkeys as passkey}
							<div
								class="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-bark-800/30 border border-white/20 dark:border-bark-700/20"
							>
								<div class="flex items-center gap-3">
									<Key class="w-4 h-4 text-foreground-muted" />
									<div>
										<p class="text-sm font-medium text-foreground">
											{passkey.name || 'Passkey'}
										</p>
										<p class="text-xs text-foreground-subtle">
											Added {formatDate(passkey.createdAt)}
											{#if passkey.lastUsedAt}
												 &middot; Last used {formatDate(passkey.lastUsedAt)}
											{/if}
										</p>
									</div>
								</div>
								<form method="POST" action="?/deletePasskey" use:enhance>
									<input type="hidden" name="passkeyId" value={passkey.id} />
									<button
										type="submit"
										class="p-2 rounded-lg text-foreground-muted hover:text-error hover:bg-error/10 transition-colors"
										aria-label="Delete passkey {passkey.name || 'unnamed'}"
									>
										<Trash2 class="w-4 h-4" aria-hidden="true" />
									</button>
								</form>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-foreground-muted mb-4">
						You haven't added any passkeys yet. Add one for faster, more secure sign-ins.
					</p>
				{/if}

				<!-- Add passkey -->
				<div class="space-y-3">
					<div class="flex gap-2">
						<input
							type="text"
							bind:value={passkeyName}
							placeholder="Passkey name (optional)"
							class="flex-1 px-3 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 backdrop-blur-sm border border-white/30 dark:border-bark-700/30 text-foreground placeholder:text-foreground-faint text-sm transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
						/>
						<button
							onclick={addPasskey}
							disabled={isAddingPasskey}
							class="btn-primary flex items-center gap-2 text-sm"
						>
							{#if isAddingPasskey}
								<Loader2 class="w-4 h-4 animate-spin" />
							{:else}
								<Plus class="w-4 h-4" />
							{/if}
							Add Passkey
						</button>
					</div>
					{#if passkeyError}
						<p class="text-sm text-error">{passkeyError}</p>
					{/if}
				</div>
			{/if}
		</GlassCard>

		<!-- Two-Factor Authentication Section -->
		<GlassCard variant="frosted">
			<div class="flex items-center gap-3 mb-4">
				<div class="p-2 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/30">
					<Shield class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
				</div>
				<div>
					<h2 class="font-medium text-foreground">Two-Factor Authentication</h2>
					<p class="text-sm text-foreground-muted">
						Add an extra layer of security with an authenticator app
					</p>
				</div>
			</div>

			{#if data.twoFactorStatus?.enabled}
				<!-- 2FA is enabled -->
				<div
					class="p-3 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/30 border border-emerald-200/50 dark:border-emerald-700/30 mb-4"
				>
					<div class="flex items-center gap-2 mb-1">
						<Check class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
						<span class="text-sm font-medium text-emerald-800 dark:text-emerald-200"
							>Two-factor authentication is enabled</span
						>
					</div>
					<p class="text-xs text-emerald-700 dark:text-emerald-300">
						Enabled on {formatDate(data.twoFactorStatus.enabledAt)}
						{#if data.twoFactorStatus.backupCodesRemaining > 0}
							&middot; {data.twoFactorStatus.backupCodesRemaining} backup codes remaining
						{:else}
							&middot; <span class="text-amber-600 dark:text-amber-400"
								>No backup codes remaining</span
							>
						{/if}
					</p>
				</div>

				<div class="flex gap-2">
					<form method="POST" action="?/generateBackupCodes" use:enhance class="contents">
						<button type="submit" class="btn-secondary flex items-center gap-2 text-sm">
							<RefreshCw class="w-4 h-4" />
							New Backup Codes
						</button>
					</form>
					<button
						onclick={() => (showDisableConfirm = true)}
						class="btn-secondary text-error hover:bg-error/10 flex items-center gap-2 text-sm"
					>
						Disable 2FA
					</button>
				</div>

				<!-- Disable confirmation -->
				{#if showDisableConfirm}
					<div class="mt-4 p-4 rounded-lg bg-error/10 border border-error/30">
						<p class="text-sm text-foreground mb-3">
							Enter your 2FA code to disable two-factor authentication:
						</p>
						<form method="POST" action="?/disableTwoFactor" use:enhance class="flex gap-2">
							<input
								type="text"
								name="code"
								bind:value={disableCode}
								placeholder="000000"
								maxlength="6"
								pattern="[0-9]{6}"
								class="w-32 px-3 py-2 rounded-lg bg-white/70 dark:bg-bark-800/50 backdrop-blur-sm border border-error/30 text-foreground placeholder:text-foreground-faint text-sm text-center tracking-wider font-mono transition-all focus:outline-none focus:border-error focus:ring-2 focus:ring-error/20"
							/>
							<button type="submit" class="btn-primary bg-error hover:bg-error/90 text-sm">
								Confirm
							</button>
							<button
								type="button"
								onclick={() => {
									showDisableConfirm = false;
									disableCode = '';
								}}
								class="btn-secondary text-sm"
							>
								Cancel
							</button>
						</form>
						{#if form?.error && form?.action === 'disableTwoFactor'}
							<p class="text-sm text-error mt-2">{form.error}</p>
						{/if}
					</div>
				{/if}
			{:else if twoFactorSetupStep === 'idle'}
				<!-- 2FA is not enabled -->
				<p class="text-sm text-foreground-muted mb-4">
					Protect your account with an authenticator app like Google Authenticator or 1Password.
				</p>
				<form method="POST" action="?/enableTwoFactor" use:enhance>
					<button type="submit" class="btn-primary flex items-center gap-2">
						<Shield class="w-4 h-4" />
						Enable Two-Factor Auth
					</button>
				</form>
				{#if form?.error && form?.action === 'enableTwoFactor'}
					<p class="text-sm text-error mt-2">{form.error}</p>
				{/if}
			{:else if twoFactorSetupStep === 'qr'}
				<!-- QR code step -->
				<div class="space-y-4">
					<p class="text-sm text-foreground-muted">
						Scan this QR code with your authenticator app, then enter the code below.
					</p>

					{#if twoFactorQrCode}
						<div class="flex justify-center p-4 bg-white rounded-lg">
							<img src={twoFactorQrCode} alt="2FA QR Code" class="w-48 h-48" />
						</div>
					{/if}

					{#if twoFactorSecret}
						<div
							class="p-3 rounded-lg bg-white/50 dark:bg-bark-800/30 border border-white/20 dark:border-bark-700/20"
						>
							<p class="text-xs text-foreground-subtle mb-1">Or enter this code manually:</p>
							<code class="text-sm font-mono text-foreground">{twoFactorSecret}</code>
						</div>
					{/if}

					<form method="POST" action="?/verifyTwoFactor" use:enhance class="space-y-3">
						<label for="verify-code" class="block text-sm font-medium text-foreground">
							Enter the 6-digit code from your app:
						</label>
						<input
							type="text"
							id="verify-code"
							name="code"
							bind:value={verifyCode}
							placeholder="000000"
							maxlength="6"
							pattern="[0-9]{6}"
							required
							class="w-full px-4 py-3 rounded-lg bg-white/70 dark:bg-bark-800/50 backdrop-blur-sm border border-white/30 dark:border-bark-700/30 text-foreground placeholder:text-foreground-faint text-center text-xl tracking-widest font-mono transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
						/>
						<div class="flex gap-2">
							<button type="submit" class="btn-primary flex-1"> Verify & Enable </button>
							<button
								type="button"
								onclick={() => {
									twoFactorSetupStep = 'idle';
									twoFactorSecret = null;
									twoFactorQrCode = null;
									verifyCode = '';
								}}
								class="btn-secondary"
							>
								Cancel
							</button>
						</div>
					</form>
					{#if form?.error && form?.action === 'verifyTwoFactor'}
						<p class="text-sm text-error">{form.error}</p>
					{/if}
				</div>
			{:else if twoFactorSetupStep === 'backup'}
				<!-- Backup codes step -->
				<div class="space-y-4">
					<div
						class="p-3 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/30 border border-emerald-200/50 dark:border-emerald-700/30"
					>
						<div class="flex items-center gap-2 mb-1">
							<Check class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
							<span class="text-sm font-medium text-emerald-800 dark:text-emerald-200"
								>Two-factor authentication is now enabled!</span
							>
						</div>
					</div>

					<div>
						<p class="text-sm text-foreground mb-3">
							<strong>Save these backup codes</strong> in a safe place. You can use them to sign in
							if you lose access to your authenticator app.
						</p>
						<div class="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono text-sm">
							<div class="grid grid-cols-2 gap-2">
								{#each backupCodes as code}
									<div>{code}</div>
								{/each}
							</div>
						</div>
					</div>

					<div class="flex gap-2">
						<button
							onclick={copyBackupCodes}
							class="btn-secondary flex items-center gap-2 text-sm"
							aria-label={copiedBackupCodes ? 'Backup codes copied to clipboard' : 'Copy backup codes to clipboard'}
						>
							{#if copiedBackupCodes}
								<Check class="w-4 h-4" aria-hidden="true" />
								Copied!
							{:else}
								<Copy class="w-4 h-4" aria-hidden="true" />
								Copy Codes
							{/if}
						</button>
						<button
							onclick={() => {
								twoFactorSetupStep = 'idle';
								backupCodes = [];
								invalidateAll();
							}}
							class="btn-primary"
							aria-label="Finish two-factor authentication setup"
						>
							Done
						</button>
					</div>
				</div>
			{/if}
		</GlassCard>

		<!-- Linked Accounts Section -->
		<GlassCard variant="frosted">
			<div class="flex items-center gap-3 mb-4">
				<div class="p-2 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/30">
					<Link2 class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
				</div>
				<div>
					<h2 class="font-medium text-foreground">Linked Accounts</h2>
					<p class="text-sm text-foreground-muted">Social accounts connected to your Grove</p>
				</div>
			</div>

			{#if data.linkedAccounts && data.linkedAccounts.length > 0}
				<div class="space-y-2">
					{#each data.linkedAccounts as account}
						{@const info = providerInfo[account.provider] || {
							name: account.provider,
							color: '#666',
							icon: '?'
						}}
						<div
							class="flex items-center justify-between p-3 rounded-lg bg-white/50 dark:bg-bark-800/30 border border-white/20 dark:border-bark-700/20"
						>
							<div class="flex items-center gap-3">
								<div
									class="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm"
									style="background-color: {info.color}"
								>
									{info.icon}
								</div>
								<div>
									<p class="text-sm font-medium text-foreground">{info.name}</p>
									{#if account.email}
										<p class="text-xs text-foreground-subtle">{account.email}</p>
									{/if}
								</div>
							</div>
							<span class="text-xs text-foreground-subtle">
								Linked {formatDate(account.linkedAt)}
							</span>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-foreground-muted">No social accounts linked yet.</p>
			{/if}

			<!-- Link new account buttons -->
			<div class="mt-4 pt-4 border-t border-white/20 dark:border-bark-700/20">
				<p class="text-sm text-foreground-muted mb-3">Link another account:</p>
				<div class="flex gap-2 flex-wrap">
					{#each Object.entries(providerInfo) as [provider, info]}
						{@const isLinked = data.linkedAccounts?.some(
							(a: { provider: string }) => a.provider === provider
						)}
						{#if !isLinked}
							<button
								type="button"
								disabled
								class="btn-secondary flex items-center gap-2 text-sm opacity-50 cursor-not-allowed"
								style="border-color: {info.color}; color: {info.color}"
								title="Account linking coming soon"
							>
								<span
									class="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-semibold"
									style="background-color: {info.color}"
								>
									{info.icon}
								</span>
								{info.name}
							</button>
						{/if}
					{/each}
				</div>
				<p class="text-xs text-foreground-subtle mt-2">Account linking is coming soon.</p>
			</div>
		</GlassCard>
	</div>
</div>
