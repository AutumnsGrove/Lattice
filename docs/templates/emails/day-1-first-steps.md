# Day 1: First Steps Email

**Trigger:** 24 hours after account creation
**Purpose:** Admin panel orientation, encourage first post
**Timing:** Day 1

---

## Subject Line

```
Getting around your Grove admin
```

## Preview Text

```
A quick tour of where things live.
```

## Body

```markdown
Hi {{name}},

Day one with your blog. Here's a quick orientation.

---

## Your admin panel

Everything lives at **{{blog_url}}/admin**. From there:

- **Posts** — where you write, edit, and publish
- **Media** — images and files you've uploaded
- **Settings** — your blog's name, description, and theme

That's most of it. We kept it simple on purpose.

---

## Writing your first post

If you haven't yet, now's a good time. Head to **Posts → New Post** and just... start.

A few low-pressure ideas:
- Introduce yourself and why you started this blog
- Share something you've been thinking about lately
- Post a photo and write a few sentences about it

It doesn't need to be polished. First posts rarely are. The point is to start.

---

## One thing that might help

When you're writing, Grove **autosaves your work** every few seconds—you'll never lose a draft to a browser crash or accidental tab close. And nothing publishes until you're ready. No pressure to finish in one sitting.

If you get stuck or something's confusing, the help center is at {{help_url}}, or just reply to this email.

—Autumn
```

---

## Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{name}}` | User's display name | `Jordan` |
| `{{blog_url}}` | Full blog URL | `https://jordan.grove.place` |
| `{{help_url}}` | Help center URL | `https://grove.place/help` |

## Design Notes

- Practical and orienting, not overwhelming
- Low-pressure encouragement to write first post
- Acknowledge that first posts don't need to be perfect
- Mention drafts feature to reduce anxiety
- Keep it short—they're still getting settled
