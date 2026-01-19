# Data Portability & Account Separation Policy

Grove.place

*Effective December 2025*

---

## Our Promise

Your content is yours. Your domain is yours. Grove will never hold your data or domain hostage.

This document outlines exactly what happens when you cancel your subscription or need to move your content elsewhere.

---

## Data Export

### What You Receive

When you cancel your subscription (or anytime you request it), you receive a complete export package:

**Blog Content:**
- All blog posts in Markdown format
- Original images and media files
- Post metadata (publish dates, tags, status)
- All comments (both public comments and private replies)
- Site configuration and settings

**Export Format:**
```
grove-export-username-YYYY-MM-DD.zip
├── posts/
│   ├── 2025-01-15-my-first-post.md
│   ├── 2025-02-20-another-post.md
│   └── ...
├── comments/
│   ├── comments.json (all public comments)
│   └── replies.json (all private replies)
├── media/
│   ├── images/
│   ├── uploads/
│   └── ...
├── config/
│   └── site-settings.json
└── README.md (import instructions)
```

**Comments JSON Format:**

`comments.json` (public comments that were approved):
```json
{
  "exported_at": "2025-12-13T12:00:00Z",
  "total_count": 42,
  "comments": [
    {
      "id": "comment-uuid",
      "post_slug": "my-first-post",
      "author_name": "Jane Reader",
      "author_email": "jane@example.com",
      "content": "Great post! Really enjoyed reading this.",
      "created_at": "2025-02-15T14:30:00Z",
      "status": "approved"
    }
  ]
}
```

`replies.json` (private replies sent to blog author):
```json
{
  "exported_at": "2025-12-13T12:00:00Z",
  "total_count": 15,
  "replies": [
    {
      "id": "reply-uuid",
      "post_slug": "my-first-post",
      "author_name": "Anonymous Reader",
      "author_email": "reader@example.com",
      "content": "Wanted to share privately—this really resonated with me.",
      "created_at": "2025-02-16T09:15:00Z"
    }
  ]
}
```

### How to Request an Export

1. **Self-service:** Admin Panel → Settings → Export Data
2. **Email:** hello@grove.place
3. **Automatic on cancellation:** Export link sent within 24 hours

Exports are generated within 24 hours and available for download for 30 days.

---

## Domain Ownership & Transfer

### You Own Your Domain

When Grove registers a custom domain on your behalf (Evergreen tier), you are the legal owner. Grove acts as a registrar agent, not the domain owner.

**What this means:**
- The domain is registered with your contact information
- You receive registrar notifications directly
- You can transfer the domain at any time
- Grove cannot sell, redirect, or hold your domain

### Domain Transfer Process

**When you cancel your Evergreen subscription:**

1. **Notification:** You'll receive an email explaining your options
2. **Transfer window:** 30 days to initiate transfer to another registrar
3. **Authorization code:** Provided within 48 hours of request
4. **No fees:** Grove charges no transfer fees

**To request a domain transfer:**
- Email: hello@grove.place
- Subject: "Domain Transfer Request - yourdomain.com"
- We'll respond with your EPP/authorization code within 48 hours

### Domain Renewal Responsibility

**While subscribed:** Grove handles all domain renewals automatically (included in Evergreen subscription for domains up to $100/year).

**After cancellation:** You assume responsibility for domain renewal. If you don't transfer the domain before the next renewal date, you must pay the renewal fee directly to the registrar to maintain ownership.

### Grace Periods

| Timeline | What Happens |
|----------|--------------|
| Day 0 | Subscription cancelled |
| Days 1-30 | Blog remains accessible, emails forward, domain active |
| Days 31-60 | Blog shows "subscription inactive" message, domain still yours |
| Days 61-90 | Domain preserved but not pointing to Grove |
| Day 90+ | Domain follows registrar's expiration policy if not renewed |

**Your domain never disappears without warning.** You'll receive email reminders at 30, 14, and 7 days before any service interruption.

---

## Email Address Portability

### @grove.place Email Addresses

Email addresses like `username@grove.place` are tied to your Grove subscription.

**On cancellation:**
- Email forwarding stops after 30-day grace period
- We'll forward a final notice to your personal email
- The address may be released for future users after 6 months

**Recommendation:** If using a @grove.place email professionally, update your contacts before cancellation.

### Custom Domain Email

If you use email with your own custom domain (BYOD at Oak tier), that email is entirely yours and unaffected by Grove cancellation. You simply need to update DNS records to point to your new email provider.

---

## Data Retention After Cancellation

| Data Type | Retention Period | Notes |
|-----------|------------------|-------|
| Blog posts & media | 90 days | Exportable anytime during this period |
| Comments & replies | 90 days | Included in data export |
| Account information | 90 days | For reactivation purposes |
| Payment history | 7 years | Legal/tax requirements |
| Domain registration | Indefinite | You own it, registrar maintains records |

**After 90 days:** All blog content is permanently deleted from Grove servers. We cannot recover it.

**Reactivation:** Within 90 days, you can reactivate your account and restore all content.

---

## No Hostage Situations

Grove commits to the following:

1. **No transfer fees** for domains or data
2. **No artificial delays** in providing export files or authorization codes
3. **No "pay to leave"** schemes
4. **No content held for ransom** under any circumstances
5. **Standard formats** for all exports (Markdown, JSON, common image formats)

If you ever feel Grove is not honoring this commitment, contact hello@grove.place directly.

---

## Questions?

**Email:** hello@grove.place
**Response time:** Within 48 hours

---

*This policy reflects Grove's core value: your content, your ownership, your choice.*

*Last updated: December 2025*
