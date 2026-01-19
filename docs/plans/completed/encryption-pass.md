# App-Layer Encryption Pass

**Created**: January 18, 2026
**Priority**: P1 (High - Pre-launch security requirement)
**Status**: Ready for Implementation
**Estimated Effort**: 4-6 hours

---

## Overview

Integrate the existing AES-256-GCM encryption module to encrypt sensitive tokens before D1 storage. The encryption infrastructure was added on January 17, 2026, and is fully tested but not yet wired into the application layer.

## Current State

### Encryption Module (Ready)

**Location**: `packages/engine/src/lib/server/encryption.ts`

```typescript
// Available functions
encryptToken(plaintext: string, keyHex: string): Promise<string>
decryptToken(encrypted: string, keyHex: string): Promise<string>
isEncryptedToken(value: string): boolean
safeDecryptToken(encrypted: string | null, keyHex: string | undefined): Promise<string | null>
```

**Features**:
- AES-256-GCM (authenticated encryption)
- Web Crypto API (Cloudflare Workers compatible)
- Random IV per encryption (same plaintext produces different ciphertext)
- Format: `base64(iv):base64(ciphertext)`
- Graceful migration via `safeDecryptToken()` - handles plaintext legacy tokens
- 31 comprehensive test cases

### Tokens Currently Stored Plaintext

| Token Type | Location | Table | Column |
|------------|----------|-------|--------|
| GitHub PAT | Journey Curio | `journey_config` | `github_token` |
| OpenRouter API Key | Journey Curio | `journey_config` | `openrouter_key` |

### Environment Secret Required

```bash
# 64 hex characters (256-bit key)
TOKEN_ENCRYPTION_KEY=<generate with: openssl rand -hex 32>
```

---

## Implementation Tasks

### Phase 1: Wire Encryption into Journey Curio

**File**: `packages/engine/src/routes/api/curios/journey/config/+server.ts`

#### Task 1.1: Add Encryption on Token Save (POST)

```typescript
// Line ~168 - Current TODO marker
import { encryptToken } from '$lib/server/encryption';

// Before INSERT/UPDATE, encrypt tokens
const encryptedGithubToken = githubToken
  ? await encryptToken(githubToken, platform.env.TOKEN_ENCRYPTION_KEY)
  : null;
const encryptedOpenrouterKey = openrouterKey
  ? await encryptToken(openrouterKey, platform.env.TOKEN_ENCRYPTION_KEY)
  : null;
```

#### Task 1.2: Add Decryption on Token Read (GET)

```typescript
import { safeDecryptToken } from '$lib/server/encryption';

// After SELECT, decrypt tokens
const decryptedGithubToken = await safeDecryptToken(
  row.github_token,
  platform.env.TOKEN_ENCRYPTION_KEY
);
```

#### Task 1.3: Update Validation Logic

Currently, tokens are validated via external API calls. Ensure validation happens on the **plaintext** before encryption:

```typescript
// Validate before encrypting
if (githubToken) {
  const isValid = await validateGithubToken(githubToken);
  if (!isValid) throw new Error('Invalid GitHub token');
}
const encrypted = await encryptToken(githubToken, key);
```

### Phase 2: Secret Configuration

#### Task 2.1: Add to Wrangler Config

**File**: `packages/engine/wrangler.toml`

```toml
[vars]
# Other vars...

# Secret (set via wrangler secret put TOKEN_ENCRYPTION_KEY)
# TOKEN_ENCRYPTION_KEY = "..." # Never commit!
```

#### Task 2.2: Document Secret Setup

**File**: Update `docs/setup/secrets.md` or create if missing

```markdown
## TOKEN_ENCRYPTION_KEY

Used for encrypting API tokens in D1 database.

**Generate**:
```bash
openssl rand -hex 32
```

**Set in production**:
```bash
cd packages/engine
wrangler secret put TOKEN_ENCRYPTION_KEY
```

**Local development**:
Add to `.dev.vars`:
```
TOKEN_ENCRYPTION_KEY=<your-key>
```
```

### Phase 3: Migration Strategy for Existing Data

If any production data exists with plaintext tokens:

#### Task 3.1: Create Migration Script

**File**: `packages/engine/scripts/migrate-encrypt-tokens.ts`

```typescript
/**
 * One-time migration to encrypt existing plaintext tokens.
 *
 * Run with: npx tsx packages/engine/scripts/migrate-encrypt-tokens.ts
 *
 * Note: This TypeScript migration script uses the D1 API to re-encrypt tokens.
 * safeDecryptToken() handles both encrypted and plaintext, so migration can
 * happen gradually with no downtime.
 */
```

#### Task 3.2: Verify Migration

After running migration:
1. Query a record
2. Verify it has `base64:base64` format
3. Verify decryption returns original plaintext

### Phase 4: Future Token Types (Deferred)

When adding new integrations, apply the same pattern:

| Future Integration | Encrypted Column |
|--------------------|------------------|
| OAuth refresh tokens | `refresh_token` |
| Webhook signing secrets | `webhook_secret` |
| Third-party API keys | `api_key` |

---

## Test Specification

### Migration Tests (New)

**File**: `packages/engine/src/lib/server/encryption.test.ts` (extend)

```typescript
describe('Migration Scenarios', () => {
  it('should handle mixed plaintext and encrypted tokens in same table', async () => {
    // Simulate gradual migration state
  });

  it('should gracefully handle corrupted/invalid encrypted data', async () => {
    // Return null, don't throw
  });

  it('should handle missing encryption key gracefully', async () => {
    // safeDecryptToken with undefined key returns null
  });
});
```

### Backward Compatibility Tests

```typescript
describe('Backward Compatibility', () => {
  it('should decrypt tokens encrypted with current format', async () => {});
  it('should return plaintext unchanged when not encrypted', async () => {});
  it('should detect encrypted vs plaintext via isEncryptedToken()', async () => {});
});
```

### Integration Tests

```typescript
describe('Journey Config Integration', () => {
  it('should encrypt token on POST and decrypt on GET', async () => {});
  it('should validate token before encryption', async () => {});
  it('should handle token deletion (__CLEAR__ value)', async () => {});
});
```

---

## Acceptance Criteria

- [ ] GitHub tokens encrypted before D1 storage
- [ ] OpenRouter keys encrypted before D1 storage
- [ ] `TOKEN_ENCRYPTION_KEY` documented in secrets guide
- [ ] Existing plaintext tokens automatically handled (graceful migration)
- [ ] Token validation happens on plaintext before encryption
- [ ] No tokens appear in logs (already verified in security audit)
- [ ] Tests pass for encrypt/decrypt round-trip
- [ ] Migration tests added for mixed plaintext/encrypted scenarios
- [ ] Backward compatibility tests verify graceful degradation
- [ ] Integration tests verify end-to-end flow

---

## Security Notes

### 1. Single-Key Architecture (Multi-Tenant Decision)

**Decision**: Use a single `TOKEN_ENCRYPTION_KEY` for all tenants.

**Rationale**:
- Simplifies key management and rotation
- D1 already provides tenant isolation at the row level
- Per-tenant keys would require key-per-tenant storage, complicating backup/restore
- Tokens are already scoped to tenant via foreign keys

**Trade-offs**:
- Single point of compromise (mitigated by Cloudflare Secrets security)
- Key rotation affects all tenants simultaneously

**Alternative considered**: Per-tenant keys stored in KV (`TENANT_KEY_{id}`). Rejected due to complexity and limited benefit given existing tenant isolation.

### 2. Key Storage

Use Cloudflare Secrets (`wrangler secret put`), never environment variables in wrangler.toml.

### 3. Key Rotation Procedure (Manual)

When key rotation is needed (compromise suspected, compliance requirement):

```bash
# 1. Generate new key
NEW_KEY=$(openssl rand -hex 32)

# 2. Create rotation script
cat > rotate-keys.ts << 'EOF'
// Decrypt with old key, re-encrypt with new key
const rows = await db.prepare('SELECT id, github_token, openrouter_key FROM journey_config').all();
for (const row of rows.results) {
  const github = await safeDecryptToken(row.github_token, OLD_KEY);
  const openrouter = await safeDecryptToken(row.openrouter_key, OLD_KEY);

  const newGithub = github ? await encryptToken(github, NEW_KEY) : null;
  const newOpenrouter = openrouter ? await encryptToken(openrouter, NEW_KEY) : null;

  await db.prepare('UPDATE journey_config SET github_token = ?, openrouter_key = ? WHERE id = ?')
    .bind(newGithub, newOpenrouter, row.id).run();
}
EOF

# 3. Run rotation during maintenance window
# 4. Update secret: wrangler secret put TOKEN_ENCRYPTION_KEY
# 5. Verify decryption works with new key
# 6. Securely delete old key from any backups/notes
```

**Estimated downtime**: < 5 minutes for typical dataset.

### 4. Backup Considerations

D1 backups will contain encrypted blobs, which is safe. Restore requires the same encryption key. Document which key version was active at backup time.

### 5. IV Security

The module uses `crypto.getRandomValues()` for IV generation (12 bytes per encryption). Test coverage verifies same plaintext produces different ciphertext.

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/engine/src/routes/api/curios/journey/config/+server.ts` | Add encrypt/decrypt calls |
| `packages/engine/wrangler.toml` | Document secret requirement |
| `docs/setup/secrets.md` | Add TOKEN_ENCRYPTION_KEY docs |
| `.dev.vars.example` | Add example for local dev |

---

## Related Documents

- Security documentation: `packages/engine/src/lib/curios/journey/SECURITY.md`
- Encryption module: `packages/engine/src/lib/server/encryption.ts`
- Encryption tests: `packages/engine/src/lib/server/encryption.test.ts`
