/**
 * Export Ready Email Template
 *
 * Sent when a user's zip export is complete and ready for download.
 * Uses the same Grove email styling as onboarding templates.
 */

export function getExportReadyEmail(params: {
	name: string;
	downloadUrl: string;
	itemCounts: { posts: number; pages: number; images: number };
	fileSize: string;
	expiresAt: string;
}): { subject: string; html: string; text: string } {
	const { name, downloadUrl, itemCounts, fileSize, expiresAt } = params;

	const subject = "Your Grove export is ready";

	const html = `<!DOCTYPE html>
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
        <img src="https://cdn.grove.place/email/logo.png" width="48" height="48" alt="Grove" style="display: inline-block; border-radius: 50%;" />
      </td>
    </tr>
    <tr>
      <td style="padding: 30px; background-color: #1e2227; border-radius: 12px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #f5f2ea; font-weight: normal;">
          Your export is ready!
        </h1>
        <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: rgba(245, 242, 234, 0.7);">
          Hey ${name}! Your Grove export is packed and waiting for you. Here's what's inside:
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
          <tr>
            <td style="padding: 4px 16px 4px 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">Posts</td>
            <td style="padding: 4px 0; font-size: 14px; color: #f5f2ea; font-weight: 500;">${itemCounts.posts}</td>
          </tr>
          <tr>
            <td style="padding: 4px 16px 4px 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">Pages</td>
            <td style="padding: 4px 0; font-size: 14px; color: #f5f2ea; font-weight: 500;">${itemCounts.pages}</td>
          </tr>
          <tr>
            <td style="padding: 4px 16px 4px 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">Images</td>
            <td style="padding: 4px 0; font-size: 14px; color: #f5f2ea; font-weight: 500;">${itemCounts.images}</td>
          </tr>
          <tr>
            <td style="padding: 4px 16px 4px 0; font-size: 14px; color: rgba(245, 242, 234, 0.5);">Total size</td>
            <td style="padding: 4px 0; font-size: 14px; color: #f5f2ea; font-weight: 500;">${fileSize}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <a href="${downloadUrl}" style="display: inline-block; padding: 14px 28px; background-color: #16a34a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 500;">
          Download Your Export →
        </a>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 20px;">
        <p style="margin: 0; font-size: 13px; color: rgba(61, 41, 20, 0.5); line-height: 1.5;">
          This link leads to your account where you can download the file.<br>
          Your export will be available until ${expiresAt}.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 16px;">
        <p style="margin: 0; font-size: 14px; color: rgba(61, 41, 20, 0.5);">
          This is your data — you own it.<br>
          — Grove
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 40px;">
        <p style="margin: 0; font-size: 12px; color: rgba(61, 41, 20, 0.4);">
          grove.place
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

	const text = `Your Grove export is ready!

Hey ${name}! Your export is packed and waiting:
- ${itemCounts.posts} posts
- ${itemCounts.pages} pages
- ${itemCounts.images} images
- Total size: ${fileSize}

Download it here: ${downloadUrl}

Your export will be available until ${expiresAt}.

This is your data — you own it.

— Grove
grove.place`;

	return { subject, html, text };
}
