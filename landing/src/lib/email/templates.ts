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
        <svg width="60" height="73" viewBox="0 0 417 512" xmlns="http://www.w3.org/2000/svg">
          <path fill="#5d4037" d="M171.274 344.942h74.09v167.296h-74.09V344.942z"/>
          <path fill="#16a34a" d="M0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z"/>
        </svg>
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
          Thank you for joining us early.
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          We're building something special — a quiet corner of the internet where your words can grow and flourish.
        </p>
        <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #3d2914;">
          We'll reach out when Grove is ready to bloom. Until then, thank you for believing in what we're growing.
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 40px;">
        <p style="margin: 0; font-size: 14px; color: #3d2914; opacity: 0.5;">
          — The Grove Team
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 30px;">
        <div style="display: inline-block;">
          <span style="display: inline-block; width: 6px; height: 6px; background-color: #bbf7d0; border-radius: 50%; margin: 0 4px;"></span>
          <span style="display: inline-block; width: 6px; height: 6px; background-color: #86efac; border-radius: 50%; margin: 0 4px;"></span>
          <span style="display: inline-block; width: 6px; height: 6px; background-color: #4ade80; border-radius: 50%; margin: 0 4px;"></span>
        </div>
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

Thank you for joining us early.

We're building something special — a quiet corner of the internet where your words can grow and flourish.

We'll reach out when Grove is ready to bloom. Until then, thank you for believing in what we're growing.

— The Grove Team

grove.place

---
Don't want to receive these emails? Unsubscribe: ${unsubscribeUrl}
`.trim();
}
