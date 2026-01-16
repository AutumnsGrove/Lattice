---
title: "My Site Isn't Loading"
slug: my-site-isnt-loading
category: troubleshooting
order: 1
keywords: [not loading, down, broken, error, 404, 500, can't access, offline, site down]
related: [checking-grove-status, contact-support]
---

# My Site Isn't Loading

If your blog isn't loading, let's figure out what's going on. Start at the top and work your way down.

## First: Is it just you?

Before anything else, let's rule out local issues.

**Try this:**
1. Open your blog URL in a different browser
2. Try from your phone (on cellular, not WiFi)
3. Ask a friend to try loading it

If it works for others but not you, the issue is likely:
- Your internet connection
- Your browser cache (try clearing it or using incognito mode)
- Your DNS (try restarting your router)

**How to clear your browser cache:**
- **Chrome:** Settings → Privacy and Security → Clear browsing data → Select "Cached images and files"
- **Firefox:** Settings → Privacy & Security → Cookies and Site Data → Clear Data
- **Safari:** Safari menu → Clear History → Select timeframe
- **Edge:** Settings → Privacy, search, and services → Clear browsing data

If it's broken for everyone, keep reading.

## Check Grove's status

We post updates at **status.grove.place** when there's a known issue.

If you see an incident listed, we're already aware and working on it. Status updates are posted there in real-time. You don't need to contact us—we'll update that page as things change.

## Common issues and fixes

### "This site can't be reached" or DNS errors

This usually means the domain isn't pointing to Grove correctly.

**If you're using a grove.place subdomain:**
This shouldn't happen. [Contact us](/contact) with your blog URL—something's wrong on our end.

**If you're using a custom domain:**
Check that your DNS records are still configured correctly:
- CNAME record pointing to `grove.place` (or the value we provided)
- No conflicting A records

DNS changes can take up to 48 hours to fully propagate. If you recently changed something, it might just need time.

### Error 404 (Page not found)

Your blog exists, but the specific page doesn't.

- If it's your homepage: Your blog might not have any published posts yet. Publish something and refresh.
- If it's a specific post: The URL might be wrong. Check that the slug matches what's in your admin panel.

### Error 500 (Server error)

Something went wrong on our end.

- Refresh the page and try again
- If it persists, check **status.grove.place** for known issues
- If there's no incident posted, [contact us](/contact): this is something we need to fix

### Slow loading or timing out

If your site loads but takes forever:

- Large images can slow things down. Consider compressing them before uploading.
- If it's only slow sometimes, we might be experiencing high traffic. It should resolve on its own.
- Persistent slowness? [Let us know](/contact). We want your blog to be fast.

## If you have a custom domain

Custom domain issues have their own quirks. Common culprits:

- **SSL certificate not issued yet:** New domains can take up to 24 hours to get their SSL certificate. During this time, you might see security warnings.
- **Domain expired:** Check that your domain registration is current with your registrar.
- **DNS provider issues:** Sometimes the problem is upstream. Try checking your registrar's status page.

If you're still having trouble with your custom domain, [contact us](/contact) with your domain name and we'll help you troubleshoot.

## Still stuck?

If you've tried the above and your site is still down:

1. **Note the exact error message** you're seeing (screenshot if possible)
2. **Note your blog URL** (subdomain or custom domain)
3. **Contact us at [/contact](/contact)**

Include those details in your message. We'll prioritize site-down issues and get back to you as quickly as we can.

---

*Site outages are stressful. We take them seriously. If your blog is down, we want to know about it.*
