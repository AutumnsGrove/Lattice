# Plant Onboarding Enhancements

**Created**: January 18, 2026
**Priority**: P1-P2 (Mixed priorities)
**Status**: Ready for Implementation
**Estimated Effort**: 16-24 hours total

---

## Overview

Five enhancements to the Plant onboarding flow, listed in priority order:

1. **Email verification flow** (P1 - Highest priority)
2. **Onboarding checklist table** (P2)
3. **Custom confirmation dialogs** (P2)
4. **Focus management fixes** (P2)
5. **Reserved username data** (P3 - Already 90% complete)

**Spec**: `docs/specs/plant-spec.md`
**Location**: `apps/plant/src/routes/`

---

## 1. Email Verification Flow (Highest Priority)

### Current State

Users can complete signup without verifying their email address. This allows:

- Typo'd email addresses to go unnoticed
- Fake email addresses for spam accounts
- No reliable communication channel

### Implementation

#### Task 1.1: Create Verification Code Table

**File**: `apps/plant/migrations/XXX_email_verification.sql`

```sql
CREATE TABLE IF NOT EXISTS email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  code TEXT NOT NULL,  -- 6-digit code
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,  -- 15 minutes from creation
  verified_at INTEGER,
  attempts INTEGER DEFAULT 0,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX idx_email_verifications_code ON email_verifications(code);
```

#### Task 1.2: Create Verification Page

**File**: `apps/plant/src/routes/verify-email/+page.svelte`

```svelte
<script lang="ts">
  import { GlassCard, GlassButton } from '@autumnsgrove/lattice/ui';
  import { enhance } from '$app/forms';

  let { data, form } = $props();
  let code = $state('');
</script>

<GlassCard class="verify-email-card">
  <h1>Verify Your Email</h1>
  <p>We sent a 6-digit code to <strong>{data.email}</strong></p>

  <form method="POST" use:enhance>
    <input
      type="text"
      name="code"
      bind:value={code}
      placeholder="000000"
      maxlength="6"
      pattern="[0-9]{6}"
      inputmode="numeric"
      autocomplete="one-time-code"
    />

    {#if form?.error}
      <p class="error">{form.error}</p>
    {/if}

    <GlassButton type="submit" disabled={code.length !== 6}>
      Verify Email
    </GlassButton>
  </form>

  <button class="resend-link" formaction="?/resend">
    Didn't receive it? Send again
  </button>
</GlassCard>
```

#### Task 1.3: Create Server Actions

**File**: `apps/plant/src/routes/verify-email/+page.server.ts`

```typescript
import { fail, redirect } from "@sveltejs/kit";
import { Resend } from "resend";

export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(302, "/");
  if (locals.user.emailVerified) throw redirect(302, "/profile");

  return { email: locals.user.email };
};

export const actions = {
  default: async ({ request, locals, platform }) => {
    const data = await request.formData();
    const code = data.get("code");

    // Verify code against database
    const verification = await platform.env.DB.prepare(
      `
      SELECT * FROM email_verifications
      WHERE user_id = ? AND code = ? AND expires_at > unixepoch()
    `,
    )
      .bind(locals.user.id, code)
      .first();

    if (!verification) {
      // Increment attempts, check for rate limiting
      return fail(400, { error: "Invalid or expired code" });
    }

    // Mark user as verified
    await platform.env.DB.prepare(
      `
      UPDATE users SET email_verified = 1 WHERE id = ?
    `,
    )
      .bind(locals.user.id)
      .run();

    throw redirect(302, "/profile");
  },

  resend: async ({ locals, platform }) => {
    // Rate limit: max 3 resends per hour
    // Use KV for rate limiting (faster than D1, built-in TTL)
    const key = `email_resend:${locals.user.id}`;
    const attempts = await platform.env.RATE_LIMIT_KV.get(key);
    if (parseInt(attempts || "0") >= 3) {
      return fail(429, { error: "Too many attempts. Please try again later." });
    }
    await platform.env.RATE_LIMIT_KV.put(
      key,
      String(parseInt(attempts || "0") + 1),
      {
        expirationTtl: 3600, // 1 hour TTL, auto-cleanup
      },
    );
    // Generate new code, send via Resend
  },
};
```

#### Task 1.4: Send Verification Email

**File**: `apps/plant/src/lib/server/email.ts`

```typescript
import { Resend } from "resend";

export async function sendVerificationEmail(
  resend: Resend,
  email: string,
  code: string,
) {
  await resend.emails.send({
    from: "Grove <noreply@grove.place>",
    to: email,
    subject: "Verify your Grove email",
    html: `
      <h1>Welcome to Grove!</h1>
      <p>Your verification code is:</p>
      <h2 style="font-size: 32px; letter-spacing: 4px;">${code}</h2>
      <p>This code expires in 15 minutes.</p>
    `,
  });
}
```

#### Task 1.5: Gate Plan Selection on Verification

**File**: `apps/plant/src/routes/plans/+page.server.ts`

```typescript
export const load = async ({ locals }) => {
  if (!locals.user) throw redirect(302, "/");

  // Require email verification before plan selection
  if (!locals.user.emailVerified) {
    throw redirect(302, "/verify-email");
  }

  // Continue with plan selection...
};
```

### Acceptance Criteria

- [ ] Users must verify email before selecting a plan
- [ ] 6-digit code sent via Resend
- [ ] Code expires after 15 minutes
- [ ] Max 3 resend attempts per hour
- [ ] Clear error messages for invalid/expired codes
- [ ] Mobile-friendly input with `inputmode="numeric"`

---

## 2. Onboarding Checklist Table

### Current State

No tracking of onboarding completion steps. Users may miss important setup tasks.

### Implementation

#### Task 2.1: Create Checklist Table

**File**: `libs/engine/migrations/XXX_onboarding_checklist.sql`

```sql
CREATE TABLE IF NOT EXISTS onboarding_checklist (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  step TEXT NOT NULL,  -- 'profile', 'first_post', 'custom_domain', etc.
  completed_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, step)
);

CREATE INDEX idx_onboarding_tenant ON onboarding_checklist(tenant_id);
```

#### Task 2.2: Define Checklist Steps

```typescript
export const ONBOARDING_STEPS = [
  { id: "email_verified", label: "Verify your email", required: true },
  { id: "profile_complete", label: "Complete your profile", required: true },
  { id: "first_post", label: "Write your first post", required: false },
  { id: "site_settings", label: "Customize site settings", required: false },
  {
    id: "custom_domain",
    label: "Add a custom domain",
    required: false,
    tier: "oak",
  },
] as const;
```

#### Task 2.3: Create Checklist Widget

**File**: `libs/engine/src/lib/ui/components/admin/OnboardingChecklist.svelte`

Already exists with basic structure. Enhance with:

- Progress percentage
- Animated completion states
- Links to relevant pages

### Acceptance Criteria

- [ ] Database table created
- [ ] Steps automatically tracked on completion
- [ ] Progress displayed in admin dashboard
- [ ] Celebration animation at 100%

---

## 3. Custom Confirmation Dialogs

### Current State

Uses browser `confirm()` for destructive actions. This:

- Looks inconsistent with Grove aesthetic
- Cannot be styled
- Has limited functionality

### Implementation

#### Task 3.1: Create ConfirmDialog Component

**File**: `libs/engine/src/lib/ui/components/dialogs/ConfirmDialog.svelte`

```svelte
<script lang="ts">
  import { GlassCard, GlassButton } from '../glass';
  import { createDialog } from '../primitives/dialog';

  interface Props {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
  }

  let { title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'default', onConfirm, onCancel }: Props = $props();

  const dialog = createDialog();

  async function handleConfirm() {
    await onConfirm();
    dialog.close();
  }
</script>

<dialog bind:this={dialog.element} class="confirm-dialog">
  <GlassCard>
    <h2>{title}</h2>
    <p>{message}</p>

    <div class="actions">
      <GlassButton variant="ghost" onclick={() => { onCancel?.(); dialog.close(); }}>
        {cancelText}
      </GlassButton>
      <GlassButton variant={variant} onclick={handleConfirm}>
        {confirmText}
      </GlassButton>
    </div>
  </GlassCard>
</dialog>
```

#### Task 3.2: Create useConfirm Composable

**File**: `libs/engine/src/lib/ui/composables/useConfirm.svelte.ts`

```typescript
import { mount } from "svelte";
import ConfirmDialog from "../components/dialogs/ConfirmDialog.svelte";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
}

export function useConfirm() {
  return {
    confirm: (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        const dialog = mount(ConfirmDialog, {
          target: document.body,
          props: {
            ...options,
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false),
          },
        });
      });
    },
  };
}
```

#### Task 3.3: Replace Browser Confirms

Search for `confirm(` across Plant and replace with `useConfirm`.

### Acceptance Criteria

- [ ] Glassmorphic dialog component created
- [ ] `useConfirm` composable for easy usage
- [ ] All browser `confirm()` calls replaced
- [ ] Keyboard accessible (Escape to cancel, Enter to confirm)
- [ ] Focus trapped within dialog

---

## 4. Focus Management Fixes

### Current State

Issues identified:

- Focus not returned to trigger element after actions
- Potential keyboard traps in modals
- Mobile tap issues on some interactive elements

### Implementation

#### Task 4.1: Audit Current Focus Issues

Run accessibility audit:

```bash
npx axe-core packages/plant
```

#### Task 4.2: Fix Focus Return

After modal/dialog closes, return focus to the element that opened it:

```typescript
// In dialog close handler
const triggerElement = document.activeElement;

dialog.close();

// Return focus
triggerElement?.focus();
```

#### Task 4.3: Fix Mobile Tap Targets

Ensure all interactive elements have minimum 44x44px touch targets:

```css
.interactive-element {
  min-width: 44px;
  min-height: 44px;
  /* Or use padding to achieve the size */
}
```

### Acceptance Criteria

- [ ] Focus returns to trigger after modal close
- [ ] No keyboard traps in any modal/dialog
- [ ] All touch targets minimum 44x44px
- [ ] Tab order is logical throughout signup flow

---

## 5. Reserved Username Data (Already 90% Complete)

### Current State

**Good news**: This work is largely complete!

**Existing Implementation**:

- Migration 012: `reserved_usernames` table with 70 entries
- Migration 017: 450+ entries across 7 categories
- TypeScript blocklist: `libs/engine/src/lib/config/domain-blocklist.ts` (865 lines)
- Offensive blocklist: `libs/engine/src/lib/config/offensive-blocklist.ts` (802 lines)
- API endpoint: `apps/plant/src/routes/api/check-username/+server.ts` (281 lines)
- Comprehensive tests: `libs/engine/src/lib/config/domain-blocklist.test.ts` (321 lines)

### Remaining Work

#### Task 5.1: Create Admin UI for Reserved Usernames

**File**: `libs/engine/src/routes/admin/reserved-usernames/+page.svelte`

- List all reserved usernames with search/filter
- Add new reserved username
- Delete reserved username
- Filter by category

#### Task 5.2: Add Audit Logging

Track who added/removed reserved usernames:

```sql
CREATE TABLE IF NOT EXISTS reserved_usernames_audit (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  action TEXT NOT NULL,  -- 'added', 'removed'
  admin_id TEXT,
  reason TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);
```

#### Task 5.3: Create Offensive Blocklist Tests

**File**: `libs/engine/src/lib/config/offensive-blocklist.test.ts`

Test cases needed:

- Leetspeak variant detection
- Word boundary checking
- False positive prevention (e.g., "retardant")
- All slur category coverage

### Acceptance Criteria

- [ ] Admin UI for managing reserved usernames
- [ ] Audit log for changes
- [ ] Tests for offensive content detection
- [ ] **Update TODOS.md** - Mark existing items as complete

---

## Priority Summary

| Item                 | Priority | Effort | Dependencies        |
| -------------------- | -------- | ------ | ------------------- |
| Email Verification   | P1       | 6-8h   | Resend integration  |
| Onboarding Checklist | P2       | 4-6h   | None                |
| Custom Dialogs       | P2       | 3-4h   | None                |
| Focus Management     | P2       | 2-3h   | Accessibility audit |
| Reserved Usernames   | P3       | 3-4h   | Admin routes        |

---

## Files to Create/Modify

| File                                                                     | Type   | Item |
| ------------------------------------------------------------------------ | ------ | ---- |
| `apps/plant/migrations/XXX_email_verification.sql`                   | New    | #1   |
| `apps/plant/src/routes/verify-email/+page.svelte`                    | New    | #1   |
| `apps/plant/src/routes/verify-email/+page.server.ts`                 | New    | #1   |
| `apps/plant/src/lib/server/email.ts`                                 | Modify | #1   |
| `libs/engine/migrations/XXX_onboarding_checklist.sql`                | New    | #2   |
| `libs/engine/src/lib/ui/components/admin/OnboardingChecklist.svelte` | Modify | #2   |
| `libs/engine/src/lib/ui/components/dialogs/ConfirmDialog.svelte`     | New    | #3   |
| `libs/engine/src/lib/ui/composables/useConfirm.svelte.ts`            | New    | #3   |
| `libs/engine/src/routes/admin/reserved-usernames/+page.svelte`       | New    | #5   |
| `libs/engine/src/lib/config/offensive-blocklist.test.ts`             | New    | #5   |

---

## Related Documents

- Plant spec: `docs/specs/plant-spec.md`
- Loam spec: `docs/specs/loam-spec.md`
- Domain blocklist: `libs/engine/src/lib/config/domain-blocklist.ts`
- Offensive blocklist: `libs/engine/src/lib/config/offensive-blocklist.ts`
