---
title: What is Pulse?
description: A living heartbeat for your grove, powered by GitHub webhooks
category: help
section: how-it-works
lastUpdated: "2026-02-14"
keywords:
  - pulse
  - github
  - activity
  - curio
  - webhooks
  - heatmap
  - commits
  - coding
  - developer
order: 45
---

# What is Pulse?

Your grove already shows your writing. Pulse shows the work behind it.

Pulse is a [[curios|curio]]—one of the curious little things you can add to your grove—that connects to your GitHub activity and displays it as a living heartbeat on your blog. Commit streaks, contribution heatmaps, recent pushes, merged pull requests. The quiet rhythm of building something, made visible.

## Why Pulse exists

Developers write code the way writers write prose: in bursts, in quiet sustained effort, in late-night sessions that produce something you're proud of by morning. But most coding activity lives behind a login screen. Your visitors see the blog. They don't see the building.

Pulse bridges that gap. Not as a vanity metric or a productivity scoreboard, but as texture. The way a potter's workshop has clay dust on the shelves. Evidence that someone's here, making things.

## How it works

Pulse uses GitHub webhooks. When something happens in your repositories—a push, a pull request, a release—GitHub sends a notification to your grove. Pulse catches it, normalizes it, and stores it.

No polling. No API tokens sitting in a database. No scraping your profile page. GitHub tells Pulse what happened, and Pulse listens.

### Setting it up

1. Go to **Arbor → Curios → Pulse** and enable it
2. Copy the webhook URL that appears
3. Add it as a webhook in your GitHub repository (or organization) settings
4. Choose which events to send—pushes and pull requests are a good start

That's it. Within seconds of your next commit, Pulse starts beating.

### What it shows

**Activity heatmap** — A grid of your coding days, colored by intensity. Like GitHub's contribution graph, but on _your_ site, in _your_ style.

**Today's stats** — Commits pushed, PRs merged, issues closed. A quiet summary of the day's work.

**Recent activity feed** — A timeline of events: pushes, releases, pull requests. Chronological, factual, yours.

**Commit streak** — How many consecutive days you've pushed code. Not to create pressure—just to notice patterns.

### Repository filtering

Not everything belongs on your public blog. Pulse lets you include or exclude specific repositories. Work projects, private experiments, client repos—filter them out. Only show what you want visitors to see.

## What this means for you

**Your work, visible.** Code happens in private. Pulse gives it a presence on your site without you having to write about it.

**Zero maintenance.** Once the webhook is connected, Pulse runs itself. Push code, and your grove updates. No manual syncing, no daily check-ins.

**Privacy by default.** Pulse only sees what GitHub sends it. You choose which repos, which events. Commit messages appear; diffs don't. Activity patterns show; source code doesn't.

**It's a curio.** Pulse isn't trying to be a GitHub dashboard. It's a small, warm detail that says: this person builds things. Like a workbench visible through a window.

## Related

- [What are Curios?](/knowledge/help/what-are-curios) — The cabinet Pulse belongs to
- [Grove Workshop → Curios](/workshop#tool-curios)

---

_A pulse is the first sign of life—steady, rhythmic, proof that something's alive. Your grove has one now._
