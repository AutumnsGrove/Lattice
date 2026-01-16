---
title: "Checking Grove Status"
slug: checking-grove-status
category: troubleshooting
order: 9
keywords: [status, outage, down, maintenance, incident, issues, problems, not working]
related: [my-site-isnt-loading, contact-support]
---

# Checking Grove Status

If something seems off with Grove, here's how to find out what's happening.

## The status page

Grove's status page lives at **status.grove.place**.

This is where we post updates whenever there's a known issue: outages, slowdowns, scheduled maintenance. If something's wrong on our end, it'll be listed here.

## What you'll see

### All systems operational

When everything's working normally, you'll see a green banner and all components showing "Operational." This is the good state. Nothing to worry about.

### Active incident

If there's an ongoing issue, the page shows:

- **What's affected**: Which parts of Grove are having problems (Blog Engine, CDN, Authentication, etc.)
- **Current status**: Investigating, Identified, Monitoring, or Resolved
- **Latest update**: What we know and what we're doing about it
- **Timeline**: A history of updates since the incident started

### Scheduled maintenance

Sometimes we need to do planned work. When maintenance is scheduled, you'll see it listed on the status page in advance with:

- When it's happening
- What might be affected
- Expected duration

We try to schedule maintenance during low-traffic hours and keep it brief.

## Subscribing to updates

You can subscribe to status updates via RSS at `status.grove.place/feed`. Add this to your feed reader and you'll be notified when:

- A new incident is reported
- An incident status changes
- An incident is resolved
- Maintenance is scheduled

You can also check your admin panel. Active incidents appear in the **Messages** section.

## What the components mean

| Component | What it covers |
|-----------|----------------|
| Blog Engine | Publishing, editing, viewing blog posts |
| CDN | Image and media loading |
| Authentication | Signing in, session management |
| Meadow | Community feed, reactions, voting |
| Payments | Subscription billing, plan changes |
| API | Backend services powering everything |

## When to check vs. when to contact support

**Check the status page first if:**
- Your site isn't loading
- Images aren't appearing
- You can't sign in
- Things feel slower than usual
- Something that worked before suddenly doesn't

If there's an active incident, we already know about it and are working on it. No need to contact support; we'll update the status page as things progress.

**Contact support if:**
- The status page shows all operational, but you're still having issues
- Your problem seems specific to your account or blog
- You've tried the troubleshooting steps and nothing helps

## During an incident

When there's an active incident:

- **Don't panic.** We're on it.
- **Check the status page** for updates rather than refreshing your broken blog repeatedly.
- **Wait for the "Resolved" status** before expecting things to work normally.
- **Cached pages might still work** even if the backend is having issues.

We post updates as we learn more. If an incident is marked "Investigating," we're still figuring out what's wrong. "Identified" means we know the cause. "Monitoring" means we've deployed a fix and are watching to make sure it holds.

## Historical incidents

The status page shows the past 30 days of incidents. You can see what happened, how long it lasted, and how we handled it. This transparency is intentional: we want you to know our track record.

---

*If something's broken and the status page doesn't mention it, [let us know](/contact). We want to know about issues we haven't caught yet.*
