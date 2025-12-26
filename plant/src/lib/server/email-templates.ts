/**
 * Onboarding Email Templates
 *
 * Templates for welcome and follow-up emails sent during onboarding.
 */

interface EmailParams {
  name: string;
  username: string;
  email: string;
  postCount?: number;
  checklistComplete?: boolean;
}

/**
 * Base email wrapper with Grove styling
 */
function wrapEmail(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Grove</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fefdfb; font-family: 'Lexend', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td align="center" style="padding-bottom: 30px;">
        <!-- Grove Logo -->
        <svg width="48" height="59" viewBox="0 0 417 512.238" xmlns="http://www.w3.org/2000/svg">
          <path fill="#5d4037" d="M171.274 344.942h74.09v167.296h-74.09V344.942z"/>
          <path fill="#22c55e" d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"/>
        </svg>
      </td>
    </tr>
    ${content}
    <tr>
      <td align="center" style="padding-top: 40px;">
        <p style="margin: 0; font-size: 12px; color: rgba(61, 41, 20, 0.4);">
          grove.place
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Welcome email - sent immediately after signup
 */
export function getWelcomeEmail(params: EmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Welcome to Grove, ${params.name}!`;

  const html = wrapEmail(`
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          Welcome to Grove, ${params.name}!
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Your blog is live and ready at:
        </p>
        <p style="margin: 0 0 24px 0;">
          <a href="https://${params.username}.grove.place" style="font-size: 20px; color: #16a34a; text-decoration: none; font-weight: 500;">
            ${params.username}.grove.place
          </a>
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Here's what to do next:
        </p>
        <ul style="margin: 0 0 24px 0; padding-left: 20px; color: rgba(245, 242, 234, 0.7);">
          <li style="margin-bottom: 8px;">Write your first post</li>
          <li style="margin-bottom: 8px;">Add some vines (sidebar links)</li>
          <li style="margin-bottom: 8px;">Customize your theme</li>
        </ul>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Need help? Visit our <a href="https://grove.place/help" style="color: #16a34a;">Help Center</a> or just reply to this email.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <a href="https://${params.username}.grove.place/admin" style="display: inline-block; padding: 14px 28px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500;">
          Go to Your Blog →
        </a>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          Happy writing!<br>
          — Autumn
        </p>
      </td>
    </tr>
  `);

  const text = `
Welcome to Grove, ${params.name}!

Your blog is live and ready at: ${params.username}.grove.place

Here's what to do next:
• Write your first post
• Add some vines (sidebar links)
• Customize your theme

Need help? Visit grove.place/help or reply to this email.

Happy writing!
— Autumn
`.trim();

  return { subject, html, text };
}

/**
 * Day 1 checklist reminder - sent if checklist incomplete
 */
export function getDay1Email(params: EmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Finish setting up your Grove blog`;

  const html = wrapEmail(`
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          Hey ${params.name}!
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          I noticed you haven't finished setting up your blog yet. No rush—but if you need help with anything, just reply to this email.
        </p>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Your checklist is waiting at <a href="https://${params.username}.grove.place/admin" style="color: #16a34a;">${params.username}.grove.place</a>
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          — Autumn
        </p>
      </td>
    </tr>
  `);

  const text = `
Hey ${params.name}!

I noticed you haven't finished setting up your blog yet. No rush—but if you need help with anything, just reply to this email.

Your checklist is waiting at ${params.username}.grove.place

— Autumn
`.trim();

  return { subject, html, text };
}

/**
 * Day 3 check-in
 */
export function getDay3Email(params: EmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `How's it going, ${params.name}?`;

  const hasPublished = (params.postCount || 0) > 0;

  const html = wrapEmail(`
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          How's it going, ${params.name}?
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          You've been on Grove for a few days now. How's it feeling?
        </p>
        ${
          hasPublished
            ? `<p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
                  I saw you published ${params.postCount} post${params.postCount === 1 ? "" : "s"}! That's awesome.
                </p>`
            : `<p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
                  If you haven't written your first post yet, no pressure—sometimes it takes a while to find the right words.
                </p>`
        }
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          I'm here if you need anything. Just hit reply.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          — Autumn
        </p>
      </td>
    </tr>
  `);

  const text = `
How's it going, ${params.name}?

You've been on Grove for a few days now. How's it feeling?

${hasPublished ? `I saw you published ${params.postCount} post${params.postCount === 1 ? "" : "s"}! That's awesome.` : "If you haven't written your first post yet, no pressure—sometimes it takes a while to find the right words."}

I'm here if you need anything. Just hit reply.

— Autumn
`.trim();

  return { subject, html, text };
}

/**
 * Day 7 check-in
 */
export function getDay7Email(params: EmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `One week with Grove`;

  const html = wrapEmail(`
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          One week with Grove
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Hey ${params.name}! It's been a week since you joined Grove. I hope you're finding your rhythm.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Quick tips:
        </p>
        <ul style="margin: 0 0 24px 0; padding-left: 20px; color: rgba(245, 242, 234, 0.7);">
          <li style="margin-bottom: 8px;">Use vines to connect related posts</li>
          <li style="margin-bottom: 8px;">Your RSS feed is at ${params.username}.grove.place/rss.xml</li>
          <li style="margin-bottom: 8px;">You can export your data anytime from Settings</li>
        </ul>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Questions? I'm here.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          — Autumn
        </p>
      </td>
    </tr>
  `);

  const text = `
	One week with Grove

Hey ${params.name}! It's been a week since you joined Grove. I hope you're finding your rhythm.

Quick tips:
• Use vines to connect related posts
• Your RSS feed is at ${params.username}.grove.place/rss.xml
• You can export your data anytime from Settings

Questions? I'm here.

— Autumn
`.trim();

  return { subject, html, text };
}

/**
 * Day 30 milestone check-in
 */
export function getDay30Email(params: EmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `One month!`;

  const hasPublished = (params.postCount || 0) > 0;

  const html = wrapEmail(`
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          One month!
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Hey ${params.name}! You've been growing with Grove for a whole month now.
        </p>
        ${
          hasPublished
            ? `<p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
            You've published <strong style="color: #16a34a;">${params.postCount} post${params.postCount === 1 ? "" : "s"}</strong>! That's your voice out in the world.
          </p>`
            : ""
        }
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Thanks for being part of this. I'd love to hear how it's going—what's working, what could be better. Just hit reply.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          — Autumn
        </p>
      </td>
    </tr>
  `);

  const text = `
	One month!

Hey ${params.name}! You've been growing with Grove for a whole month now.

${hasPublished ? `You've published ${params.postCount} post${params.postCount === 1 ? "" : "s"}! That's your voice out in the world.` : ""}

Thanks for being part of this. I'd love to hear how it's going—what's working, what could be better. Just hit reply.

— Autumn
`.trim();

  return { subject, html, text };
}

/**
 * Payment Failed Email
 */
interface PaymentFailedParams {
  name: string;
  subdomain: string;
}

export function getPaymentFailedEmail(params: PaymentFailedParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Issue with your Grove payment`;

  const html = wrapEmail(`
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          Hi ${params.name},
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          We tried to charge your card for your Grove subscription, but it didn't go through. These things happen—expired cards, bank holds, cosmic rays.
        </p>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #16a34a; font-weight: 500;">
          Your blog is still live. Nothing's been taken down. You have time to sort this out.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(245, 242, 234, 0.1); margin: 24px 0;" />
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #f5f2ea; font-weight: 500;">
          What to do
        </h2>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Update your payment method here:
        </p>
        <p style="margin: 0 0 24px 0;">
          <a href="https://plant.grove.place/billing" style="color: #16a34a; text-decoration: none;">
            plant.grove.place/billing
          </a>
        </p>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Once updated, we'll retry the charge automatically. If you run into any trouble, just reply to this email.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(245, 242, 234, 0.1); margin: 24px 0;" />
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #f5f2ea; font-weight: 500;">
          What happens if not fixed
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          If we can't process payment after a few attempts over the next 7 days, your subscription will be paused. Your blog will still exist—your content isn't going anywhere—but it won't be publicly visible until the billing is sorted.
        </p>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          You can always reactivate by updating your payment info. No penalty, no "restart fee," no drama.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(245, 242, 234, 0.1); margin: 24px 0;" />
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #f5f2ea; font-weight: 500;">
          Need to cancel instead?
        </h2>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          If you'd rather not continue, you can cancel here: <a href="https://plant.grove.place/billing" style="color: #16a34a;">plant.grove.place/billing</a>
        </p>
        <p style="margin: 16px 0 0 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          No hard feelings. Your content is always exportable.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          —Autumn
        </p>
      </td>
    </tr>
  `);

  const text = `
Hi ${params.name},

We tried to charge your card for your Grove subscription, but it didn't go through. These things happen—expired cards, bank holds, cosmic rays.

Your blog is still live. Nothing's been taken down. You have time to sort this out.

---

What to do:

Update your payment method here:
https://plant.grove.place/billing

Once updated, we'll retry the charge automatically. If you run into any trouble, just reply to this email.

---

What happens if not fixed:

If we can't process payment after a few attempts over the next 7 days, your subscription will be paused. Your blog will still exist—your content isn't going anywhere—but it won't be publicly visible until the billing is sorted.

You can always reactivate by updating your payment info. No penalty, no "restart fee," no drama.

---

Need to cancel instead?

If you'd rather not continue, you can cancel here: https://plant.grove.place/billing

No hard feelings. Your content is always exportable.

—Autumn
`.trim();

  return { subject, html, text };
}

/**
 * Payment Received Email
 */
interface PaymentReceivedParams {
  name: string;
  subdomain: string;
  amount: string;
  paymentDate: string;
  planName: string;
  interval: string;
  nextPaymentDate: string;
  invoiceId: string;
}

export function getPaymentReceivedEmail(params: PaymentReceivedParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Receipt for your Grove subscription`;

  const html = wrapEmail(`
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          Hi ${params.name},
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Just confirming we received your payment. Thanks for sticking with us.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(245, 242, 234, 0.1); margin: 24px 0;" />
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #f5f2ea; font-weight: 500;">
          Receipt
        </h2>
        <table style="width: 100%; margin: 0 0 24px 0;">
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">Amount:</td>
            <td style="padding: 8px 0; font-size: 14px; color: #f5f2ea; text-align: right;">$${params.amount}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">Date:</td>
            <td style="padding: 8px 0; font-size: 14px; color: #f5f2ea; text-align: right;">${params.paymentDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">Plan:</td>
            <td style="padding: 8px 0; font-size: 14px; color: #f5f2ea; text-align: right;">${params.planName} (${params.interval}ly)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">Next payment:</td>
            <td style="padding: 8px 0; font-size: 14px; color: #f5f2ea; text-align: right;">${params.nextPaymentDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">Invoice ID:</td>
            <td style="padding: 8px 0; font-size: 14px; color: #f5f2ea; text-align: right; font-family: monospace;">${params.invoiceId}</td>
          </tr>
        </table>
        <hr style="border: none; border-top: 1px solid rgba(245, 242, 234, 0.1); margin: 24px 0;" />
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #f5f2ea; font-weight: 500;">
          Your blog
        </h2>
        <p style="margin: 0 0 16px 0;">
          <a href="https://${params.subdomain}.grove.place" style="font-size: 18px; color: #16a34a; text-decoration: none; font-weight: 500;">
            ${params.subdomain}.grove.place
          </a>
        </p>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Still there, still yours. Keep writing when you feel like it.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(245, 242, 234, 0.1); margin: 24px 0;" />
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: rgba(245, 242, 234, 0.5);">
          If you need a formal receipt for taxes or expenses, you can download one from your <a href="https://plant.grove.place/billing" style="color: #16a34a;">billing page</a>.
        </p>
        <p style="margin: 16px 0 0 0; font-size: 14px; line-height: 1.6; color: rgba(245, 242, 234, 0.5);">
          Questions? Just reply.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          —Autumn
        </p>
      </td>
    </tr>
  `);

  const text = `
Hi ${params.name},

Just confirming we received your payment. Thanks for sticking with us.

---

Receipt:

Amount: $${params.amount}
Date: ${params.paymentDate}
Plan: ${params.planName} (${params.interval}ly)
Next payment: ${params.nextPaymentDate}
Invoice ID: ${params.invoiceId}

---

Your blog:
https://${params.subdomain}.grove.place

Still there, still yours. Keep writing when you feel like it.

---

If you need a formal receipt for taxes or expenses, you can download one from your billing page: https://plant.grove.place/billing

Questions? Just reply.

—Autumn
`.trim();

  return { subject, html, text };
}

/**
 * Trial Ending Soon Email
 */
interface TrialEndingParams {
  name: string;
  subdomain: string;
  trialEndDay: string;
  trialEndDate: string;
  planName: string;
  amount: string;
  interval: string;
}

export function getTrialEndingSoonEmail(params: TrialEndingParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your trial ends ${params.trialEndDay}`;

  const html = wrapEmail(`
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          Hi ${params.name},
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Quick heads-up: your Grove trial ends on <strong style="color: #f5f2ea;">${params.trialEndDate}</strong>.
        </p>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          After that, your <strong style="color: #f5f2ea;">${params.planName}</strong> subscription will begin at <strong style="color: #16a34a;">$${params.amount}/${params.interval}</strong>. Your card on file will be charged automatically.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(245, 242, 234, 0.1); margin: 24px 0;" />
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #f5f2ea; font-weight: 500;">
          What stays the same
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Everything. Your blog stays live, your posts stay published, your readers don't notice a thing. No interruption, no migration, no extra steps.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(245, 242, 234, 0.1); margin: 24px 0;" />
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #f5f2ea; font-weight: 500;">
          If you'd rather not continue
        </h2>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          No hard feelings—really. You can cancel anytime before ${params.trialEndDate} and you won't be charged.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          <strong style="color: #f5f2ea;">To cancel:</strong> <a href="https://plant.grove.place/billing" style="color: #16a34a; text-decoration: none;">plant.grove.place/billing</a>
        </p>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          If you cancel, your blog will remain accessible through the end of your trial period, and you can export all your content anytime.
        </p>
        <hr style="border: none; border-top: 1px solid rgba(245, 242, 234, 0.1); margin: 24px 0;" />
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #f5f2ea; font-weight: 500;">
          Questions?
        </h2>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Just reply to this email. Happy to help with anything.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <p style="margin: 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">
          —Autumn
        </p>
      </td>
    </tr>
  `);

  const text = `
Hi ${params.name},

Quick heads-up: your Grove trial ends on ${params.trialEndDate}.

After that, your ${params.planName} subscription will begin at $${params.amount}/${params.interval}. Your card on file will be charged automatically.

---

What stays the same:

Everything. Your blog stays live, your posts stay published, your readers don't notice a thing. No interruption, no migration, no extra steps.

---

If you'd rather not continue:

No hard feelings—really. You can cancel anytime before ${params.trialEndDate} and you won't be charged.

To cancel: https://plant.grove.place/billing

If you cancel, your blog will remain accessible through the end of your trial period, and you can export all your content anytime.

---

Questions?

Just reply to this email. Happy to help with anything.

—Autumn
`.trim();

  return { subject, html, text };
}
