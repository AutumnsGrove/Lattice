# Sessions & Cookies: What You Need to Know

## The Short Version

When you log in to Grove, we give your browser a small piece of data called a "session cookie." This is how we know it's you when you come back. If you delete this cookie or block cookies entirely, you'll be logged out and will need to log in again.

## What's a Cookie?

A cookie is just a tiny text file your browser stores. It's like a wristband at a concert — it proves you already showed your ticket at the door. Every time you visit Grove, your browser shows us that wristband, and we let you in without asking for your password again.

## What Happens If I Delete Cookies?

You'll be logged out. Next time you visit, you'll see the login screen. Just log in again, and you'll get a new session cookie.

## What If I Block Cookies?

You won't be able to log in at all. Grove needs at least one cookie to remember who you are. There's no way around this — it's how the entire internet handles logins.

If you're using a privacy-focused browser or extension that blocks cookies, you'll need to allow cookies for `grove.place` to use your account.

## What About Privacy?

Your session cookie only contains a random ID — not your email, password, or any personal information. It's just a key that unlocks your account on our servers. If someone else got your cookie, they could access your account, which is why:

1. We mark it "secure" (only sent over HTTPS)
2. We mark it "HttpOnly" (JavaScript can't read it)
3. It expires after 30 days

## Can I See My Active Sessions?

Yes! Go to **Settings → Security → Active Sessions** to see every device where you're logged in. You can log out of any device from there, or hit "Log out everywhere" if you think something's wrong.

## Why Does My Login Work Across All Grove Sites?

Your session cookie is set for `*.grove.place`, which means it works on your personal site (`you.grove.place`), the main site (`grove.place`), and everywhere else in the Grove ecosystem. One login, access everywhere.
