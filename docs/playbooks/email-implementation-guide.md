# Email Provisioning Implementation Guide

*Internal technical documentation for @grove.place email feature*

---

## Overview

Grove offers email addresses at two levels:
- **Basic tier:** Forwarding only (via Cloudflare Email Routing)
- **Professional+ tiers:** Full send/receive mailboxes (via Forward Email)

---

## Part 1: Cloudflare Email Routing (Basic Tier)

### Prerequisites

- grove.place DNS managed by Cloudflare
- Email Routing enabled on the zone
- API token with `Email Routing Rules Write` permission

### Initial Setup (One-Time)

1. Enable Email Routing on grove.place zone in Cloudflare dashboard
2. Cloudflare automatically adds required MX and TXT records
3. Create API token with appropriate permissions

### Provisioning User Email (Automatic)

When a user upgrades to Basic tier, call the Cloudflare API:

```typescript
// POST /zones/{zone_id}/email/routing/rules
async function provisionEmailForwarding(
  username: string,
  destinationEmail: string
): Promise<void> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/email/routing/rules`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        actions: [
          { type: 'forward', value: [destinationEmail] }
        ],
        matchers: [
          { type: 'literal', field: 'to', value: `${username}@grove.place` }
        ],
        enabled: true,
        name: `${username}.grove.place email forwarding`,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to provision email: ${response.statusText}`);
  }
}
```

### Updating Forwarding Destination

```typescript
// PUT /zones/{zone_id}/email/routing/rules/{rule_id}
async function updateEmailForwarding(
  ruleId: string,
  newDestinationEmail: string
): Promise<void> {
  // Same structure as create, with rule_id in path
}
```

### Removing Email (Downgrade/Cancellation)

```typescript
// DELETE /zones/{zone_id}/email/routing/rules/{rule_id}
async function removeEmailForwarding(ruleId: string): Promise<void> {
  await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/email/routing/rules/${ruleId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${CF_API_TOKEN}` },
    }
  );
}
```

### Database Schema Addition

```sql
-- Add to users or subscriptions table
ALTER TABLE user_subscriptions ADD COLUMN email_rule_id TEXT;
ALTER TABLE user_subscriptions ADD COLUMN email_forwarding_to TEXT;
```

### Cost

**$0:** Cloudflare Email Routing is free.

---

## Part 2: Forward Email (Professional+ Tiers)

### Service Selection

[Forward Email](https://forwardemail.net) chosen for:
- $3/month flat for unlimited domains and aliases
- Full API for programmatic provisioning
- IMAP/SMTP access for users
- Privacy-focused, open-source
- 10GB shared storage included

### Account Setup (One-Time)

1. Sign up for Forward Email Enhanced Protection ($3/month)
2. Add grove.place as a domain
3. Configure DNS records as instructed
4. Generate API key for programmatic access

### DNS Requirements

Forward Email requires these records on grove.place:

```
MX    grove.place    mx1.forwardemail.net    10
MX    grove.place    mx2.forwardemail.net    20
TXT   grove.place    forward-email=...
TXT   grove.place    v=spf1 include:spf.forwardemail.net -all
```

**Note:** This will conflict with Cloudflare Email Routing. Options:
1. Use Forward Email for ALL email (Basic gets forwarding via FE instead)
2. Use subdomains (e.g., mail.grove.place for full mailboxes)
3. Accept that Basic users use CF, Pro+ users use FE with different MX priority

**Recommended:** Option 1. Use Forward Email for everything. $3/month covers all users, simpler architecture.

### Provisioning Full Mailbox

```typescript
// Forward Email API
async function provisionFullMailbox(
  username: string,
  password: string  // User-provided or generated
): Promise<{ imapServer: string; smtpServer: string }> {
  const response = await fetch(
    `https://api.forwardemail.net/v1/domains/grove.place/aliases`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${FE_API_KEY}:`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: username,
        has_imap: true,
        // Password set separately via user portal or API
      }),
    }
  );

  return {
    imapServer: 'imap.forwardemail.net',
    smtpServer: 'smtp.forwardemail.net',
  };
}
```

### User Onboarding Flow

1. User upgrades to Professional
2. System provisions alias via API
3. User receives email with:
   - Their email address: `username@grove.place`
   - IMAP/SMTP server details
   - Link to set password
4. User adds to their email client (Gmail, Outlook, Apple Mail, etc.)

### Email Client Configuration (User-Facing)

```
Incoming Mail (IMAP):
  Server: imap.forwardemail.net
  Port: 993
  Security: SSL/TLS
  Username: username@grove.place

Outgoing Mail (SMTP):
  Server: smtp.forwardemail.net
  Port: 465
  Security: SSL/TLS
  Username: username@grove.place
```

### Cost

**$3/month total:** Covers all Professional and Premium users combined.

---

## Implementation Phases

### Phase 1: Basic Forwarding (MVP)
- [ ] Set up Cloudflare Email Routing on grove.place
- [ ] Create API integration for provisioning
- [ ] Add email_rule_id to database schema
- [ ] Build settings UI for users to set forwarding destination
- [ ] Implement provisioning on tier upgrade
- [ ] Implement removal on downgrade/cancellation

### Phase 2: Full Mailboxes (Post-MVP)
- [ ] Set up Forward Email account
- [ ] Migrate DNS to Forward Email
- [ ] Create API integration
- [ ] Build onboarding flow for mailbox setup
- [ ] Add IMAP credential management
- [ ] Update settings UI for Professional+ users

---

## Security Considerations

1. **API Keys:** Store CF and FE API keys in secrets, never in code
2. **User Passwords:** Never store mailbox passwords; use Forward Email's password reset flow
3. **Rate Limiting:** Cloudflare API has rate limits; batch operations if provisioning many users
4. **Email Verification:** Consider requiring email verification before provisioning

---

## Monitoring

- Track email provisioning success/failure rates
- Monitor Forward Email usage against plan limits
- Alert on DNS propagation issues
- Log all email-related API calls for debugging

---

*Last updated: December 2025*
