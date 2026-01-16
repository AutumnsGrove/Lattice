---
title: "Browser Compatibility"
slug: browser-compatibility
category: troubleshooting
order: 7
keywords: [browser, chrome, firefox, safari, edge, mobile, compatibility, supported, not working]
related: [my-site-isnt-loading, known-limitations]
---

# Browser Compatibility

Grove works in all modern browsers. Here's what's supported and what to do if something isn't working right.

## Supported browsers

Grove is tested and works in:

| Browser | Minimum Version | Notes |
|---------|-----------------|-------|
| **Chrome** | 90+ | Full support |
| **Firefox** | 90+ | Full support |
| **Safari** | 14+ | Full support |
| **Edge** | 90+ | Full support (Chromium-based) |
| **Mobile Safari** | iOS 14+ | Full support |
| **Chrome Mobile** | Android 10+ | Full support |

**In practice:** If your browser auto-updates (most do), you're fine. Grove uses standard web technologies that have been stable for years.

## What "supported" means

For readers visiting your blog:
- Pages load correctly
- Images display
- Theme renders as intended
- Navigation works
- Comments and reactions function

For you in the admin panel:
- Editor works correctly
- Image uploads succeed
- Settings save properly
- All admin features accessible

## Browsers we don't support

**Internet Explorer:** Not supported at all. IE was retired by Microsoft in 2022. If you're still using it, please switch to a modern browser.

**Very old browser versions:** Browsers more than ~3 years out of date may have issues. CSS features or JavaScript APIs we rely on might not exist.

**Text-only browsers:** Lynx, w3m, and similar text browsers will show content but without styling. This is fine for reading—the content is still accessible.

## Known quirks

### Safari private browsing

Safari's private browsing mode blocks some storage features more aggressively than other browsers. The editor's autosave-to-local-storage feature may not work in private mode. Your work still saves to the server when you click Save—you just won't get the local backup.

### Firefox strict tracking protection

If you have Firefox's Enhanced Tracking Protection set to "Strict," it may occasionally interfere with authentication flows. If you can't log in, try setting tracking protection to "Standard" for Grove, or add an exception.

### Mobile keyboards and the editor

On some mobile devices, the formatting toolbar may compete with the keyboard for screen space. This is a limitation of mobile web editing in general. For long-form writing, we recommend a desktop or tablet.

## If something isn't working

### Step 1: Check your browser version

- **Chrome:** Menu → Help → About Google Chrome
- **Firefox:** Menu → Help → About Firefox
- **Safari:** Safari menu → About Safari
- **Edge:** Menu → Help and feedback → About Microsoft Edge

If you're significantly out of date, update your browser first.

### Step 2: Try a different browser

If Grove works in Chrome but not Firefox (or vice versa), that helps us narrow down the issue. Cross-browser testing is useful diagnostic information.

### Step 3: Clear your cache

Old cached files can cause strange behavior:

- **Chrome:** Settings → Privacy and security → Clear browsing data
- **Firefox:** Settings → Privacy & Security → Clear Data
- **Safari:** Safari menu → Clear History
- **Edge:** Settings → Privacy, search, and services → Clear browsing data

Select "Cached images and files" at minimum.

### Step 4: Disable extensions

Browser extensions, especially ad blockers, privacy tools, and script blockers, can interfere with Grove. Try disabling them temporarily to see if that's the cause.

If an extension is the problem, you can usually whitelist Grove rather than disabling the extension entirely.

### Step 5: Contact support

If you've tried the above and things still aren't working, [contact us](/contact) with:

- Your browser and version
- What you're trying to do
- What's happening instead
- Whether other browsers work

We'll help figure it out.

## For blog readers

If someone tells you your blog isn't working for them:

1. Ask what browser they're using
2. Ask them to try clearing cache or a different browser
3. If the issue persists, it might be on our end—check [status.grove.place](https://status.grove.place)

Most "your site is broken" reports turn out to be temporary network issues or very outdated browsers.

## Accessibility and assistive technology

Grove aims to be accessible. We test with:

- VoiceOver (macOS/iOS)
- Screen readers (general compatibility)
- Keyboard-only navigation
- High contrast modes

If you use assistive technology and encounter barriers, please let us know. Accessibility bugs are treated as high priority.

---

*Having browser issues we haven't covered? [Reach out](/contact)—we want to know about edge cases.*
