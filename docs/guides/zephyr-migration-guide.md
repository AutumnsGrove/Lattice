# Zephyr Migration Guide

A guide for migrating existing email code to use Zephyr, Grove's unified email gateway.

## Overview

This guide helps you migrate from direct Resend usage to Zephyr. The migration happens in phases, starting with the most critical fix (Porch), then gradually moving other services.

## Migration Phases

### Phase 1: Porch (Critical Bug Fix)

**Priority:** Immediate  
**Risk:** Low  
**Effort:** 1-2 hours

The Porch reply email bug is the primary driver for Zephyr. Replies were "sending" but actually failing silently. This phase fixes that immediately.

#### Before (Broken)

```typescript
// libs/engine/src/routes/admin/porch/[id]/+page.server.ts
import { Resend } from "resend";

const resend = new Resend(RESEND_API_KEY);

export const actions = {
	reply: async ({ request, params }) => {
		const data = await request.formData();
		const content = data.get("content");

		// Get the visit and user email
		const visit = await db.getVisit(params.id);

		// This was failing silently!
		await resend.emails.send({
			from: "Grove <hello@grove.place>",
			to: visit.email,
			subject: `Re: ${visit.subject}`,
			html: `<p>${content}</p>`,
		});
		// No error handling - success assumed

		return { success: true };
	},
};
```

#### After (Fixed)

```typescript
// libs/engine/src/routes/admin/porch/[id]/+page.server.ts
import { zephyr } from "@autumnsgrove/lattice/zephyr";

export const actions = {
	reply: async ({ request, params }) => {
		const data = await request.formData();
		const content = data.get("content");

		const visit = await db.getVisit(params.id);

		// Now we know if it fails
		const result = await zephyr.send({
			type: "notification",
			template: "porch-reply",
			to: visit.email,
			data: {
				content,
				visitId: visit.id,
				visitNumber: visit.visit_number,
				subject: visit.subject,
			},
			tenant: "grove",
			source: "porch-admin",
			correlationId: visit.id,
		});

		if (!result.success) {
			console.error("Failed to send Porch reply:", result.error);
			return fail(500, {
				error: "Reply saved but email failed to send. Please try again.",
			});
		}

		return { success: true };
	},
};
```

#### Migration Steps

1. **Create the Porch reply template** in `workers/zephyr/templates/PorchReplyEmail.tsx`
2. **Update the route** to use Zephyr instead of direct Resend
3. **Test** the reply flow end-to-end
4. **Verify** emails actually arrive

---

### Phase 2: Verification Emails

**Priority:** High  
**Risk:** Medium (auth flow)  
**Effort:** 2-3 hours

Email verification is critical for user onboarding. Downtime here blocks new signups.

#### Before

```typescript
// apps/plant/src/lib/server/email-verification.ts
import { Resend } from "resend";
import { VERIFICATION_EMAIL_TEMPLATE } from "./templates";

const resend = new Resend(RESEND_API_KEY);

export async function sendVerificationEmail(email: string, code: string) {
	await resend.emails.send({
		from: "Grove <hello@grove.place>",
		to: email,
		subject: "Verify your email",
		html: VERIFICATION_EMAIL_TEMPLATE.replace("{{code}}", code),
	});
}
```

#### After

```typescript
// apps/plant/src/lib/server/email-verification.ts
import { zephyr } from "@autumnsgrove/lattice/zephyr";

export async function sendVerificationEmail(email: string, code: string) {
	const result = await zephyr.send({
		type: "verification",
		template: "verification",
		to: email,
		data: { code, expiresIn: "15 minutes" },
		tenant: "grove",
		source: "plant-auth",
	});

	if (!result.success) {
		throw new Error(`Failed to send verification: ${result.errorMessage}`);
	}

	return result;
}
```

#### Migration Steps

1. **Create verification template** in Zephyr
2. **Update the auth module** to use Zephyr
3. **Test signup flow** thoroughly
4. **Monitor error rates** during rollout

---

### Phase 3: Payment Notifications

**Priority:** Medium  
**Risk:** Low-Medium (revenue-related)  
**Effort:** 3-4 hours

Payment emails inform users about charges, failures, and renewals. Important for trust.

#### Before

```typescript
// apps/plant/src/lib/server/payment-emails.ts
import { Resend } from "resend";

export async function sendPaymentReceivedEmail(email: string, amount: number, plan: string) {
	await resend.emails.send({
		from: "Grove <hello@grove.place>",
		to: email,
		subject: "Payment confirmed",
		html: renderPaymentEmail({ amount, plan }),
	});
}

export async function sendPaymentFailedEmail(email: string, amount: number) {
	await resend.emails.send({
		from: "Grove <hello@grove.place>",
		to: email,
		subject: "Payment failed",
		html: renderFailedEmail({ amount }),
	});
}
```

#### After

```typescript
// apps/plant/src/lib/server/payment-emails.ts
import { zephyr } from "@autumnsgrove/lattice/zephyr";

export async function sendPaymentReceivedEmail(email: string, amount: number, plan: string) {
	return zephyr.send({
		type: "lifecycle",
		template: "payment-received",
		to: email,
		data: { amount, plan, date: new Date().toISOString() },
		tenant: "grove",
		source: "plant-payments",
	});
}

export async function sendPaymentFailedEmail(email: string, amount: number) {
	return zephyr.send({
		type: "lifecycle",
		template: "payment-failed",
		to: email,
		data: { amount, retryUrl: "/billing/retry" },
		tenant: "grove",
		source: "plant-payments",
	});
}
```

#### Migration Steps

1. **Create payment templates** (payment-received, payment-failed, trial-ending)
2. **Update webhook handlers** that trigger these emails
3. **Test with Stripe/LemonSqueezy** test mode
4. **Monitor** for failed payment notifications

---

### Phase 4: Onboarding Sequences

**Priority:** Medium  
**Risk:** Low  
**Effort:** 4-6 hours

Welcome sequences and drip campaigns. These can be migrated last since they're less time-sensitive.

#### Before

```typescript
// libs/engine/src/lib/email/schedule.ts
import { Resend } from "resend";
import { scheduleJob } from "./scheduler";

export function scheduleWelcomeSequence(userId: string, email: string) {
	// Day 0: Welcome
	scheduleJob("email", {
		runAt: Date.now(),
		payload: {
			to: email,
			template: "welcome",
			data: { userId },
		},
	});

	// Day 1: Getting started
	scheduleJob("email", {
		runAt: Date.now() + 86400000,
		payload: {
			to: email,
			template: "day-1",
			data: { userId },
		},
	});

	// Day 7: Check-in
	scheduleJob("email", {
		runAt: Date.now() + 604800000,
		payload: {
			to: email,
			template: "day-7",
			data: { userId },
		},
	});
}

// Worker processes the job
export async function processEmailJob(job: EmailJob) {
	await resend.emails.send({
		from: "Autumn <autumn@grove.place>",
		to: job.payload.to,
		subject: getSubject(job.payload.template),
		html: renderTemplate(job.payload.template, job.payload.data),
	});
}
```

#### After

```typescript
// libs/engine/src/lib/email/schedule.ts
import { zephyr } from "@autumnsgrove/lattice/zephyr";
import { scheduleJob } from "./scheduler";

export function scheduleWelcomeSequence(userId: string, email: string) {
	const baseKey = `${userId}-welcome`;

	// Day 0: Welcome
	scheduleJob("zephyr-email", {
		runAt: Date.now(),
		payload: {
			type: "sequence",
			template: "welcome",
			to: email,
			data: { userId },
			idempotencyKey: `${baseKey}-day0`,
		},
	});

	// Day 1: Getting started
	scheduleJob("zephyr-email", {
		runAt: Date.now() + 86400000,
		payload: {
			type: "sequence",
			template: "day-1",
			to: email,
			data: { userId },
			idempotencyKey: `${baseKey}-day1`,
		},
	});

	// Day 7: Check-in
	scheduleJob("zephyr-email", {
		runAt: Date.now() + 604800000,
		payload: {
			type: "sequence",
			template: "day-7",
			to: email,
			data: { userId },
			idempotencyKey: `${baseKey}-day7`,
		},
	});
}

// Worker processes the job
export async function processEmailJob(job: EmailJob) {
	return zephyr.send({
		type: job.payload.type,
		template: job.payload.template,
		to: job.payload.to,
		data: job.payload.data,
		idempotencyKey: job.payload.idempotencyKey,
		tenant: "grove",
		source: "engine-sequences",
	});
}
```

#### Migration Steps

1. **Migrate templates** to Zephyr's template system
2. **Update scheduler** to use Zephyr job type
3. **Add idempotency keys** to prevent duplicates during retry
4. **Gradually roll out** sequence by sequence

---

## Migration Checklist

### Pre-Migration

- [ ] Read Zephyr README (`workers/zephyr/README.md`)
- [ ] Set up local development environment
- [ ] Generate and configure `ZEPHYR_API_KEY`
- [ ] Review current email usage in your service
- [ ] Identify which templates need to be migrated

### During Migration

- [ ] Create Zephyr templates for migrated emails
- [ ] Update code to use Zephyr client
- [ ] Add error handling for failed sends
- [ ] Test locally with Zephyr dev server
- [ ] Add idempotency keys where appropriate

### Post-Migration

- [ ] Deploy to staging
- [ ] Test critical flows (signup, payment, etc.)
- [ ] Monitor D1 logs for errors
- [ ] Check rate limits aren't being hit
- [ ] Remove old Resend imports and code
- [ ] Update documentation

---

## Testing Your Migration

### Unit Tests

```typescript
// __tests__/email.test.ts
import { zephyr } from "@autumnsgrove/lattice/zephyr";
import { vi } from "vitest";

vi.mock("@autumnsgrove/lattice/zephyr", () => ({
	zephyr: {
		send: vi.fn(),
	},
}));

test("sends welcome email on signup", async () => {
	const sendMock = vi.mocked(zephyr.send);
	sendMock.mockResolvedValue({ success: true, messageId: "123" });

	await signupUser("test@example.com");

	expect(sendMock).toHaveBeenCalledWith({
		type: "sequence",
		template: "welcome",
		to: "test@example.com",
		data: expect.any(Object),
		tenant: "grove",
		source: expect.any(String),
	});
});

test("handles email failure gracefully", async () => {
	const sendMock = vi.mocked(zephyr.send);
	sendMock.mockResolvedValue({
		success: false,
		errorCode: "RATE_LIMITED",
		errorMessage: "Too many requests",
	});

	const result = await signupUser("test@example.com");

	expect(result.emailSent).toBe(false);
	expect(result.userCreated).toBe(true);
});
```

### Integration Tests

```typescript
// __tests__/email.integration.test.ts
test("end-to-end email flow", async () => {
	// Start Zephyr dev server
	const zephyrProcess = spawn("pnpm", ["run", "dev"], {
		cwd: "workers/zephyr",
	});

	// Wait for server
	await waitForPort(8787);

	// Send test email
	const result = await fetch("http://localhost:8787/send", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-API-Key": "test-key",
		},
		body: JSON.stringify({
			type: "transactional",
			template: "welcome",
			to: "test@example.com",
			data: { name: "Test" },
		}),
	});

	const body = await result.json();
	expect(body.success).toBe(true);
	expect(body.messageId).toBeDefined();

	// Check D1 logs
	const logs = await db.query(`
    SELECT * FROM zephyr_logs 
    WHERE recipient = 'test@example.com'
    ORDER BY created_at DESC
  `);
	expect(logs.length).toBeGreaterThan(0);

	// Cleanup
	zephyrProcess.kill();
});
```

---

## Troubleshooting

### Common Issues

**Problem:** `401 Unauthorized`  
**Solution:** Check that `X-API-Key` header is set and matches `ZEPHYR_API_KEY` secret

**Problem:** `INVALID_TEMPLATE` error  
**Solution:** Template name must match exactly (case-sensitive). Check `/templates` endpoint for available templates.

**Problem:** `RATE_LIMITED` error  
**Solution:** Check rate limits for the email type. Consider using a different type or implementing backoff.

**Problem:** Emails not actually sending  
**Solution:** Check D1 logs for `PROVIDER_ERROR`. Verify `RESEND_API_KEY` is set correctly.

**Problem:** Template rendering fails  
**Solution:** Ensure all required template data fields are provided. Check `EMAIL_RENDER_URL` is accessible.

### Debug Mode

Enable detailed logging:

```typescript
// Add to your service
const result = await zephyr.send({
	// ... request
});

console.log("Zephyr response:", JSON.stringify(result, null, 2));
```

Check D1 logs directly:

```bash
wrangler d1 execute zephyr-logs --command="SELECT * FROM zephyr_logs ORDER BY created_at DESC LIMIT 10"
```

---

## Rollback Plan

If something goes wrong:

1. **Immediate:** Keep old Resend code as fallback:

   ```typescript
   const result = await zephyr.send({...});
   if (!result.success && shouldFallback(result.errorCode)) {
     // Fallback to old method
     await oldSendEmailMethod(...);
   }
   ```

2. **Short-term:** Revert to previous commit

   ```bash
   git revert HEAD
   ```

3. **Long-term:** Keep feature flag to disable Zephyr:
   ```typescript
   if (await isFlagEnabled('use-zephyr')) {
     await zephyr.send({...});
   } else {
     await oldSendEmailMethod(...);
   }
   ```

---

## Post-Migration Cleanup

After successful migration:

- [ ] Remove `RESEND_API_KEY` from service secrets (keep only in Zephyr)
- [ ] Delete old email utility files
- [ ] Remove inline HTML email templates
- [ ] Update service documentation
- [ ] Archive old email workers if applicable

---

_The wind shifts. Messages flow. The grove breathes easier._
