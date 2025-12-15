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
<body style="margin: 0; padding: 0; background-color: #171a1e; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td align="center" style="padding-bottom: 30px;">
        <!-- Logo -->
        <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 10C35 25 20 35 20 55C20 75 33 90 50 90C67 90 80 75 80 55C80 35 65 25 50 10Z" fill="#16a34a" fill-opacity="0.15"/>
          <path d="M50 20C40 32 30 40 30 55C30 70 38 80 50 80C62 80 70 70 70 55C70 40 60 32 50 20Z" fill="#16a34a" fill-opacity="0.3"/>
          <path d="M50 32C44 40 38 46 38 55C38 64 43 70 50 70C57 70 62 64 62 55C62 46 56 40 50 32Z" fill="#16a34a"/>
          <path d="M50 70V95" stroke="#16a34a" stroke-width="3" stroke-linecap="round"/>
        </svg>
      </td>
    </tr>
    ${content}
    <tr>
      <td align="center" style="padding-top: 40px;">
        <p style="margin: 0; font-size: 12px; color: rgba(245, 242, 234, 0.4);">
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
export function getWelcomeEmail(params: EmailParams): { subject: string; html: string; text: string } {
	const subject = `Welcome to Grove, ${params.name}! 🌱`;

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
export function getDay1Email(params: EmailParams): { subject: string; html: string; text: string } {
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
export function getDay3Email(params: EmailParams): { subject: string; html: string; text: string } {
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
            I saw you published ${params.postCount} post${params.postCount === 1 ? '' : 's'}! That's awesome. 🌱
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

${hasPublished ? `I saw you published ${params.postCount} post${params.postCount === 1 ? '' : 's'}! That's awesome.` : "If you haven't written your first post yet, no pressure—sometimes it takes a while to find the right words."}

I'm here if you need anything. Just hit reply.

— Autumn
`.trim();

	return { subject, html, text };
}

/**
 * Day 7 check-in
 */
export function getDay7Email(params: EmailParams): { subject: string; html: string; text: string } {
	const subject = `One week with Grove`;

	const html = wrapEmail(`
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          One week with Grove 🌿
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
One week with Grove 🌿

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
export function getDay30Email(params: EmailParams): { subject: string; html: string; text: string } {
	const subject = `One month! 🎉`;

	const hasPublished = (params.postCount || 0) > 0;

	const html = wrapEmail(`
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          One month! 🎉
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Hey ${params.name}! You've been growing with Grove for a whole month now.
        </p>
        ${
					hasPublished
						? `<p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
            You've published <strong style="color: #16a34a;">${params.postCount} post${params.postCount === 1 ? '' : 's'}</strong>! That's your voice out in the world.
          </p>`
						: ''
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
One month! 🎉

Hey ${params.name}! You've been growing with Grove for a whole month now.

${hasPublished ? `You've published ${params.postCount} post${params.postCount === 1 ? '' : 's'}! That's your voice out in the world.` : ''}

Thanks for being part of this. I'd love to hear how it's going—what's working, what could be better. Just hit reply.

— Autumn
`.trim();

	return { subject, html, text };
}
