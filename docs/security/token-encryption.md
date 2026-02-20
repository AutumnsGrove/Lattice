# Token Encryption Guide

Grove encrypts sensitive API tokens (GitHub, OpenRouter, etc.) at rest using AES-256-GCM. This document covers setup, key management, and rotation procedures.

## Overview

**What's encrypted:**

- GitHub Personal Access Tokens (Journey, Timeline curios)
- OpenRouter API keys (Timeline curio)
- Any future sensitive credentials stored in D1

**Encryption details:**

- Algorithm: AES-256-GCM (authenticated encryption)
- Key: 256-bit (64 hex characters)
- IV: 12 bytes, randomly generated per encryption
- Format: `v1:base64(iv):base64(ciphertext)`

The `v1:` prefix allows future algorithm changes without breaking existing data.

---

## Setup

### 1. Generate an Encryption Key

```bash
openssl rand -hex 32
```

This outputs a 64-character hex string like:

```
a1b2c3d4e5f6...  (64 characters total)
```

**Keep this key safe.** If you lose it, encrypted tokens become unrecoverable.

### 2. Add to Local Development

Create or edit `libs/engine/.dev.vars`:

```env
TOKEN_ENCRYPTION_KEY=your_64_character_hex_key_here
```

This file is gitignored and should never be committed.

### 3. Add to Production (Cloudflare)

1. Open [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to: Workers & Pages → grove-engine → Settings → Variables
3. Add a new variable:
   - **Name:** `TOKEN_ENCRYPTION_KEY`
   - **Value:** Your 64-character hex key
4. Click **Encrypt** to store it as a secret
5. Deploy your worker

Repeat for any other environments (staging, preview).

---

## How It Works

### Encryption (on save)

When a user saves their config with API tokens:

```
User enters: ghp_abc123...
     ↓
encryptToken(plaintext, key)
     ↓
Stored in D1: v1:randomIV:encryptedData
```

### Decryption (on use)

When Grove needs to call an external API:

```
Read from D1: v1:randomIV:encryptedData
     ↓
safeDecryptToken(encrypted, key)
     ↓
API call with: ghp_abc123...
```

### Migration Support

`safeDecryptToken` handles both encrypted and plaintext tokens:

- If token starts with `v1:` → decrypt it
- If token is plaintext → return as-is (legacy)

This allows zero-downtime migration. Old plaintext tokens work immediately and get encrypted on next config save.

---

## Key Rotation

**When to rotate:**

- Key may have been exposed
- Regular security policy (e.g., annual rotation)
- Employee with key access leaves

### Rotation Procedure

Key rotation requires re-encrypting all tokens. There's no automatic process—it must be done manually.

**Step 1: Generate new key**

```bash
openssl rand -hex 32
# Save this as NEW_KEY
```

**Step 2: Export current tokens (with old key)**

Run this in Cloudflare Workers console or a migration script:

```typescript
// Pseudocode - adapt to your migration approach
const OLD_KEY = "current_key_here";
const NEW_KEY = "new_key_here";

// For each config table with encrypted tokens:
const configs = await db.prepare("SELECT * FROM timeline_curio_config").all();

for (const config of configs.results) {
	// Decrypt with old key
	const githubToken = await safeDecryptToken(config.github_token_encrypted, OLD_KEY);
	const openrouterKey = await safeDecryptToken(config.openrouter_key_encrypted, OLD_KEY);

	// Re-encrypt with new key
	const newGithubToken = githubToken ? await encryptToken(githubToken, NEW_KEY) : null;
	const newOpenrouterKey = openrouterKey ? await encryptToken(openrouterKey, NEW_KEY) : null;

	// Update database
	await db
		.prepare(
			`
    UPDATE timeline_curio_config
    SET github_token_encrypted = ?, openrouter_key_encrypted = ?
    WHERE tenant_id = ?
  `,
		)
		.bind(newGithubToken, newOpenrouterKey, config.tenant_id)
		.run();
}
```

**Step 3: Update secrets**

1. Update `TOKEN_ENCRYPTION_KEY` in Cloudflare Dashboard
2. Update `.dev.vars` locally
3. Deploy

**Step 4: Verify**

- Test that existing configs still work
- Check logs for decryption failures

### Emergency Key Change

If you change `TOKEN_ENCRYPTION_KEY` without re-encrypting:

- All encrypted tokens become undecryptable
- `safeDecryptToken` returns `null`
- API calls to GitHub/OpenRouter fail
- Users must re-enter their tokens

This is disruptive but not catastrophic—no data is permanently lost, just inaccessible until users re-configure.

---

## Database Schema

Columns storing encrypted tokens use the `_encrypted` suffix to indicate they should contain encrypted data (or plaintext during migration):

| Table                   | Column                     | Contents           |
| ----------------------- | -------------------------- | ------------------ |
| `timeline_curio_config` | `github_token_encrypted`   | GitHub PAT         |
| `timeline_curio_config` | `openrouter_key_encrypted` | OpenRouter API key |
| `journey_curio_config`  | `github_token_encrypted`   | GitHub PAT         |
| `journey_curio_config`  | `openrouter_key_encrypted` | OpenRouter API key |
| `git_dashboard_config`  | `github_token_encrypted`   | GitHub PAT         |

**Note:** During migration, these columns may temporarily hold plaintext. The `_encrypted` suffix means "should be encrypted" not "is encrypted."

---

## Troubleshooting

### "Failed to decrypt GitHub token"

**Cause:** Token is encrypted but key is missing or wrong.

**Fix:**

1. Verify `TOKEN_ENCRYPTION_KEY` is set in environment
2. Verify it's the same key used to encrypt
3. If key was changed, user must re-enter their token

### Tokens work locally but not in production

**Cause:** Different encryption keys between environments.

**Fix:** Each environment needs its own key, OR use the same key everywhere. If you use different keys, tokens encrypted in one environment won't decrypt in another.

### User says "my token stopped working"

**Cause:** Either the token expired/was revoked on GitHub's side, or the encryption key changed.

**Diagnosis:**

1. Check if `TOKEN_ENCRYPTION_KEY` was recently changed
2. Ask user to re-enter their token (will encrypt with current key)

---

## Security Considerations

### What's Protected

- **At rest:** Tokens in D1 are encrypted
- **In transit:** HTTPS (Cloudflare handles this)
- **In memory:** Briefly decrypted for API calls, then discarded

### What's NOT Protected

- **If key is compromised:** Attacker with key + DB access can decrypt
- **If Worker is compromised:** Code has access to decrypted tokens
- **Cloudflare staff:** Theoretical access to Worker memory during execution

### Best Practices

1. **Limit key access** — Only those who need it for deployment
2. **Rotate regularly** — Annual rotation at minimum
3. **Audit key usage** — Track who has accessed the key
4. **Use separate keys per environment** — Production key should differ from staging/dev
5. **Never log tokens** — Encrypted or plaintext, keep them out of logs
