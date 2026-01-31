---
title: How Grove Protects Your Secrets
description: Learn how Grove uses envelope encryption to protect your API keys, tokens, and credentials with bank-level security.
category: security
lastUpdated: 2026-01-31
---

# How Grove Protects Your Secrets

Your API keys, tokens, and private credentials deserve real protection. Here's how we built it.

## The Short Version

Every secret you store in Grove is encrypted with a key that belongs only to you. Even if someone accessed our database, they'd find nothing but scrambled text. Your keys, your encryption, your data.

This is the same approach used by banks, payment processors, and major cloud providers. We didn't invent it. We just made sure you have access to it too.

## Why We Built This

Most indie platforms skip the hard security work. It's expensive. It's complicated. And honestly, most users never ask about it.

But you trusted us with your data. That means something.

We believe small platforms should protect their communities with the same care as billion-dollar companies. You're not a second-class citizen just because you chose something cozy over something corporate.

---

## How It Actually Works

*This section is for the curious. Feel free to skip it.*

### Your Own Encryption Key

When you first store a secret, Grove generates a unique encryption key just for your account. This is called a Data Encryption Key, or DEK.

Your DEK encrypts all your secrets. Nobody else's. If another account were somehow compromised, your data stays locked.

### Keys Protecting Keys

Your DEK is itself encrypted by a master key that never touches our database. It lives in a separate, hardware-protected system that only handles key operations.

This layered approach means there's no single point of failure. Attackers would need to compromise multiple isolated systems to reach your data.

### What Encryption Means in Practice

When you save a secret like an API key, here's what happens:

1. Grove fetches your personal encryption key
2. Your secret is encrypted with that key
3. Only the encrypted version is stored
4. When you need it back, we reverse the process

The original value never sits in our database unprotected. Not even for a moment.

---

## What You Can Trust

**Your secrets are isolated.** Each account has its own encryption key. One account's data can't decrypt another's.

**We can rotate keys.** If you ever need to, we can generate a fresh encryption key and re-protect all your secrets without you losing access.

**We built diagnostics.** If something goes wrong with decryption, we have tools to figure out exactly where the problem is. No guessing, no "try again later."

---

## Questions?

If you want to know more about how we handle your data, reach out. We're happy to talk about it.

*You deserve the same protection as everyone else. We made sure you have it.*
