# Day 30: One Month In Email

**Trigger:** 30 days after account creation
**Purpose:** Celebrate milestone, request feedback, gentle upgrade mention
**Timing:** Day 30

---

## Subject Line

```
One month with Grove
```

## Preview Text

```
Quick check-in and a question.
```

## Body

```markdown
Hi {{name}},

It's been a month since you started your blog. That's something.

Whether you've published a dozen posts or just one, whether you've found your rhythm or you're still figuring it out—you showed up. That matters more than most people realize.

---

## A quick question

I'd genuinely love to know: **How's it going?**

- What's one thing Grove does well for you?
- What's one thing that's been confusing or frustrating?
- Is there a feature you keep wishing existed?

You can reply to this email with just a sentence or two—doesn't need to be a formal review. I read everything, and your feedback directly shapes what gets built next.

---

{{#if is_seedling}}
## One more thing

You're on the Seedling plan, which is a great way to start. If you're finding yourself wanting more—more posts, more storage, more themes—**Sapling** unlocks all of that for just a few dollars more.

No pressure. Seedling is a real plan, not a trial. But if you're outgrowing it, the upgrade is there: {{upgrade_url}}
{{/if}}

---

Thanks for being here. Genuinely.

—Autumn
```

---

## Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{name}}` | User's display name | `Jordan` |
| `{{is_seedling}}` | Boolean: user is on Seedling plan | `true` |
| `{{upgrade_url}}` | URL to upgrade page | `https://grove.place/dashboard/billing` |

## Conditional Sections

The upgrade section only appears for Seedling plan users. Sapling, Oak, and Evergreen users receive the email without the upgrade prompt.

## Design Notes

- "That's something" is understated celebration—not over-the-top
- Feedback request is genuine, not performative
- Upgrade mention is honest: "Seedling is a real plan, not a trial"
- Conditional logic keeps it relevant to each user's situation
- "Thanks for being here. Genuinely." closes with warmth
