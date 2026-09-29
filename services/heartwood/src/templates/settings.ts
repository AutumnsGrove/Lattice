/**
 * Heartwood Settings Page Template
 * Account settings including two-factor authentication
 */

import { escapeHtml } from "@autumnsgrove/lattice/utils";

interface SettingsPageOptions {
	authBaseUrl: string;
	user?: {
		id: string;
		name: string | null;
		email: string;
		image: string | null;
	};
	error?: string;
	success?: string;
}

export function getSettingsPageHTML(options: SettingsPageOptions): string {
	const { authBaseUrl, user, error, success } = options;

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Settings - Heartwood</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js" integrity="sha512-ZTGn8lKgMaX5YXLfD/+7Y/wj01uMvD5ZIjJFy8u2JEoyjD+0KC/xnggZW6RJGxqGQBvkTYCJosDJ0PZghmS4lA==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
  <style>
    :root {
      --color-bg: #fafaf9;
      --color-surface: #ffffff;
      --color-primary: #166534;
      --color-primary-hover: #15803d;
      --color-text: #1c1917;
      --color-text-muted: #78716c;
      --color-border: #e7e5e4;
      --color-error: #dc2626;
      --color-error-bg: #fef2f2;
      --color-success: #166534;
      --color-success-bg: #dcfce7;
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
      --radius: 12px;
      --radius-sm: 8px;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --color-bg: #1c1917;
        --color-surface: #292524;
        --color-primary: #4ade80;
        --color-primary-hover: #22c55e;
        --color-text: #fafaf9;
        --color-text-muted: #a8a29e;
        --color-border: #44403c;
        --color-error: #f87171;
        --color-error-bg: #450a0a;
        --color-success: #4ade80;
        --color-success-bg: #14532d;
      }
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Lexend', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--color-bg);
      color: var(--color-text);
      min-height: 100vh;
      padding: 20px;
      line-height: 1.5;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 32px;
    }

    .header h1 {
      font-size: 24px;
      font-weight: 700;
      color: var(--color-primary);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .header svg {
      width: 32px;
      height: 32px;
    }

    .card {
      background: var(--color-surface);
      border-radius: var(--radius);
      box-shadow: var(--shadow-md);
      padding: 24px;
      border: 1px solid var(--color-border);
      margin-bottom: 24px;
    }

    .card-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-title svg {
      width: 20px;
      height: 20px;
      color: var(--color-primary);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: var(--color-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 600;
      color: var(--color-text-muted);
    }

    .avatar img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }

    .user-details h2 {
      font-size: 18px;
      font-weight: 600;
    }

    .user-details p {
      color: var(--color-text-muted);
      font-size: 14px;
    }

    .message {
      padding: 12px 16px;
      border-radius: var(--radius-sm);
      margin-bottom: 16px;
      font-size: 14px;
    }

    .message-error {
      background: var(--color-error-bg);
      color: var(--color-error);
      border: 1px solid var(--color-error);
    }

    .message-success {
      background: var(--color-success-bg);
      color: var(--color-success);
      border: 1px solid var(--color-success);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
      border: 1px solid var(--color-border);
      background: var(--color-surface);
      color: var(--color-text);
    }

    .btn:hover {
      background: var(--color-bg);
      border-color: var(--color-text-muted);
    }

    .btn svg {
      width: 16px;
      height: 16px;
    }

    .btn-primary {
      background: var(--color-primary);
      color: white;
      border-color: var(--color-primary);
    }

    .btn-primary:hover {
      background: var(--color-primary-hover);
      border-color: var(--color-primary-hover);
    }

    .btn-danger {
      color: var(--color-error);
      border-color: var(--color-error);
    }

    .btn-danger:hover {
      background: var(--color-error-bg);
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 13px;
    }

    .actions {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }

    .loading {
      opacity: 0.7;
      pointer-events: none;
    }

    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .modal-overlay.active {
      display: flex;
    }

    .modal {
      background: var(--color-surface);
      border-radius: var(--radius);
      padding: 24px;
      max-width: 400px;
      width: 90%;
      box-shadow: var(--shadow-lg);
    }

    .modal h3 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .modal p {
      color: var(--color-text-muted);
      font-size: 14px;
      margin-bottom: 16px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 6px;
    }

    .form-group input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 14px;
      background: var(--color-surface);
      color: var(--color-text);
    }

    .form-group input:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .not-authenticated {
      text-align: center;
      padding: 48px 24px;
    }

    .not-authenticated h2 {
      font-size: 20px;
      margin-bottom: 12px;
    }

    .not-authenticated p {
      color: var(--color-text-muted);
      margin-bottom: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        Heartwood
      </h1>
    </div>

    ${error ? `<div class="message message-error">${escapeHtml(error)}</div>` : ""}
    ${success ? `<div class="message message-success">${escapeHtml(success)}</div>` : ""}

    ${
			user
				? `
    <!-- User Profile Card -->
    <div class="card">
      <div class="user-info">
        <div class="avatar">
          ${user.image ? `<img src="${escapeHtml(user.image)}" alt="Avatar">` : escapeHtml((user.name?.[0] || user.email[0]).toUpperCase())}
        </div>
        <div class="user-details">
          <h2>${escapeHtml(user.name || "User")}</h2>
          <p>${escapeHtml(user.email)}</p>
        </div>
      </div>
    </div>

    <!-- Two-Factor Authentication Card -->
    <div class="card">
      <div class="card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        Two-Factor Authentication
      </div>

      <p style="color: var(--color-text-muted); font-size: 14px; margin-bottom: 16px;">
        Add an extra layer of security using an authenticator app like Google Authenticator or Authy.
      </p>

      <div id="2fa-status">
        <!-- 2FA status will be loaded here -->
      </div>

      <div id="2fa-disabled" style="display: none;">
        <div class="actions">
          <button id="enable-2fa" class="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Enable 2FA
          </button>
        </div>
      </div>

      <div id="2fa-enabled" style="display: none;">
        <div class="message message-success" style="margin-bottom: 16px;">
          <strong>2FA is enabled</strong> - Your account is protected with two-factor authentication.
        </div>
        <div class="actions">
          <button id="view-backup-codes" class="btn">
            View Backup Codes
          </button>
          <button id="disable-2fa" class="btn btn-danger">
            Disable 2FA
          </button>
        </div>
      </div>
    </div>

    <!-- Sign Out -->
    <div class="card">
      <button id="sign-out" class="btn btn-danger" style="width: 100%;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Sign Out
      </button>
    </div>
    `
				: `
    <div class="card not-authenticated">
      <h2>Not Signed In</h2>
      <p>Please sign in to manage your account settings.</p>
      <a href="/login" class="btn btn-primary">Sign In</a>
    </div>
    `
		}
  </div>

  <!-- 2FA Setup Modal -->
  <div id="2fa-setup-modal" class="modal-overlay">
    <div class="modal">
      <h3>Set Up Two-Factor Authentication</h3>
      <div id="2fa-setup-step1">
        <p>Scan this QR code with your authenticator app:</p>
        <div id="2fa-qr-code" style="text-align: center; margin: 16px 0; padding: 16px; background: white; border-radius: 8px;">
          <!-- QR code will be inserted here -->
        </div>
        <p style="font-size: 12px; color: var(--color-text-muted); margin-bottom: 16px;">
          Or enter this code manually: <code id="2fa-secret" style="background: var(--color-bg); padding: 4px 8px; border-radius: 4px;"></code>
        </p>
        <form id="2fa-verify-form">
          <div class="form-group">
            <label for="2fa-code">Enter the 6-digit code from your app</label>
            <input type="text" id="2fa-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000" required style="text-align: center; font-size: 20px; letter-spacing: 4px;">
          </div>
          <div class="modal-actions">
            <button type="button" id="cancel-2fa-setup" class="btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Verify & Enable</button>
          </div>
        </form>
      </div>
      <div id="2fa-setup-step2" style="display: none;">
        <div class="message message-success" style="margin-bottom: 16px;">
          <strong>2FA is now enabled!</strong>
        </div>
        <p style="margin-bottom: 16px;">Save these backup codes in a safe place. You can use them to sign in if you lose access to your authenticator app.</p>
        <div id="2fa-backup-codes" style="background: var(--color-bg); padding: 16px; border-radius: 8px; font-family: monospace; margin-bottom: 16px;">
          <!-- Backup codes will be inserted here -->
        </div>
        <div class="modal-actions">
          <button type="button" id="close-2fa-setup" class="btn btn-primary">Done</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 2FA Disable Modal -->
  <div id="2fa-disable-modal" class="modal-overlay">
    <div class="modal">
      <h3>Disable Two-Factor Authentication</h3>
      <p>Enter your current 2FA code to disable two-factor authentication.</p>
      <form id="2fa-disable-form">
        <div class="form-group">
          <label for="2fa-disable-code">6-digit code</label>
          <input type="text" id="2fa-disable-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000" required style="text-align: center; font-size: 20px; letter-spacing: 4px;">
        </div>
        <div class="modal-actions">
          <button type="button" id="cancel-2fa-disable" class="btn">Cancel</button>
          <button type="submit" class="btn btn-danger">Disable 2FA</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Backup Codes Modal -->
  <div id="backup-codes-modal" class="modal-overlay">
    <div class="modal">
      <h3>Backup Codes</h3>
      <p style="margin-bottom: 16px;">These codes can be used to sign in if you lose access to your authenticator app. Each code can only be used once.</p>
      <div id="backup-codes-list" style="background: var(--color-bg); padding: 16px; border-radius: 8px; font-family: monospace; margin-bottom: 16px;">
        <!-- Backup codes will be loaded here -->
      </div>
      <div class="modal-actions">
        <button type="button" id="regenerate-backup-codes" class="btn btn-danger">Regenerate Codes</button>
        <button type="button" id="close-backup-codes" class="btn btn-primary">Done</button>
      </div>
    </div>
  </div>

  ${
		user
			? `
  <script>
    const API_BASE = '${authBaseUrl}';

    // Inline notification helper — replaces alert() with a dismissible banner
    function showNotification(message, type) {
      const existing = document.getElementById('inline-notification');
      if (existing) existing.remove();

      const el = document.createElement('div');
      el.id = 'inline-notification';
      el.className = 'message message-' + (type || 'error');
      el.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999;min-width:280px;max-width:480px;text-align:center;cursor:pointer;';
      el.textContent = message;
      el.addEventListener('click', () => el.remove());
      document.body.appendChild(el);
      setTimeout(() => { if (el.parentNode) el.remove(); }, 5000);
    }

    // DOM elements
    const signOutBtn = document.getElementById('sign-out');

    // Sign out
    signOutBtn.addEventListener('click', async () => {
      signOutBtn.classList.add('loading');
      try {
        await fetch(API_BASE + '/api/auth/sign-out', {
          method: 'POST',
          credentials: 'include',
        });
        window.location.href = '/';
      } catch (err) {
        console.error('Error signing out:', err);
        signOutBtn.classList.remove('loading');
        showNotification('Sign out failed. Please try again or clear your cookies.', 'error');
      }
    });

    // ==========================================================================
    // TWO-FACTOR AUTHENTICATION
    // ==========================================================================

    const twoFaDisabled = document.getElementById('2fa-disabled');
    const twoFaEnabled = document.getElementById('2fa-enabled');
    const enable2faBtn = document.getElementById('enable-2fa');
    const disable2faBtn = document.getElementById('disable-2fa');
    const viewBackupCodesBtn = document.getElementById('view-backup-codes');

    // Modals
    const setupModal = document.getElementById('2fa-setup-modal');
    const disableModal = document.getElementById('2fa-disable-modal');
    const backupCodesModal = document.getElementById('backup-codes-modal');

    // Setup modal elements
    const setupStep1 = document.getElementById('2fa-setup-step1');
    const setupStep2 = document.getElementById('2fa-setup-step2');
    const qrCodeContainer = document.getElementById('2fa-qr-code');
    const secretDisplay = document.getElementById('2fa-secret');
    const backupCodesDisplay = document.getElementById('2fa-backup-codes');
    const verifyForm = document.getElementById('2fa-verify-form');
    const cancelSetupBtn = document.getElementById('cancel-2fa-setup');
    const closeSetupBtn = document.getElementById('close-2fa-setup');

    // Disable modal elements
    const disableForm = document.getElementById('2fa-disable-form');
    const cancelDisableBtn = document.getElementById('cancel-2fa-disable');

    // Backup codes modal elements
    const backupCodesList = document.getElementById('backup-codes-list');
    const regenerateCodesBtn = document.getElementById('regenerate-backup-codes');
    const closeBackupCodesBtn = document.getElementById('close-backup-codes');

    let currentTotpUri = '';

    // Load 2FA status
    async function load2faStatus() {
      try {
        const response = await fetch(API_BASE + '/api/auth/two-factor/get-status', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.enabled) {
            twoFaDisabled.style.display = 'none';
            twoFaEnabled.style.display = 'block';
          } else {
            twoFaDisabled.style.display = 'block';
            twoFaEnabled.style.display = 'none';
          }
        }
      } catch (err) {
        console.error('Error loading 2FA status:', err);
        // Show error instead of misleadingly defaulting to "disabled"
        const statusEl = document.getElementById('2fa-status');
        if (statusEl) {
          statusEl.innerHTML = '<div class="message message-error">Could not check 2FA status. Please refresh the page.</div>';
        }
      }
    }

    // Enable 2FA - Step 1: Generate secret
    enable2faBtn.addEventListener('click', async () => {
      enable2faBtn.classList.add('loading');
      enable2faBtn.textContent = 'Setting up...';

      try {
        const response = await fetch(API_BASE + '/api/auth/two-factor/enable', {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) throw new Error('Failed to enable 2FA');

        const data = await response.json();
        currentTotpUri = data.totpURI;

        // Generate QR code client-side to keep TOTP secret secure
        // Never send secrets to third-party services
        const qr = qrcode(0, 'M');
        qr.addData(currentTotpUri);
        qr.make();
        qrCodeContainer.innerHTML = qr.createImgTag(4, 8);

        // Extract secret from URI for manual entry
        const secretMatch = currentTotpUri.match(/secret=([A-Z2-7]+)/i);
        if (secretMatch) {
          secretDisplay.textContent = secretMatch[1];
        }

        setupStep1.style.display = 'block';
        setupStep2.style.display = 'none';
        setupModal.classList.add('active');
        document.getElementById('2fa-code').focus();
      } catch (err) {
        console.error('Error enabling 2FA:', err);
        showNotification('Failed to set up 2FA. Please try again.', 'error');
      } finally {
        enable2faBtn.classList.remove('loading');
        enable2faBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Enable 2FA';
      }
    });

    // Verify TOTP code
    verifyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = document.getElementById('2fa-code').value;
      const submitBtn = verifyForm.querySelector('button[type="submit"]');
      submitBtn.classList.add('loading');
      submitBtn.textContent = 'Verifying...';

      try {
        const response = await fetch(API_BASE + '/api/auth/two-factor/verify-totp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code }),
        });

        if (!response.ok) throw new Error('Invalid code');

        const data = await response.json();

        // Show backup codes
        if (data.backupCodes) {
          backupCodesDisplay.textContent = '';
          data.backupCodes.forEach(code => {
            const div = document.createElement('div');
            div.style.margin = '4px 0';
            div.textContent = code;
            backupCodesDisplay.appendChild(div);
          });
        }

        setupStep1.style.display = 'none';
        setupStep2.style.display = 'block';
      } catch (err) {
        console.error('Error verifying 2FA:', err);
        showNotification('Invalid code. Please try again.', 'error');
        document.getElementById('2fa-code').value = '';
        document.getElementById('2fa-code').focus();
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.textContent = 'Verify & Enable';
      }
    });

    cancelSetupBtn.addEventListener('click', () => {
      setupModal.classList.remove('active');
      document.getElementById('2fa-code').value = '';
    });

    closeSetupBtn.addEventListener('click', () => {
      setupModal.classList.remove('active');
      load2faStatus();
    });

    // Disable 2FA
    disable2faBtn.addEventListener('click', () => {
      disableModal.classList.add('active');
      document.getElementById('2fa-disable-code').focus();
    });

    cancelDisableBtn.addEventListener('click', () => {
      disableModal.classList.remove('active');
      document.getElementById('2fa-disable-code').value = '';
    });

    disableForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = document.getElementById('2fa-disable-code').value;
      const submitBtn = disableForm.querySelector('button[type="submit"]');
      submitBtn.classList.add('loading');
      submitBtn.textContent = 'Disabling...';

      try {
        const response = await fetch(API_BASE + '/api/auth/two-factor/disable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code }),
        });

        if (!response.ok) throw new Error('Invalid code');

        disableModal.classList.remove('active');
        document.getElementById('2fa-disable-code').value = '';
        load2faStatus();
      } catch (err) {
        console.error('Error disabling 2FA:', err);
        showNotification('Invalid code. Please try again.', 'error');
        document.getElementById('2fa-disable-code').value = '';
        document.getElementById('2fa-disable-code').focus();
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.textContent = 'Disable 2FA';
      }
    });

    // View backup codes
    viewBackupCodesBtn.addEventListener('click', async () => {
      backupCodesList.innerHTML = 'Loading...';
      backupCodesModal.classList.add('active');

      try {
        const response = await fetch(API_BASE + '/api/auth/two-factor/get-backup-codes', {
          credentials: 'include',
        });

        if (!response.ok) throw new Error('Failed to get backup codes');

        const data = await response.json();
        if (data.backupCodes && data.backupCodes.length > 0) {
          backupCodesList.textContent = '';
          data.backupCodes.forEach(code => {
            const div = document.createElement('div');
            div.style.margin = '4px 0';
            if (code.used) {
              const strikethrough = document.createElement('s');
              strikethrough.style.color = 'var(--color-text-muted)';
              strikethrough.textContent = code.code;
              div.appendChild(strikethrough);
            } else {
              div.textContent = code.code;
            }
            backupCodesList.appendChild(div);
          });
        } else {
          backupCodesList.textContent = '';
          const p = document.createElement('p');
          p.style.color = 'var(--color-text-muted)';
          p.textContent = 'No backup codes available.';
          backupCodesList.appendChild(p);
        }
      } catch (err) {
        console.error('Error loading backup codes:', err);
        backupCodesList.textContent = '';
        const p = document.createElement('p');
        p.style.color = 'var(--color-error)';
        p.textContent = 'Failed to load backup codes.';
        backupCodesList.appendChild(p);
      }
    });

    closeBackupCodesBtn.addEventListener('click', () => {
      backupCodesModal.classList.remove('active');
    });

    regenerateCodesBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure? This will invalidate your existing backup codes.')) return;

      regenerateCodesBtn.classList.add('loading');
      regenerateCodesBtn.textContent = 'Regenerating...';

      try {
        const response = await fetch(API_BASE + '/api/auth/two-factor/generate-backup-codes', {
          method: 'POST',
          credentials: 'include',
        });

        if (!response.ok) throw new Error('Failed to regenerate backup codes');

        const data = await response.json();
        if (data.backupCodes) {
          backupCodesList.textContent = '';
          data.backupCodes.forEach(code => {
            const div = document.createElement('div');
            div.style.margin = '4px 0';
            div.textContent = code;
            backupCodesList.appendChild(div);
          });
        }
      } catch (err) {
        console.error('Error regenerating backup codes:', err);
        showNotification('Failed to regenerate backup codes.', 'error');
      } finally {
        regenerateCodesBtn.classList.remove('loading');
        regenerateCodesBtn.textContent = 'Regenerate Codes';
      }
    });

    // Auto-format 2FA code inputs
    document.querySelectorAll('input[pattern="[0-9]{6}"]').forEach(input => {
      input.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
      });
    });

    // Load 2FA status on page load
    load2faStatus();
  </script>
  `
			: ""
	}
</body>
</html>`;
}
