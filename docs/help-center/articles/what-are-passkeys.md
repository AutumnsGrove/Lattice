---
title: What are Passkeys?
description: The passwordless future of signing in—secure, simple, and tied to your device
category: help
section: how-it-works
lastUpdated: '2026-01-29'
keywords:
  - passkeys
  - passwordless
  - biometric
  - touch id
  - face id
  - windows hello
  - authentication
  - security
  - webauthn
order: 11
---

# What are Passkeys?

You know that moment when a website asks you to create yet another password? Twelve characters minimum, one uppercase, one number, one symbol, can't be similar to your last ten passwords...

Passkeys eliminate all of that.

A passkey is a way to sign in using something you already have—your device—and something you already are—your fingerprint, face, or a PIN you've memorized. No password to create, remember, or type. Just you and your device, working together.

## Why passkeys exist

Passwords have been broken for a long time. People reuse them across sites. They write them on sticky notes. They fall for phishing emails asking them to "verify their account." Even the strongest password can be stolen if a website's database gets hacked.

Passkeys solve this differently. Instead of something you *know* (a password that can be stolen), passkeys rely on something you *have* (your device) and something you *are* (your biometrics). A phishing site can't trick you into revealing a fingerprint. A hacked database can't leak a passkey because the secret never leaves your device.

This isn't new technology dressed up—it's a fundamentally different approach that major platforms (Apple, Google, Microsoft) have spent years building into their operating systems.

## How it works

When you register a passkey with Grove, here's what happens:

1. **Your device creates a key pair** — A public key (shared with Grove) and a private key (stays on your device, never leaves it).

2. **The private key is protected** — It's stored in your device's secure enclave, protected by Touch ID, Face ID, Windows Hello, or your device PIN.

3. **When you sign in** — Grove sends a challenge, your device uses the private key to sign it, and Grove verifies the signature with your public key. Your fingerprint or face unlocks the key, but the biometric data itself never leaves your device.

The whole process takes about two seconds. Tap the button, touch your fingerprint sensor (or glance at your phone), and you're in.

### What you'll see

**On Mac** — Touch ID prompt appears, you place your finger on the sensor.

**On iPhone/iPad** — Face ID or Touch ID activates automatically.

**On Windows** — Windows Hello prompts for fingerprint, face, or PIN.

**On Android** — Fingerprint sensor or face unlock.

If your device doesn't support biometrics, you can usually use your device's unlock PIN instead.

## What this means for you

**No more passwords.** Once you've set up a passkey, you don't need to remember anything. Your device handles authentication.

**Phishing-proof.** Passkeys are bound to specific websites. Even if someone builds a convincing fake Grove login page, your device won't offer to sign you in—it knows the domain is wrong.

**Faster sign-in.** Two taps and a fingerprint is faster than typing an email address and password. Much faster than digging through a password manager.

**Works across your devices.** If you're in the Apple ecosystem, your passkey syncs through iCloud Keychain. Same for Google Password Manager or Windows Hello. One passkey, multiple devices.

**Backup options remain.** You can still sign in with Google or magic codes if you're on a device without your passkey. Passkeys are an addition, not a replacement for your other sign-in methods.

## Managing your passkeys

You can register and manage passkeys from your Account page in any Grove property's admin panel. There you'll see:

- **All your registered passkeys** — Named by device, with creation dates
- **Add new passkeys** — Register additional devices
- **Remove passkeys** — If you sell a device or want to start fresh

We recommend registering passkeys on at least two devices you use regularly, so you're never locked out.

## Related

- [What is Heartwood?](/knowledge/help/what-is-heartwood)
- [Sessions and cookies](/knowledge/help/sessions-and-cookies)
- [Heartwood Specification](/knowledge/specs/heartwood-spec)

---

*A passkey is like a key to your home that only works when held by your hand. Someone else can pick up the key, but it won't turn for them. The lock knows you by touch.*
