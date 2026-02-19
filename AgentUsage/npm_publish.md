# Publishing to npm

This guide covers publishing `@autumnsgrove/lattice` to npm.

## The Problem

npm requires 2FA for publishing. If you use **passkeys** for 2FA (not an authenticator app), you'll get this error:

```
npm error code EOTP
npm error This operation requires a one-time password from your authenticator.
```

Passkeys only work for web login — they don't work for CLI publishing.

## The Solution: Granular Access Token with "Bypass 2FA"

Every time you need to publish, create a new granular access token:

1. Go to https://www.npmjs.com/settings/autumnsgrove/tokens
2. Click **Generate New Token** → **Granular Access Token**
3. Configure:
   - **Name**: `publish-cli` (or whatever)
   - **Expiration**: 7 days is fine (90 days max)
   - **Packages**: `@autumnsgrove/lattice` or "All packages"
   - **Permissions**: **Read and write**
   - **Bypass 2FA**: **ENABLE THIS** (critical!)
4. Copy the token (starts with `npm_`)

Then set it locally:

```bash
npm config set //registry.npmjs.org/:_authToken=npm_YOUR_TOKEN_HERE
```

## Publishing

From `libs/engine`:

```bash
pnpm run package && npm publish --access public
```

Or just:

```bash
npm publish --access public
```

(The `prepublishOnly` script runs `pnpm run package` automatically)

## Verify

```bash
npm view @autumnsgrove/lattice version
```

## Notes

- Tokens expire, so you'll need to create a new one periodically
- The "Bypass 2FA" checkbox is the key — without it, npm still demands OTP codes
- This is a known limitation of passkey-only 2FA on npm
- Classic tokens were deprecated in December 2025; granular tokens are the only option now
