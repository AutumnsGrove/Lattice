---
title: Setting Up a Custom Domain
description: How to connect your own domain to your Grove blog
category: help
section: customization
lastUpdated: '2026-02-08'
slug: custom-domain-setup
order: 6
keywords:
  - custom domain
  - domain
  - DNS
  - CNAME
  - SSL
  - HTTPS
  - registrar
  - own domain
  - connect domain
related:
  - my-site-isnt-loading
  - choosing-your-plan
---

# Setting Up a Custom Domain

Every Grove blog starts with a `yourname.grove.place` address. If you'd like to use your own domain instead—like `yourdomain.com`—here's how that works.

## Who can use custom domains

Custom domains are available on **Oak** and **Evergreen** plans.

- **Oak ($25/month):** Bring your own domain. You purchase and manage the domain through a registrar of your choice, and we connect it to your Grove blog.
- **Evergreen ($35/month):** Domain included. We help you find and register a domain as part of your plan.

If you're on Seedling or Sapling, you'll need to upgrade before connecting a custom domain. Your `yourname.grove.place` address works well in the meantime—it's not going anywhere.

## The setup process

Custom domain setup is a collaborative process. You handle the domain side, and we handle the Grove side. Here's what to expect:

### 1. Get a domain

If you don't already have one, you'll need to register a domain through a registrar. Some popular options:

- [Cloudflare Registrar](https://www.cloudflare.com/products/registrar/) — No markup pricing, straightforward
- [Namecheap](https://www.namecheap.com/) — Budget-friendly, good interface
- [Porkbun](https://porkbun.com/) — Clean and simple

If you're on Evergreen, we'll help you with this step. Just reach out and we'll find something that fits.

### 2. Contact us

Once you have a domain (or if you're on Evergreen and want us to handle it), [get in touch](/contact). We'll walk through the connection together. This isn't a form-and-wait situation—we'll work with you directly to make sure everything's configured correctly.

### 3. Point your DNS to Grove

You'll need to add a DNS record at your registrar that tells the internet "this domain points to Grove." Specifically:

**Add a CNAME record:**

| Type | Name | Target |
|------|------|--------|
| CNAME | `www` | `lattice.pages.dev` |

If you want your root domain (like `yourdomain.com` without the `www`) to work too, some registrars support CNAME flattening or ALIAS records at the root. We can help you figure out what your registrar supports.

> **Tip:** If your registrar's DNS settings feel overwhelming, send us a screenshot and we'll tell you exactly what to change.

### 4. Wait for DNS propagation

DNS changes don't take effect instantly. Most updates propagate within a few hours, but it can take up to 48 hours in some cases. During this window, your domain might work intermittently or not at all. That's normal.

You can check propagation status at [dnschecker.org](https://dnschecker.org) by entering your domain and looking for the CNAME record.

### 5. SSL certificate

Once your DNS is pointing to Grove, an SSL certificate is issued automatically. This is what makes your site load over `https://` (the secure padlock in your browser).

Certificate issuance usually happens within minutes, but can take up to 24 hours. During this time, you might see a browser security warning—that's temporary. Don't panic.

After the certificate is active, your site loads securely with no extra configuration needed.

## What happens to your grove.place address

Your original `yourname.grove.place` address keeps working. Visitors who use it will be redirected to your custom domain. Nothing breaks, no links go dead.

## Troubleshooting

### "This site can't be reached" after setup

Your DNS records might not have propagated yet. Give it a few hours. If it's been more than 48 hours, double-check:

- The CNAME record is pointing to `lattice.pages.dev` (not your old host)
- There are no conflicting A records for the same domain
- The record is actually saved (some registrars require you to hit a separate "Save" button)

### Browser security warning

This usually means the SSL certificate hasn't been issued yet. Wait a few hours and try again. If it persists beyond 24 hours, [contact us](/contact)—something may need manual attention.

### Site loads but looks wrong

If your domain loads but shows the wrong content or a generic page, the DNS might be pointing somewhere else. Verify your CNAME target is exactly `lattice.pages.dev` with no typos.

### Domain expired

If your site suddenly stops working after months of being fine, check that your domain registration hasn't expired. Registrars send renewal reminders by email—check your inbox (and spam folder). You can renew through your registrar's dashboard.

## Things to know

**Your domain is yours.** Grove doesn't own or control your domain. You registered it, you manage it, and you can take it elsewhere anytime. If you're on Evergreen and we helped register it, it's still in your name.

**You can switch back.** If you decide you prefer your `grove.place` address, we can disconnect the custom domain. Your blog just goes back to its original address.

**Email isn't affected.** Connecting a domain to Grove doesn't change your email setup. If you have email on that domain (like `hello@yourdomain.com`), it keeps working as before. We only touch the web-related DNS records.

## Need help?

Custom domains involve a few moving parts across different services, and every registrar's interface is a little different. If you get stuck at any point—even if it feels like a small question—[reach out](/contact). We'd rather help you through it than have you guessing.

---

*Your blog, your name. We're here to help you connect the two.*
