/**
 * Email Templates for Grove Landing Page
 *
 * Onboarding sequence for waitlist signups:
 * - Day 0: Welcome email (thanks for joining early)
 * - Day 3: What we're building (product preview)
 * - Day 7: Why Grove exists (values + community)
 * - Day 14: Check-in + how to reach us
 */

interface OnboardingEmailResult {
  subject: string;
  html: string;
  text: string;
}

// Shared email wrapper with Grove styling
function wrapEmail(content: string, unsubscribeUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grove</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fefdfb; font-family: Georgia, Cambria, 'Times New Roman', serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td align="center" style="padding-bottom: 30px;">
        <!-- Grove Logo -->
        <img src="https://cdn.grove.place/email/logo.png" width="48" height="48" alt="Grove" style="display: inline-block; border-radius: 50%;" />
      </td>
    </tr>
    ${content}
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 12px; color: #3d2914; opacity: 0.4;">
          grove.place
        </p>
        <p style="margin: 8px 0 0 0; font-size: 11px; color: #3d2914; opacity: 0.3;">
          <a href="${unsubscribeUrl}" style="color: inherit;">Unsubscribe from updates</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

// =============================================================================
// DAY 0: WELCOME EMAIL
// =============================================================================

export function getWelcomeEmailHtml(unsubscribeUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Grove</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fefdfb; font-family: Georgia, Cambria, 'Times New Roman', serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td align="center" style="padding-bottom: 30px;">
        <!-- Grove Logo -->
        <img src="https://cdn.grove.place/email/logo.png" width="56" height="56" alt="Grove" style="display: inline-block; border-radius: 50%;" />
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-bottom: 20px;">
        <h1 style="margin: 0; font-size: 28px; color: #3d2914; font-weight: normal;">
          Welcome to Grove
        </h1>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-bottom: 30px;">
        <p style="margin: 0; font-size: 18px; color: #3d2914; opacity: 0.7; font-style: italic;">
          a place to Be
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f0fdf4; border-radius: 12px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Hey there,
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Thank you for planting yourself here. It means a lot.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Grove is a quiet corner of the internet where your words actually belong to you. No algorithms, no ads, no data harvesting — just your space, growing at your pace.
        </p>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          I'll be in touch soon with more. In the meantime, you can reply directly to this email — it comes straight to me.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 40px;">
        <p style="margin: 0; font-size: 14px; color: #3d2914; opacity: 0.5;">
          — Autumn
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 12px; color: #3d2914; opacity: 0.4;">
          grove.place
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 20px; border-top: 1px solid #e5e5e5; margin-top: 20px;">
        <p style="margin: 16px 0 0 0; font-size: 11px; color: #3d2914; opacity: 0.35;">
          Don't want to receive these emails? <a href="${unsubscribeUrl}" style="color: #3d2914; opacity: 0.5;">Unsubscribe</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

export function getWelcomeEmailText(unsubscribeUrl: string): string {
  return `
Welcome to Grove
================

a place to Be

Hey there,

Thank you for planting yourself here. It means a lot.

Grove is a quiet corner of the internet where your words actually belong to you. No algorithms, no ads, no data harvesting — just your space, growing at your pace.

I'll be in touch soon with more. In the meantime, you can reply directly to this email — it comes straight to me.

— Autumn

grove.place

---
Don't want to receive these emails? Unsubscribe: ${unsubscribeUrl}
`.trim();
}

// =============================================================================
// DAY 3: WHAT WE'RE BUILDING
// =============================================================================

export function getDay3Email(unsubscribeUrl: string): OnboardingEmailResult {
  const subject = "What we're building at Grove";

  const html = wrapEmail(
    `
    <tr>
      <td align="center" style="padding-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #3d2914; font-weight: normal;">
          A peek behind the curtain
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f0fdf4; border-radius: 12px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Hey there,
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Since you signed up for Grove, I wanted to share what we're actually building.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          <strong style="color: #16a34a;">Grove is a blogging platform</strong> — but not like the ones you've seen before. No algorithms deciding who sees your work. No ads. No data harvesting. Just your words, your space, your readers.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Here's what you'll get:
        </p>
        <ul style="margin: 0 0 16px 0; padding-left: 20px; color: #3d2914; line-height: 1.8;">
          <li>Your own blog at <strong>yourname.grove.place</strong></li>
          <li>A clean, distraction-free writing experience</li>
          <li>Beautiful themes that put your words first</li>
          <li>Optional community features (if you want them)</li>
          <li>Your data, always exportable, always yours</li>
        </ul>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          We're still growing, but we're getting closer every day. I'll keep you posted.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: #3d2914; opacity: 0.5;">
          — Autumn
        </p>
      </td>
    </tr>
  `,
    unsubscribeUrl,
  );

  const text = `
A peek behind the curtain
=========================

Hey there,

Since you signed up for Grove, I wanted to share what we're actually building.

Grove is a blogging platform — but not like the ones you've seen before. No algorithms deciding who sees your work. No ads. No data harvesting. Just your words, your space, your readers.

Here's what you'll get:

• Your own blog at yourname.grove.place
• A clean, distraction-free writing experience
• Beautiful themes that put your words first
• Optional community features (if you want them)
• Your data, always exportable, always yours

We're still growing, but we're getting closer every day. I'll keep you posted.

— Autumn

grove.place

---
Unsubscribe: ${unsubscribeUrl}
`.trim();

  return { subject, html, text };
}

// =============================================================================
// DAY 7: WHY GROVE EXISTS
// =============================================================================

export function getDay7Email(unsubscribeUrl: string): OnboardingEmailResult {
  const subject = "Why we're building Grove";

  const html = wrapEmail(
    `
    <tr>
      <td align="center" style="padding-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #3d2914; font-weight: normal;">
          Why Grove exists
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f0fdf4; border-radius: 12px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Hey,
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          I've been thinking about why I started Grove, and I wanted to share that with you.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          The internet used to feel like a place where you could just... exist. Make a weird little website. Write without worrying about engagement metrics. Connect with people who actually cared about what you had to say.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Somewhere along the way, that got lost. Everything became about growth, algorithms, monetization. The platforms that promised to give us a voice turned us into products.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          <strong style="color: #16a34a;">Grove is my attempt to bring some of that back.</strong>
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          A place where you own your space. Where your readers find you because they want to, not because an algorithm served you up. Where the business model is simple: you pay for the service, and that's it.
        </p>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Thanks for being here. It means more than you know.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: #3d2914; opacity: 0.5;">
          — Autumn
        </p>
      </td>
    </tr>
  `,
    unsubscribeUrl,
  );

  const text = `
Why Grove exists
================

Hey,

I've been thinking about why I started Grove, and I wanted to share that with you.

The internet used to feel like a place where you could just... exist. Make a weird little website. Write without worrying about engagement metrics. Connect with people who actually cared about what you had to say.

Somewhere along the way, that got lost. Everything became about growth, algorithms, monetization. The platforms that promised to give us a voice turned us into products.

Grove is my attempt to bring some of that back.

A place where you own your space. Where your readers find you because they want to, not because an algorithm served you up. Where the business model is simple: you pay for the service, and that's it.

Thanks for being here. It means more than you know.

— Autumn

grove.place

---
Unsubscribe: ${unsubscribeUrl}
`.trim();

  return { subject, html, text };
}

// =============================================================================
// DAY 14: CHECK-IN
// =============================================================================

export function getDay14Email(unsubscribeUrl: string): OnboardingEmailResult {
  const subject = "Still here, still growing";

  const html = wrapEmail(
    `
    <tr>
      <td align="center" style="padding-bottom: 20px;">
        <h1 style="margin: 0; font-size: 24px; color: #3d2914; font-weight: normal;">
          A quick check-in
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #f0fdf4; border-radius: 12px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Hey,
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          It's been a couple weeks since you signed up for Grove. I wanted to check in and let you know we're still here, still working on this.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Building something good takes time, and I'd rather do it right than rush it out. But progress is happening — every day, Grove gets a little closer to being ready for you.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          <strong style="color: #16a34a;">Questions? Ideas? Just want to say hi?</strong>
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          You can reply directly to this email — it comes straight to me, not a support queue. I read everything.
        </p>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          Thanks for your patience. I promise it'll be worth the wait.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: #3d2914; opacity: 0.5;">
          — Autumn
        </p>
      </td>
    </tr>
  `,
    unsubscribeUrl,
  );

  const text = `
A quick check-in
================

Hey,

It's been a couple weeks since you signed up for Grove. I wanted to check in and let you know we're still here, still working on this.

Building something good takes time, and I'd rather do it right than rush it out. But progress is happening — every day, Grove gets a little closer to being ready for you.

Questions? Ideas? Just want to say hi?

You can reply directly to this email — it comes straight to me, not a support queue. I read everything.

Thanks for your patience. I promise it'll be worth the wait.

— Autumn

grove.place

---
Unsubscribe: ${unsubscribeUrl}
`.trim();

  return { subject, html, text };
}
