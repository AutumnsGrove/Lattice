# Authentication Strategy for Grove: A Comprehensive Implementation Guide

---

## DECISION: Magic Links with 6-Digit Email Codes

**Status:** DECIDED (November 2025)

**Choice:** Email-based one-time passwords (OTP) - 6-digit codes sent via email

**Rationale:**
- Extremely simple user experience - no passwords to remember
- More secure than traditional click-link magic links (doesn't train phishing behavior)
- Works with corporate email scanners that break clickable magic links
- Familiar pattern (similar to 2FA codes users already know)
- Lower implementation complexity than OAuth
- Zero password storage/hashing concerns

**Implementation:**
1. User enters email address
2. System generates 6-digit code (cryptographically secure)
3. Code sent via Resend with 15-minute expiration
4. User enters code to authenticate
5. Session created in KV with appropriate TTL

**Tech Stack:**
- Resend for email delivery
- Cloudflare KV for session storage and code verification
- D1 for user accounts

---

## Research Summary

**Better Auth with email/password emerges as the optimal solution for Grove, offering production-ready features, excellent Cloudflare compatibility, and maintainable complexity for a solo developer.** This approach provides industry-standard security at zero ongoing cost beyond infrastructure, with clear paths to add OAuth and advanced features. The recommended architecture uses single unified accounts with role-based access, D1 for user storage, KV for sessions, and Resend for transactional emails—creating a robust foundation that scales from 10 to 1000+ users without infrastructure changes.

This matters because authentication failures create user frustration and security vulnerabilities. Grove's current broken GitHub OAuth situation exemplifies the risk of choosing solutions without proper Cloudflare edge compatibility. By implementing the patterns outlined here—specifically designed for SvelteKit + Cloudflare Pages—you'll achieve a simple signup flow (under 2 minutes), enterprise-grade security, and long-term maintainability as a solo developer.

The authentication landscape for SvelteKit shifted dramatically in November 2024 when Lucia Auth, previously the top recommendation, deprecated in favor of teaching implementation patterns. This created opportunity for Better Auth to emerge as the maintained successor, while also validating that auth is simple enough to implement directly. For Grove's multi-tenant blog platform with two use cases (admin management and social feed interactions), the decision between simplicity and security resolves clearly: start with battle-tested fundamentals rather than complex OAuth that doesn't work.

## Authentication method comparison and recommendations

The core decision for Grove centers on choosing between self-hosted authentication (implementing session management directly or using Better Auth) versus managed services (Supabase, Clerk, Auth0). **Self-hosted with Better Auth provides the best balance** of developer control, zero ongoing costs, and production-ready features specifically optimized for Cloudflare's edge infrastructure.

**Better Auth represents the current best practice** for SvelteKit + Cloudflare projects. This actively maintained open-source framework offers built-in support for email/password, OAuth (50+ providers), passkeys, and 2FA while working seamlessly with Cloudflare D1, KV, and Workers. The framework requires approximately 150-200 lines of integration code, offers medium learning curve complexity, and provides high customization through its plugin system. Most critically, it solved the issues that plagued earlier solutions—the User-Agent header problems that break GitHub OAuth in Cloudflare Workers are handled correctly, environment variables access follows edge runtime patterns, and password hashing works without Node.js native dependencies. Setup takes 2-4 hours for a solo developer, with maintenance burden remaining low-medium as you own configuration but not the core auth logic.

For comparison, implementing authentication from scratch using **Oslo (auth utilities) + Arctic (OAuth library)** gives complete control and teaches fundamental concepts through the Copenhagen Book guide. This approach requires 200-300 lines of code, has a high learning curve, and provides unlimited customization since you write everything. The critical challenge for Cloudflare is that password hashing implementations like Argon2 use Node.js bindings that don't work in Workers. The solution requires creating a separate Rust Worker for hashing called via Service Bindings—adding complexity but achieving 100ms hash times versus 14 seconds with pure JavaScript alternatives. This path takes 10-15 hours initial setup and suits developers wanting deep understanding or specific requirements that frameworks can't accommodate.

**Auth.js (formerly NextAuth)** remains experimental for SvelteKit despite maturity in the Next.js ecosystem. While it offers 68+ OAuth providers and quick initial setup (50-100 lines of code), Cloudflare deployment suffers from critical issues. Build failures occur with "basePath.length" TypeErrors during Cloudflare Pages builds, requiring `AUTH_TRUST_HOST=true` environment variable workarounds and lazy initialization patterns to access platform environment variables. The framework's abstraction makes customization difficult once needs exceed basic OAuth—you inherit a black box that becomes hard to debug. Community consensus recommends avoiding Auth.js on Cloudflare unless only implementing simple OAuth-only authentication with no custom requirements.

The managed authentication services present different tradeoffs. **Supabase Auth** offers the most generous free tier at 50,000 monthly active users (MAU), can be used standalone without the full Supabase database, and costs just $25/month for 100,000 MAU. However, SvelteKit integration is unofficial and described as "harder to setup" than alternatives, creating medium vendor lock-in through Postgres-stored user data. **Clerk** provides the smoothest developer experience with pre-built UI components and a 10,000 MAU free tier, but lacks official SvelteKit support (relying on community adapters) and becomes expensive at scale—approximately $500-1000/month at 100,000 users represents a severe "growth penalty." **Auth0** now offers 25,000 MAU free with significantly limited features, but costs balloon to ~$700/month at just 10,000 users with no official SvelteKit support, earning its reputation for surprise price increases. **Firebase Auth** provides 50,000 MAU free but creates very high Google lock-in unsuitable for web-first applications. 

For Grove's specific context—a solo developer managing 10-100 initial clients scaling to 100+—the cost analysis reveals that managed services offer minimal value. At 100 users, you're looking at $0 for self-hosted versus $0 for most managed free tiers, seemingly equal. But at 10,000 users, Auth0 costs $700/month, Clerk costs estimated $250-300/month, while Better Auth remains $0 beyond the $5/month Workers Paid subscription you already need. The convenience of managed auth translates to 2-3 hours saved on initial setup, which you'll recoup in the first month by avoiding the learning curve of provider-specific quirks and limitations.

### Why GitHub OAuth breaks on Cloudflare Pages

The GitHub OAuth failure on Cloudflare Pages stems from a specific technical mismatch between GitHub's API requirements and Cloudflare's edge runtime behavior. **GitHub's OAuth API strictly requires User-Agent headers on all requests, but Cloudflare's fetch implementation in Workers does not provide default User-Agent headers**. Node.js environments (using undici's fetch) automatically add User-Agent headers, which is why the OAuth flow works perfectly in `npm run dev` (local development) but fails in production with `wrangler` or deployed to Cloudflare Pages.

When Auth.js or similar libraries make bare `fetch()` calls to GitHub's OAuth endpoints without explicitly setting User-Agent headers, GitHub returns an HTML error page instead of JSON. This causes callback processing to fail with cryptic "premature TLS connection" errors or generic "Error" messages that provide no clear indication of the root cause. The issue was definitively identified in NextAuth GitHub Issue #6741 after developers confirmed the pattern: works locally, breaks in Cloudflare runtime.

**The solution requires explicit header management**: Add `'User-Agent': 'YourApp/1.0'` to all OAuth fetch requests. Better Auth handles this correctly out of the box, which is one reason it emerged as the recommended solution. Alternatively, implement a dedicated Cloudflare Worker for the OAuth proxy following Simon Willison's pattern—this keeps client secrets secure server-side, properly handles state parameters for CSRF protection, and controls all headers explicitly. The broader lesson is that Cloudflare's edge runtime differs subtly from Node.js environments, requiring libraries specifically tested and designed for Workers/Pages compatibility rather than frameworks ported from traditional server architectures.

## Cloudflare infrastructure decisions

The choice between Cloudflare Pages Functions and Workers for authentication logic initially seems complex but resolves simply: **use Pages Functions for initial development, plan to migrate to Workers as the project matures**. Pages Functions and Workers run identical underlying V8 isolates with the same runtime, performance, and pricing for invocations. The ~5ms cold start applies to both (though real-world complex apps experience 50-250ms from initialization overhead). The distinction lies in developer experience and feature access.

Pages Functions offer file-based routing where `/functions/api/auth.js` automatically maps to `/api/auth` endpoint, built-in middleware support, and the simplest deployment via git push with automatic preview environments per branch. Free static asset serving doesn't count toward request quotas. However, Pages Functions use older Wrangler 3.x that cannot upgrade to 4.x, lack access to the new Worker Logs observability feature, cannot be edited in the dashboard, and don't support Cron Triggers or full Durable Objects capabilities. Most significantly, **Cloudflare is directing investment toward Workers**, with Pages receiving fewer new features—a concerning long-term signal.

Workers provide the latest Wrangler 4.x tooling, superior logging and observability, full feature access including Cron Triggers and Durable Objects, and more control over routing and asset serving. The tradeoff is manual routing setup without file-based magic and more complex configuration for SPAs and 404 pages. For authentication specifically, both support D1, KV, and R2 bindings identically. The critical consideration for auth checks is that with Workers, you must set `assets.run_worker_first: true` to perform authentication before serving static assets.

Cloudflare provides an official migration guide from Pages to Workers, making this a safe progression path. For Grove, **start with Pages Functions to ship quickly**, leveraging automatic deployment and simpler setup. Plan the Workers migration for when you need advanced features, better observability, or hit Pages-specific limitations. The authentication code itself will transfer directly since both environments share the same runtime.

### Storage architecture: D1 vs KV for authentication

The optimal storage architecture for Grove separates concerns by data type and access pattern: **use D1 (SQL database) for user accounts and profiles, use KV (key-value store) for active sessions and rate limiting**. This hybrid approach plays to each service's strengths while avoiding their weaknesses.

**D1 proves perfect for user accounts** due to relational data requirements. User entities need email uniqueness constraints, OAuth provider linkage through foreign keys, profile data with complex queries, and audit logs with timestamp filtering. D1's SQLite-based system handles \<1ms read queries with proper indexes (create index on users.email for login lookups), supports transactions for account linking operations, and provides strong consistency through its session-based access pattern. For Grove's scale, the free tier covers 5 million rows read per day and 100,000 rows written per day—vastly exceeding a 100-user workload that might generate 10,000 daily auth checks (1 million rows/month) and 1,000 daily logins (30,000 rows/month). Storage under 1 MB for user accounts remains free. Even at 10,000 users, costs stay near $0/month as D1 pricing is remarkably generous.

The critical limitations appear in D1's architecture: 6 simultaneous connections per worker invocation, 50 queries per invocation on free tier, and 30-second maximum query duration. These constraints don't affect authentication reads (single indexed query: `SELECT * FROM users WHERE email = ?`) but would impact complex reporting or analytics queries. For Grove's auth use case, D1 is perfectly sized—you'll never hit the limits with simple CRUD operations on user records.

**KV excels for session storage** through features specifically designed for this use case. The built-in TTL (time-to-live) support enables automatic session expiration without cron jobs—set `expirationTtl: 86400` for 24-hour sessions and KV handles cleanup automatically. Read latency for frequently accessed "hot" keys reaches 500µs to 10ms cached at the edge, making session validation effectively free in terms of perceived latency. The simple get/put/delete API reduces code complexity compared to SQL session queries. Write performance reaches ~1-2ms, faster than D1's several-millisecond replication time.

KV's free tier provides 100,000 reads per day and 1,000 writes per day, covering 100 active users with daily session checks. Writes are the constrained resource—each login/logout consumes one write. At 1,000 writes per day free tier, you support roughly 30 daily logins (with some buffer for rate limit counters). If you exceed this, paid tier pricing is $5.00 per million writes beyond the 1 million monthly included, making even heavy usage inexpensive.

The eventual consistency model (changes visible immediately in the same region, up to 60 seconds globally) suits session storage where brief propagation delays don't matter—users typically remain in one region per session. The minimum 60-second TTL means you can't create shorter-lived tokens, but authentication tokens should last at least minutes anyway. The 1 write per second limit per key prevents using single keys for global rate limiting (use sharded keys like `rate:${userId}:${Math.floor(Date.now()/1000)}` to distribute load).

**The recommended database schema** implements this separation:

```sql
-- D1: User accounts and profiles
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE auth_providers (
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'local', 'google', 'github'
  provider_user_id TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(provider, provider_user_id)
);
CREATE INDEX idx_auth_providers_user ON auth_providers(user_id);
```

```javascript
// KV: Active sessions (with TTL)
await env.SESSION_KV.put(
  `session:${sessionId}`,
  JSON.stringify({ userId, email, role, createdAt: Date.now() }),
  { expirationTtl: 86400 * 7 } // 7 days
);

// KV: Rate limiting counters (short TTL)
await env.RATE_LIMIT_KV.put(
  `login_attempts:${ip}`,
  attemptCount.toString(),
  { expirationTtl: 900 } // 15 minutes
);
```

This architecture scales horizontally—D1 can support 10 GB databases (hard limit) holding millions of users, while KV handles billions of operations at global edge locations. The cost structure remains linear and predictable: primarily based on read/write operations rather than storage, with free tiers covering initial scale and paid tiers offering transparent per-operation pricing.

## Email delivery and communication strategy

**Resend emerges as the clear winner** for Grove's transactional authentication emails, offering the best combination of developer experience, Cloudflare integration, and free tier generosity specifically designed for indie developers. The 3,000 emails per month free tier (100 per day limit) covers Grove through 100+ users without charges, as authentication workloads generate approximately 50 emails per month at 10 users (signup verifications, password resets), 165 per month at 50 users, and 380 per month at 100 users (including verification, resets, magic links if implemented, and account notifications).

Resend's superiority for this stack stems from its purpose-built developer focus. Official Cloudflare tutorials document integration patterns, the API design prioritizes simplicity (clean REST with idempotency keys to prevent duplicate sends), and SvelteKit examples proliferate in the community. Setup requires minimal configuration—add DNS records for SPF/DKIM/DMARC, and Resend handles automatic verification and deliverability optimization. The service includes 1-day log retention on free tier (3 days on Pro tier), webhooks for delivery tracking, and excellent reported inbox placement rates. At $20/month for 50,000 emails when you eventually exceed the free tier, the pricing remains predictable and reasonable.

**Cloudflare Email Service remains unavailable** for production use as of November 2024. The service entered private beta in September 2025 with no public general availability date, requires waitlist signup, and has unfinalized pricing beyond confirming it will need the $5/month Workers Paid subscription. While the native integration (email bindings without API keys), automatic DNS configuration, and global delivery from 330+ edge locations sound compelling, you cannot bet Grove's authentication flows on an unreleased service with unknown pricing and unproven deliverability. The smart strategy is to launch with Resend now and optionally evaluate migration after Cloudflare Email Service reaches GA.

**SendGrid's expired free tier** (100 emails per day for 60 days only) immediately disqualifies it—you'll hit a payment wall after two months. Deliverability concerns further compound this: tests showed 20.9% of emails went missing, and users report spam folder issues and poor customer support post-Twilio acquisition. **Mailgun** offers a reasonable alternative with an always-on 100 per day free tier and good deliverability (71.4% inbox placement), but the lower monthly cap (3,000 vs Resend) and higher paid pricing ($35/month for 50,000 vs $20/month) make it the second choice. **Postmark** delivers best-in-class reliability (83.3% inbox placement) but costs significantly more ($15/month for 10,000 emails) with a very limited free tier (100 per month total), making it overkill unless email deliverability is absolutely mission-critical. **AWS SES** provides the cheapest per-email cost ($0.10 per 1,000) but demands complex setup including manual SPF/DKIM/DMARC configuration, sandbox limitations requiring approval, and poor error handling—not worth the time investment for the trivial cost savings at Grove's scale.

The cost reality bears emphasizing: **email expenses are negligible at Grove's scale**. Even at 100 users generating 380 emails per month, all major services cost $0 on free tiers or minimal amounts ($15-20/month) on paid plans. The $20/month Resend would charge at 3,000+ emails per month equals about 4 hours of developer time at reasonable indie dev rates. If Resend saves even one afternoon of debugging deliverability issues compared to AWS SES, it pays for itself many times over. Optimize for developer velocity and reliability rather than marginal cost differences.

### Email verification and authentication flow decisions

**Email verification should be required on signup** for Grove despite the signup friction it creates. The security risks of skipping verification are too significant for an authentication-dependent platform. Without verification, attackers can create accounts using victim email addresses and set passwords, then when the real owner signs up with a magic link, the attacker retains backdoor password-based access (account takeover vulnerability). Users who mistype their email addresses during signup become permanently locked out—they can't reset passwords because the email address is wrong, and you have no way to reach them. You can't send important notifications or account security alerts without verified email addresses. Email enumeration becomes possible where malicious users claim email addresses preemptively to block legitimate owners.

The implementation should follow established security patterns: Generate cryptographically secure tokens (minimum 128 bits of entropy using `crypto.randomBytes`), store the bcrypt hash of tokens rather than plaintext (protects against database breaches), set 24-48 hour expiration for verification links (balances user convenience with security), mark tokens as one-time use and delete after validation, and crucially **prevent account access until email is verified** (not just a reminder). Show a clear "didn't receive?" resend option on the waiting page, as users will occasionally need to check spam folders or retry due to delivery delays.

**Password reset flows** require even tighter security with shorter expiration times (15-30 minutes) since the token grants access to change account credentials. Generate tokens with identical entropy standards, store only hashed versions, implement one-time use with immediate invalidation after successful password change, apply aggressive rate limiting (maximum 5 reset requests per 15 minutes per email), and send notification emails after successful resets to alert users of potential unauthorized access attempts. The error handling must be security-conscious: when users request resets for non-existent emails, don't reveal existence—always say "if that email exists, a reset link was sent" to prevent email enumeration. For expired or invalid tokens, provide clear messages and easy resend options.

**Token delivery time expectations** critically impact user experience. Target \<30 seconds for transactional emails, though reality typically falls into 30 seconds to 2 minutes. Problem cases where emails take 5-15 minutes frustrate users and break authentication flows. Email delivery speed depends on sender reputation (new domains start slower), recipient email provider processing times (Gmail is fast, some corporate email is slow), content filtering (spam checks cause delays), and service infrastructure (Postmark optimizes for speed, AWS SES is variable). Resend and Postmark consistently hit \<30 second targets, while SendGrid and AWS SES show more variability.

### Magic links versus one-time passwords

The research reveals that **magic links create more friction and security concerns than initially apparent**, particularly the problematic pattern of training users to click links in emails. Security professionals emphasize that conditioning users to "it's OK to click links in authentication emails" directly enables phishing attacks—scammers exploit this learned behavior across all email contexts. Financial institutions and security-conscious companies specifically avoid magic links for this reason. Additionally, modern corporate email security systems scan links in emails before delivery, sometimes clicking them for threat analysis, which can inadvertently invalidate one-time magic links before users access them.

The user experience friction compounds these security concerns. Users must switch between email and browser (particularly annoying on mobile between apps), wait for email delivery where delays cause abandonment (5-15 minute delays break the flow entirely), check spam folders when emails don't arrive promptly, and face uncertainty with "Did it send?" questions. For frequent logins, repeatedly checking email becomes tedious compared to password manager autofill. Magic links work best for infrequent logins (weekly or monthly), web-based SaaS products, and users who regularly check email—but become problematic for daily authentication patterns.

**One-time password (OTP) codes delivered via email** provide better security posture and comparable user experience: Users receive a 6-digit code via email, type the code into the application, avoiding link-clicking behavior that trains phishing susceptibility. OTPs work with email security scanners that break magic links, create a more secure perception through active user input versus passive clicking, and provide fallback options (receive code, type manually instead of single point of failure in link). The UX is nearly identical—users still check email—but the security benefits are substantial.

For Grove specifically, the recommendation is **start with email+password authentication** (simplest, most familiar), add optional email OTP for passwordless login in a later phase (test user preference), and avoid magic links entirely given their security training concerns. If users request passwordless authentication, implement OTP codes rather than links. Monitor user behavior—if most users stick with passwords and password managers provide good UX, the passwordless option may be unnecessary complexity.

## Session management and security architecture

The choice between stateless (JWT) and stateful (server-side) session management fundamentally shapes the security and scalability characteristics of Grove's authentication system. **For Cloudflare Pages architecture, stateful sessions stored in KV offer superior security with minimal performance tradeoff**, making them the recommended approach.

**Stateful sessions** store only a random session ID in an HTTP-only cookie, while actual session data (user ID, email, role, creation time) lives in Cloudflare KV. On each request, the application retrieves and validates session data from KV using the session ID as the key. This architecture provides immediate session invalidation (delete KV entry), automatic expiration through KV's built-in TTL, minimal data exposure in cookies (just an unguessable random ID), easy tracking of active sessions per user (enumerate `session:{userId}:*` keys), and flexible session data updates without touching clients (change role, permissions in KV only). The performance impact is negligible—KV reads for hot sessions take 500µs to 10ms, adding minimal latency to request handling. The implementation complexity remains low with KV's simple API.

**Stateless sessions (JWT)** encode all session data directly into a signed token stored in cookies or localStorage. No database lookup occurs on each request—the Worker validates the signature and extracts user data from the token itself. This offers zero database queries per request (fastest theoretically) and works identically across distributed edge locations without shared state. However, the security tradeoffs are significant: you cannot invalidate tokens before expiration (logout only clears client-side cookie, token remains valid if stolen), changing user roles requires waiting for token expiration, token theft via XSS provides access until natural expiration, implementing refresh tokens adds complexity similar to stateful sessions, and secret key rotation forces all users to re-authenticate.

The **critical security vulnerability** in JWT for authentication is the inability to invalidate sessions immediately. When a user logs out, you can clear their cookie, but if an attacker already copied the JWT (via XSS, network interception, or browser extension), they retain access until the token's expiration time. This makes JWT unsuitable for admin sessions requiring immediate logout capability. Attempted mitigations like token blacklists reintroduce database lookups, negating JWT's stateless benefit.

For Grove's specific requirements—admin sessions (high security needs) and feed sessions (moderate security needs)—the solution is **stateful sessions in KV with role-based timeouts**: Admin sessions expire after 2 hours with 30-minute idle timeout, following OWASP recommendations for elevated privilege access. Feed sessions persist for 30 days with "remember me" or 24 hours for session-only, balancing user convenience with security. The implementation stores separate session types tracking last activity timestamps, with middleware enforcing step-up authentication when feed users access admin panels (require password re-entry if session older than 15 minutes).

**Cookie security flags** must be configured correctly for Cloudflare edge deployment:

```javascript
cookies.set('grove_session', sessionId, {
  httpOnly: true,        // Prevents JavaScript access (XSS protection)
  secure: true,          // HTTPS only
  sameSite: 'lax',       // CSRF protection, allows navigation
  maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
  path: '/',
  domain: undefined      // Current domain only
});
```

**CSRF protection** comes built into SvelteKit through origin checking on form actions, but API endpoints require explicit token validation. Generate CSRF tokens per session, store in KV alongside session data, embed in forms or meta tags, and validate on mutation endpoints (POST, PUT, DELETE). For SvelteKit form actions, rely on the framework's automatic protection through origin header validation.

**Rate limiting** prevents brute force attacks against login endpoints and must operate at the edge for effectiveness. Implement using KV counters with TTL:

```javascript
const rateKey = `login_attempts:${clientIP}`;
const attempts = parseInt(await env.RATE_LIMIT_KV.get(rateKey) || '0');

if (attempts >= 5) {
  return json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
}

await env.RATE_LIMIT_KV.put(rateKey, (attempts + 1).toString(), {
  expirationTtl: 900 // 15 minutes
});
```

The rate limit should be 5 failed login attempts per 15 minutes per IP address, with exponential backoff for repeated violations. Account lockout after 10 consecutive failed attempts adds a second layer, storing lockout state in D1 user records with administrator unlock capability.

**Password hashing** requires special attention on Cloudflare Workers. Node.js native implementations of Argon2 and bcrypt don't function in the Workers runtime. The pure JavaScript `@noble/hashes` library works but takes ~14 seconds CPU time versus ~100ms for native implementations, potentially hitting Worker CPU limits. The recommended solution for production implementations is creating a separate Rust-based Worker for Argon2 hashing called via Service Bindings—this achieves native performance (~100ms) while remaining edge-compatible. For rapid prototyping, bcryptjs (pure JavaScript) offers acceptable performance with cost parameter 12, taking ~200-300ms per hash. Choose Argon2 for maximum security in production, bcrypt for adequate security with simpler implementation.

## Account architecture and future-proofing

**Grove should implement a single unified account with role-based access** rather than separate admin and feed accounts. This architectural decision follows industry standard patterns from Stack Overflow, Medium, WordPress, and Ghost—all multi-tenant blog platforms that successfully scale to millions of users with single-account architectures. The dual-account pattern exists in enterprise contexts like Microsoft Azure or AWS IAM where infrastructure administrators have catastrophic access (delete entire production infrastructure), justifying the extreme separation. Blog platform admins can create/edit posts and manage settings—serious responsibilities, but not infrastructure-level privileges requiring account separation.

The single-account approach dramatically simplifies user experience: users remember one email/password combination, password resets affect all access seamlessly, profile settings update everywhere, and single sign-on between admin and feed happens transparently (already logged in for feed access, no re-authentication needed for admin panel). The security doesn't suffer because role-based session management handles risk differences appropriately. Store role field in the users table (`'admin'` or `'user'`), implement separate session timeouts (admin: 2 hours with 30-minute idle timeout, feed: 30 days remembered), and enforce step-up authentication when feed users access admin functionality (require password re-entry if session older than 15 minutes since last admin action).

**The database schema must support future OAuth integration and account linking** from day one, even if launching with just email/password:

```sql
-- Core user identity (stable, never tied to auth method)
CREATE TABLE users (
  id TEXT PRIMARY KEY,              -- UUID, never changes
  email TEXT UNIQUE,                 -- Can change if user updates
  display_name TEXT,
  role TEXT DEFAULT 'user',
  created_at INTEGER NOT NULL
);

-- Multiple authentication methods per user (extensible)
CREATE TABLE auth_providers (
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,            -- 'local', 'google', 'github', 'twitter'
  provider_user_id TEXT,             -- OAuth provider's user ID
  provider_email TEXT,               -- Email from OAuth provider
  password_hash TEXT,                -- Only for 'local' provider
  is_primary BOOLEAN DEFAULT FALSE,  -- Which method to suggest on login
  linked_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(provider, provider_user_id)
);
```

This schema enables seamless evolution: Start with email+password by creating `users` entry and `auth_providers` entry with `provider='local'`. When adding Google OAuth, the OAuth flow returns Google email address and Google user ID. If the email matches an existing user, prompt for password confirmation to link accounts (prevents hijacking), then insert new `auth_providers` entry with `provider='google'`. The user can now log in with either email+password OR Google OAuth, both accessing the same user identity. Handle email conflicts carefully—if someone tries to link Google account but email differs from primary email, either require admin approval, send verification to both emails, or prevent linking with clear error message.

**Account linking conflict resolution** follows the pattern established by Firebase and Auth0: When OAuth returns an email already in the system but from a different provider, present the user with "This email is already registered. Enter your password to link accounts." After password verification succeeds, create the additional auth_providers entry. If password verification fails after 3 attempts, suggest password reset flow. This pattern prevents account takeover attacks where attackers use OAuth to claim victim email addresses.

**Migration paths for evolving authentication requirements** should be planned in advance. To add OAuth to an existing email+password user base, implement account linking UI in user settings ("Link Google Account"), follow standard OAuth flow, create auth_providers entry on successful link, and allow unlinking with warning if it's the only authentication method. To migrate from one auth library to another (e.g., custom implementation to Better Auth), keep the same database schema (Better Auth supports custom schemas), write migration script to adjust schema differences, run both systems in parallel with feature flag, and gradually roll out to users over days/weeks monitoring for issues.

**Feature flags** enable safe rollout of authentication changes:

```javascript
// Environment variable based feature flags
const features = {
  GOOGLE_OAUTH: env.ENABLE_GOOGLE_OAUTH === 'true',
  GITHUB_OAUTH: env.ENABLE_GITHUB_OAUTH === 'true',
  TWO_FACTOR: env.ENABLE_2FA === 'true',
  MAGIC_LINKS: env.ENABLE_MAGIC_LINKS === 'true'
};

// In auth routes
if (features.GOOGLE_OAUTH) {
  // Show Google login button
}
```

Enable features for internal testing first, then gradually roll out to percentage of users (use user ID hash modulo for consistent bucketing), and monitor error rates before full deployment. This staged approach prevents authentication outages that lock out entire user bases.

## Two-factor authentication and advanced security

**Two-factor authentication (2FA) should be mandatory for admin accounts and optional for feed users**, reflecting the different risk profiles of these roles. Admin accounts control blog content, manage user permissions, and access sensitive settings—capabilities that justify the authentication friction of 2FA. The **mandatory 2FA for admins** should be implemented with a grace period: Allow new admin accounts 30 days without 2FA to establish primary authentication, then show increasingly urgent reminders, and finally require 2FA setup on next admin panel access after the grace period ends. This graduated approach follows GitHub's successful rollout strategy that achieved 1.4 million passkey users.

Feed users who only read content, upvote, and comment represent lower risk targets. **Optional 2FA for feed users** satisfies security-conscious individuals without burdening the entire user base with authentication friction. Approximately 5-10% of users typically enable optional 2FA in consumer applications—enough to provide the feature for those who want it without making it a conversion barrier.

**TOTP (Time-based One-Time Password) via authenticator apps** provides the optimal 2FA implementation for Cloudflare Workers. Popular authenticator apps (Google Authenticator, Authy, 1Password, Bitwarden) generate 6-digit codes that rotate every 30 seconds based on shared secrets. The implementation requires the `otpauth` library which works in Cloudflare Workers environment (unlike some Node.js-specific libraries), costs $0 (no per-verification charges unlike SMS), provides strong security (phishing-resistant, no SIM swapping vulnerability), and achieves offline functionality (codes generate without internet). Setup complexity for a solo developer spans 2-3 days of focused implementation including setup flow, verification, and recovery codes.

The **2FA database schema** extends the existing user system:

```sql
CREATE TABLE user_2fa (
  user_id TEXT PRIMARY KEY,
  secret TEXT NOT NULL,              -- Encrypted TOTP secret
  backup_codes TEXT,                 -- JSON array of hashed backup codes
  enabled_at INTEGER,                -- When user activated 2FA
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Implementation flow** for TOTP setup: Generate random secret (32-character base32), display secret as QR code (`otpauth://totp/Grove:${email}?secret=${secret}&issuer=Grove`), user scans with authenticator app, prompt user to enter current code to verify setup worked correctly, generate 10 single-use backup codes (store bcrypt hashes, show plaintext once), and mark 2FA as enabled only after successful verification. The verification step is critical—ensures users successfully configured their app before enabling 2FA, preventing lockouts from failed setup.

**Login flow with 2FA**: User enters email+password, after password validates, check if user has 2FA enabled, if yes show TOTP code prompt, verify code with 60-second window tolerance (allows one step forward/backward for clock skew), only then create session and log in. For backup codes, provide clear "Lost your device?" link on the code prompt showing backup code entry field, verify backup code against stored hashes, mark code as used (prevent reuse), and suggest user regenerate backup codes during next login.

**SMS 2FA should be avoided** despite user familiarity. The costs ($0.01-0.34 per verification) accumulate quickly—1000 admin logins per month = $10-340/month. Security vulnerabilities include SIM swapping attacks where attackers convince carriers to port victim phone numbers to attacker's SIM card, SMS interception through SS7 network weaknesses, and message delivery failures blocking account access. The implementation complexity rivals TOTP while providing inferior security. Only consider SMS 2FA if absolutely required by specific customers willing to pay premium pricing to cover costs.

**WebAuthn/Passkeys** represent the future of authentication—biometric or security key based, phishing-resistant by design, and excellent user experience once set up. However, implementation complexity is high for solo developers, requiring understanding of WebAuthn protocol, handling browser compatibility differences, and implementing both platform authenticators (Face ID, Touch ID) and roaming authenticators (YubiKeys). Browser support remains imperfect with edge cases in older browsers. **Recommendation: defer passkeys to post-launch**, focusing on proven TOTP implementation first. Better Auth includes passkey support if you want to offer it later with minimal additional code.

## GDPR compliance and data governance

GDPR compliance for authentication systems centers on three core rights: the right to access data, the right to data portability (export), and the right to erasure (deletion). Grove's authentication system must implement these capabilities from launch to avoid expensive retrofitting later, even if initially targeting non-EU users, because GDPR increasingly influences global privacy expectations.

**Cookie consent requirements** have a crucial carve-out for authentication: HTTPS-only session cookies used exclusively for authentication qualify as "strictly necessary" cookies under GDPR and do not require consent banners. Users cannot use an authenticated service without authentication cookies, making consent implied by service use. However, any analytics cookies (Google Analytics, Plausible) or advertising cookies DO require explicit consent before setting. The implementation is simple—set authentication cookies immediately on login, defer analytics cookies until user accepts via consent banner (or skip analytics cookies entirely for simplest compliance).

**Privacy policy requirements** must explicitly document what authentication data Grove collects (email, username, password hash, IP addresses, OAuth provider identity if using social login), why (user authentication and security), how long it's retained (active accounts retained indefinitely, deleted accounts purged after 30 days), and users' rights (access, correct, delete, export). The policy should live at `grove.com/privacy` linked prominently in footer and during signup. Template privacy policies for authentication systems are available from privacy policy generators, customized for your specific data practices.

**Account deletion (right to erasure)** requires careful implementation to balance user rights with operational needs. The **30-day grace period pattern** provides optimal user experience: User requests deletion from account settings, mark account as "deletion_pending" with scheduled_deletion_date 30 days future, send confirmation email with prominent cancellation link, disable login immediately (treat as deleted for all purposes), and after 30 days execute permanent deletion via scheduled Worker or manual process. This prevents accidental deletions and allows reconsideration, while immediately ending service access.

**Deletion methods** present a choice between hard delete (completely remove from database) and anonymization (replace identifiable data with random values). Austrian Data Protection Authority rulings confirm that proper anonymization satisfies GDPR's right to erasure if truly irreversible—you cannot retain any way to connect anonymized data back to the individual. For Grove, the recommended approach is **cascading deletion** with **content anonymization**: Delete user from users table with CASCADE removing auth_providers and sessions automatically, anonymize blog posts/comments by changing author to "deleted_user_${uuid}" (preserves community content while removing attribution), and hard delete any private data (draft posts, private messages if implemented). Audit logs may retain email/IP for security purposes with documented retention period (90 days typical).

**Data export** provides users with machine-readable copies of their data:

```javascript
// Generate export JSON
{
  "account": {
    "email": "user@example.com",
    "displayName": "Jane Smith",
    "role": "user",
    "created": "2024-01-15T10:30:00Z"
  },
  "authentication": {
    "providers": ["local", "google"],
    "twoFactorEnabled": false
  },
  "content": {
    "posts": [{"title": "...", "published": "..."}],
    "comments": [{"text": "...", "date": "..."}],
    "reactions": [{"post": "...", "type": "upvote"}]
  },
  "activity": {
    "lastLogin": "2024-11-15T09:20:00Z",
    "loginHistory": [...]
  }
}
```

Provide this export as downloadable JSON via account settings, include creation timestamp and export format version, and exclude password hashes and security tokens (not user data). Process export requests immediately for small datasets (\<1MB), or queue for background processing with email delivery for larger exports. GDPR requires responding to export requests within 30 days, though immediate export provides better user experience.

**Session logging and audit trails** balance security monitoring with privacy. Log authentication events (successful logins, failed attempts, password changes, 2FA changes) with timestamps and IP addresses, retain security logs for 90 days, and allow users to view their own login history in account settings for transparency. Avoid logging full user activity or content interactions beyond what's needed for security and required for service operation.

## Implementation guide and timeline

**Phase 1: Foundation (Week 1-2)** establishes core authentication with email and password. Set up Better Auth with Cloudflare D1 adapter following official SvelteKit integration guide, implement user registration with email verification (generate secure token, send via Resend, validate token on click, mark user as verified), create login flow with SvelteKit form actions (validate credentials, create session in KV with TTL, set HTTP-only session cookie, redirect to dashboard), and implement password reset (generate token with 30-minute expiration, send email, validate token, allow password change, invalidate all existing sessions). Configure D1 database schema from provided SQL examples, set up KV namespace for sessions, integrate Resend with DNS verification, and deploy hooks.server.ts with session validation middleware. By end of week 2, admin users can sign up, verify email, log in, and reset passwords—sufficient for early testing.

**Phase 2: OAuth Integration (Week 3)** adds social login options. Implement Google OAuth using Better Auth's Google provider (register application in Google Cloud Console, configure OAuth consent screen, set up redirect URIs for both dev and production, add environment variables for client ID and secret), implement GitHub OAuth similarly with User-Agent header explicitly set to avoid Cloudflare issues, build account linking flow (detect existing email from OAuth, prompt for password confirmation, create auth_providers entry, handle conflicts with clear error messages), and update UI to show multiple login options prominently while keeping email+password as fallback. Test with both new account creation via OAuth and linking OAuth to existing email+password accounts.

**Phase 3: Session Management Enhancement (Week 4)** refines user experience. Implement "remember me" functionality using secure token rotation pattern (store series+token in separate table, verify both on return, regenerate token on each use, detect theft if series matches but token doesn't), create role-based session timeouts (admin: 2 hours, feed: 30 days remembered or 24 hours session), build step-up authentication for feed users accessing admin panel (check last admin auth time, if \>15 minutes require password re-entry, store admin_verified_at timestamp), and implement active sessions management (show user list of active sessions with device info, allow remote logout of specific sessions, track last activity timestamps).

**Phase 4: Two-Factor Authentication (Week 5-6)** adds administrator security. Integrate `otpauth` library for TOTP, implement 2FA setup flow (generate secret, display QR code, verify first code before enabling, generate and display backup codes once), modify login flow to prompt for TOTP code after password validation if user has 2FA enabled, implement backup code redemption flow with clear UI, create 2FA enforcement for admin accounts with 30-day grace period, and build recovery process (use backup codes or admin-initiated reset with strong identity verification). Test thoroughly with actual authenticator apps on multiple platforms (Google Authenticator, Authy, 1Password).

**Phase 5: GDPR Compliance (Week 7)** satisfies regulatory requirements. Implement account deletion with 30-day grace period (add deletion_pending status, scheduled job to execute deletion, immediate login disablement, cancellation flow), create data export endpoint (gather user data from all tables, generate JSON, return as download, consider async processing for large exports), write privacy policy covering authentication data practices (what's collected, why, retention, user rights), implement cookie consent if using analytics beyond authentication, and create audit logging (track security events, retain 90 days, allow user viewing of own history).

**Phase 6: Security Hardening (Week 8)** completes pre-launch security. Implement rate limiting across endpoints (5 failed logins per 15 minutes per IP via KV counters, progressive backoff for repeated violations, account lockout after 10 failures), add security headers to Cloudflare Pages (Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options via _headers file), conduct security review of all auth endpoints (SQL injection testing, XSS prevention verification, CSRF token validation, session fixation protection), implement monitoring and alerting (Cloudflare Workers Analytics, error tracking, security event notifications), perform penetration testing or security audit if budget allows, and complete full test coverage of authentication flows.

**Estimated total time: 6-8 weeks** for solo developer to production-ready authentication system. This includes learning Better Auth if unfamiliar (week 1 overhead), debugging edge cases (distributed throughout), and polish/testing time (week 8 could extend to 2-3 weeks for thorough testing). Can be compressed to 4-5 weeks if experienced with SvelteKit auth and Cloudflare deployment, or extended to 10-12 weeks if this is first authentication system and learning fundamentals.

## Security checklist and common pitfalls

**Critical security requirements before launch** ensure Grove's authentication system meets industry standards:

✅ **Transport Security**: Enforce HTTPS everywhere with HSTS header (Strict-Transport-Security: max-age=31536000; includeSubDomains), redirect all HTTP requests to HTTPS in Cloudflare settings, and use Cloudflare's automatic HTTPS rewrites for mixed content.

✅ **Password Security**: Hash passwords with bcrypt cost 12 or Argon2id with OWASP-recommended parameters, never store plaintext passwords anywhere (logs, backups, database dumps), implement minimum password length of 8 characters without unnecessary complexity requirements (NIST guidelines), and consider passwordless options for users wanting convenience over memorization.

✅ **Session Security**: Set cookies with httpOnly (JavaScript cannot access), secure (HTTPS only), and sameSite: 'lax' (CSRF protection while allowing navigation), regenerate session ID after privilege escalation (email+password login → admin access requires new session ID to prevent session fixation), implement session timeout and idle timeout, and provide session management UI showing active sessions.

✅ **CSRF Protection**: Use SvelteKit's built-in CSRF protection for form actions, validate origin header on API mutations, include CSRF tokens for non-SvelteKit endpoints, and never accept authentication credentials via GET requests.

✅ **Rate Limiting**: Limit failed login attempts (5 per 15 minutes per IP address), limit password reset requests (3 per hour per email), limit 2FA code attempts (5 per 5 minutes per session), implement exponential backoff after repeated violations, and consider account lockout after 10 consecutive failures.

✅ **2FA Implementation**: Mandatory for admin accounts (with grace period), TOTP via authenticator apps preferred over SMS, provide backup codes (10 single-use codes, show once, store hashed), allow 60-second window tolerance for clock skew, and implement recovery process for lost devices.

✅ **Security Headers**: Deploy CSP header restricting script sources, X-Frame-Options: DENY prevents clickjacking, X-Content-Type-Options: nosniff prevents MIME sniffing, Referrer-Policy: strict-origin-when-cross-origin limits referrer leakage, and Permissions-Policy restricts feature access.

✅ **Audit Logging**: Log authentication events with timestamp and IP (login success/failure, password changes, 2FA changes, account deletion requests), retain logs for 90 days minimum for security incident investigation, allow users to view their own login history, and alert on suspicious patterns (many failed attempts, new device logins for admins).

**Common pitfalls specific to SvelteKit + Cloudflare** and how to avoid them:

**❌ Race Condition**: Attempting to access session data in `+page.ts` or `+page.server.ts` before parent load function completes. Session might be undefined even though user is logged in.  
**✅ Fix**: Always `await parent()` in child load functions to ensure parent loads complete first:
```javascript
// +page.server.ts
export const load = async ({ parent }) => {
  const { session } = await parent(); // Wait for parent hooks/layout
  if (!session) throw redirect(302, '/login');
  return { /* page data */ };
};
```

**❌ Environment Variables**: Using `process.env.SECRET` in Cloudflare Workers causes undefined errors because Workers don't have Node.js process object.  
**✅ Fix**: Access via `event.platform.env` in request context:
```javascript
export const handle = SvelteKitAuth(async (event) => {
  return {
    providers: [{
      clientId: event.platform.env.GOOGLE_CLIENT_ID,
      clientSecret: event.platform.env.GOOGLE_CLIENT_SECRET
    }]
  };
});
```

**❌ Server Stores**: Attempting to use writable Svelte stores in server-side code causes errors because stores are client-side concepts.  
**✅ Fix**: Return data from load functions and access via `$page.data` in components. Use `event.locals` for server-side request state.

**❌ Cookie Flags Missing**: Forgetting httpOnly, secure, or sameSite flags exposes session tokens to JavaScript (XSS) or CSRF attacks.  
**✅ Fix**: Always specify complete cookie configuration:
```javascript
cookies.set('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 24 * 30
});
```

**❌ Password Hashing in Workers**: Using `bcrypt` or `@node-rs/argon2` fails with native module errors in Cloudflare Workers runtime.  
**✅ Fix**: Use bcryptjs (pure JavaScript) for acceptable performance, or create separate Rust Worker for Argon2 via Service Binding for production speed.

**❌ User-Agent Headers Missing**: OAuth providers (especially GitHub) reject requests without User-Agent headers, causing cryptic errors.  
**✅ Fix**: Use Better Auth which handles this correctly, or explicitly set headers in custom OAuth implementations:
```javascript
fetch(url, {
  headers: { 
    'User-Agent': 'Grove/1.0',
    'Accept': 'application/json'
  }
});
```

**❌ Immediate Logout Not Working**: Using JWT tokens prevents immediate session invalidation—logged out users can still access resources if they saved the JWT.  
**✅ Fix**: Use stateful sessions in KV where logout deletes the session entry, immediately invalidating access.

## Final recommendations and decision matrix

The comprehensive research reveals clear optimal choices for Grove's authentication implementation:

| Decision Point | Recommendation | Rationale |
|----------------|----------------|-----------|
| **Auth Framework** | Better Auth | Actively maintained, Cloudflare-native, production-ready features, replaces deprecated Lucia |
| **Alternative Approach** | Oslo + Arctic + Custom | Complete control, minimal dependencies, best learning experience, requires more time |
| **Avoid** | Auth.js on Cloudflare | Experimental SvelteKit support, known build failures, harder customization |
| **User Storage** | D1 (SQL database) | Relational data needs, free for 100+ users, query flexibility, ACID compliance |
| **Session Storage** | KV (key-value) | Built-in TTL for auto-expiration, faster hot reads, simpler API than SQL |
| **Email Service** | Resend | Best free tier (3000/month), official Cloudflare docs, developer-focused, $20/month paid |
| **Email Verification** | Required on signup | Prevents account takeover, ensures communication channel, industry standard |
| **Passwordless Auth** | Email OTP (not magic links) | Doesn't train phishing, works with email scanners, more secure perception |
| **Account Architecture** | Single account, role-based | Industry standard for blogs, simpler UX, separate session timeouts handle risk |
| **Admin vs Feed Sessions** | Admin: 2hr, Feed: 30d | Risk-appropriate timeouts, step-up auth for admin access from feed sessions |
| **OAuth Providers** | Google + GitHub | Covers 90% users, Good Cloudflare compatibility with Better Auth |
| **Account Linking** | Email match + password confirm | Prevents hijacking, standard pattern from Firebase/Auth0 |
| **2FA Method** | TOTP (authenticator apps) | Free, secure, Cloudflare-compatible, no SMS costs/vulnerabilities |
| **2FA Requirement** | Mandatory admin, optional users | Risk-appropriate, 30-day grace period for adoption |
| **Remember Me** | Yes, with token rotation | Standard feature, secure series+token pattern prevents theft |
| **Password Hashing** | Bcryptjs (quick) or Argon2 Worker (production) | Cloudflare-compatible, adequate to excellent security |
| **Deployment Target** | Pages Functions → Workers | Start simple, migrate later as needs grow and for better tooling |
| **GDPR Compliance** | Built-in from launch | 30-day deletion grace, data export, privacy policy, avoid retrofit costs |

**Total costs at scale** for the recommended architecture:

- **10 users**: Workers Paid $5/month + D1 free + KV free + Resend free = **$5/month**
- **100 users**: Workers Paid $5/month + D1 free + KV free + Resend free = **$5/month**  
- **1,000 users**: Workers Paid $5/month + D1 free + KV ~$1/month + Resend $20/month = **$26/month**
- **10,000 users**: Workers Paid $5/month + D1 ~$5/month + KV ~$10/month + Resend $20/month = **$40/month**

Compare this to managed auth services that would cost $250-700/month at 10,000 users, and the self-hosted approach saves thousands annually while providing complete control. The $5-40/month infrastructure costs are unavoidable regardless of auth choice (you need Workers for application logic and storage for data), making the authentication implementation essentially free beyond initial development time.

**Implementation timeline summary** for solo developer:
- **Weeks 1-2**: Email+password, verification, password reset (core auth)
- **Week 3**: OAuth integration with Google and GitHub  
- **Week 4**: Remember me, session management, role-based timeouts
- **Weeks 5-6**: Admin 2FA with TOTP and backup codes
- **Week 7**: GDPR compliance (deletion, export, privacy policy)
- **Week 8**: Security hardening, testing, monitoring setup

**Total: 6-8 weeks to production-ready authentication system** with all features, or 2-3 weeks for MVP (email+password only, add OAuth and 2FA post-launch).

Grove's authentication needs align perfectly with Better Auth's capabilities—it's specifically designed for this use case and technology stack. The implementation provides enterprise-grade security (mandatory admin 2FA, proper session management, CSRF protection, rate limiting) with indie-friendly complexity (solo developer can implement and maintain without specialized security expertise). The architecture scales efficiently from 10 to 10,000+ users without requiring infrastructure changes or creating surprise billing, making it optimal for sustainable bootstrapped growth.

By following this guide, Grove achieves authentication that works reliably on Cloudflare Pages, provides simple user experience (1-2 minute signup, familiar login patterns), implements industry-standard security (OWASP recommendations, GDPR compliance, proper cryptography), scales to 100+ users without changes, and remains maintainable by a solo developer with clear documentation and community support from Better Auth. This represents the current best practice for SvelteKit + Cloudflare authentication as of November 2024.