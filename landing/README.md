# Grove Landing Page

Minimal landing page for [grove.place](https://grove.place) with email signup functionality.

## Tech Stack

- **Framework**: SvelteKit 2 + Svelte 5
- **Styling**: Tailwind CSS
- **Database**: Cloudflare D1
- **Email**: Resend
- **Hosting**: Cloudflare Pages

## Local Development

```bash
cd landing
pnpm install
pnpm run dev
```

## Deployment

Automatic deployment via GitHub Actions on push to `main`. See `../.github/workflows/deploy-landing.yml`.

## Configuration

See [`../DEPLOY-GUIDE.md`](../DEPLOY-GUIDE.md) for setup instructions.
