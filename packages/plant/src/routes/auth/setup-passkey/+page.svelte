<script lang="ts">
	import { goto } from '$app/navigation';
	import { GlassCard } from '@autumnsgrove/groveengine/ui';
	import {
		Fingerprint,
		Shield,
		Sparkles,
		ArrowRight,
		Loader2,
		CheckCircle
	} from '@autumnsgrove/groveengine/ui/icons';
	import { AlertCircle } from 'lucide-svelte';

	let { data } = $props();

	let isRegistering = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);

	/**
	 * Start the WebAuthn passkey registration flow
	 */
	async function registerPasskey() {
		isRegistering = true;
		error = null;

		try {
			// Step 1: Get registration options from our API
			const optionsResponse = await fetch('/api/account/passkey/register-options', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!optionsResponse.ok) {
				const data = (await optionsResponse.json()) as { error?: string };
				throw new Error(data.error || 'Failed to get registration options');
			}

			const options = (await optionsResponse.json()) as {
				challenge: string;
				user: { id: string; name: string; displayName: string };
				rp: { name: string; id: string };
				pubKeyCredParams: PublicKeyCredentialParameters[];
				timeout?: number;
				authenticatorSelection?: AuthenticatorSelectionCriteria;
				attestation?: AttestationConveyancePreference;
			};

			// Step 2: Create the credential using WebAuthn API
			// Convert base64url strings to ArrayBuffers
			const challenge = base64urlToBuffer(options.challenge);
			const userId = base64urlToBuffer(options.user.id);

			const credential = await navigator.credentials.create({
				publicKey: {
					challenge,
					rp: {
						name: options.rp.name,
						id: options.rp.id
					},
					user: {
						id: userId,
						name: options.user.name,
						displayName: options.user.displayName
					},
					pubKeyCredParams: options.pubKeyCredParams,
					timeout: options.timeout,
					authenticatorSelection: options.authenticatorSelection,
					attestation: options.attestation || 'none'
				}
			});

			if (!credential) {
				throw new Error('Passkey creation was cancelled');
			}

			// Step 3: Send the credential to our API for verification
			const credentialForServer = {
				id: credential.id,
				rawId: bufferToBase64url((credential as PublicKeyCredential).rawId),
				response: {
					clientDataJSON: bufferToBase64url(
						(credential as PublicKeyCredential).response.clientDataJSON
					),
					attestationObject: bufferToBase64url(
						((credential as PublicKeyCredential).response as AuthenticatorAttestationResponse)
							.attestationObject
					)
				},
				type: credential.type
			};

			const verifyResponse = await fetch('/api/account/passkey/verify-registration', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(credentialForServer)
			});

			if (!verifyResponse.ok) {
				const data = (await verifyResponse.json()) as { error?: string };
				throw new Error(data.error || 'Failed to register passkey');
			}

			// Success!
			success = true;

			// Brief delay to show success, then continue to profile
			setTimeout(() => {
				goto('/profile');
			}, 1500);
		} catch (err) {
			console.error('[Passkey Setup] Error:', err);

			if (err instanceof Error) {
				// Handle specific WebAuthn errors
				if (err.name === 'NotAllowedError') {
					error = 'Passkey creation was cancelled or timed out.';
				} else if (err.name === 'SecurityError') {
					error = 'Security error. Make sure you\'re using HTTPS.';
				} else {
					error = err.message;
				}
			} else {
				error = 'Failed to create passkey. Please try again.';
			}
		} finally {
			isRegistering = false;
		}
	}

	/**
	 * Skip passkey setup - user can add one later
	 */
	function skipSetup() {
		goto('/profile');
	}

	// Utility functions for base64url encoding/decoding
	function base64urlToBuffer(base64url: string): ArrayBuffer {
		const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
		const padding = '='.repeat((4 - (base64.length % 4)) % 4);
		const binary = atob(base64 + padding);
		const buffer = new ArrayBuffer(binary.length);
		const view = new Uint8Array(buffer);
		for (let i = 0; i < binary.length; i++) {
			view[i] = binary.charCodeAt(i);
		}
		return buffer;
	}

	function bufferToBase64url(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = '';
		for (let i = 0; i < bytes.length; i++) {
			binary += String.fromCharCode(bytes[i]);
		}
		return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
	}
</script>

<div class="max-w-lg mx-auto space-y-8 animate-fade-in">
	<!-- Header -->
	<div class="text-center space-y-4">
		<div
			class="inline-flex items-center justify-center w-16 h-16 rounded-full
				bg-emerald-100/50 dark:bg-emerald-900/30 backdrop-blur-md
				border border-emerald-200/40 dark:border-emerald-700/30"
		>
			<Fingerprint class="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
		</div>

		<div>
			<h1 class="text-2xl font-medium text-foreground">Secure your account</h1>
			<p class="text-foreground-muted mt-2">
				Welcome, <span class="font-medium text-foreground">{data.email}</span>!
			</p>
		</div>
	</div>

	<!-- Main Card -->
	<GlassCard variant="frosted" class="space-y-6">
		{#if success}
			<!-- Success State -->
			<div class="text-center py-8 space-y-4">
				<div
					class="inline-flex items-center justify-center w-16 h-16 rounded-full
						bg-emerald-100/50 dark:bg-emerald-900/30"
				>
					<CheckCircle class="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
				</div>
				<div>
					<h2 class="text-lg font-medium text-foreground">Passkey created!</h2>
					<p class="text-foreground-muted mt-1">Redirecting to your profile...</p>
				</div>
			</div>
		{:else}
			<!-- Explanation -->
			<div class="space-y-4">
				<p class="text-foreground-muted">
					Create a passkey to sign in securely without passwords. Passkeys use your device's
					biometrics (fingerprint, face) or security key.
				</p>

				<div class="grid gap-3">
					<div class="flex items-start gap-3">
						<div class="p-1.5 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/30 mt-0.5">
							<Shield class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
						</div>
						<div>
							<p class="text-sm font-medium text-foreground">Phishing-resistant</p>
							<p class="text-xs text-foreground-muted">
								Passkeys can't be stolen or reused on fake sites
							</p>
						</div>
					</div>
					<div class="flex items-start gap-3">
						<div class="p-1.5 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/30 mt-0.5">
							<Sparkles class="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
						</div>
						<div>
							<p class="text-sm font-medium text-foreground">One-tap sign in</p>
							<p class="text-xs text-foreground-muted">
								Just use your fingerprint or face to log in instantly
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Error message -->
			{#if error}
				<div
					class="flex items-start gap-3 p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30"
				>
					<AlertCircle class="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
					<p class="text-sm text-red-700 dark:text-red-300">{error}</p>
				</div>
			{/if}

			<!-- Actions -->
			<div class="space-y-3">
				<button
					onclick={registerPasskey}
					disabled={isRegistering}
					class="btn-primary w-full flex items-center justify-center gap-2"
				>
					{#if isRegistering}
						<Loader2 class="w-5 h-5 animate-spin" />
						Creating passkey...
					{:else}
						<Fingerprint class="w-5 h-5" />
						Create Passkey
					{/if}
				</button>

				<button
					onclick={skipSetup}
					disabled={isRegistering}
					class="btn-secondary w-full flex items-center justify-center gap-2 text-foreground-muted"
				>
					Skip for now
					<ArrowRight class="w-4 h-4" />
				</button>
			</div>

			<p class="text-xs text-foreground-subtle text-center">
				You can always add a passkey later in your account settings.
			</p>
		{/if}
	</GlassCard>
</div>
