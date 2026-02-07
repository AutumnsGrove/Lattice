# Turtle Hardening Report: Section 3 - Input/Output & XSS Prevention

**Date**: 2026-02-06
**Scope**: Engine sanitization pipeline, CSP, `{@html}` usage, file uploads, form validation
**Mode**: Existing code audit (defense-in-depth verification)
**Threat model**: Public-facing multi-tenant SaaS — user-generated content must never execute arbitrary code

---

## Files Audited

| File | Status |
|------|--------|
| `Engine/src/lib/utils/sanitize.ts` (DOMPurify + sanitize-html) | Audited |
| `Engine/src/lib/utils/markdown.ts` (Markdown→HTML pipeline) | Audited |
| `Engine/src/hooks.server.ts` (CSP construction, nonce generation, security headers) | Audited |
| `Engine/svelte.config.js` (CSRF trustedOrigins) | Audited |
| `Engine/src/app.html` (nonce injection, meta tags) | Audited |
| All `.svelte` files with `{@html}` (9 instances) | Audited + Fixed |
| `Engine/src/routes/api/images/upload/+server.ts` (magic bytes, MIME, filename) | Audited |
| `Engine/src/lib/server/services/storage.ts` (Content-Disposition, R2 serving) | Audited |
| `Engine/src/routes/api/curios/timeline/config/+server.ts` | Audited + Fixed |
| `Engine/src/routes/arbor/comped-invites/+page.server.ts` | Audited + Fixed |
| `Engine/src/routes/api/sentinel/+server.ts` | Audited |
| `Engine/src/routes/arbor/pages/**/+page.server.ts` | Audited |
| `Engine/src/routes/api/posts/+server.ts` | Audited |
| `Landing/src/routes/api/kb/excerpt/[slug]/+server.ts` | Audited |

---

## Defense Layers Applied

| Layer | Status | Notes |
|-------|--------|-------|
| HTML Sanitization | PASS | Dual library: DOMPurify (client) + sanitize-html (server/SSR) |
| SVG Sanitization | PASS | Strips script, foreignObject, animate, set, image, a; blocks xlink:href |
| URL Sanitization | PASS | Protocol allowlist rejects javascript:, data:, vbscript:, file:, about: |
| Prototype Pollution Prevention | PASS | `sanitizeObject()` blocks `__proto__`, `constructor`, `prototype`; freezes result |
| Output Encoding | PASS | 9 `{@html}` instances, all sanitized (1 fixed in this audit) |
| CSP (Content-Security-Policy) | PASS | Nonce-based for scripts, per-request generation via `crypto.randomUUID()` |
| unsafe-eval Scoping | PASS | Only admin/content routes (Monaco/Mermaid); never auth/API |
| Security Headers | PASS | HSTS (1yr+subdomains+preload), X-Frame-Options DENY, XCTO nosniff, Referrer-Policy, Permissions-Policy |
| File Upload Validation | PASS | Magic byte validation for 5 formats, SVG blocked, EXIF stripped, tenant-scoped R2 |
| Filename Sanitization | PASS | Removes `..`, `/`, `\`, null bytes, special chars; server-generated names |
| Form Input Validation | PARTIAL | Manual validation (no Zod); some fields missing length limits |

---

## Turtle Checklist (Section 3)

```
[x] No {@html} with unsanitized user input
    - 9 instances found across engine; 8 were already sanitized
    - FIXED: WaystonePopup.svelte now wraps excerpt.firstSection with sanitizeMarkdown()
    - EmbedWidget uses srcdoc with sandbox="allow-scripts" (isolated iframe)

[x] HTML sanitization uses DOMPurify (client) + sanitize-html (server)
    - DOMPurify: FORBID_TAGS approach for arbitrary HTML, ALLOWED_TAGS for markdown
    - sanitize-html: Server-side fallback for SSR on Cloudflare Workers
    - 100+ test payload vectors verified in sanitize.test.ts

[x] SVG sanitization strips script, foreignObject, event handlers
    - FORBID_TAGS: foreignObject blocked
    - FORBID_ATTR: All on* event handlers, xlink:href
    - Additional SVG blocks: animate, set, image, a (inside SVG context)
    - SVG file uploads blocked entirely at the upload endpoint

[x] URL sanitization rejects javascript:, data:, vbscript:
    - sanitizeURL() uses protocol allowlist: ^(?:(?:https?|mailto|tel):|\/|#)
    - Explicit checks for javascript:, data:, vbscript:, file:, about:
    - Case-insensitive matching (handles jAvAsCrIpT: variants)
    - External links get rel="noopener noreferrer" (reverse tabnabbing prevention)

[x] CSP nonce-based for scripts
    - Nonce generated per-request: crypto.randomUUID().replace(/-/g, "")
    - Injected into all <script> tags via global regex in transformPageChunk
    - CSRF token delivered via <meta> tag (not vulnerable to CSS exfiltration — value changes per request)

[x] unsafe-eval only on justified routes (never auth)
    - needsUnsafeEval() gates: /arbor/* content pages, /preview paths
    - Required for Monaco editor, Mermaid diagram rendering
    - Auth routes (/auth/*), API routes (/api/*) never receive unsafe-eval

[x] File uploads validated: magic bytes, MIME, extension, size, dimensions
    - Magic byte validation: JPEG (5 signatures), PNG (8-byte), GIF87a/89a, WebP (RIFF+WEBP), JPEG XL
    - SVG uploads completely blocked (not in allowlist)
    - Client-side EXIF stripping via canvas re-encode
    - Size limits enforced (per-file)
    - Petal content moderation (CSAM detection) integration

[x] Filenames sanitized (no path traversal)
    - Server-generated filenames: hash + timestamp
    - Original filenames stripped of .., /, \, null bytes
    - R2 keys: ${tenantId}/photos/YYYY/MM/DD/${filename}

[x] Image metadata stripped
    - Client-side canvas re-encode strips EXIF/GPS/camera data
    - Content-Disposition: attachment set when serving uploaded files

[~] Form inputs validated server-side on ALL form actions
    - Manual validation (no schema library like Zod)
    - FIXED: Timeline config now has length limits on all free-text fields
    - FIXED: Comped-invites now uses validateEmail() instead of includes("@")
    - Some endpoints have limited length checks (pages API has them; timeline config now does too)
    - Recommendation: Adopt Zod for structured validation on new endpoints
```

---

## Exotic Attack Vectors Tested

| Vector | Status | Notes |
|--------|--------|-------|
| Stored XSS via {@html} | FIXED | WaystonePopup was rendering KB excerpts without sanitization |
| Reflected XSS | CLEAR | Svelte auto-escapes all `{expression}` output by default |
| SVG XSS via Upload | CLEAR | SVG uploads blocked entirely; only raster formats accepted |
| SVG XSS via Inline | CLEAR | All SVG rendering uses static assets, not user content |
| CSS Injection | CLEAR | `style` attribute forbidden in sanitize config; `<style>` tag in FORBID_TAGS |
| Prototype Pollution | CLEAR | `sanitizeObject()` blocks dangerous keys; Object.freeze on output |
| Reverse Tabnabbing | CLEAR | All external links get `rel="noopener noreferrer"` via sanitize config |
| CSP Bypass via unsafe-eval | CLEAR | Only on admin routes, never on user-facing or auth routes |
| CSP Bypass via unsafe-inline (scripts) | CLEAR | Script-src uses nonces, not unsafe-inline |
| Content-Type Confusion | CLEAR | X-Content-Type-Options: nosniff on all responses |
| MIME Sniffing Attack | CLEAR | Magic byte validation matches actual content, not just Content-Type header |
| Unicode/Homoglyph | LOW RISK | No username display normalization; email comparison uses `normalizeEmail()` |
| ReDoS | CLEAR | Email regex is simple non-backtracking pattern; URL parsing uses URL() constructor |
| Path Traversal via Upload | CLEAR | Server-generated filenames; `..`, `/`, `\` stripped from any user input |
| CRLF Injection | CLEAR | No user-controlled values injected into HTTP headers |
| Second-Order XSS | CLEAR | Database content always sanitized on output, not just on input |

---

## Vulnerabilities Found

| ID | Severity | Description | Fix Applied |
|----|----------|-------------|-------------|
| S3-F1 | LOW | `WaystonePopup.svelte` rendered KB excerpt HTML via `{@html excerpt.firstSection}` without sanitization — defense-in-depth gap (source is admin-controlled filesystem markdown with `html: false`, but rendering point should not trust upstream) | YES |
| S3-F2 | LOW | Timeline config PUT handler accepted `customSystemPrompt`, `customSummaryInstructions`, `customGutterStyle`, `ownerName`, `githubUsername`, `timezone` without length limits — storage abuse vector | YES |
| S3-F3 | LOW | Comped-invites email validation used `includes("@")` instead of proper regex — could accept malformed addresses like `@@` or strings with spaces | YES |
| S3-F4 | INFO | CSP has no `report-uri` or `report-to` directive configured — violations go unmonitored | N/A (operational) |
| S3-F5 | ACCEPTED | `style-src 'unsafe-inline'` in CSP — required by Svelte's component style injection | N/A (framework requirement) |
| S3-F6 | ACCEPTED | `data:` in `img-src` directive — required for inline/generated images (canvas exports, placeholder images) | N/A (functional requirement) |

### Fixes Applied (3)

1. **S3-F1**: `Engine/src/lib/ui/components/ui/waystone/WaystonePopup.svelte` — Added `sanitizeMarkdown()` wrapper around `{@html excerpt.firstSection}` (defense-in-depth at rendering point)
2. **S3-F2**: `Engine/src/routes/api/curios/timeline/config/+server.ts` — Added length limits: customSystemPrompt (10K), customSummaryInstructions (5K), customGutterStyle (2K), ownerName (200), githubUsername (100), timezone (100)
3. **S3-F3**: `Engine/src/routes/arbor/comped-invites/+page.server.ts` — Replaced `!email.includes("@")` with `!validateEmail(email)` from `$lib/utils/validation.js` (checks regex pattern + 255 char limit)

---

## Defense-in-Depth Compliance

### Layer Verification

| Layer | Present | Controls |
|-------|---------|----------|
| Network | YES | TLS enforced (HSTS 1yr+subdomains+preload), Cloudflare edge |
| Application | YES | Dual sanitization (DOMPurify + sanitize-html), nonce-based CSP, auto-escaping |
| Data | YES | Parameterized queries, Content-Disposition on uploads, EXIF stripping |
| Infrastructure | YES | R2 separate domain for uploads, SVG uploads blocked, sandbox on embeds |
| Process | PARTIAL | Sanitization tests (100+ vectors); no automated CSP reporting |

### Critical Function Defense Layers

| Function | Layer 1 | Layer 2 | Layer 3 |
|----------|---------|---------|---------
| Prevent XSS | Svelte auto-escaping | DOMPurify/sanitize-html on {@html} | Nonce-based CSP |
| Prevent SVG XSS | SVG uploads blocked | SVG sanitization strips dangerous elements | Content-Disposition: attachment |
| Prevent content injection | FORBID_TAGS/ATTR lists | URL protocol allowlist | External link rel="noopener" |
| Prevent file-based attacks | Magic byte validation | Server-generated filenames | Tenant-prefixed R2 keys |
| Prevent CSS injection | style attribute forbidden | `<style>` in FORBID_TAGS | CSP style-src restrictions |
| Prevent storage abuse | Length limits on inputs | Size limits on uploads | Tenant-scoped storage |

---

## Strengths Observed

1. **Dual sanitization is the gold standard** — Using DOMPurify client-side AND sanitize-html server-side means content is safe regardless of rendering context. The SSR path on Cloudflare Workers doesn't have DOM access, so sanitize-html fills that gap.

2. **FORBID_TAGS approach is appropriate** — For arbitrary HTML input, forbidding known-dangerous tags is more practical than allowlisting (which would break legitimate content). For markdown output, the allowlist approach via `sanitizeMarkdown()` is stricter and correct.

3. **CSP nonce implementation is clean** — `crypto.randomUUID()` is cryptographically strong on Cloudflare Workers (uses V8's CSPRNG), nonces are fresh per-request, and the regex injection in `transformPageChunk` catches all script tags reliably.

4. **SVG attack surface eliminated** — Blocking SVG uploads entirely is the safest approach. Combined with SVG sanitization for any programmatic SVG rendering, this closes the most dangerous image-based XSS vector.

5. **Upload security is thorough** — Five-way magic byte validation (JPEG/PNG/GIF/WebP/JPEG XL), EXIF stripping, content moderation, tenant-scoped R2 keys, and Content-Disposition headers form a complete defense chain.

6. **Prototype pollution prevention is proactive** — `sanitizeObject()` blocking `__proto__`, `constructor`, and `prototype` with `Object.freeze()` on the result is defense-in-depth against a class of attack that many codebases ignore entirely.

---

## Risk Acceptances

1. **style-src 'unsafe-inline'** — Svelte injects component styles as inline `<style>` tags. This is a framework requirement that cannot be worked around without significant build pipeline changes. CSS injection risk is mitigated by forbidding `style` attributes in sanitized HTML and blocking `<style>` tags in user content.

2. **data: in img-src** — Required for canvas-exported images and placeholder content. Risk is minimal: `data:` URIs in `<img>` context cannot execute JavaScript (browsers enforce this). The only risk is data exfiltration via `<img src="data:...">` in CSS selectors, which is mitigated by CSP's script restrictions.

3. **No CSP violation reporting** — Violations are not currently reported to a monitoring endpoint. This is an operational gap (we can't detect attempted XSS attacks), but doesn't affect the strength of the CSP itself. Recommended: add `report-to` directive pointing to a Cloudflare Worker or logging service.

4. **Manual validation (no Zod)** — Form inputs are validated imperatively rather than with schema validation. This works but is more error-prone for new endpoints. The existing validation covers critical paths; the risk is in future endpoints forgetting to add checks. Recommended: adopt Zod for new API endpoints.

---

## Recommendations for Future Work

1. **CSP violation reporting** — Add `report-to` directive to collect and monitor CSP violations. This provides visibility into attempted XSS attacks and misconfigurations.

2. **Schema validation adoption** — Introduce Zod or Valibot for structured input validation on new API endpoints. The current manual approach works but doesn't scale well and is easy to forget.

3. **Trusted Types** — Consider adopting the Trusted Types API (`require-trusted-types-for 'script'`) as an additional CSP directive. This would provide compile-time enforcement against DOM XSS, though it requires all third-party libraries to be compatible.

4. **Content-Security-Policy-Report-Only** — Deploy stricter CSP rules in report-only mode first to identify any regressions before enforcement.

---

*The shell holds. Input sanitized on entry, encoded on exit, restricted by policy. Three layers deep on every vector — the content flows clean.* 🐢
