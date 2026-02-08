---
title: Trouble Signing In
description: What to try when you can't log in to your Grove account
category: help
section: troubleshooting
lastUpdated: '2026-02-08'
slug: authentication-issues
order: 2
keywords:
  - login
  - sign in
  - can't log in
  - authentication
  - Google
  - session
  - cookies
  - locked out
  - incognito
  - cache
related:
  - creating-your-account
  - sessions-and-cookies
  - checking-grove-status
---

# Trouble Signing In

If you can't log in to your Grove account, let's work through the most common causes.

## Clear your browser cache and cookies

This fixes the majority of login issues. Old session data can get stuck and confuse things.

**How to clear for Grove specifically:**

1. Go to your browser's settings
2. Find the cookies/site data section
3. Search for `grove.place`
4. Delete all entries for it
5. Try signing in again

**Or use the nuclear option:**

- **Chrome:** **Settings → Privacy and Security → Clear browsing data** → Select "Cookies" and "Cached images and files"
- **Firefox:** **Settings → Privacy & Security → Cookies and Site Data → Clear Data**
- **Safari:** **Safari menu → Clear History** → Select timeframe
- **Edge:** **Settings → Privacy, search, and services → Clear browsing data**

After clearing, you'll need to sign in fresh. That's expected.

## Try incognito/private mode

Open an incognito window (or private browsing in Safari/Firefox) and try signing in there. This rules out extensions, cached data, and cookie issues all at once.

If it works in incognito but not in your regular browser, the problem is likely a browser extension interfering with the sign-in flow. Privacy extensions and ad blockers sometimes block the redirect back from Google. Try disabling them temporarily for `grove.place`.

## Check that cookies aren't blocked

Grove needs cookies to keep you logged in. If your browser or a privacy extension blocks cookies for `grove.place`, you won't be able to sign in at all.

Make sure cookies are allowed for `grove.place`. If you're using a privacy-focused browser like Brave or Firefox with strict tracking protection, you may need to add an exception.

## Make sure you're using the right Google account

Grove uses Google for authentication. If you have multiple Google accounts, it's easy to accidentally pick the wrong one during sign-in.

Check which Google account you're currently signed into in your browser. If it's not the one you used to create your Grove account, sign out of Google first, then try the Grove sign-in flow again and select the correct account.

Your Grove account is tied to a specific Google account. There's no way to switch which one is connected.

## Check Grove's status

If sign-in is broken for everyone, we'll know about it. Check **status.grove.place** for any ongoing incidents.

If there's an active incident, we're already working on it. You don't need to contact us—updates are posted there in real-time.

## Your session might have expired

Grove sessions last about 30 days. After that, you'll see the sign-in screen again. This is normal—just sign in again with your Google account.

If you're being signed out more frequently than that, clearing your cookies (step one above) usually resolves it.

## Still can't get in?

If none of the above helps:

1. Note which browser you're using and the version
2. Note any error messages you see (a screenshot helps)
3. [Contact us](/contact)

We'll figure it out together.

---

*Getting locked out is frustrating. We'll help you get back in.*
