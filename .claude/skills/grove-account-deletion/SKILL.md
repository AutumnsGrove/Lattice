---
name: grove-account-deletion
description: Remove a Grove tenant and everything keyed to it — content, uploads, subdomain, groveauth login identity — cite the right Acceptable Use Policy section in the notice email, and verify nothing was left behind. Use when deleting a test account, cleaning up after a walkthrough, or removing an account for spam, a link farm, or an automated signup.
---

# Grove Account Deletion

Removing an account is the one operation where "the command returned success" and "it worked" are different things. The 2026-11 sweep removed nine spam tenants by hand — 61 statements against `grove-engine-db`, 44 against `grove-curios-db`, 14 against `groveauth`, and a 96-table scan just to find out where the rows were. Then it half-finished one of them by timing out.

Everything below exists so nobody has to do that again.

## When to Activate

- "Delete Alice's account", "nuke that account", "clean up the fixture"
- Removing a spam, link-farm, or automated account
- A person asks to be deleted
- Cleaning up after a demo or walkthrough
- You are about to write a SQL sweep of tenant rows by hand — **stop and read this first**

## The Shape Of It

```
Decide the citation → Dry run → Read the output → Say the reason out loud → --write → Verify → Report
```

One command does the removal. It is a thin caller over `removeTenant()` in the engine, running inside the ops worker in a single invocation. Do not reimplement it.

```bash
export GROVE_OPS_ENDPOINT=https://grove-durable-objects.m7jv4v7npb.workers.dev
```

## Step 1 — Pick the citation

`--policy` decides which rule the email names. Pick the one that actually describes what you found — this is what the person reads, and what they will check you against.

| What you found                                                                                                                                | `--policy`  | Cited as                         |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------- |
| Account existed to place outbound links, doorway content, template posts at scale, guest-post placements                                      | `aup-1.4`   | §1.4 Spam and Malicious Content  |
| Account pretending to be someone or something it is not                                                                                       | `aup-1.5`   | §1.5 Impersonation and Fraud     |
| Automated/agent-operated account, or an extra account for a person or business that already has one, or an alias used to get around a removal | `aup-1.9`   | §1.9 One Account, One Person     |
| The person asked to be deleted                                                                                                                | `requested` | _(no citation; different email)_ |

`aup-1.4` is the default and the right answer most of the time.

**An unknown value is a 400, not a fallback.** If you are reaching for a citation that is not in this table, the honest move is to write the section first (`docs/legal/acceptable-use-policy.md`) and add it to `libs/engine/src/lib/server/tenants/removal-policy.ts`. Never invent a number: the email would cite a rule nobody can find.

`removal-policy.test.ts` reads the real AUP and fails when a cited section stops existing, so a rename shows up as a red test rather than a wrong email.

## Step 2 — Dry run

```bash
gw tenant delete <subdomain> --reason "<what you found>" --policy aup-1.4
```

Prints per-table counts across engine, curios and observability, the identity plan, and touches nothing. Read it:

- `keep audit_log` is correct — the removal record outlives the tenant by design.
- `groveauth identity: ba_session: 1, ba_user: 1` means there is a login to delete.
- `⚠ Not swept: <db>` means a binding is missing. Do not proceed with `--write`; the removal would be partial by construction.

## Step 3 — Say the reason out loud

The `--reason` is **quoted verbatim in the email the person receives.** Write it for them, not for the changelog.

| Don't          | Do                                                                                     |
| -------------- | -------------------------------------------------------------------------------------- |
| `spam`         | `18 posts to upsampler.com in one session, no personalisation`                         |
| `link farm`    | `account existed only to link to karma.domains; one 42-word post, zero other activity` |
| `test cleanup` | `deletion fixture from the #1710 round trip`                                           |

It appears under `In our words:` in the email. Facts, not adjectives. No internal IDs, no table names, no issue numbers.

## Step 4 — Do it

```bash
gw tenant delete <subdomain> --reason "<what you found>" --policy aup-1.4 --write
```

What runs, in order: every registered table in curios and observability, then engine (children before parents), then the `tenants` row, then the TenantDO cache, then the groveauth identity, then the R2 objects, then the email.

## Step 5 — Read the output like you mean it

```
Removed emmareed.grove.place — 214 rows
Identity: 6 rows
R2 objects: 14
Tenant row deleted: yes
Cache evicted: yes
Account holder notified: yes
Audit recorded: yes
```

Anything other than that means it is not finished:

| Line                                               | What it means                                                  | What to do                                                               |
| -------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `Tenant row deleted: NO — subdomain still claimed` | An earlier statement failed, so the root was kept for a retry. | Fix the failure, run again. The tenant still resolves.                   |
| `Cache evicted: NO — the site may still serve`     | The DO flush failed.                                           | `POST /tenant/flush/:subdomain` with the ops key, then re-check.         |
| `Account holder notified: no`                      | No gateway configured, no address on file, or Zephyr refused.  | See below.                                                               |
| `⚠ Leftovers — this removal is incomplete`         | Rows survived.                                                 | Do not report success. None of the no-carry-on cases apply.              |
| `⚠ Statements that failed`                         | Constraints or missing tables.                                 | Read them; a constraint failure usually means registry ordering drifted. |

**A removal with leftovers does not email the person.** That is deliberate: telling someone their account is gone while rows remain is the lie the person keeps.

If the person was not told, that is part of the task, not a footnote. Check `ZEPHYR_API_KEY` and `ZEPHYR_URL` on the worker, check `tenants.email` is non-empty, then send the message by hand.

### When the identity was kept

```
NOT deleted — the same login still owns another blog (secondgarden). Deleting it would lock the person out of a blog that is still theirs.
```

This is correct behaviour, not a failure. One login can own several blogs; removing one must not lock someone out of the other. Say so in your report.

### The identity was already gone, or there never was one

`identitiesDeleted: 0` with nothing in `notDone` means there was nothing to delete. That is fine. The email adapts — it does not claim the login was removed when it was not.

## The email

Built by `libs/engine/src/lib/server/tenants/removal-email.ts`. Sent as a raw Zephyr transactional message (`template: "raw"`, HTML + text).

**Abuse removal** (`aup-*`):

```
Subject: Your Grove account was removed

Hello,

We've removed <subdomain>.grove.place and the account behind it.

What we found: <one sentence, in plain language>
The rule: §1.4 Spam and Malicious Content — https://grove.place/legal/acceptable-use#14-spam-and-malicious-content
In our words: <the --reason, verbatim>

What's gone:
  • your blog at <subdomain>.grove.place
  • its posts, pages, and settings
  • the images and files you uploaded
  • the subdomain itself, which anyone may now register
  • the login you used to sign in, and any connected sign-in methods

Backups clear on our usual 90-day clock, and then nothing recoverable remains.

If we got this wrong — a shared network, a false positive, a site you didn't
know was involved — reply to this email and tell us. A person reads it, and we
have reversed removals before.

We did not keep a copy of your writing, and we are not offering an export of
content removed for this reason.

— Grove
   (hello@grove.place)
```

**Requested deletion** (`requested`):

```
Subject: Your Grove account has been deleted
...
As you asked, we've deleted <subdomain>.grove.place and the account behind it.
Your note: <the --reason>
(no citation, no "what we found")
If you didn't ask for this, reply immediately. Backups live on a 90-day clock...
```

### The voice rules the email follows

- **It is not a warning.** It arrives after the removal, on purpose. Notice before a link-farm takedown is notice to publish again before we finish.
- **It is not a legal notice.** The citation is there so the person can check we are describing their account accurately; the rest talks like a person.
- **Name the blog, not the schema.** "its posts, pages, and settings", never `platform_billing` or "rows".
- **No export for an abuse removal.** Do not offer one; the phrase in the email exists so nobody promises it in a reply.
- **One reader, at 2am.** `hello@grove.place` is the reply path, and a human reads it.
- **Warm, plain, brief.** The house voice: a midnight tea shop, not a courtroom.

If you change the email, change `removal-email.test.ts` — and if you add a citation, change `removal-policy.ts` and `removal-policy.test.ts` with it.

## Step 6 — Verify from outside the command

```bash
# the tenant row is gone
curl -s -o /dev/null -w "%{http_code}\n" https://<subdomain>.grove.place/
# 302 → /verify means the Turnstile gate answered, not the tenant (#1734).
# If it is still 200 after a DO flush, the removal did not take.

# the identity is gone (only when the command said it deleted one)
npx wrangler d1 execute groveauth --remote \
  --command="SELECT count(*) FROM ba_user WHERE lower(email) = '<email>';"
```

Fresh-tenant round trip, when you want to prove the path works end to end:

```bash
# Use hello@grove.place as the owner address when you want to read the removal
# email yourself — the notice goes to the address on file, not to support.
gw tenant create --subdomain final-fixture --email hello@grove.place \
  --plan seedling --created-at 20d --write
gw tenant delete final-fixture --reason "round trip check" --policy aup-1.4 --write
```

The email arrives at `hello@grove.place` with the reason quoted verbatim, the
citation, and the reply path — which is also `hello@grove.place` (`SUPPORT_EMAIL`).
Before running it, confirm the durable-objects worker has `ZEPHYR_API_KEY` and
`ZEPHYR_URL` set; without a gateway the command refuses to claim it notified
anyone and says so.

## Step 7 — Report

```
Removed "emmareed" (emma@upsampler.com).

  Content      18 posts, 2 pages, 4 uploads
  Identity     6 groveauth rows (login deleted)
  Email        sent to emma@upsampler.com, citing §1.4
  Audit        tenant_remove_started + tenant_remove

Verified: no rows across engine/curios/observability, ba_user empty.
The subdomain emmareed.grove.place is released.
```

If anything was skipped, it goes in the report. A clean-looking report over an unfinished removal is worse than an ugly one.

## Hard Rules

1. **Never hand-write the sweep.** One registry, one code path. If the command cannot express something, extend `removeTenant()` — not a SQL script.
2. **Dry run first, always.** `--write` is the only thing that destroys, and it should be a decision you made twice.
3. **Never claim a removal that has leftovers or failures.** Say what is still there.
4. **Never email someone whose removal was incomplete.** The code enforces this; do not work around it.
5. **Never delete a login that still owns another blog.** The code checks; do not override it by hand.
6. **Never invent a policy citation.** Write the section, then the citation.
7. **Test fixtures are accounts.** Same reason, same citation, same email. `--policy requested` and `reason "deletion fixture"` is fine; skipping the checks is not.
8. **One deletion per confirmation.** Confirm the subdomain, and only the subdomain, before `--write`.

## What This Does Not Cover

- **Suspension** (reversible) — `gw tenant suspend <subdomain> --write`. Use it first when you might be wrong.
- **Self-serve deletion** in Arbor — not built. Today this is an operator command.
- **Billing.** Deleting rows does not cancel a Stripe subscription. `removeTenant()` sweeps `platform_billing` and never calls the provider, so the card keeps being charged after the rows that could cancel it are gone. Check `platform_billing.provider_subscription_id` (joined through `tenants`) and say so — see #1745.
- **Custom domains.** A BYOD domain keeps pointing at nothing; an Evergreen domain needs a transfer code before deletion.
- **The site actually 404s** — currently unobservable from outside (#1734).

## Where The Pieces Live

| What                        | Where                                                                   |
| --------------------------- | ----------------------------------------------------------------------- |
| Tenant table registry       | `libs/engine/src/lib/server/tenants/tenant-tables.ts`                   |
| The removal itself          | `libs/engine/src/lib/server/tenants/remove-tenant.ts`                   |
| Identity registry and sweep | `libs/engine/src/lib/server/tenants/groveauth-identity.ts`              |
| Citation vocabulary         | `libs/engine/src/lib/server/tenants/removal-policy.ts`                  |
| The email                   | `libs/engine/src/lib/server/tenants/removal-email.ts`                   |
| Operator endpoint           | `services/durable-objects/src/index.ts` (`POST /tenant/remove`)         |
| CLI                         | `tools/grove-wrap-go/cmd/tenant.go`                                     |
| Policy                      | `docs/legal/acceptable-use-policy.md`, `docs/legal/terms-of-service.md` |
| What people read            | `docs/help-center/articles/account-deletion.md`                         |
| Operator runbook            | `docs/security/incident-response-runbook.md`                            |

Migrations are applied by hand with `wrangler d1 execute --file`, never `migrations apply` — see #1692.
