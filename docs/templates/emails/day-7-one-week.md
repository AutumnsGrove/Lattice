# Day 7: One Week In Email

**Trigger:** 7 days after account creation
**Purpose:** Check-in, introduce RSS, mention community features
**Timing:** Day 7

---

## Subject Line

```
One week in
```

## Preview Text

```
A few things you might not have found yet.
```

## Body

```markdown
Hi {{name}},

You've had your blog for a week now. Hope it's starting to feel like yours.

A couple things you might not have discovered yet:

---

## Your RSS feed

Your blog has an RSS feed at **{{blog_url}}/rss.xml**.

If you're not familiar: RSS lets people subscribe to your blog in a feed reader. When you publish something new, it shows up for them automatically. No algorithms deciding who sees what. No notifications. Just your posts, delivered to people who asked for them.

It's old technology, and it still works beautifully. If you want to share your feed, that URL is all anyone needs.

**Need a feed reader?** A few good options:
- [NetNewsWire](https://netnewswire.com/) — Free, open source, and a classic
- [Reeder](https://reeder.app/) — Apple only, one-time purchase, genuinely excellent
- [Feedly](https://feedly.com/) — Web-based, works everywhere, free tier available

---

## The Grove community

Grove has a shared feed called **Meadow** where posts from across the network can appear. It's entirely opt-in—your posts stay on your blog only unless you explicitly choose to share them.

If you want to be discovered by other Grove readers (or discover other writers), you can enable this in **Settings → Meadow**. You control which posts appear there, and you can change your mind anytime. No pressure either way.

---

That's all for now. This is the last "getting started" email. From here on, you'll only hear from me if something important changes or you reach out first.

Your blog, your pace.

—Autumn
```

---

## Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{name}}` | User's display name | `Jordan` |
| `{{blog_url}}` | Full blog URL | `https://jordan.grove.place` |

## Design Notes

- "One week" framing is a gentle milestone without being celebratory
- RSS explanation assumes unfamiliarity but doesn't condescend
- Meadow introduction is low-pressure, opt-in focused
- Explicitly signals end of onboarding sequence—respect for inbox
- "Your blog, your pace" reinforces autonomy
