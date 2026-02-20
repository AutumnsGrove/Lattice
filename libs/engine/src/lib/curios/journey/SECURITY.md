# Journey Curio Security Notes

## Token Storage

### Current State: Encrypted at Rest

API tokens (`github_token`, `openrouter_key`) are **encrypted using AES-256-GCM** before storage in the D1 database. This encryption was implemented in PR #400.

**Encryption details:**

- Algorithm: AES-256-GCM (authenticated encryption)
- Key: 256-bit (64 hex characters) via `TOKEN_ENCRYPTION_KEY` environment variable
- IV: 12 bytes, randomly generated per encryption
- Format: `v1:base64(iv):base64(ciphertext)`

The `v1:` prefix enables future algorithm changes without breaking existing data.

### Security Measures

1. **Tokens never exposed via API**: GET /config returns `hasGithubToken: boolean` instead of the actual token
2. **Token deletion supported**: Send `"__CLEAR__"` to explicitly delete tokens
3. **Tenant isolation**: All queries are scoped to `tenant_id`
4. **Cascade delete**: Tokens are deleted when tenant is removed
5. **Zero-downtime migration**: `safeDecryptToken` handles both encrypted and legacy plaintext tokens
6. **Tamper detection**: GCM mode validates integrity (corrupted ciphertext returns null)

### Key Management

For setup and key rotation procedures, see:

- `docs/security/token-encryption.md` - Complete encryption guide

**Critical:** If `TOKEN_ENCRYPTION_KEY` is lost, encrypted tokens become unrecoverable. Users would need to re-enter their tokens.

### Graceful Degradation

If `TOKEN_ENCRYPTION_KEY` is not set:

- Tokens are stored as plaintext (with console warning)
- Existing tokens continue to work
- On next config save, tokens will be encrypted (if key is then set)

This enables zero-downtime migration from plaintext to encrypted storage.

## Related Files

- `docs/security/token-encryption.md` - Key setup, rotation, troubleshooting
- `libs/engine/src/lib/server/encryption.ts` - Encryption implementation
- `libs/engine/src/lib/server/encryption.test.ts` - Unit tests (35 tests)
- `libs/engine/src/lib/server/encryption.integration.test.ts` - Integration tests (21 tests)
- `libs/engine/migrations/025_journey_curio.sql` - Schema definition
- `libs/engine/src/routes/api/curios/journey/config/+server.ts` - Token handling
- `libs/engine/src/lib/curios/journey/index.ts` - `CLEAR_TOKEN_VALUE` constant
