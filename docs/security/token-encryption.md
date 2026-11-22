# Token Encryption

Grove encrypts sensitive credentials at rest — GitHub tokens, OpenRouter keys, provider keys an agent needs — with AES-256-GCM, using **envelope encryption**: one key encryption key (KEK), a separate data key per tenant, and ciphertext underneath.

This document covers how it works and how to rotate it. It replaces the old single-key scheme; see [What changed](#what-changed) at the bottom.

## The shape of it

```
GROVE_KEK (env secret, 64 hex chars)
    └── encrypts → tenants.encrypted_dek   (one per tenant)
                        └── encrypts → tenant_secrets.encrypted_value   (one per key name)
```

- **KEK** — one 64-hex-character secret, set per worker (`GROVE_KEK`). It never appears in D1 or in code.
- **DEK** — generated per tenant on first write, stored **encrypted** in `tenants.encrypted_dek`. One tenant's compromise does not reach another's.
- **Secret** — the token itself, encrypted with that tenant's DEK, in `tenant_secrets` (`tenant_id`, `key_name`, `encrypted_value`).

Ciphertext format is `v1:base64(iv):base64(ciphertext)`. The `v1:` prefix leaves room for an algorithm change without a data migration.

Everything lives in `@autumnsgrove/grove-crypto`:

| Entry point | What it is |
| --- | --- |
| `createSecretsManager({ DB, GROVE_KEK })` | The way in. Throws if the KEK is missing — refusing to store a secret is better than storing it weakly |
| `secrets.setSecret(tenantId, keyName, value)` | Encrypt under the tenant DEK, creating the DEK if needed |
| `secrets.safeGetSecret(tenantId, keyName)` | Decrypt, returning `null` rather than throwing |
| `secrets.hasSecret` / `deleteSecret` / `listSecrets` | The rest of the lifecycle |
| `secrets.rotateTenantDEK(tenantId)` | Re-encrypt every secret for one tenant under a fresh DEK |

## Setup

One secret per worker that stores or reads tenant secrets — Aspen, Timeline Sync, and anything else with `tenant_secrets` access:

```bash
openssl rand -hex 32          # 64 hex characters
gw secret apply GROVE_KEK --worker grove-aspen --write
```

Locally, `GROVE_KEK` in `apps/aspen/.dev.vars` (gitignored). **Losing it makes every encrypted secret unrecoverable** — the DEKs are only readable through it.

## Rotation

**Rotate a tenant's DEK** when you want to invalidate what was encrypted for that tenant. This decrypts and re-encrypts each secret under a new DEK; the KEK is untouched.

```ts
const result = await secrets.rotateTenantDEK(tenantId);
// { rotated: <number of secrets> }
```

**Rotate the KEK** means re-encrypting the DEKs: `migrateDEKEncryption(oldKeyHex)` re-wraps every `tenants.encrypted_dek` under the new KEK. Because it only touches DEKs, it is small and fast regardless of how many secrets exist.

Order matters: write the new `GROVE_KEK`, run the migration, then remove the old key. Never run the migration twice against a half-set key.

## What changed

Before #1475, tokens were encrypted with a single shared `TOKEN_ENCRYPTION_KEY` and stored in per-feature columns (`timeline_curio_config.github_token_encrypted`, and the same idea in the old git dashboard). That key is gone: it was not set on any production worker, no legacy `v1:` ciphertext remained in either database, and the columns are now always cleared on save rather than written.

Two consequences worth knowing when reading older code or plans:

- `timeline_curio_config.github_token_encrypted` and `openrouter_key_encrypted` still exist in the schema (dropping columns is a rebuild), but nothing writes them.
- `libs/engine/scripts/migrate-to-envelope.ts` is the one-off script that moved data from the old key to envelopes. It is history, like a migration file — it is not run any more.
