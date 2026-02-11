# Grove Incident Response Runbook

**Version:** 1.0
**Last Updated:** 2026-02-11
**Owner:** Security Team
**Review Frequency:** Quarterly

---

## Purpose

This runbook provides step-by-step procedures for responding to security incidents in Grove. Each incident type has:

- **Detection criteria** — How to recognize the incident
- **Immediate actions** — What to do in the first 5 minutes
- **Investigation** — How to assess scope and impact
- **Containment** — How to stop the bleeding
- **Recovery** — How to restore normal operations
- **Post-mortem** — What to document afterward

---

## Incident Severity Levels

| Level             | Response Time | Description                                      | Examples                                                        |
| ----------------- | ------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| **P0 - CRITICAL** | < 15 minutes  | Active breach, data exposure, system-wide outage | Auth bypass, database exposed, credential leak                  |
| **P1 - HIGH**     | < 1 hour      | Significant security risk, limited exposure      | Single tenant breach, DoS attack, payment system down           |
| **P2 - MEDIUM**   | < 4 hours     | Security concern with contained impact           | Rate limit bypass, individual account compromise, CSP violation |
| **P3 - LOW**      | < 24 hours    | Minor issue, no immediate risk                   | Security header misconfiguration, audit log gap                 |

---

## General Response Framework

### Phase 1: DETECT (0-5 minutes)

1. **Confirm the incident is real** — Verify it's not a false positive
2. **Assign severity level** — Use the table above
3. **Start incident log** — Create timestamped notes
4. **Alert response team** — Notify via established channels

### Phase 2: CONTAIN (5-30 minutes)

1. **Stop active exploitation** — Block attacker access
2. **Preserve evidence** — Don't destroy logs
3. **Isolate affected systems** — Prevent lateral movement
4. **Assess blast radius** — How far did they get?

### Phase 3: INVESTIGATE (30 minutes - 4 hours)

1. **Identify attack vector** — How did they get in?
2. **Enumerate compromised resources** — What did they access?
3. **Check for persistence** — Did they plant backdoors?
4. **Document timeline** — When did each action occur?

### Phase 4: RECOVER (Varies by incident)

1. **Remove attacker access** — Close all entry points
2. **Patch vulnerabilities** — Fix the root cause
3. **Restore from clean state** — If systems were compromised
4. **Verify integrity** — Confirm systems are clean

### Phase 5: COMMUNICATE (Ongoing)

1. **Internal updates** — Keep team informed
2. **User notification** — If data was exposed (see templates below)
3. **Public statement** — If incident is public
4. **Regulatory disclosure** — If required by law

### Phase 6: POST-MORTEM (Within 1 week)

1. **Root cause analysis** — Why did this happen?
2. **Timeline reconstruction** — Complete incident narrative
3. **Impact assessment** — What was the damage?
4. **Lessons learned** — How do we prevent this?
5. **Action items** — What changes are we making?

---

## Incident Type: Authentication Bypass

### Detection

- User accessing resources they don't own
- Session token working after logout
- Logs show mismatched user_id and tenant_id
- Alert from monitoring: "Authorization check failed"

### Immediate Actions (0-5 minutes)

```bash
# 1. Verify the report
cd /home/user/GroveEngine
gf --agent search "getVerifiedTenantId" | head -20

# 2. Check recent auth changes
gf --agent recent 7 | grep -E "(auth|session|tenant)"

# 3. Review auth logs (if available)
# Look for patterns of unauthorized access

# 4. If confirmed, immediately revoke ALL sessions
# Emergency session invalidation command (would need to be implemented):
# gw d1 execute "UPDATE sessions SET invalidated = true WHERE updated_at > datetime('now', '-1 hour')"
```

### Severity Assessment

- **P0 (CRITICAL)** if: Multiple tenants affected, or attacker has admin access
- **P1 (HIGH)** if: Single tenant affected, limited scope
- **P2 (MEDIUM)** if: Theoretical bypass found but no evidence of exploitation

### Investigation

```bash
# 1. Check all auth-related code
gf --agent search "locals.user" --type ts

# 2. Review session validation logic
gf --agent func "validateSession"

# 3. Check tenant isolation
gf --agent search "getVerifiedTenantId" --context 5

# 4. Examine recent commits
gw git log --since="1 week ago" --grep="auth\|session\|tenant" --oneline

# 5. Search for IDOR vulnerabilities
gf --agent search "params.id" | grep -v "tenantId"
```

### Containment

```bash
# 1. If specific vulnerability found, deploy hotfix immediately
# Example: Fix auth bypass in specific endpoint
# (Use appropriate deployment commands for Grove)

# 2. Force all users to re-authenticate
# gw deploy --hotfix auth-invalidate-all-sessions

# 3. Enable additional logging
# Temporarily add verbose auth logging to track attacker
```

### Recovery

```bash
# 1. Audit all tenant data access since suspected breach time
# gw d1 query "SELECT * FROM audit_log WHERE created_at > ?"

# 2. Verify no unauthorized data modifications
# Check for suspicious posts, uploads, or account changes

# 3. Reset sessions for affected users
# Notify them to log in again

# 4. Deploy fix and verify
pnpm test:engine
pnpm test:landing

# 5. Monitor auth endpoints for 24 hours
# Watch for retry attempts or similar patterns
```

### Communication

- **Affected users:** Use template "Data Access Incident"
- **All users:** Only if widespread impact
- **Regulatory:** Required if PII was accessed (GDPR, etc.)

### Post-Mortem Checklist

- [ ] Root cause identified and documented
- [ ] Timeline of attacker actions reconstructed
- [ ] All affected users identified
- [ ] Data exposure scope quantified
- [ ] Fix deployed and verified
- [ ] Similar vulnerabilities checked elsewhere
- [ ] Preventive measures identified
- [ ] Tests added to prevent regression
- [ ] Documentation updated

---

## Incident Type: Data Breach / Unauthorized Data Access

### Detection

- Alert from monitoring: "Unusual data export volume"
- User report: "I can see someone else's data"
- R2 logs show unexpected access patterns
- D1 query logs show tenant_id bypass

### Immediate Actions (0-5 minutes)

```bash
# 1. Confirm the breach
# Check if tenant isolation is actually broken
gf --agent search "getTenantDb"

# 2. Identify the leak vector
gf --agent search "SELECT.*FROM" --type ts | grep -v "WHERE tenant_id"

# 3. If confirmed, immediately block the vulnerable endpoint
# Add emergency rate limit or disable endpoint entirely

# 4. Preserve logs
# gw d1 backup create --emergency
# Export R2 access logs for affected timeframe
```

### Severity Assessment

- **P0 (CRITICAL)** if: PII exposed, payment data accessed, or multiple tenants
- **P1 (HIGH)** if: Non-sensitive data exposed, single tenant
- **P2 (MEDIUM)** if: Metadata only, no user content

### Investigation

```bash
# 1. Audit all database queries for tenant scoping
gf --agent search "\.prepare\(" --type ts | head -50

# 2. Check R2 access patterns
# Review object keys accessed - do they cross tenant boundaries?

# 3. Examine recent code changes to data access layer
gw git log --since="2 weeks ago" -- "**/*db*" --oneline

# 4. Search for IDOR vulnerabilities
gf --agent search "params\.(id|slug)" --type ts

# 5. Check if attacker downloaded data
# Review R2 bandwidth logs, D1 query volumes
```

### Containment

```bash
# 1. Disable vulnerable endpoint immediately
# Deploy emergency fix or feature flag disable

# 2. Block attacker IP if identified
# gw deploy --hotfix --env BLOCKED_IPS="x.x.x.x,y.y.y.y"

# 3. Rotate any exposed credentials
# If API keys or secrets were in accessible data

# 4. Enable emergency logging
# Capture all data access attempts for forensics
```

### Recovery

```bash
# 1. Identify all affected users
# Query audit logs or access logs to enumerate

# 2. Quantify data exposed
# What fields were accessible? For how long?

# 3. Deploy fix with test coverage
pnpm test
gw git commit --write -m "security: fix tenant isolation breach"
gw git push --write

# 4. Verify fix works
# Manual testing of previously vulnerable path
# Automated regression test added

# 5. Monitor for 48 hours
# Watch for similar patterns or retry attempts
```

### Communication

**Required:** Notify all affected users within 72 hours (GDPR requirement)

Use template: "Data Breach Notification"

### Post-Mortem Checklist

- [ ] Attack vector fully understood
- [ ] All exposed data catalogued
- [ ] Every affected user identified
- [ ] Notification sent within legal timeframe
- [ ] Root cause documented
- [ ] Regression tests added
- [ ] Similar patterns audited across codebase
- [ ] Security controls improved to prevent recurrence

---

## Incident Type: Denial of Service (DoS)

### Detection

- Cloudflare alerts: "Unusual traffic spike"
- Application errors: "Rate limit exhausted"
- Worker CPU time exceeded
- Users report: "Site is slow or down"

### Immediate Actions (0-5 minutes)

```bash
# 1. Check Cloudflare analytics
# Identify if this is distributed or single-source

# 2. Review recent traffic patterns
# Look for unusual user agents, IPs, or endpoints

# 3. If single-source, block immediately via Cloudflare WAF
# Add IP block rule or challenge rule

# 4. If application-level DoS (expensive query), identify the endpoint
gf --agent search "\.all\(\)" --type ts | head -20
# Look for queries without LIMIT clauses
```

### Severity Assessment

- **P0 (CRITICAL)** if: Complete outage, all users affected
- **P1 (HIGH)** if: Significant degradation, some users affected
- **P2 (MEDIUM)** if: Single endpoint slow, workarounds exist

### Investigation

```bash
# 1. Identify attack vector
# Is it network-level (volumetric) or application-level (resource exhaustion)?

# 2. For application-level, find the expensive operation
gf --agent search "json\(\{" --context 3 | grep -A3 "all()"

# 3. Check for missing rate limits
gf --agent search "checkRateLimit" --type ts

# 4. Review recent performance changes
gw git log --since="1 week ago" -- "**/*server*" --oneline

# 5. Examine Worker metrics
# CPU time, memory usage, KV operation counts
```

### Containment

```bash
# 1. If network-level: Enable Cloudflare DDoS protection
# Increase security level, enable "I'm Under Attack" mode if needed

# 2. If application-level: Rate-limit or disable expensive endpoint
# Add emergency rate limit via feature flag

# 3. Scale up if possible
# For Workers, this is automatic, but check D1/KV quota

# 4. Add LIMIT clauses to unbounded queries
# Emergency patch if a specific query is the bottleneck
```

### Recovery

```bash
# 1. Once traffic normalizes, review what happened
# Cloudflare logs, Worker logs, error rates

# 2. Implement permanent fix
# Rate limits, query optimization, caching

# 3. Add monitoring
# Alert on unusual traffic patterns before outage

# 4. Load test the fix
# Ensure it handles similar volume in future
```

### Communication

- **Users:** "Service Disruption" template (if downtime > 10 minutes)
- **Status page:** Update with current status and ETA

### Post-Mortem Checklist

- [ ] Attack classification (volumetric, protocol, application)
- [ ] Peak traffic volume documented
- [ ] Effective mitigation identified
- [ ] Permanent fix deployed
- [ ] Monitoring improved to catch earlier
- [ ] Rate limits reviewed across all endpoints
- [ ] Load testing performed
- [ ] Incident timeline published

---

## Incident Type: Secret Exposure (API Keys, Credentials)

### Detection

- Alert from GitHub secret scanning
- User report: "Found API key in public repo"
- Unusual activity on third-party service (Stripe, etc.)
- Accidental commit contains .env file

### Immediate Actions (0-5 minutes)

```bash
# 1. Confirm the exposure
# Check if secret is actually in git history, logs, or public

# 2. Immediately rotate the exposed secret
# For Stripe: Create new key, update in Cloudflare secrets
# For JWT: Generate new signing key, invalidate all sessions
# For OAuth: Rotate client secret

# 3. Revoke the old secret
# Deactivate old key on provider side (Stripe dashboard, etc.)

# 4. Check for unauthorized usage
# Review Stripe logs, API logs for suspicious activity
```

### Severity Assessment

- **P0 (CRITICAL)** if: Production secret with payment/PII access
- **P1 (HIGH)** if: Production secret with limited scope
- **P2 (MEDIUM)** if: Development/staging secret
- **P3 (LOW)** if: Secret with no actual privileges

### Investigation

```bash
# 1. How was it exposed?
gw git log --all -S "sk_live_" --source --full-history

# 2. How long was it exposed?
# Check commit timestamp, GitHub secret scanning alert time

# 3. Was it used by an attacker?
# Review third-party service logs (Stripe events, etc.)

# 4. Are there other secrets in the same location?
gf --agent search "process\.env" --type ts | head -30
gf --agent search "API_KEY\|SECRET\|PASSWORD" --type ts

# 5. Check for additional secret leaks
gw git log --all -p | grep -E "(sk_|pk_|api_key|password|secret)" | head -50
```

### Containment

```bash
# 1. Rotate ALL potentially exposed secrets
# Don't take chances - rotate everything in the same context

# 2. If in git history, consider force-push to remove
# CAUTION: Only if absolutely necessary and coordinated
# gw git filter-repo --path-glob '**/.env' --invert-paths

# 3. Update all deployment environments
# Cloudflare Workers secrets, wrangler.toml references

# 4. Revoke any tokens created with the exposed secret
# If OAuth client secret was exposed, revoke all tokens
```

### Recovery

```bash
# 1. Update secret in all environments
# gw deploy --update-secrets

# 2. Notify third-party provider if their key was exposed
# Stripe, Resend, etc. may want to monitor for suspicious activity

# 3. Add pre-commit hooks to prevent recurrence
# See raccoon-audit skill for secret scanning setup

# 4. Verify new secrets work
pnpm test
# Test payment flow, email sending, etc.

# 5. Document what was exposed and for how long
# Required for compliance reporting if PII access was possible
```

### Communication

- **Users:** Only if their data was accessed with exposed secret
- **Provider:** Notify if their key (Stripe, etc.) was exposed
- **Regulatory:** If exposure enabled PII access

### Post-Mortem Checklist

- [ ] Secret rotation completed across all environments
- [ ] Git history cleaned (if applicable)
- [ ] Unauthorized usage quantified (or ruled out)
- [ ] Pre-commit hooks installed to prevent recurrence
- [ ] Audit of all other secrets performed
- [ ] Documentation updated on secret management
- [ ] Team trained on proper secret handling
- [ ] Provider notified (if their key)

---

## Incident Type: Privilege Escalation

### Detection

- User accessing admin endpoints without authorization
- Logs show: "User X accessed Wayfinder resource"
- Regular user performing admin actions (suspend tenant, etc.)

### Immediate Actions (0-5 minutes)

```bash
# 1. Confirm the escalation
gf --agent search "isWayfinder" --type ts

# 2. Check if user manipulated role/permission check
gf --agent search "locals\.user\.role" --context 5

# 3. Immediately revoke elevated access
# Force logout if user has unauthorized session

# 4. Disable the vulnerable endpoint
# Feature flag or deployment to block access
```

### Severity Assessment

- **P0 (CRITICAL)** if: Attacker gained Wayfinder/admin access
- **P1 (HIGH)** if: Attacker accessed other tenant's admin functions
- **P2 (MEDIUM)** if: Attacker gained limited elevated privileges

### Investigation

```bash
# 1. Review authorization checks
gf --agent search "RequestHandler" --type ts | head -30

# 2. Check if role is verified server-side
gf --agent func "isWayfinder"

# 3. Examine recent changes to auth/authz logic
gw git log --since="2 weeks ago" --grep="auth\|role\|permission" --oneline

# 4. Search for client-side role checks (vulnerable)
gf --agent search "user\.role" --context 3

# 5. Check for confused deputy scenarios
# Is authorization delegated to another service that can be tricked?
```

### Containment

```bash
# 1. Deploy hotfix to vulnerable authorization check
# Add server-side verification before any action

# 2. Audit all actions taken by attacker
# gw d1 query "SELECT * FROM audit_log WHERE actor = ? AND action LIKE '%admin%'"

# 3. Revert any unauthorized changes
# Undo tenant suspensions, config changes, etc.

# 4. Force re-authentication for all admin users
# Invalidate all Wayfinder sessions as precaution
```

### Recovery

```bash
# 1. Fix authorization bypass
# Ensure all admin endpoints check isWayfinder server-side

# 2. Add tests for privilege escalation
# Negative tests: regular user hitting admin endpoint

# 3. Audit all privileged endpoints
gf --agent search "arbor" --type ts
# Verify each has proper authorization

# 4. Deploy and verify
pnpm test:landing
gw git commit --write -m "security: fix privilege escalation in admin endpoints"
gw git push --write

# 5. Monitor admin actions for 48 hours
# Watch for retry attempts
```

### Communication

- **Users:** If attacker modified their data/account
- **All users:** If attacker had broad admin access

### Post-Mortem Checklist

- [ ] Authorization bypass fully understood
- [ ] All privileged endpoints audited
- [ ] Attacker actions enumerated and reverted
- [ ] Server-side authorization enforced everywhere
- [ ] Tests added for privilege escalation
- [ ] Authorization model documented
- [ ] Code review focused on authz checks

---

## Incident Type: Supply Chain Compromise (Dependency Attack)

### Detection

- `pnpm audit` shows new critical vulnerability
- GitHub Dependabot alert
- Suspicious package behavior after update
- News of popular package compromise

### Immediate Actions (0-5 minutes)

```bash
# 1. Identify the compromised package
pnpm audit --json | grep -i "critical\|high"

# 2. Check if we're using the vulnerable version
pnpm list <package-name>

# 3. Immediately pin to last known-good version
# Edit package.json to use exact version "=1.2.3"

# 4. If already deployed, consider rollback
gw git revert HEAD  # If recent deploy introduced the vulnerability
```

### Severity Assessment

- **P0 (CRITICAL)** if: Malicious code executed in production
- **P1 (HIGH)** if: Vulnerable dependency in production, no evidence of exploitation
- **P2 (MEDIUM)** if: Vulnerable dev dependency
- **P3 (LOW)** if: Transitive dependency with limited exposure

### Investigation

```bash
# 1. Understand what the package does
cat node_modules/<package>/package.json
cat node_modules/<package>/README.md

# 2. Check where we use it
gf --agent search "from '<package>'" --type ts

# 3. Review postinstall scripts (common attack vector)
grep -r "postinstall" node_modules/*/package.json | grep <package>

# 4. Check for credential theft attempts
# Review environment variables, file system access in package code

# 5. Examine package diff between good and bad versions
# npm view <package>@<good-version> --json > good.json
# npm view <package>@<bad-version> --json > bad.json
# diff good.json bad.json
```

### Containment

```bash
# 1. Pin to safe version or remove package
pnpm add <package>@<safe-version> --save-exact

# 2. If no safe version exists, find alternative
# Research replacement packages

# 3. Use package override to force safe version across entire monorepo
# In root package.json:
# "overrides": {
#   "<package>": "<safe-version>"
# }

# 4. Lockfile update
pnpm install

# 5. Immediate deployment if malicious code was deployed
gw deploy --emergency
```

### Recovery

```bash
# 1. Audit secrets and credentials
# If malicious package had file system or network access, rotate secrets

# 2. Review logs for unusual activity
# Network calls to unexpected domains, file reads/writes

# 3. Update all environments
pnpm install
pnpm test

# 4. Deploy fix
gw git commit --write -m "security: pin <package> to safe version, avoiding CVE-XXXX"
gw git push --write

# 5. Add monitoring for this package
# Subscribe to security advisories
```

### Communication

- **Users:** Only if their data was accessed by malicious code
- **Team:** Always notify of supply chain incident
- **Community:** Consider public disclosure if significant

### Post-Mortem Checklist

- [ ] Compromised package identified and contained
- [ ] Safe version pinned in package.json and overrides
- [ ] All usage of package audited
- [ ] Secrets rotated if necessary
- [ ] Dependency scanning improved
- [ ] Package lock file integrity verified
- [ ] Alternative packages evaluated
- [ ] Incident shared with community (if appropriate)

---

## Communication Templates

### Template: Data Access Incident

**Subject:** Security Notice: Unauthorized Access to Your Grove Account

**Body:**

> Hi [User Name],
>
> We're writing to inform you of a security incident that may have affected your Grove account.
>
> **What happened:**
> On [DATE], we discovered that [DESCRIPTION OF VULNERABILITY] could have allowed unauthorized access to [SCOPE OF DATA, e.g., "your blog posts and account email address"]. We immediately fixed the issue and verified that no further unauthorized access is possible.
>
> **What information was involved:**
> [LIST OF DATA FIELDS, e.g., "Your name, email address, and blog post content. Your password and payment information were NOT accessed."]
>
> **What we're doing:**
>
> - We've fixed the vulnerability and verified the fix
> - We've reviewed all our security controls to prevent similar issues
> - We're adding additional monitoring to detect unauthorized access earlier
> - We're notifying all affected users
>
> **What you should do:**
>
> - You don't need to take any action. As a precaution, we've logged you out of all devices. Please log in again at [URL].
> - If you use the same password elsewhere, we recommend changing it on those sites.
> - If you see any suspicious activity on your account, please contact us immediately at security@grove.place.
>
> We take the security of your data very seriously, and we sincerely apologize for this incident. If you have any questions or concerns, please don't hesitate to reach out.
>
> — The Grove Security Team

---

### Template: Service Disruption

**Subject:** Service Update: [Brief Description]

**Body:**

> Hi Grove users,
>
> We're currently experiencing [DESCRIPTION OF ISSUE, e.g., "intermittent slowness on the image upload service"].
>
> **Status:** [Investigating / Identified / Resolving / Resolved]
> **Started:** [TIME]
> **Impact:** [DESCRIPTION, e.g., "Some users may see errors when uploading images"]
> **Workaround:** [IF AVAILABLE, e.g., "Uploads work fine if you try again after 30 seconds"]
>
> We're actively working on this and will update you as soon as it's resolved.
>
> — The Grove Team

---

### Template: Security Maintenance

**Subject:** Scheduled Security Maintenance: [DATE]

**Body:**

> Hi Grove users,
>
> We'll be performing security maintenance on [DATE] at [TIME] [TIMEZONE].
>
> **Expected downtime:** [DURATION, e.g., "5-10 minutes"]
> **What's changing:** [BRIEF DESCRIPTION, e.g., "We're updating security certificates and rotating encryption keys"]
> **Impact:** [DESCRIPTION, e.g., "You may need to log in again after maintenance"]
>
> No action is needed on your part. We'll send an update when maintenance is complete.
>
> — The Grove Team

---

### Template: Data Breach Notification (GDPR Compliant)

**Subject:** Important Security Notice: Data Breach Notification

**Body:**

> Hi [User Name],
>
> We're writing to inform you of a data breach that affected your Grove account. We are required by law to notify you of this incident.
>
> **What happened:**
> On [DATE], we discovered that [DETAILED DESCRIPTION OF BREACH]. We immediately took steps to secure our systems and investigate the incident.
>
> **What information was accessed:**
> [COMPREHENSIVE LIST OF DATA FIELDS]
> [EXPLICITLY STATE what was NOT accessed if relevant, e.g., passwords, payment info]
>
> **How it happened:**
> [EXPLANATION OF VULNERABILITY OR ATTACK VECTOR]
>
> **When it happened:**
> [DATE RANGE OF EXPOSURE]
>
> **What we've done:**
>
> - [DATE] — Detected the breach
> - [DATE] — Contained the breach and prevented further access
> - [DATE] — Fixed the vulnerability
> - [DATE] — Completed investigation of scope and impact
> - [TODAY] — Notifying all affected users
>
> **What you should do:**
>
> 1. [SPECIFIC ACTIONS, e.g., "Change your password immediately"]
> 2. [MONITORING STEPS, e.g., "Monitor your account for suspicious activity"]
> 3. [EXTERNAL ACTIONS if needed, e.g., "Consider placing a fraud alert on your credit report"]
>
> **Your rights:**
> Under GDPR, you have the right to:
>
> - Request a copy of all data we hold about you
> - Request deletion of your account and all associated data
> - Lodge a complaint with your local data protection authority
>
> **How to contact us:**
> If you have questions or concerns, please contact our security team:
> Email: security@grove.place
> Response time: Within 24 hours for security inquiries
>
> We sincerely apologize for this incident. We take the security of your data extremely seriously, and we're implementing additional safeguards to prevent similar incidents in the future.
>
> — The Grove Security Team

---

## Tabletop Exercise Scenarios

### Exercise 1: Auth Bypass via Session Fixation

**Scenario:** A researcher reports that they can log in as another user by manually setting a session cookie to a predictable value.

**Questions:**

1. Who do you notify immediately?
2. What is the first technical action you take?
3. How do you determine how many users are affected?
4. What logs do you examine?
5. Do you need to notify users? If so, which template do you use?
6. What is the fix?
7. What test do you add to prevent regression?

**Debrief:** Discuss session ID generation, CSPRNG requirements, session regeneration after login

---

### Exercise 2: Stripe API Key in Git History

**Scenario:** GitHub secret scanning alerts that a Stripe secret key (`sk_live_*`) was committed 6 months ago and is still in git history.

**Questions:**

1. What is the severity level?
2. What do you do in the first 5 minutes?
3. How do you check if the key was used by an attacker?
4. Do you need to force-push to remove it from history? What are the risks?
5. How do you update the key across all environments?
6. Do you need to notify Stripe? Users? Regulators?
7. What preventive measures do you implement?

**Debrief:** Discuss secret rotation, pre-commit hooks, git history rewriting, compliance requirements

---

### Exercise 3: DDoS Attack on Upload Endpoint

**Scenario:** Cloudflare alerts that the image upload endpoint is receiving 10,000 requests per second from distributed sources. The Workers are hitting CPU limits and legitimate users can't upload.

**Questions:**

1. What is the severity level?
2. What immediate actions do you take?
3. How do you distinguish attack traffic from legitimate traffic?
4. What Cloudflare features do you enable?
5. Do you need to disable the upload endpoint entirely?
6. How do you communicate with users during the incident?
7. What permanent changes do you make after resolution?

**Debrief:** Discuss rate limiting, Cloudflare DDoS protection, fail-closed vs fail-open, communication during outages

---

### Exercise 4: Multi-Tenant Isolation Breach

**Scenario:** A user reports seeing blog posts from a different tenant in their admin panel. You confirm the bug: a recent code change removed tenant scoping from one SQL query.

**Questions:**

1. What is the severity level?
2. What do you do immediately?
3. How do you identify all affected users?
4. What data might have been exposed?
5. Do you need to notify users within 72 hours per GDPR?
6. How do you verify the fix works?
7. What systematic changes do you make to prevent similar issues?

**Debrief:** Discuss tenant isolation patterns, GDPR notification requirements, audit logging, defense in depth

---

## Testing Your Runbook

### Monthly: Drill One Scenario

- Pick one incident type
- Walk through the runbook step-by-step
- Identify any commands that don't work
- Update runbook with corrections
- Time how long each phase takes

### Quarterly: Full Tabletop Exercise

- Gather the team
- Run through one tabletop scenario
- Discuss decisions at each step
- Document gaps in knowledge or tooling
- Update runbook based on learnings

### Annually: Live Fire Exercise

- With proper safeguards, simulate a real incident in staging
- Example: Intentionally commit a test secret and practice rotation
- Practice the full incident response process
- Measure actual response times
- Update runbook with real-world findings

---

## Runbook Maintenance

### Quarterly Review

- [ ] Verify all commands still work
- [ ] Update with any new tools or systems
- [ ] Review recent incidents for lessons learned
- [ ] Check communication templates against current branding
- [ ] Ensure contact information is current
- [ ] Update OWASP Top 10 references if new version published

### After Every Incident

- [ ] Document what worked well
- [ ] Document what was missing or incorrect
- [ ] Add new scenarios based on real incidents
- [ ] Update time estimates based on actual response
- [ ] Share learnings with the team

---

## Quick Reference Card

**Print this and keep it handy:**

```
╔════════════════════════════════════════════════════════════╗
║             GROVE INCIDENT RESPONSE QUICK REFERENCE         ║
╠════════════════════════════════════════════════════════════╣
║ DETECT → CONTAIN → INVESTIGATE → RECOVER → COMMUNICATE     ║
╠════════════════════════════════════════════════════════════╣
║ P0 CRITICAL → < 15 min     P1 HIGH → < 1 hour             ║
║ P2 MEDIUM → < 4 hours      P3 LOW → < 24 hours            ║
╠════════════════════════════════════════════════════════════╣
║ First Actions (ANY incident):                              ║
║  1. Confirm it's real (not false positive)                 ║
║  2. Assign severity (P0/P1/P2/P3)                         ║
║  3. Start incident log (timestamped notes)                 ║
║  4. Alert response team                                    ║
║  5. Preserve evidence (don't delete logs!)                 ║
╠════════════════════════════════════════════════════════════╣
║ Key Commands:                                              ║
║  cd /home/user/GroveEngine                                 ║
║  gf --agent search "pattern"      # Find code              ║
║  gw git log --since="1 week ago"  # Recent changes         ║
║  pnpm test                        # Verify fix             ║
╠════════════════════════════════════════════════════════════╣
║ Communication:                                             ║
║  security@grove.place - Security team                      ║
║  See templates in runbook for user notification            ║
║  GDPR: 72-hour notification deadline for data breaches     ║
╠════════════════════════════════════════════════════════════╣
║ Full Runbook: docs/security/incident-response-runbook.md   ║
╚════════════════════════════════════════════════════════════╝
```

---

_The grove is watched, the paths are clear, and help is ready when shadows appear._ 🦅
