/**
 * Payment Lifecycle Email Templates
 *
 * Emails related to subscription payments:
 * - Payment received (thank you)
 * - Payment failed (action needed)
 * - Trial ending (reminder)
 */

import { wrapEmail, paragraph, button, highlight, escapeHtml } from "./base";
import type { RenderResult } from "./index";

export interface PaymentData {
  /** User's name */
  name?: string;
  /** Plan name (e.g., "Grove Monthly") */
  planName?: string;
  /** Amount paid/due */
  amount?: string;
  /** Payment date */
  date?: string;
  /** Next billing date */
  nextBillingDate?: string;
  /** Days until trial ends */
  daysRemaining?: number;
  /** Link to update payment method */
  updatePaymentUrl?: string;
  /** Link to manage subscription */
  manageUrl?: string;
}

/**
 * Payment received (thank you) email.
 */
function paymentReceivedTemplate(data: PaymentData): RenderResult {
  const {
    name,
    planName = "your Grove subscription",
    amount,
    date,
    nextBillingDate,
    manageUrl = "https://plant.grove.place/account",
  } = data;

  const greeting = name ? `Hey ${escapeHtml(name)},` : "Hey,";

  let details = "";
  if (amount || date || nextBillingDate) {
    const items = [];
    if (amount) items.push(`<strong>Amount:</strong> ${escapeHtml(amount)}`);
    if (date) items.push(`<strong>Date:</strong> ${escapeHtml(date)}`);
    if (nextBillingDate)
      items.push(
        `<strong>Next billing:</strong> ${escapeHtml(nextBillingDate)}`,
      );

    details = highlight(
      items.map((item) => `<p style="margin: 4px 0;">${item}</p>`).join(""),
    );
  }

  const contentHtml = `
    ${paragraph(greeting)}
    ${paragraph(`Thank you for your payment for ${escapeHtml(planName)}. Your support means everything — it's what keeps Grove growing.`)}
    ${details}
    ${paragraph("If you ever need anything, just reply to this email. I read everything.")}
    ${button("Manage subscription", manageUrl)}
  `;

  const html = wrapEmail({
    previewText: "Payment received — thank you for supporting Grove!",
    content: contentHtml,
    signature: "— Autumn",
  });

  const text = `${greeting}

Thank you for your payment for ${planName}. Your support means everything — it's what keeps Grove growing.

${amount ? `Amount: ${amount}` : ""}
${date ? `Date: ${date}` : ""}
${nextBillingDate ? `Next billing: ${nextBillingDate}` : ""}

If you ever need anything, just reply to this email. I read everything.

Manage subscription: ${manageUrl}

— Autumn
Grove`;

  return { html, text };
}

/**
 * Payment failed email.
 */
function paymentFailedTemplate(data: PaymentData): RenderResult {
  const {
    name,
    planName = "your Grove subscription",
    amount,
    updatePaymentUrl = "https://plant.grove.place/account/billing",
  } = data;

  const greeting = name ? `Hey ${escapeHtml(name)},` : "Hey,";

  const contentHtml = `
    ${paragraph(greeting)}
    ${paragraph(`We had trouble processing your payment${amount ? ` of ${escapeHtml(amount)}` : ""} for ${escapeHtml(planName)}.`)}
    ${paragraph("This can happen for lots of reasons — expired card, bank security checks, etc. No worries though, these things happen.")}
    ${paragraph("To keep your grove growing, please update your payment method:")}
    ${button("Update payment method", updatePaymentUrl)}
    ${paragraph("If you're having any issues or have questions, just reply to this email and I'll help sort it out.")}
  `;

  const html = wrapEmail({
    previewText:
      "We had trouble processing your payment — please update your payment method",
    content: contentHtml,
    signature: "— Autumn",
  });

  const text = `${greeting}

We had trouble processing your payment${amount ? ` of ${amount}` : ""} for ${planName}.

This can happen for lots of reasons — expired card, bank security checks, etc. No worries though, these things happen.

To keep your grove growing, please update your payment method:
${updatePaymentUrl}

If you're having any issues or have questions, just reply to this email and I'll help sort it out.

— Autumn
Grove`;

  return { html, text };
}

/**
 * Trial ending soon email.
 */
function trialEndingTemplate(data: PaymentData): RenderResult {
  const {
    name,
    daysRemaining = 3,
    planName = "Grove",
    manageUrl = "https://plant.grove.place/account",
  } = data;

  const greeting = name ? `Hey ${escapeHtml(name)},` : "Hey,";
  const dayWord = daysRemaining === 1 ? "day" : "days";

  const contentHtml = `
    ${paragraph(greeting)}
    ${paragraph(`Your ${escapeHtml(planName)} trial ends in ${daysRemaining} ${dayWord}.`)}
    ${paragraph("I hope you've found a cozy corner of the internet here. If Grove feels like home, I'd love for you to stay.")}
    ${paragraph("If you're not ready to commit, that's okay too. Your content will always be yours — we'll email you everything if you decide to leave.")}
    ${button("View your account", manageUrl)}
    ${paragraph("Questions? Just reply to this email.")}
  `;

  const html = wrapEmail({
    previewText: `Your Grove trial ends in ${daysRemaining} ${dayWord}`,
    content: contentHtml,
    signature: "— Autumn",
  });

  const text = `${greeting}

Your ${planName} trial ends in ${daysRemaining} ${dayWord}.

I hope you've found a cozy corner of the internet here. If Grove feels like home, I'd love for you to stay.

If you're not ready to commit, that's okay too. Your content will always be yours — we'll email you everything if you decide to leave.

View your account: ${manageUrl}

Questions? Just reply to this email.

— Autumn
Grove`;

  return { html, text };
}

/**
 * Export all payment templates.
 */
export const paymentTemplates = {
  received: paymentReceivedTemplate,
  failed: paymentFailedTemplate,
  trialEnding: trialEndingTemplate,
};
