---
title: Trouble Signing In
description: What to try when you can't log in to your Grove account
category: help
section: troubleshooting
lastUpdated: '2026-10-03'
slug: authentication-issues
order: 2
keywords:
  - login
  - sign in
  - can't log in
  - authentication
  - Google
  - email code
  - code not arriving
  - code expired
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

## Signing in with an emailed code

If you chose **Continue with email**, these are the usual snags.

**The code never arrived.** Give it a minute or two, then check your spam or junk folder. The email comes from `auth@grove.place` and the subject line starts with your six digits. Make sure the address you typed is spelled right. If it's wrong, click **Use a different email** and start over.

**"That code has expired."** Codes last 10 minutes. Click **Send a new code** and use the newest email. Older codes stop working once a new one is sent.

**"That code doesn't match."** Check for a typo, and make sure you're reading the newest email if you've asked for more than one. Spaces and dashes are fine.

**"That code has been used up."** A code allows three wrong guesses, then it's burned. Click **Send a new code**.

**"Too many tries."** To keep inboxes from being flooded, we limit how many codes can be sent: three every 10 minutes. Wait a few minutes and try again. This one resolves itself.

> 💡 **Tip:** If codes keep failing, try Continue with Google instead, as long as your Google account uses the same email address.

## Make sure you're using the right account

Your Grove account is tied to your **email address**. Whichever way you sign in, that address is what Grove recognizes.

**Using Google?** If you have several Google accounts, it's easy to pick the wrong one. Check which one your browser is signed into. If it isn't the one you used for Grove, sign out of Google first, then try again and select the right account.

**Using email?** Double-check the address. A different address, even a similar one, is a different account, and signing in with it will start a brand new blog setup. If you land on onboarding when you expected your existing blog, that's the most likely reason.

Both methods work for the same address, so you're free to switch between Google and an emailed code. To use a different email entirely, that would be a separate account.

## Check Grove's status

If sign-in is broken for everyone, we'll know about it. Check **status.grove.place** for any ongoing incidents.

If there's an active incident, we're already working on it. You don't need to contact us—updates are posted there in real-time.

## Your session might have expired

Grove sessions last about 30 days. After that, you'll see the sign-in screen again. This is normal—just sign in again with Google or an emailed code.

If you're being signed out more frequently than that, clearing your cookies (step one above) usually resolves it.

## Still can't get in?

If none of the above helps:

1. Note which browser you're using and the version
2. Note any error messages you see (a screenshot helps)
3. [Contact us](/contact)

We'll figure it out together.

---

*Getting locked out is frustrating. We'll help you get back in.*
