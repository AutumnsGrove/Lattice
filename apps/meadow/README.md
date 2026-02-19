# Meadow

> Where the forest opens up and you can see each other.

The social feed layer for Grove - connecting blogs across the network with chronological feeds, private voting, and author-visible reactions.

## Development

```bash
# Install dependencies
pnpm install

# Run dev server (http://localhost:5175)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Deploy to Cloudflare Pages
pnpm deploy
```

## Features

- **Chronological Feed**: Posts appear in the order they were published
- **Private Voting**: Only you see your vote scores
- **Author Reactions**: Emoji reactions visible only to post authors
- **No Algorithms**: No viral mechanics, no engagement optimization
- **Authentic Connection**: Social media without the anxiety

## Tech Stack

- **Framework**: SvelteKit 2.0 with Svelte 5
- **Styling**: Tailwind CSS with Grove design system
- **Deployment**: Cloudflare Pages
- **Domain**: meadow.grove.place

## Learn More

- [Meadow Spec](../docs/specs/meadow-spec.md)
- [Grove Platform](https://grove.place)
