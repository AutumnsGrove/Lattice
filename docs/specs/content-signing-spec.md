---
aliases: []
date created: Sunday, February 22nd 2026
date modified: Sunday, February 22nd 2026
tags:
  - security
  - cryptography
  - content-integrity
  - provenance
type: tech-spec
lastUpdated: "2026-02-22"
---

```
                        ╭───────────────╮
                        │  ┌─────────┐  │
                        │  │  POST   │  │
                        │  │ content │  │
                        │  │  ····   │  │
                        │  └────┬────┘  │
                        │       │       │
                        │    ╭──┴──╮    │
                        │    │ 🔑  │    │
                        │    ╰──┬──╯    │
                        │       │       │
                        │  ┌────┴────┐  │
                        │  │ Ed25519 │  │
                        │  │  sig    │  │
                        │  └────┬────┘  │
                        ╰───────┼───────╯
                                │
                         ╭──────┴──────╮
                         │   ✓ human   │
                         │   ✓ signed  │
                         │   ✓ yours   │
                         ╰─────────────╯

            Your words carry your name. Always.
```

> _Your words carry your name. Always._

# Content Signing: Authorship Verification and Provenance

> _Your words carry your name. Always._

Content signing gives every published post a cryptographic signature that proves who wrote it, when they wrote it, and whether AI helped. In a world where generated text floods the web, Grove posts carry receipts. The signature travels with the content. Export it, move it, verify it anywhere.

**Public Name:** Content Signing
**Internal Name:** GroveContentSigning
**Package:** `@autumnsgrove/lattice/signing`
**Location:** `libs/engine/src/lib/signing/`
**Verification Service:** `verify.grove.place`
**Last Updated:** February 2026

A wax seal on a letter. A signature on a painting. These don't prevent forgery, but they establish provenance. They say: this came from here, at this time, and the person who made it stands behind it. Content signing does the same for words on the internet.

---

## Overview

### What This Is

A system that signs every published Grove post with an Ed25519 digital signature. Each Wanderer gets a signing keypair. When they publish, the post content gets hashed and signed. Anyone with the public key can verify the signature. A public verification service at `verify.grove.place` makes this accessible to non-technical readers.

### Goals

- Prove authorship: this Wanderer wrote this post
- Prove timing: this post existed at this timestamp
- Prove AI transparency: this post was (or was not) written with Fireside
- Make verification accessible through `verify.grove.place`
- Include signatures in `.grove` exports for portable verification
- Work with Shade's existing content protection layers

### Non-Goals (Out of Scope)

- Preventing content from being copied (signing proves origin, it doesn't prevent copying)
- Building a blockchain or decentralized identity system
- Replacing Shade's crawler protections
- Signing media files (images, audio). Posts only, for now.
- Cross-platform signature federation (other platforms verifying Grove signatures is a nice-to-have, not a requirement)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Publication Flow                               │
└─────────────────────────────────────────────────────────────────────┘

  Wanderer writes post
        │
        ▼
  Post saved as draft (no signature yet)
        │
        ▼
  Wanderer clicks "Publish"
        │
        ▼
  ┌──────────────────────────────┐
  │  Signing Service             │
  │                              │
  │  1. Build canonical content  │
  │  2. Add metadata envelope    │
  │  3. Sign with Ed25519        │
  │  4. Store signature on post  │
  └──────────────┬───────────────┘
                 │
        ┌────────┼────────┐
        ▼        ▼        ▼
   ┌────────┐ ┌────────┐ ┌─────────────────────┐
   │  Post  │ │ .grove │ │  .well-known/       │
   │  (D1)  │ │ export │ │  grove-signing.json │
   └────────┘ └────────┘ └─────────────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │ verify.grove.place│
                          │                  │
                          │  paste URL or    │
                          │  .grove file     │
                          │  → verified ✓    │
                          └──────────────────┘
```

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Algorithm | Ed25519 | Fast, small signatures (64 bytes), well-supported in Web Crypto API |
| Key Storage | D1 (encrypted) | Per-tenant keypairs, encrypted at rest via envelope encryption |
| Signature Storage | D1 (posts table) | Signature stored alongside post content |
| Verification | verify.grove.place | Lightweight Cloudflare Worker + static UI |
| Export Format | .grove extension | Signatures included in existing export format |

---

## Signing Model

### What Gets Signed

The signature covers a **canonical content envelope**, not raw HTML. This ensures the signature stays valid even if rendering changes.

```typescript
interface SigningEnvelope {
  // Content
  slug: string;
  title: string;
  markdown: string;          // Raw markdown, not HTML

  // Author
  tenantId: string;
  subdomain: string;

  // Timing
  publishedAt: string;       // ISO 8601
  signedAt: string;          // ISO 8601

  // Authorship disclosure
  authorship: AuthorshipType;

  // Version (for future envelope changes)
  envelopeVersion: 1;
}

type AuthorshipType =
  | "human"                   // Written entirely by the Wanderer
  | "ai-assisted"             // Drafted via Fireside with Wisp
  | "ai-generated";           // Reserved for future AI content types
```

### Canonical Form

Before signing, the envelope gets serialized to a deterministic JSON string. No whitespace ambiguity.

```typescript
function canonicalize(envelope: SigningEnvelope): string {
  // Sort keys alphabetically, no whitespace
  return JSON.stringify(envelope, Object.keys(envelope).sort());
}
```

### Authorship Detection

The `authorship` field is determined automatically:

```
Post has fireside_assisted = 1?
    │
    ├── YES → authorship: "ai-assisted"
    │
    └── NO  → authorship: "human"
```

This integrates with the existing `fireside_assisted` column from migration 027. The `~ written fireside with Wisp ~` marker in the rendered post and the `ai-assisted` field in the signature work together. Both are permanent, enforced at the API level, and cannot be removed.

---

## Key Management

### Per-Tenant Keypairs

Each tenant (Grove site) gets its own Ed25519 keypair. Generated on first publish. Stored encrypted in D1.

```typescript
interface SigningKeypair {
  id: string;               // "key_" + ulid
  tenantId: string;
  publicKey: string;         // Base64-encoded Ed25519 public key
  encryptedPrivateKey: string; // Encrypted with tenant's DEK (envelope encryption)
  algorithm: "Ed25519";
  status: "active" | "rotated" | "revoked";
  createdAt: string;         // ISO 8601
  rotatedAt: string | null;
  revokedAt: string | null;
}
```

### Key Generation

```typescript
async function generateSigningKeypair(tenantId: string): Promise<SigningKeypair> {
  const keypair = await crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,  // extractable
    ["sign", "verify"]
  );

  const publicKeyRaw = await crypto.subtle.exportKey("raw", keypair.publicKey);
  const privateKeyRaw = await crypto.subtle.exportKey("pkcs8", keypair.privateKey);

  // Encrypt private key with tenant's DEK (existing envelope encryption via SecretsManager)
  const encryptedPrivateKey = await encryptWithDEK(tenantId, privateKeyRaw);

  return {
    id: `key_${ulid()}`,
    tenantId,
    publicKey: base64Encode(publicKeyRaw),
    encryptedPrivateKey,
    algorithm: "Ed25519",
    status: "active",
    createdAt: new Date().toISOString(),
    rotatedAt: null,
    revokedAt: null,
  };
}
```

### Key Rotation

Keys rotate on a yearly schedule or on demand. Old keys stay in `rotated` status for verification of previously signed content.

```
Active Key (2026)          Rotated Key (2025)
    │                           │
    │  signs new posts          │  verifies old posts
    │                           │  cannot sign new posts
    ▼                           ▼
```

Rotation flow:
1. Generate new keypair
2. Mark old key as `rotated`
3. New posts use new key
4. Old signatures stay valid (public key still available)

---

## Database Schema

```sql
-- Signing keypairs (per-tenant)
CREATE TABLE IF NOT EXISTS signing_keys (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  public_key TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'Ed25519',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'rotated', 'revoked')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  rotated_at INTEGER,
  revoked_at INTEGER,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_signing_keys_tenant
  ON signing_keys(tenant_id, status);

-- Post signature fields (added to existing posts table)
ALTER TABLE posts ADD COLUMN content_signature TEXT;
ALTER TABLE posts ADD COLUMN signature_key_id TEXT;
ALTER TABLE posts ADD COLUMN signed_at INTEGER;
ALTER TABLE posts ADD COLUMN authorship TEXT DEFAULT 'human'
  CHECK (authorship IN ('human', 'ai-assisted', 'ai-generated'));

CREATE INDEX idx_posts_signed
  ON posts(content_signature)
  WHERE content_signature IS NOT NULL;
```

---

## Public Key Discovery

### .well-known Endpoint

Each Grove site publishes its signing keys at a well-known URL. This follows the same pattern as the existing `security.txt` endpoint.

**URL:** `https://{subdomain}.grove.place/.well-known/grove-signing.json`

```json
{
  "version": 1,
  "subdomain": "autumn",
  "algorithm": "Ed25519",
  "keys": [
    {
      "id": "key_01JMABCDEF",
      "publicKey": "MCowBQYDK2VwAyEA...",
      "status": "active",
      "createdAt": "2026-01-15T00:00:00.000Z",
      "rotatedAt": null
    },
    {
      "id": "key_01JKXYZ123",
      "publicKey": "MCowBQYDK2VwAyEA...",
      "status": "rotated",
      "createdAt": "2025-01-15T00:00:00.000Z",
      "rotatedAt": "2026-01-15T00:00:00.000Z"
    }
  ],
  "verificationUrl": "https://verify.grove.place",
  "policy": "https://grove.place/policies/content-signing"
}
```

**Cache:** `public, max-age=3600` (1 hour). Keys don't change often.

### Implementation

```typescript
// In engine: src/routes/.well-known/grove-signing.json/+server.ts
export const GET: RequestHandler = async ({ locals, platform }) => {
  const keys = await getSigningKeys(platform.env.DB, locals.tenantId);

  return json({
    version: 1,
    subdomain: locals.subdomain,
    algorithm: "Ed25519",
    keys: keys.map(k => ({
      id: k.id,
      publicKey: k.publicKey,
      status: k.status,
      createdAt: new Date(k.createdAt * 1000).toISOString(),
      rotatedAt: k.rotatedAt ? new Date(k.rotatedAt * 1000).toISOString() : null,
    })),
    verificationUrl: "https://verify.grove.place",
    policy: "https://grove.place/policies/content-signing",
  }, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
};
```

---

## Signing Flow

### On Publish

```
Wanderer clicks "Publish"
    │
    ▼
Engine API: POST /api/posts/{id}/publish
    │
    ▼
Fetch active signing key for tenant
    │
    ├── No key? Generate one.
    │
    ▼
Build SigningEnvelope
    │
    ├── slug, title, markdown (from post)
    ├── tenantId, subdomain (from context)
    ├── publishedAt (now)
    ├── signedAt (now)
    ├── authorship (from fireside_assisted flag)
    │
    ▼
Canonicalize envelope → deterministic JSON string
    │
    ▼
Decrypt private key (envelope encryption via SecretsManager)
    │
    ▼
Ed25519 sign(canonical, privateKey)
    │
    ▼
Store on post:
    content_signature = base64(signature)
    signature_key_id = key.id
    signed_at = now
    authorship = detected value
```

### On Update

When a published post is edited and re-published, it gets re-signed. The new signature replaces the old one. The `signedAt` timestamp updates. The content changed, so the old signature is no longer valid for the new content.

### Implementation

```typescript
async function signPost(
  post: Post,
  tenant: Tenant,
  db: D1Database,
): Promise<PostSignature> {
  // Get or create active signing key
  let key = await getActiveSigningKey(db, tenant.id);
  if (!key) {
    key = await generateSigningKeypair(tenant.id);
    await storeSigningKey(db, key);
  }

  // Build envelope
  const envelope: SigningEnvelope = {
    slug: post.slug,
    title: post.title,
    markdown: post.markdown_content,
    tenantId: tenant.id,
    subdomain: tenant.subdomain,
    publishedAt: new Date(post.published_at * 1000).toISOString(),
    signedAt: new Date().toISOString(),
    authorship: post.fireside_assisted ? "ai-assisted" : "human",
    envelopeVersion: 1,
  };

  // Canonicalize
  const canonical = canonicalize(envelope);
  const encoded = new TextEncoder().encode(canonical);

  // Decrypt private key
  const privateKeyRaw = await decryptWithDEK(tenant.id, key.encryptedPrivateKey);
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyRaw,
    { name: "Ed25519" },
    false,
    ["sign"]
  );

  // Sign
  const signature = await crypto.subtle.sign("Ed25519", privateKey, encoded);

  return {
    contentSignature: base64Encode(signature),
    signatureKeyId: key.id,
    signedAt: Math.floor(Date.now() / 1000),
    authorship: envelope.authorship,
  };
}
```

---

## Verification

### verify.grove.place

A lightweight Cloudflare Worker with a static UI. Visitors paste a Grove post URL or upload a `.grove` file. The service fetches the post, fetches the signing key, and verifies the signature.

```
┌─────────────────────────────────────────────────────────────────┐
│  verify.grove.place                                              │
│                                                                  │
│  ┌─ Verify a Post ─────────────────────────────────────────┐    │
│  │                                                          │    │
│  │  Paste a Grove post URL:                                 │    │
│  │  ┌────────────────────────────────────────────────────┐  │    │
│  │  │ https://autumn.grove.place/hello-world         [↵] │  │    │
│  │  └────────────────────────────────────────────────────┘  │    │
│  │                                                          │    │
│  │  ── or ──                                                │    │
│  │                                                          │    │
│  │  Upload a .grove file:  [ Choose File ]                  │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─ Result ─────────────────────────────────────────────────┐   │
│  │                                                           │   │
│  │  ✓ Signature Valid                                        │   │
│  │                                                           │   │
│  │  Author:     autumn.grove.place                           │   │
│  │  Published:  February 22, 2026                            │   │
│  │  Signed:     February 22, 2026 at 3:45 PM                │   │
│  │  Authorship: Human                                        │   │
│  │  Key ID:     key_01JMABCDEF                               │   │
│  │                                                           │   │
│  │  This post was written by a human and cryptographically   │   │
│  │  signed by its author.                                    │   │
│  │                                                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ───────────────────────────────────────────────────────────     │
│  What is content signing?  ·  How it works  ·  grove.place      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Verification Flow

```
User submits URL
    │
    ▼
Worker fetches post metadata
    │
    ├── GET {url} with Accept: application/json
    │   (engine returns post data with signature fields)
    │
    ▼
Worker fetches signing keys
    │
    ├── GET {subdomain}.grove.place/.well-known/grove-signing.json
    │
    ▼
Find matching key by signature_key_id
    │
    ├── Not found? → "Key not found. Signature cannot be verified."
    │
    ▼
Rebuild canonical envelope from post data
    │
    ▼
Ed25519 verify(signature, canonical, publicKey)
    │
    ├── Valid?   → ✓ "Signature verified. This post is authentic."
    └── Invalid? → ✗ "Signature does not match. Content may have been modified."
```

### Verification API

```typescript
// POST /api/verify
interface VerifyRequest {
  url?: string;          // Grove post URL
  groveFile?: string;    // Base64 .grove file contents
}

interface VerifyResponse {
  valid: boolean;
  author: string;         // subdomain
  publishedAt: string;
  signedAt: string;
  authorship: AuthorshipType;
  keyId: string;
  message: string;        // Human-readable result
}
```

### Verification from .grove Exports

The `.grove` export format already includes SHA256 checksums. Content signatures extend this with per-post signing data.

In the `.grove` archive's `content-index.json`:

```json
{
  "posts": [
    {
      "slug": "hello-world",
      "title": "Hello World",
      "file": "posts/hello-world.md",
      "signature": {
        "contentSignature": "abc123...",
        "signatureKeyId": "key_01JMABCDEF",
        "signedAt": "2026-02-22T15:45:00.000Z",
        "authorship": "human",
        "algorithm": "Ed25519"
      }
    }
  ]
}
```

The `verify.grove.place` service can verify signatures from uploaded `.grove` files without needing network access to the original site.

---

## Authorship Display

### On the Post Page

Published posts with valid signatures display a subtle authorship badge:

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  Hello World                                                 │
│  ─────────────────────────────────────────────               │
│  February 22, 2026 · 5 min read                             │
│                                                              │
│  [Post content here...]                                      │
│                                                              │
│  ─────────────────────────────────────────────               │
│                                                              │
│  ✓ Signed · Human · Verify ↗                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

For Fireside-assisted posts:

```
│  ✓ Signed · AI-Assisted · ~ written fireside with Wisp ~ · Verify ↗  │
```

The "Verify" link opens `verify.grove.place/?url={post_url}`.

### Badge Variations

| Authorship | Badge | Meaning |
|-----------|-------|---------|
| `human` | ✓ Signed · Human | Written entirely by the Wanderer |
| `ai-assisted` | ✓ Signed · AI-Assisted | Drafted via Fireside with Wisp |
| Unsigned | (no badge) | Posts from before signing was enabled |

---

## Signpost Error Catalog

Content signing uses the `SIGN` prefix.

```typescript
export const SIGN_ERRORS = {
  // Infrastructure (001-019)
  KEY_GENERATION_FAILED: {
    code: "SIGN-001",
    category: "bug" as const,
    userMessage: "We had trouble setting up content signing for your site.",
    adminMessage: "Ed25519 keypair generation failed. Check Web Crypto API availability.",
  },
  KEY_NOT_FOUND: {
    code: "SIGN-002",
    category: "bug" as const,
    userMessage: "We couldn't find the signing key for this site.",
    adminMessage: "No active signing key found for tenant. Check signing_keys table.",
  },
  KEY_DECRYPTION_FAILED: {
    code: "SIGN-003",
    category: "bug" as const,
    userMessage: "We had trouble signing your post. Please try again.",
    adminMessage: "Private key decryption failed. Check DEK/KEK configuration.",
  },

  // Business Logic (040-059)
  SIGNING_FAILED: {
    code: "SIGN-040",
    category: "bug" as const,
    userMessage: "We couldn't sign your post. It's still published, just unsigned.",
    adminMessage: "Ed25519 sign operation failed.",
  },
  VERIFICATION_FAILED: {
    code: "SIGN-041",
    category: "user" as const,
    userMessage: "This signature could not be verified. The content may have been modified.",
    adminMessage: "Ed25519 verify returned false. Content or signature mismatch.",
  },
  INVALID_URL: {
    code: "SIGN-042",
    category: "user" as const,
    userMessage: "Please enter a valid Grove post URL.",
    adminMessage: "URL submitted for verification is not a valid Grove post URL.",
  },
  POST_NOT_SIGNED: {
    code: "SIGN-043",
    category: "user" as const,
    userMessage: "This post does not have a signature. It may have been published before signing was enabled.",
    adminMessage: "Post exists but has no content_signature field.",
  },

  // Internal (080-099)
  INTERNAL_ERROR: {
    code: "SIGN-080",
    category: "bug" as const,
    userMessage: "Something went wrong with content verification.",
    adminMessage: "Unhandled error in content signing system.",
  },
} satisfies Record<string, GroveErrorDef>;
```

---

## Integration with Shade

Content signing and Shade work together. Shade protects the content from being scraped. Signing proves the content's origin.

```
Shade (protection):     "You can't take this without permission."
Content Signing (proof): "And we can prove who made it."
```

The signature metadata includes the Shade protection status at time of signing:

```typescript
// Future extension: Shade status in envelope
interface SigningEnvelopeV2 extends SigningEnvelope {
  envelopeVersion: 2;
  shadeProtected: boolean;      // Was Shade active when signed?
  robotsNoai: boolean;          // Were noai meta tags present?
}
```

This creates a paper trail: if AI-scraped content appears elsewhere, the signature proves the content was created at Grove with AI crawling explicitly blocked.

---

## Security Considerations

- **Private key isolation.** Private keys are encrypted at rest using the existing envelope encryption system (KEK → DEK → key). They're decrypted only at signing time, in-memory, and never logged.
- **No client-side signing.** All signing happens server-side. The private key never reaches the browser.
- **Verification is public.** Anyone can verify. No authentication required. Public keys are published at `.well-known/grove-signing.json`.
- **Signatures don't prevent copying.** They prove origin. A copied post doesn't carry a valid signature unless the copier also has the private key (which they don't).
- **Key rotation doesn't invalidate old signatures.** Rotated keys stay available for verification.
- **Signing failure is non-blocking.** If signing fails, the post still publishes. It just won't have a signature. The `SIGN-040` error logs the failure for investigation.

---

## Implementation Checklist

### Phase 1: Key Management (Week 1)

- [ ] Create `signing_keys` table migration
- [ ] Implement `generateSigningKeypair()` using Web Crypto API
- [ ] Integrate with existing SecretsManager for key encryption
- [ ] Add key rotation function
- [ ] Unit test key generation and encryption

### Phase 2: Signing (Week 2)

- [ ] Add signature columns to `posts` table migration
- [ ] Implement `SigningEnvelope` construction
- [ ] Implement `canonicalize()` deterministic serialization
- [ ] Implement `signPost()` function
- [ ] Wire signing into publish API endpoint
- [ ] Handle re-signing on post update
- [ ] Set `authorship` field from `fireside_assisted`

### Phase 3: Public Key Discovery (Week 2)

- [ ] Create `.well-known/grove-signing.json` route in engine
- [ ] Add appropriate cache headers
- [ ] Test with curl and browser

### Phase 4: Verification Service (Week 3)

- [ ] Create `verify.grove.place` Worker
- [ ] Build verification UI (paste URL or upload .grove)
- [ ] Implement verification API endpoint
- [ ] Handle edge cases (missing keys, unsigned posts, rotated keys)
- [ ] Add Signpost error codes

### Phase 5: Display and Export (Week 4)

- [ ] Add authorship badge component to post pages
- [ ] Include signature data in `.grove` exports
- [ ] Support verification from `.grove` files
- [ ] Update content-index.json schema in file-formats spec

### Phase 6: Backfill (Week 4+)

- [ ] Script to sign existing published posts
- [ ] Handle posts published before signing existed (mark as retroactively signed)

---

*Your words carry your name. Always.*
