export function getWelcomeEmailHtml(): string {
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
        <!-- Logo -->
        <svg width="60" height="60" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M50 10C35 25 20 35 20 55C20 75 33 90 50 90C67 90 80 75 80 55C80 35 65 25 50 10Z" fill="#16a34a" fill-opacity="0.15"/>
          <path d="M50 20C40 32 30 40 30 55C30 70 38 80 50 80C62 80 70 70 70 55C70 40 60 32 50 20Z" fill="#16a34a" fill-opacity="0.3"/>
          <path d="M50 32C44 40 38 46 38 55C38 64 43 70 50 70C57 70 62 64 62 55C62 46 56 40 50 32Z" fill="#16a34a"/>
          <path d="M50 70V95" stroke="#16a34a" stroke-width="3" stroke-linecap="round"/>
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
  </table>
</body>
</html>
`.trim();
}

export function getWelcomeEmailText(): string {
	return `
Welcome to Grove
================

a place to Be

Thank you for joining us early.

We're building something special — a quiet corner of the internet where your words can grow and flourish.

We'll reach out when Grove is ready to bloom. Until then, thank you for believing in what we're growing.

— The Grove Team

grove.place
`.trim();
}
