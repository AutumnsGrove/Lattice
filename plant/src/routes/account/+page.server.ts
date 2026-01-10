/**
 * Account Settings Page - Server-side logic
 *
 * Handles loading and managing account security settings:
 * - Passkeys
 * - Two-Factor Authentication
 * - Linked OAuth Accounts
 */

import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import {
	isValidTotpCode,
	getRequiredEnv,
	TOTP_CODE_LENGTH
} from '@autumnsgrove/groveengine/groveauth';

/** Default auth URL for development. In production, set AUTH_BASE_URL env var. */
const DEFAULT_AUTH_URL = 'https://heartwood.grove.place';

// Response types
interface ErrorResponse {
	message?: string;
}

interface TwoFactorEnableResponse {
	secret: string;
	qrCodeUrl: string;
}

interface TwoFactorVerifyResponse {
	backupCodes?: string[];
}

interface BackupCodesResponse {
	backupCodes: string[];
}

export const load: PageServerLoad = async ({ parent, cookies, platform }) => {
	const { user } = await parent();

	// Redirect if not authenticated
	if (!user) {
		redirect(302, '/');
	}

	const accessToken = cookies.get('access_token');
	if (!accessToken) {
		redirect(302, '/');
	}

	const env = platform?.env as Record<string, string> | undefined;
	const authBaseUrl = getRequiredEnv(env, 'AUTH_BASE_URL', DEFAULT_AUTH_URL);

	// Fetch account data in parallel
	const [passkeysRes, twoFactorRes, linkedAccountsRes] = await Promise.allSettled([
		fetch(`${authBaseUrl}/api/auth/passkey/list-user-passkeys`, {
			headers: { Authorization: `Bearer ${accessToken}` }
		}),
		fetch(`${authBaseUrl}/api/auth/two-factor/get-status`, {
			headers: { Authorization: `Bearer ${accessToken}` }
		}),
		fetch(`${authBaseUrl}/api/auth/linked-accounts`, {
			headers: { Authorization: `Bearer ${accessToken}` }
		})
	]);

	// Parse responses
	const passkeys =
		passkeysRes.status === 'fulfilled' && passkeysRes.value.ok
			? await passkeysRes.value.json()
			: [];

	const twoFactorStatus =
		twoFactorRes.status === 'fulfilled' && twoFactorRes.value.ok
			? await twoFactorRes.value.json()
			: { enabled: false, enabledAt: null, backupCodesRemaining: 0 };

	const linkedAccounts =
		linkedAccountsRes.status === 'fulfilled' && linkedAccountsRes.value.ok
			? await linkedAccountsRes.value.json()
			: [];

	return {
		user,
		passkeys,
		twoFactorStatus,
		linkedAccounts
	};
};

export const actions: Actions = {
	// Delete a passkey
	deletePasskey: async ({ request, cookies, platform }) => {
		const accessToken = cookies.get('access_token');
		if (!accessToken) {
			return fail(401, { error: "You'll need to sign in to manage your account settings" });
		}

		const formData = await request.formData();
		const passkeyId = formData.get('passkeyId')?.toString();

		if (!passkeyId) {
			return fail(400, { error: 'Passkey ID is required' });
		}

		const env = platform?.env as Record<string, string> | undefined;
		const authBaseUrl = getRequiredEnv(env, 'AUTH_BASE_URL', DEFAULT_AUTH_URL);

		try {
			const response = await fetch(`${authBaseUrl}/api/auth/passkey/delete-passkey`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ passkeyId })
			});

			if (!response.ok) {
				const data = (await response.json()) as ErrorResponse;
				return fail(response.status, { error: data.message || 'Failed to delete passkey' });
			}

			return { success: true, action: 'deletePasskey' };
		} catch {
			return fail(500, { error: 'Unable to delete passkey. Please try again.' });
		}
	},

	// Enable 2FA - Step 1: Generate secret and QR code
	enableTwoFactor: async ({ cookies, platform }) => {
		const accessToken = cookies.get('access_token');
		if (!accessToken) {
			return fail(401, { error: "You'll need to sign in to manage your account settings" });
		}

		const env = platform?.env as Record<string, string> | undefined;
		const authBaseUrl = getRequiredEnv(env, 'AUTH_BASE_URL', DEFAULT_AUTH_URL);

		try {
			const response = await fetch(`${authBaseUrl}/api/auth/two-factor/enable`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				const errorData = (await response.json()) as ErrorResponse;
				return fail(response.status, { error: errorData.message || 'Failed to enable 2FA' });
			}

			const data = (await response.json()) as TwoFactorEnableResponse;
			return { success: true, action: 'enableTwoFactor', secret: data.secret, qrCodeUrl: data.qrCodeUrl };
		} catch {
			return fail(500, { error: 'Unable to enable 2FA. Please try again.' });
		}
	},

	// Verify 2FA code to complete setup
	verifyTwoFactor: async ({ request, cookies, platform }) => {
		const accessToken = cookies.get('access_token');
		if (!accessToken) {
			return fail(401, { error: "You'll need to sign in to manage your account settings" });
		}

		const formData = await request.formData();
		const code = formData.get('code')?.toString();

		if (!isValidTotpCode(code)) {
			return fail(400, { error: `Please enter a valid ${TOTP_CODE_LENGTH}-digit code` });
		}

		const env = platform?.env as Record<string, string> | undefined;
		const authBaseUrl = getRequiredEnv(env, 'AUTH_BASE_URL', DEFAULT_AUTH_URL);

		try {
			const response = await fetch(`${authBaseUrl}/api/auth/two-factor/verify-totp`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ code })
			});

			if (!response.ok) {
				const errorData = (await response.json()) as ErrorResponse;
				return fail(response.status, { error: errorData.message || 'Invalid code. Please try again.' });
			}

			const data = (await response.json()) as TwoFactorVerifyResponse;
			return { success: true, action: 'verifyTwoFactor', backupCodes: data.backupCodes };
		} catch {
			return fail(500, { error: 'Unable to verify code. Please try again.' });
		}
	},

	// Disable 2FA
	disableTwoFactor: async ({ request, cookies, platform }) => {
		const accessToken = cookies.get('access_token');
		if (!accessToken) {
			return fail(401, { error: "You'll need to sign in to manage your account settings" });
		}

		const formData = await request.formData();
		const code = formData.get('code')?.toString();

		if (!isValidTotpCode(code)) {
			return fail(400, { error: `Please enter a valid ${TOTP_CODE_LENGTH}-digit code` });
		}

		const env = platform?.env as Record<string, string> | undefined;
		const authBaseUrl = getRequiredEnv(env, 'AUTH_BASE_URL', DEFAULT_AUTH_URL);

		try {
			const response = await fetch(`${authBaseUrl}/api/auth/two-factor/disable`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ code })
			});

			if (!response.ok) {
				const errorData = (await response.json()) as ErrorResponse;
				return fail(response.status, { error: errorData.message || 'Failed to disable 2FA' });
			}

			return { success: true, action: 'disableTwoFactor' };
		} catch {
			return fail(500, { error: 'Unable to disable 2FA. Please try again.' });
		}
	},

	// Generate new backup codes
	generateBackupCodes: async ({ cookies, platform }) => {
		const accessToken = cookies.get('access_token');
		if (!accessToken) {
			return fail(401, { error: "You'll need to sign in to manage your account settings" });
		}

		const env = platform?.env as Record<string, string> | undefined;
		const authBaseUrl = getRequiredEnv(env, 'AUTH_BASE_URL', DEFAULT_AUTH_URL);

		try {
			const response = await fetch(`${authBaseUrl}/api/auth/two-factor/generate-backup-codes`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				const errorData = (await response.json()) as ErrorResponse;
				return fail(response.status, { error: errorData.message || 'Failed to generate backup codes' });
			}

			const data = (await response.json()) as BackupCodesResponse;
			return { success: true, action: 'generateBackupCodes', backupCodes: data.backupCodes };
		} catch {
			return fail(500, { error: 'Unable to generate backup codes. Please try again.' });
		}
	}
};
