# glimpse

Look at what you built.

Playwright screenshots with Grove theme injection. It pre-seeds `localStorage` before
the page runs (no flash of the default theme), serves `cdn.grove.place` fonts from
`libs/engine/static/fonts` so shots render offline, and writes the console output
next to each image.

```bash
bun run glimpse capture "http://localhost:5173/?subdomain=midnight-bloom" -s autumn -t dark --logs
bun run glimpse matrix  "http://localhost:5173/?subdomain=midnight-bloom" --seasons autumn,winter --themes light,dark
```

## Setup

```bash
pnpm install
pnpm exec playwright install chromium
```

Use `pnpm exec`, not `npx` — npx resolves its own Playwright copy and downloads a
browser the workspace will never look for. If you already have a Chromium from a
different Playwright build, point at it directly:

```bash
GLIMPSE_CHROMIUM=/path/to/chrome-headless-shell bun run glimpse capture <url>
```

## Commands

| Command         | What it does                                         |
| --------------- | ---------------------------------------------------- |
| `capture <url>` | One screenshot, with optional season/theme injection |
| `matrix <url>`  | Every season × theme combination                     |
| `devices`       | List device profiles for `--device`                  |
| `help`          | The full flag list                                   |

Every command exits non-zero on a failed capture, so it can gate a workflow.

## Flags

| Flag               | Meaning                                                    |
| ------------------ | ---------------------------------------------------------- |
| `-s, --season`     | `spring` \| `summer` \| `autumn` \| `winter` \| `midnight` |
| `-t, --theme`      | `light` \| `dark` \| `system`                              |
| `-g, --grove-mode` | `true` \| `false` — Grove terminology on/off               |
| `-S, --selector`   | Screenshot one element instead of the page                 |
| `--device`         | Device profile, e.g. `"iPhone 13"`                         |
| `--viewport`       | `1440x900`                                                 |
| `--windowed`       | Viewport shot instead of full page                         |
| `--logs`           | Print console errors/warnings (always written to `.json`)  |
| `--wait`           | Settle time after load, ms (default 500)                   |
| `--timeout`        | Navigation timeout, ms (default 30000)                     |
| `--name`           | Filename label instead of the URL slug                     |
| `-o, --out`        | Output directory (default `.glimpse`)                      |
| `--no-inject`      | Skip theme injection                                       |
| `--json`           | Machine-readable output                                    |

## Output

`.glimpse/` (gitignored), named from the URL plus whatever changed the render:

```
localhost-autumn-dark.png
localhost-autumn-dark.png.json     # status, timings, console messages
localhost-iphone-13.png
localhost-1440x900.png
```

Device and viewport are part of the name so a mobile shot never silently
overwrites the desktop one.

## What it does not do

- **Seeding.** Use `./scripts/dev-stack.sh seed [blog|empty|fake|fresh]` — one entry
  point per job. `fake` generates a random faker tenant.
- **Driving flows.** No clicking, no forms. Write a throwaway Playwright script and
  copy the browser setup from `src/browser.ts`.
- **Component isolation.** Showroom was removed in #1654. Capture the element with
  `-S <selector>` and check tokens, spacing and focus by hand against `DESIGN.md`.

## Authenticated pages

With `DEV_AUTH_ENABLED=true` in `apps/aspen/.dev.vars`, aspen accepts an
`x-grove-dev-auth` JSON header on localhost. That's how you capture a logged-in page
without Heartwood running:

```ts
await page.setExtraHTTPHeaders({
	"x-grove-dev-auth": JSON.stringify({ id: "u_1", email: "a@b.c", name: "Autumn" }),
});
```

## Why it exists

It replaced 8,670 lines of Python (`tools/glimpse`) and the Showroom component
harness in #1654. The Python version wrapped the same Playwright calls around a
CLI; this is that wrapper, in the language the rest of the repo already uses.
