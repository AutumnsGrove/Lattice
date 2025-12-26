# Svelte 5 Development Guide

## Overview

Svelte 5 is a component framework that compiles your code to highly efficient JavaScript at build time. Unlike virtual DOM frameworks, Svelte surgically updates the DOM when state changes, resulting in smaller bundles and faster runtime performance.

**Key Innovation - Runes**: Svelte 5 introduces runes, special compiler symbols prefixed with `$` that control reactivity. Runes replace the previous `$:` reactive statements with a more explicit, powerful system.

Using Svelte 5 with SvelteKit provides:
- **File-based routing** with automatic code splitting
- **Server-side rendering (SSR)** with hydration
- **Progressive enhancement** for forms
- **Data loading** at the route level
- **TypeScript support** out of the box

---

## Quick Reference

```bash
# Project Setup
npx sv create my-app      # Create new SvelteKit project
cd my-app && pnpm install # Install dependencies
pnpm dev                  # Start dev server (localhost:5173)
pnpm build                # Build for production
pnpm preview              # Preview production build
```

### Runes Cheatsheet

| Rune | Purpose | Example |
|------|---------|---------|
| `$state` | Declare reactive state | `let count = $state(0)` |
| `$derived` | Computed values | `let doubled = $derived(count * 2)` |
| `$effect` | Side effects | `$effect(() => console.log(count))` |
| `$props` | Component props | `let { name } = $props()` |
| `$bindable` | Two-way binding | `let { value = $bindable() } = $props()` |
| `$inspect` | Debug reactivity | `$inspect(count)` |

### SvelteKit File Conventions

| File | Purpose |
|------|---------|
| `+page.svelte` | Page component |
| `+page.js` | Universal load function |
| `+page.server.js` | Server-only load/actions |
| `+layout.svelte` | Shared layout wrapper |
| `+layout.server.js` | Layout data loading |
| `+server.js` | API endpoints |
| `+error.svelte` | Error boundary |

---

## When to Use Svelte/SvelteKit

### Primary Use Cases

- **Interactive web applications** with complex state
- **Content-driven sites** requiring SSR and SEO
- **Progressive web apps** with offline support
- **Dashboard interfaces** with real-time updates
- **Marketing sites** where bundle size matters
- **Form-heavy applications** with validation

### When to Consider Alternatives

- **Static documentation** - Use Astro or plain HTML
- **Native mobile apps** - Use React Native or Flutter
- **Existing React/Vue teams** - Migration cost may outweigh benefits
- **Micro-frontends** - Svelte's compilation model complicates sharing

---

## Runes: The Reactivity System

Runes are Svelte 5's core innovation. They're compiler instructions that look like function calls but are processed at build time.

**Important**: Runes work in `.svelte` files and `.svelte.js`/`.svelte.ts` modules. They cannot be imported or passed as values.

### $state - Reactive State

Declares reactive variables that trigger UI updates when modified.

```svelte
<script>
  let count = $state(0);
  let user = $state({ name: 'Alice', age: 30 });
  let items = $state(['apple', 'banana']);
</script>

<button onclick={() => count++}>
  Clicked {count} times
</button>

<button onclick={() => user.age++}>
  {user.name} is {user.age}
</button>

<button onclick={() => items.push('cherry')}>
  {items.length} items
</button>
```

**Deep Reactivity**: Objects and arrays are deeply reactive. Mutations like `user.age++` or `items.push()` trigger updates automatically.

#### $state.raw - Disable Deep Reactivity

For large data structures you won't mutate, use `$state.raw` for better performance:

```javascript
let largeDataset = $state.raw(fetchedData);

// Must reassign entirely to trigger updates
largeDataset = { ...largeDataset, newField: value };
```

#### $state.snapshot - Get Plain Object

Extract a non-reactive copy for external APIs or logging:

```javascript
let form = $state({ name: '', email: '' });

function submit() {
  const data = $state.snapshot(form);
  fetch('/api/submit', { body: JSON.stringify(data) });
}
```

#### Class Fields

Use `$state` in class properties:

```javascript
class Counter {
  count = $state(0);

  increment() {
    this.count++;
  }
}

let counter = new Counter();
```

### $derived - Computed Values

Creates values that automatically update when dependencies change.

```svelte
<script>
  let count = $state(0);
  let doubled = $derived(count * 2);
  let quadrupled = $derived(doubled * 2);
</script>

<p>{count} × 2 = {doubled}</p>
<p>{count} × 4 = {quadrupled}</p>
```

#### $derived.by - Complex Computations

For multi-line derived values, use `$derived.by`:

```javascript
let todos = $state([
  { text: 'Learn Svelte', done: true },
  { text: 'Build app', done: false }
]);

let summary = $derived.by(() => {
  const total = todos.length;
  const completed = todos.filter(t => t.done).length;
  return `${completed}/${total} completed`;
});
```

### $effect - Side Effects

Runs code when dependencies change. Effects run after the DOM updates.

```svelte
<script>
  let count = $state(0);

  $effect(() => {
    console.log(`Count is now ${count}`);
    document.title = `Count: ${count}`;
  });
</script>
```

#### Cleanup Functions

Return a function to clean up before re-running or on unmount:

```javascript
$effect(() => {
  const interval = setInterval(() => {
    count++;
  }, 1000);

  return () => clearInterval(interval);
});
```

#### Dependency Tracking

Only **synchronously** accessed reactive values are tracked:

```javascript
// count IS tracked
$effect(() => {
  console.log(count);
});

// count is NOT tracked (async access)
$effect(() => {
  setTimeout(() => {
    console.log(count);
  }, 100);
});
```

#### $effect.pre - Run Before DOM Updates

For DOM measurements before updates:

```javascript
$effect.pre(() => {
  previousHeight = element.offsetHeight;
});
```

### $props - Component Properties

Declares props that a component accepts from its parent.

```svelte
<!-- Button.svelte -->
<script>
  let {
    label,
    disabled = false,
    onclick
  } = $props();
</script>

<button {disabled} {onclick}>
  {label}
</button>
```

#### TypeScript Props

```svelte
<script lang="ts">
  interface Props {
    label: string;
    disabled?: boolean;
    onclick?: () => void;
  }

  let { label, disabled = false, onclick }: Props = $props();
</script>
```

#### Rest Props

Collect remaining props with spread:

```svelte
<script>
  let { href, ...rest } = $props();
</script>

<a {href} {...rest}>
  <slot />
</a>
```

### $bindable - Two-Way Binding

Allows child components to update parent state.

```svelte
<!-- TextInput.svelte -->
<script>
  let { value = $bindable('') } = $props();
</script>

<input bind:value />
```

```svelte
<!-- Parent.svelte -->
<script>
  import TextInput from './TextInput.svelte';
  let name = $state('');
</script>

<TextInput bind:value={name} />
<p>Hello, {name}!</p>
```

### $inspect - Debug Reactivity

Logs values when they change (development only):

```svelte
<script>
  let count = $state(0);
  let user = $state({ name: 'Alice' });

  $inspect(count, user);

  // Custom handler
  $inspect(count).with((type, value) => {
    if (type === 'update') {
      console.trace('count updated to', value);
    }
  });
</script>
```

---

## Component Syntax

### Basic Structure

```svelte
<script>
  // JavaScript/TypeScript logic
  let name = $state('world');
</script>

<!-- HTML template -->
<h1>Hello {name}!</h1>

<style>
  /* Scoped CSS */
  h1 { color: blue; }
</style>
```

### Conditional Rendering

```svelte
{#if loggedIn}
  <Dashboard />
{:else if loading}
  <Spinner />
{:else}
  <LoginForm />
{/if}
```

### Loops

```svelte
{#each items as item, index (item.id)}
  <li>{index}: {item.name}</li>
{:else}
  <li>No items found</li>
{/each}
```

**Important**: Always use a key `(item.id)` for efficient updates.

### Event Handling

Events use `on` prefix attributes:

```svelte
<button onclick={() => count++}>Click</button>
<button onclick={handleClick}>Click</button>

<input
  oninput={(e) => name = e.target.value}
  onkeydown={(e) => e.key === 'Enter' && submit()}
/>
```

### Snippets - Reusable Markup

Replace repetitive templates with snippets:

```svelte
{#snippet userCard(user)}
  <div class="card">
    <h3>{user.name}</h3>
    <p>{user.email}</p>
  </div>
{/snippet}

{#each users as user}
  {@render userCard(user)}
{/each}
```

Pass snippets as props:

```svelte
<!-- Table.svelte -->
<script>
  let { data, row } = $props();
</script>

<table>
  {#each data as item}
    <tr>{@render row(item)}</tr>
  {/each}
</table>

<!-- Usage -->
<Table {data}>
  {#snippet row(item)}
    <td>{item.name}</td>
    <td>{item.value}</td>
  {/snippet}
</Table>
```

---

## SvelteKit Integration

### Project Structure

```
my-app/
├── src/
│   ├── lib/           # Reusable code ($lib alias)
│   │   ├── components/
│   │   ├── server/    # Server-only code
│   │   └── utils.js
│   ├── routes/        # File-based routing
│   │   ├── +layout.svelte
│   │   ├── +page.svelte
│   │   ├── about/
│   │   │   └── +page.svelte
│   │   └── blog/
│   │       ├── +page.svelte
│   │       └── [slug]/
│   │           ├── +page.svelte
│   │           └── +page.server.js
│   ├── app.html
│   └── hooks.server.js
├── static/            # Static assets
├── svelte.config.js
└── vite.config.js
```

### Routing

Routes are defined by directory structure:

- `/` → `src/routes/+page.svelte`
- `/about` → `src/routes/about/+page.svelte`
- `/blog/my-post` → `src/routes/blog/[slug]/+page.svelte`

#### Dynamic Routes

```javascript
// src/routes/blog/[slug]/+page.server.js
export async function load({ params }) {
  const post = await getPost(params.slug);
  return { post };
}
```

#### Optional and Rest Parameters

- `[[optional]]` - matches with or without segment
- `[...rest]` - matches multiple segments

### Data Loading

#### Server Load Function

```javascript
// src/routes/posts/+page.server.js
export async function load({ fetch, cookies }) {
  const session = cookies.get('session');
  const response = await fetch('/api/posts');
  const posts = await response.json();

  return { posts, isLoggedIn: !!session };
}
```

#### Page Component

```svelte
<!-- src/routes/posts/+page.svelte -->
<script>
  let { data } = $props();
</script>

{#each data.posts as post}
  <article>
    <h2>{post.title}</h2>
    <p>{post.excerpt}</p>
  </article>
{/each}
```

#### Universal Load (Client + Server)

```javascript
// src/routes/posts/+page.js
export async function load({ fetch }) {
  // Runs on server during SSR, then on client
  const response = await fetch('/api/posts');
  return { posts: await response.json() };
}
```

### Form Actions

Handle form submissions server-side with progressive enhancement:

```javascript
// src/routes/login/+page.server.js
import { fail, redirect } from '@sveltejs/kit';

export const actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData();
    const email = data.get('email');
    const password = data.get('password');

    if (!email) {
      return fail(400, { email, missing: true });
    }

    const user = await authenticate(email, password);
    if (!user) {
      return fail(401, { email, incorrect: true });
    }

    cookies.set('session', user.token, { path: '/' });
    throw redirect(303, '/dashboard');
  }
};
```

```svelte
<!-- src/routes/login/+page.svelte -->
<script>
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<form method="POST" use:enhance>
  <input name="email" value={form?.email ?? ''} />
  {#if form?.missing}
    <p class="error">Email is required</p>
  {/if}

  <input name="password" type="password" />
  {#if form?.incorrect}
    <p class="error">Invalid credentials</p>
  {/if}

  <button>Log in</button>
</form>
```

### API Routes

```javascript
// src/routes/api/posts/+server.js
import { json } from '@sveltejs/kit';

export async function GET({ url }) {
  const limit = url.searchParams.get('limit') ?? 10;
  const posts = await getPosts(limit);
  return json(posts);
}

export async function POST({ request }) {
  const data = await request.json();
  const post = await createPost(data);
  return json(post, { status: 201 });
}
```

### Layouts

Shared UI that wraps pages:

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { page } from '$app/state';
  let { children } = $props();
</script>

<nav>
  <a href="/" aria-current={page.url.pathname === '/' ? 'page' : null}>
    Home
  </a>
  <a href="/about">About</a>
</nav>

<main>
  {@render children()}
</main>
```

---

## TypeScript Usage

### Setup

SvelteKit projects include TypeScript by default. Add `lang="ts"` to script tags:

```svelte
<script lang="ts">
  interface User {
    id: number;
    name: string;
    email: string;
  }

  let user: User = $state({
    id: 1,
    name: 'Alice',
    email: 'alice@example.com'
  });
</script>
```

### Typing Components

```svelte
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    count?: number;
    children: Snippet;
    onclose?: () => void;
  }

  let { title, count = 0, children, onclose }: Props = $props();
</script>
```

### Generic Components

```svelte
<script lang="ts" generics="T extends { id: number }">
  interface Props {
    items: T[];
    onselect: (item: T) => void;
  }

  let { items, onselect }: Props = $props();
</script>

{#each items as item (item.id)}
  <button onclick={() => onselect(item)}>
    {item.id}
  </button>
{/each}
```

---

## Common Pitfalls

### 1. Destructuring Breaks Reactivity

```javascript
// ❌ Bad: Values become static
let { count } = $state({ count: 0 });
count++; // No update

// ✅ Good: Keep object reference
let state = $state({ count: 0 });
state.count++; // Updates correctly
```

### 2. Async Values Not Tracked in Effects

```javascript
// ❌ Bad: count not tracked after await
$effect(async () => {
  await somePromise;
  console.log(count); // Not a dependency
});

// ✅ Good: Read dependencies synchronously
$effect(() => {
  const currentCount = count;
  somePromise.then(() => {
    console.log(currentCount);
  });
});
```

### 3. Using Effects for Derived State

```javascript
// ❌ Bad: Don't sync state in effects
let doubled;
$effect(() => {
  doubled = count * 2;
});

// ✅ Good: Use $derived
let doubled = $derived(count * 2);
```

### 4. Missing Keys in Each Blocks

```svelte
<!-- ❌ Bad: No key causes issues with reordering -->
{#each items as item}
  <Item data={item} />
{/each}

<!-- ✅ Good: Always provide a key -->
{#each items as item (item.id)}
  <Item data={item} />
{/each}
```

### 5. Not Using use:enhance on Forms

```svelte
<!-- ❌ Bad: Full page reload -->
<form method="POST">
  <button>Submit</button>
</form>

<!-- ✅ Good: Progressive enhancement -->
<script>
  import { enhance } from '$app/forms';
</script>

<form method="POST" use:enhance>
  <button>Submit</button>
</form>
```

### 6. Server-Only Code in Universal Loads

```javascript
// ❌ Bad: Database access in +page.js runs on client
// src/routes/+page.js
import { db } from '$lib/database'; // Error on client

// ✅ Good: Use +page.server.js for server-only code
// src/routes/+page.server.js
import { db } from '$lib/database';
```

---

## Performance Considerations

### Use $state.raw for Large Data

```javascript
// Avoid proxying large datasets you won't mutate
let products = $state.raw(await fetchProducts());
```

### Minimize Effect Dependencies

```javascript
// ❌ Bad: Effect runs on any state change
$effect(() => {
  if (shouldLog) {
    console.log(data);
  }
});

// ✅ Good: Only track necessary dependencies
$effect(() => {
  if (shouldLog) {
    // Only re-run when shouldLog or data changes
  }
});
```

### Use Snippets Over Components for Simple Templates

Snippets have less overhead than component instantiation for simple, repeated markup.

### Prerender Static Routes

```javascript
// src/routes/about/+page.js
export const prerender = true;
```

### Lazy Load Heavy Components

```svelte
<script>
  import { onMount } from 'svelte';

  let Chart;
  onMount(async () => {
    Chart = (await import('$lib/Chart.svelte')).default;
  });
</script>

{#if Chart}
  <Chart {data} />
{:else}
  <p>Loading chart...</p>
{/if}
```

---

## Project Configuration

### svelte.config.js

```javascript
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      $components: 'src/lib/components',
      $utils: 'src/lib/utils'
    }
  }
};
```

### Common Adapters

- `@sveltejs/adapter-auto` - Auto-detect platform
- `@sveltejs/adapter-node` - Node.js server
- `@sveltejs/adapter-static` - Static site generation
- `@sveltejs/adapter-vercel` - Vercel deployment
- `@sveltejs/adapter-cloudflare` - Cloudflare Pages

---

## Related Guides

- **[project_structure.md](project_structure.md)** - Directory organization patterns
- **[git_guide.md](git_guide.md)** - Version control workflow
- **[testing_strategies.md](testing_strategies.md)** - Test organization and patterns
- **[code_style_guide.md](code_style_guide.md)** - Code formatting guidelines
- **[cloudflare_guide.md](cloudflare_guide.md)** - Deploying SvelteKit to Cloudflare Pages

---

*Last updated: 2025-11-24*
