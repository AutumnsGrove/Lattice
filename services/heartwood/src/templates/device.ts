/**
 * Device Authorization Page Template (RFC 8628)
 * Styled to match Grove ecosystem aesthetic
 */

interface DeviceAuthorizationPageOptions {
  userCode: string;
  clientName: string;
  userName?: string;
  error?: string | null;
  showForm: boolean;
  authBaseUrl: string;
  success?: "approved" | "denied" | null;
}

export function getDeviceAuthorizationPageHTML(
  options: DeviceAuthorizationPageOptions,
): string {
  const { userName } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Authorize Device - Heartwood</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --color-bg: #fafaf9;
      --color-surface: #ffffff;
      --color-primary: #166534;
      --color-primary-hover: #15803d;
      --color-danger: #dc2626;
      --color-danger-hover: #b91c1c;
      --color-text: #1c1917;
      --color-text-muted: #78716c;
      --color-border: #e7e5e4;
      --color-error: #dc2626;
      --color-error-bg: #fef2f2;
      --color-success: #16a34a;
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
        --color-danger: #f87171;
        --color-danger-hover: #ef4444;
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
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      line-height: 1.5;
    }

    .container {
      width: 100%;
      max-width: 420px;
    }

    .card {
      background: var(--color-surface);
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      padding: 32px;
      border: 1px solid var(--color-border);
    }

    .logo {
      text-align: center;
      margin-bottom: 24px;
    }

    .logo h1 {
      font-size: 24px;
      font-weight: 700;
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .logo svg {
      width: 32px;
      height: 32px;
    }

    .subtitle {
      text-align: center;
      color: var(--color-text-muted);
      margin-bottom: 24px;
      font-size: 14px;
    }

    .user-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--color-bg);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 13px;
      color: var(--color-text);
      margin-bottom: 24px;
    }

    .client-name {
      font-weight: 600;
      color: var(--color-text);
    }

    .code-display {
      text-align: center;
      margin-bottom: 24px;
    }

    .code-display label {
      display: block;
      font-size: 13px;
      color: var(--color-text-muted);
      margin-bottom: 8px;
    }

    .code-value {
      font-family: monospace;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 4px;
      color: var(--color-primary);
      padding: 16px;
      background: var(--color-bg);
      border-radius: var(--radius-sm);
      border: 2px solid var(--color-border);
    }

    .error-box {
      background: var(--color-error-bg);
      border: 1px solid var(--color-error);
      border-radius: var(--radius-sm);
      padding: 16px;
      margin-bottom: 24px;
      text-align: center;
    }

    .error-box p {
      color: var(--color-error);
      font-size: 14px;
    }

    .success-box {
      background: var(--color-success-bg);
      border: 1px solid var(--color-success);
      border-radius: var(--radius-sm);
      padding: 16px;
      margin-bottom: 24px;
      text-align: center;
    }

    .success-box h3 {
      color: var(--color-success);
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .success-box p {
      color: var(--color-success);
      font-size: 14px;
      opacity: 0.9;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 6px;
      color: var(--color-text);
    }

    .form-group input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 18px;
      font-family: monospace;
      text-align: center;
      letter-spacing: 4px;
      background: var(--color-surface);
      color: var(--color-text);
      transition: border-color 0.15s ease;
      text-transform: uppercase;
    }

    .form-group input:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .form-group input::placeholder {
      color: var(--color-text-muted);
      letter-spacing: 2px;
    }

    .button-group {
      display: flex;
      gap: 12px;
    }

    .btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 20px;
      border-radius: var(--radius-sm);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
      border: none;
    }

    .btn-primary {
      background: var(--color-primary);
      color: white;
    }

    .btn-primary:hover {
      background: var(--color-primary-hover);
    }

    .btn-danger {
      background: transparent;
      color: var(--color-danger);
      border: 1px solid var(--color-danger);
    }

    .btn-danger:hover {
      background: var(--color-danger);
      color: white;
    }

    .btn-secondary {
      background: var(--color-bg);
      color: var(--color-text);
      border: 1px solid var(--color-border);
    }

    .btn-secondary:hover {
      background: var(--color-border);
    }

    .warning-text {
      margin-top: 20px;
      padding: 12px;
      background: var(--color-bg);
      border-radius: var(--radius-sm);
      font-size: 13px;
      color: var(--color-text-muted);
      text-align: center;
    }

    .warning-text strong {
      color: var(--color-text);
    }

    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 12px;
      color: var(--color-text-muted);
    }

    .footer a {
      color: var(--color-primary);
      text-decoration: none;
    }

    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          Heartwood
        </h1>
      </div>

      ${
        userName
          ? `
      <div style="text-align: center;">
        <span class="user-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          ${escapeHtml(userName)}
        </span>
      </div>
      `
          : ""
      }

      ${renderContent(options)}

      <p class="footer">
        Powered by <a href="https://heartwood.grove.place" target="_blank">Heartwood</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function renderContent(options: DeviceAuthorizationPageOptions): string {
  const { userCode, clientName, error, showForm, authBaseUrl, success } =
    options;

  // Handle success states from redirect
  if (success === "approved") {
    return renderSuccess(
      "Device Authorized",
      "You can close this window and return to your CLI.",
    );
  }
  if (success === "denied") {
    return renderSuccess(
      "Authorization Denied",
      "The device authorization request was denied.",
    );
  }

  // Show error if present
  if (error) {
    return `
      <div class="error-box">
        <p>${escapeHtml(error)}</p>
      </div>
      ${renderCodeEntry(authBaseUrl)}
    `;
  }

  // Show authorization form if device code is valid
  if (showForm && userCode) {
    return renderAuthorizationForm(userCode, clientName, authBaseUrl);
  }

  // Default: show code entry form
  return renderCodeEntry(authBaseUrl);
}

function renderSuccess(title: string, message: string): string {
  return `
    <div class="success-box">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderCodeEntry(authBaseUrl: string): string {
  return `
    <p class="subtitle">Enter the code displayed on your device</p>
    <form action="${authBaseUrl}/auth/device" method="GET">
      <div class="form-group">
        <label for="user_code">Device Code</label>
        <input
          type="text"
          id="user_code"
          name="user_code"
          placeholder="XXXX-XXXX"
          maxlength="9"
          autocomplete="off"
          autocapitalize="characters"
          required
        />
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%;">
        Continue
      </button>
    </form>
  `;
}

function renderAuthorizationForm(
  userCode: string,
  clientName: string,
  authBaseUrl: string,
): string {
  return `
    <p class="subtitle">
      <span class="client-name">${escapeHtml(clientName)}</span> is requesting access to your account
    </p>

    <div class="code-display">
      <label>Confirm this is the code shown on your device</label>
      <div class="code-value">${escapeHtml(userCode)}</div>
    </div>

    <form action="${authBaseUrl}/auth/device/authorize" method="POST">
      <input type="hidden" name="user_code" value="${escapeHtml(userCode)}" />
      <div class="button-group">
        <button type="submit" name="action" value="deny" class="btn btn-danger">
          Deny
        </button>
        <button type="submit" name="action" value="approve" class="btn btn-primary">
          Approve
        </button>
      </div>
    </form>

    <p class="warning-text">
      <strong>Only approve if you initiated this request.</strong><br/>
      If you did not request this authorization, click Deny.
    </p>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
