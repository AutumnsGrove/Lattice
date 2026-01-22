---
title: How Grove Backs Up Your Data
description: 'Patina: Automated nightly backups with 12-week retention'
category: help
section: privacy-security
lastUpdated: '2025-12-31'
keywords:
  - backup
  - backups
  - data
  - protection
  - patina
  - recovery
  - restore
  - disaster
  - safety
order: 3
---

# How Grove Backs Up Your Data

You probably don't think about backups. You shouldn't have to.

Every night while you sleep, Grove quietly preserves everything: your posts, your comments, your settings. It's been happening since the day you signed up. We call this system **Patina**.

## What is Patina?

A patina is the thin layer that forms on copper and bronze over time—not decay, but protection. It's what happens when something weathers the world and comes out stronger.

Patina is Grove's automated backup system. Every night at 3 AM UTC, it creates a complete snapshot of every Grove database. Your words, preserved in layers, like rings in a tree.

## What gets backed up

Everything:

- **Your posts**: drafts and published, including all revisions
- **Your comments**: both public comments and private replies
- **Your media**: images, files, everything in your storage
- **Your settings**: theme choices, blog configuration, preferences
- **Your account**: authentication data, session history

If it's in Grove, it's in Patina.

## How long backups are kept

Patina runs on two rhythms:

**Nightly snapshots**: A fresh backup every 24 hours. These are kept for 7 days, so we can restore to any night in the past week.

**Weekly archives**: Every Sunday, the week's daily backups are compressed into a single archive. These weekly snapshots are kept for 12 weeks.

That means we can restore your data to any point in the last three months. Most problems are caught within days, but if something slips through, we have you covered.

## Where backups are stored

All backups live in Cloudflare R2, a cold storage system designed for exactly this purpose. It's separate from the servers that run your blog. If something catastrophic happened to Grove's main infrastructure, your backups would be untouched.

The storage is encrypted at rest. Even in cold storage, your words stay private.

## What this means for you

**You don't need to do anything.** Patina runs automatically. No buttons to click, no schedules to set.

**Your data survives mistakes.** Accidentally deleted something important? We can help recover it from a recent backup.

**Your data survives disasters.** Server failures, database corruption, the apocalyptic edge cases we hope never happen: backups mean starting over isn't losing everything.

**This isn't a replacement for your own exports.** You should still [export your content](/knowledge/help/exporting-your-content) regularly. Patina protects against Grove's failures. Personal exports protect against everything else—including Grove itself, if you ever want to leave.

## If you need something restored

Backup restores aren't self-service (yet). If you need something recovered:

1. [Contact support](/knowledge/help/contact-support)
2. Tell us what you need (specific post, everything, etc.)
3. Tell us approximately when it was lost or corrupted
4. We'll restore from the appropriate backup

Most restores complete within 24 hours. Complex situations might take longer.

**Want to understand the restore process?** Our technical documentation includes [restore guides](https://patina.grove.place/restore-guide) that explain exactly how recovery works. You can see the available backup dates and restoration steps—even if you can't trigger them yourself yet.

## What backups can't fix

Patina is powerful, but not magic:

**Gradual data loss.** If something corrupts slowly over weeks, by the time you notice, even old backups might have the problem.

**Intentional deletion.** If you deleted something on purpose, we won't restore it without confirmation. Your "delete" means delete.

**Content that was never saved.** If a post didn't make it to the database—connection dropped mid-save, browser crashed—there's nothing to back up. Always save drafts.

**The past 24 hours.** If something happened today, it won't be in last night's backup. We're working on more frequent snapshots, but for now, there's always a small window.

## Why we built this

Backups aren't exciting. Nobody signs up for a blogging platform because it has good backup infrastructure.

But losing years of writing to a server failure? Watching your creative work vanish because of a database corruption? That's the kind of disaster that makes people stop writing entirely.

We built Patina so you never have to worry about it. Your words accumulate. Protection accumulates with them. Layer by layer, night by night.

Age as armor.

---

*Like rings in a tree, your history is preserved.*
