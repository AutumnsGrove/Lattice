# Privacy Policy

**Grove Platform**
**Effective Date:** December 10, 2025
**Last Updated:** December 10, 2025

---

## Our Commitment to Your Privacy

Grove is built on a simple principle: **your data belongs to you**. We collect only what we need to provide the Service, we never sell your data, and we give you full control over your information.

This Privacy Policy explains what data we collect, how we use it, and your rights regarding your information.

---

## 1. Information We Collect

### 1.1 Information You Provide

**Account Information**
- Email address (required for authentication)
- Display name (optional)
- Profile information you choose to add

**Content**
- Blog posts and pages you create
- Images and media you upload
- Comments and reactions (if using Grove Social)

**Payment Information**
- Billing details are processed by Stripe
- We do not store your credit card numbers
- We retain transaction records for accounting purposes

**Communications**
- Emails you send us
- Support requests

### 1.2 Information Collected Automatically

**Authentication Data**
- Session tokens (stored as HTTP-only cookies)
- Login timestamps
- IP addresses (retained for exactly 1 minute for rate limiting, then automatically discarded)

**Usage Data**
- Pages visited on your blog
- Referrer information
- Browser type and device information
- Country (inferred from IP, not stored with personal data)

**Note:** We use privacy-respecting analytics. Data is aggregated and anonymized. We do not build individual user profiles or track users across the internet.

### 1.3 Information We Do NOT Collect

- We do not use tracking pixels or third-party advertising trackers
- We do not collect data from your device beyond what's necessary for the Service
- We do not purchase data about you from third parties
- We do not monitor your activity outside of Grove

---

## 2. How We Use Your Information

We use your information solely to:

| Purpose | Data Used |
|---------|-----------|
| Provide the Service | Account info, content, session data |
| Process payments | Billing info (via Stripe) |
| Send important updates | Email address |
| Improve the Service | Aggregated, anonymized usage data |
| Prevent abuse | IP addresses, rate limiting data |
| Content moderation | Post content (zero retention, see below) |
| Respond to support requests | Communications, account info |
| Comply with legal obligations | As required by law |

**We Never Use Your Data To:**
- Sell to third parties
- Target you with advertising
- Build profiles for marketing
- Train AI models
- Share with data brokers

---

## 3. How We Share Your Information

### 3.1 We Do NOT Sell Your Data

**We will never sell, rent, or trade your personal information.** This is a core promise of Grove.

### 3.2 Service Providers

We share limited data with trusted service providers who help us operate Grove:

| Provider | Purpose | Data Shared |
|----------|---------|-------------|
| **Cloudflare** | Infrastructure, CDN, security | IP addresses, request data |
| **Stripe** | Payment processing | Billing information |
| **Resend** | Email delivery | Email address, email content |
| **Google** | Authentication (optional) | Email address (if you use Google Sign-In) |
| **Fireworks AI / Groq** | Content moderation | Post content (zero data retention) |

These providers are contractually bound to protect your data and use it only for the services they provide to us.

**Changes to Providers:** If we add new categories of service providers that process your data, we will notify you via email before the change takes effect.

**Content Moderation Privacy:**
Post content is processed through privacy-respecting LLM inference providers with **Zero Data Retention (ZDR)** enabled. This means:
- Your content is never stored by the inference provider
- Your content is never used to train AI models
- Content is encrypted in transit (TLS 1.2+)
- Only the moderation decision is retained (not your content)
- No human reviews your content unless the automated system cannot reach a confident decision

For full technical details, see our [Content Moderation Spec](../Specs/CONTENT-MODERATION.md).

### 3.3 Legal Requirements

We may disclose your information if required by law, such as:
- In response to a valid subpoena or court order
- To protect our rights or the safety of others
- To prevent fraud or abuse

We will notify you of legal requests when legally permitted to do so.

### 3.4 Business Transfers

If Grove is acquired or merged with another company, your information may be transferred. We will notify you before any such transfer and give you the opportunity to delete your account.

---

## 4. Data Retention

### 4.1 Active Accounts

While your account is active, we retain your data to provide the Service.

### 4.2 After Account Deletion

When you delete your account:
- Your data is retained for **30 days** to allow you to recover your account or export your data
- After 30 days, your data is permanently deleted from our systems
- Backups may retain data for up to **90 days** before being purged

### 4.3 Specific Data Types

| Data Type | Retention Period |
|-----------|------------------|
| Authentication codes | 10 minutes (then auto-deleted) |
| Failed login attempts | Cleared on successful login |
| Sessions | 7 days (or until logout) |
| IP addresses | Exactly 1 minute (rate limiting only, then discarded) |
| Rate limiting data | 1 minute |
| Content moderation queue | Immediate deletion after review |
| Email signup list | Until you unsubscribe |
| Payment records | As required by law (typically 7 years) |

---

## 5. Your Rights and Choices

### 5.1 Access Your Data

You can view all your personal information in your account settings at any time.

### 5.2 Export Your Data

You can export your data (posts, pages, media) at any time in standard formats. We believe in data portability - you should never feel locked in.

### 5.3 Correct Your Data

You can update your account information at any time through your settings.

### 5.4 Delete Your Data

You can request deletion of your account and all associated data by contacting us at autumn@grove.place. Deletion will be processed within 30 days.

### 5.5 Opt Out of Communications

You can unsubscribe from marketing emails at any time. We will still send essential account-related communications (payment confirmations, security alerts, etc.).

---

## 6. Data Security

We take security seriously and implement industry-standard measures to protect your data:

**Technical Measures:**
- All data transmitted over HTTPS/TLS encryption
- Passwords and authentication codes are hashed (never stored in plain text)
- HTTP-only, Secure, SameSite=Strict cookies for sessions
- Rate limiting to prevent brute-force attacks
- Regular security audits

**Infrastructure:**
- Data stored on Cloudflare's infrastructure (SOC 2 Type II certified)
- Database encryption at rest
- Access controls and audit logging

**Operational:**
- Minimal data access on a need-to-know basis
- No third-party access to raw user data

While we implement strong security measures, no system is 100% secure. If you discover a security vulnerability, please report it to autumn@grove.place.

---

## 7. Cookies and Tracking

### 7.1 Cookies We Use

| Cookie | Purpose | Duration |
|--------|---------|----------|
| Session cookie | Authentication | 7 days |
| CSRF token | Security | Session |

### 7.2 What We Don't Use

- No third-party tracking cookies
- No advertising cookies
- No analytics cookies that track individuals
- No social media tracking pixels

### 7.3 Your Browser Settings

You can configure your browser to block cookies, but this may prevent you from using Grove's features that require authentication.

---

## 8. Children's Privacy

Grove is not intended for users under 18 years of age. We do not knowingly collect personal information from anyone under 18. If we learn that we have collected data from someone under 18, we will delete it promptly.

If you believe a child under 18 has provided us with personal information, please contact us at autumn@grove.place.

---

## 9. International Users

Grove currently serves users in the **United States only**. Our servers and data processing are located in the United States.

If you access Grove from outside the United States, please be aware that your information will be transferred to, stored, and processed in the United States.

---

## 10. Third-Party Links

Your blog may contain links to third-party websites. We are not responsible for the privacy practices of those websites. We encourage you to read the privacy policies of any third-party sites you visit.

---

## 11. Changes to This Policy

We may update this Privacy Policy from time to time. When we make changes:
- We will update the "Last Updated" date at the top
- For significant changes, we will notify you by email
- Your continued use of Grove after changes take effect constitutes acceptance

We encourage you to review this policy periodically.

---

## 12. Contact Us

If you have questions about this Privacy Policy or your personal data, please contact us:

**Email:** autumn@grove.place

We will respond to privacy-related inquiries within 30 days.

---

## 13. Summary

| Question | Answer |
|----------|--------|
| Do you sell my data? | **Never.** |
| Do you use my data for advertising? | **No.** |
| Can I export my data? | **Yes, anytime.** |
| Can I delete my account? | **Yes, completely.** |
| How long do you keep my data? | **Only while needed, deleted 30 days after account closure.** |
| Do you use tracking cookies? | **Only essential cookies for authentication.** |
| Is my data encrypted? | **Yes, in transit and at rest.** |

---

*Your privacy matters. If something in this policy concerns you or doesn't make sense, please reach out. We're happy to explain.*
