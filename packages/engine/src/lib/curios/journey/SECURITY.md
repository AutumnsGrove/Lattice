# Journey Curio Security Notes

## Token Storage

### Current State (Alpha/Beta)

API tokens (`github_token`, `openrouter_key`) are currently stored as **plaintext** in the D1 database. This is acceptable for alpha/beta testing but **MUST be addressed before production**.

### Mitigation Measures in Place

1. **Tokens never exposed via API**: GET /config returns `hasGithubToken: boolean` instead of the actual token
2. **Token deletion supported**: Send `"__CLEAR__"` to explicitly delete tokens
3. **Tenant isolation**: All queries are scoped to tenant_id
4. **Cascade delete**: Tokens are deleted when tenant is removed

### Production Encryption Plan

Before production deployment, implement one of these approaches:

#### Option 1: Cloudflare Workers Secrets (Recommended)

Store tokens in Cloudflare Workers secrets with tenant-scoped naming:

```typescript
// Store: wrangler secret put JOURNEY_TOKEN_tenant123
// Retrieve: env.JOURNEY_TOKEN_tenant123
```

Pros:
- Managed by Cloudflare infrastructure
- No encryption code to maintain
- Automatic rotation support

Cons:
- Limited to 1MB per secret
- Requires secret per tenant (may hit limits at scale)

#### Option 2: Application-Layer Encryption

Encrypt tokens using AES-256-GCM before storing in D1:

```typescript
// packages/engine/src/lib/server/encryption.ts
import { webcrypto } from 'crypto';

const ENCRYPTION_KEY = env.TOKEN_ENCRYPTION_KEY; // 256-bit key

export async function encryptToken(plaintext: string): Promise<string> {
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const key = await importKey(ENCRYPTION_KEY);
  const ciphertext = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return `${base64(iv)}:${base64(ciphertext)}`;
}

export async function decryptToken(encrypted: string): Promise<string> {
  const [ivStr, ciphertextStr] = encrypted.split(':');
  const iv = fromBase64(ivStr);
  const ciphertext = fromBase64(ciphertextStr);
  const key = await importKey(ENCRYPTION_KEY);
  const plaintext = await webcrypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new TextDecoder().decode(plaintext);
}
```

Pros:
- Works with existing D1 storage
- No per-tenant limits
- Single encryption key to manage

Cons:
- Key rotation requires re-encryption of all tokens
- Additional code to maintain

#### Migration Steps

1. Add encryption functions to `$lib/server/encryption.ts`
2. Update config endpoint to encrypt on write, decrypt on read
3. Create migration script to encrypt existing plaintext tokens
4. Update column comments to reflect encrypted state
5. Remove plaintext TODO comments

### Timeline

| Phase | Status | Target |
|-------|--------|--------|
| Alpha | Current | Plaintext acceptable |
| Beta | Planned | Implement encryption |
| Production | Required | Must be encrypted |

## Related Files

- `packages/engine/migrations/025_journey_curio.sql` - Schema with TODO comments
- `packages/engine/src/routes/api/curios/journey/config/+server.ts` - Token handling
- `packages/engine/src/lib/curios/journey/index.ts` - CLEAR_TOKEN_VALUE constant
