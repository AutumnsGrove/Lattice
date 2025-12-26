# JavaScript/TypeScript Testing Guide

## Overview

This guide covers testing for JavaScript and TypeScript projects using **Vitest** (recommended for Vite/SvelteKit projects) and **Jest** (widely used, works everywhere). Both frameworks share similar APIs, making knowledge transferable.

**When to use which:**
- **Vitest**: Vite-based projects (SvelteKit, Vite + React/Vue), modern ESM projects, fast iteration
- **Jest**: Non-Vite projects, established codebases, React Native, projects needing specific Jest plugins

---

## Quick Reference

### Vitest Commands

```bash
# Run all tests
pnpm test
# or directly
npx vitest

# Run in watch mode (default)
npx vitest

# Run once (CI mode)
npx vitest run

# Run specific file
npx vitest src/lib/utils.test.ts

# Run tests matching pattern
npx vitest -t "user authentication"

# Run with coverage
npx vitest run --coverage

# Run with UI
npx vitest --ui
```

### Jest Commands

```bash
# Run all tests
pnpm test

# Run in watch mode
pnpm test --watch

# Run specific file
pnpm test src/utils.test.ts

# Run tests matching pattern
pnpm test -t "user authentication"

# Run with coverage
pnpm test --coverage

# Run only changed files
pnpm test --onlyChanged
```

---

## Vitest Setup (Recommended for SvelteKit)

### Installation

```bash
# For SvelteKit projects
pnpm add -D vitest @testing-library/svelte @testing-library/jest-dom jsdom

# For general Vite projects
pnpm add -D vitest jsdom

# For coverage
pnpm add -D @vitest/coverage-v8
```

### Configuration (vite.config.ts)

```typescript
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
    plugins: [sveltekit()],
    test: {
        include: ['src/**/*.{test,spec}.{js,ts}'],
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/tests/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            exclude: ['node_modules/', 'src/tests/']
        }
    }
});
```

### Setup File (src/tests/setup.ts)

```typescript
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock SvelteKit modules
vi.mock('$app/navigation', () => ({
    goto: vi.fn(),
    invalidate: vi.fn(),
    invalidateAll: vi.fn(),
    preloadData: vi.fn(),
    preloadCode: vi.fn()
}));

vi.mock('$app/stores', () => ({
    page: {
        subscribe: vi.fn()
    },
    navigating: {
        subscribe: vi.fn()
    }
}));

// Mock environment variables
vi.mock('$env/dynamic/private', () => ({
    env: {
        API_KEY: 'test-api-key'
    }
}));
```

### Package.json Scripts

```json
{
    "scripts": {
        "test": "vitest",
        "test:run": "vitest run",
        "test:coverage": "vitest run --coverage",
        "test:ui": "vitest --ui"
    }
}
```

---

## Jest Setup

### Installation

```bash
# Basic setup
pnpm add -D jest @types/jest

# For TypeScript
pnpm add -D ts-jest @types/jest

# For Svelte (non-SvelteKit)
pnpm add -D jest @testing-library/svelte svelte-jester

# For React
pnpm add -D jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

### Configuration (jest.config.js)

```javascript
/** @type {import('jest').Config} */
const config = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.test.ts', '**/*.spec.ts'],
    moduleNameMapper: {
        '^\\$lib/(.*)$': '<rootDir>/src/lib/$1',
        '^\\$app/(.*)$': '<rootDir>/src/tests/mocks/$app/$1'
    },
    setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
    collectCoverageFrom: [
        'src/**/*.{ts,js}',
        '!src/**/*.d.ts',
        '!src/tests/**'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    }
};

module.exports = config;
```

### Package.json Scripts

```json
{
    "scripts": {
        "test": "jest",
        "test:watch": "jest --watch",
        "test:coverage": "jest --coverage"
    }
}
```

---

## Test Structure: AAA Pattern

Both Vitest and Jest use the same test structure:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
// For Jest: import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
// Or use globals if configured

describe('UserService', () => {
    let userService: UserService;

    beforeEach(() => {
        userService = new UserService();
    });

    afterEach(() => {
        // Cleanup
    });

    describe('register', () => {
        it('should create a new user with valid data', () => {
            // Arrange
            const email = 'test@example.com';
            const password = 'secure_pass123';

            // Act
            const result = userService.register(email, password);

            // Assert
            expect(result.success).toBe(true);
            expect(result.user.email).toBe(email);
        });

        it('should reject invalid email formats', () => {
            // Arrange
            const invalidEmail = 'not-an-email';

            // Act & Assert
            expect(() => {
                userService.register(invalidEmail, 'password');
            }).toThrow('Invalid email format');
        });
    });
});
```

---

## Common Assertions

```typescript
// Equality
expect(value).toBe(expected);           // Strict equality (===)
expect(value).toEqual(expected);        // Deep equality for objects/arrays
expect(value).toStrictEqual(expected);  // Deep equality + type checking

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeGreaterThanOrEqual(3);
expect(value).toBeLessThan(5);
expect(value).toBeCloseTo(0.3, 5);      // Floating point

// Strings
expect(value).toMatch(/pattern/);
expect(value).toContain('substring');

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);
expect(array).toEqual(expect.arrayContaining([1, 2]));

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toHaveProperty('nested.key', 'value');
expect(obj).toMatchObject({ key: 'value' });

// Exceptions
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('error message');
expect(() => fn()).toThrow(CustomError);

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow('error');
```

---

## Mocking

### Vitest Mocking

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock a module
vi.mock('./api', () => ({
    fetchUser: vi.fn()
}));

// Import after mocking
import { fetchUser } from './api';
import { UserService } from './userService';

describe('UserService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch user data', async () => {
        // Arrange
        const mockUser = { id: 1, name: 'John' };
        vi.mocked(fetchUser).mockResolvedValue(mockUser);

        const service = new UserService();

        // Act
        const result = await service.getUser(1);

        // Assert
        expect(fetchUser).toHaveBeenCalledWith(1);
        expect(result).toEqual(mockUser);
    });
});

// Spy on methods
const obj = {
    method: (x: number) => x * 2
};
const spy = vi.spyOn(obj, 'method');
obj.method(5);
expect(spy).toHaveBeenCalledWith(5);
expect(spy).toHaveReturnedWith(10);

// Mock timers
vi.useFakeTimers();
setTimeout(() => callback(), 1000);
vi.advanceTimersByTime(1000);
expect(callback).toHaveBeenCalled();
vi.useRealTimers();

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: 'test' })
});
```

### Jest Mocking

```typescript
// Mock a module
jest.mock('./api', () => ({
    fetchUser: jest.fn()
}));

import { fetchUser } from './api';

describe('UserService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch user data', async () => {
        (fetchUser as jest.Mock).mockResolvedValue({ id: 1, name: 'John' });
        // ... rest is the same as Vitest
    });
});

// Spy on methods
const spy = jest.spyOn(obj, 'method');

// Mock timers
jest.useFakeTimers();
jest.advanceTimersByTime(1000);
jest.useRealTimers();

// Mock fetch
global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: 'test' })
});
```

---

## Testing Svelte Components

### With @testing-library/svelte

```typescript
import { render, screen, fireEvent } from '@testing-library/svelte';
import { expect, it, describe } from 'vitest';
import Counter from './Counter.svelte';

describe('Counter', () => {
    it('should render initial count', () => {
        render(Counter, { props: { initialCount: 5 } });

        expect(screen.getByText('Count: 5')).toBeInTheDocument();
    });

    it('should increment count on button click', async () => {
        render(Counter, { props: { initialCount: 0 } });

        const button = screen.getByRole('button', { name: /increment/i });
        await fireEvent.click(button);

        expect(screen.getByText('Count: 1')).toBeInTheDocument();
    });

    it('should emit event on threshold', async () => {
        const { component } = render(Counter, {
            props: { initialCount: 9, threshold: 10 }
        });

        let eventFired = false;
        component.$on('thresholdReached', () => {
            eventFired = true;
        });

        const button = screen.getByRole('button', { name: /increment/i });
        await fireEvent.click(button);

        expect(eventFired).toBe(true);
    });
});
```

### Testing with Svelte 5 Runes

```typescript
import { render, screen } from '@testing-library/svelte';
import { expect, it, describe } from 'vitest';
import UserCard from './UserCard.svelte';

describe('UserCard (Svelte 5)', () => {
    it('should render user data from $props', () => {
        render(UserCard, {
            props: {
                user: { name: 'Alice', email: 'alice@example.com' }
            }
        });

        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    });

    it('should update when props change', async () => {
        const { rerender } = render(UserCard, {
            props: { user: { name: 'Alice', email: 'alice@test.com' } }
        });

        expect(screen.getByText('Alice')).toBeInTheDocument();

        await rerender({ user: { name: 'Bob', email: 'bob@test.com' } });

        expect(screen.getByText('Bob')).toBeInTheDocument();
        expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });
});
```

### Query Priority

Use queries in this order (most to least preferred):

1. **getByRole** - Accessible queries (best)
2. **getByLabelText** - Form fields
3. **getByPlaceholderText** - Inputs
4. **getByText** - Non-interactive elements
5. **getByTestId** - Last resort

```typescript
// Preferred
screen.getByRole('button', { name: /submit/i });
screen.getByLabelText('Email');

// Acceptable
screen.getByText('Welcome');

// Last resort (add data-testid to component)
screen.getByTestId('user-avatar');
```

---

## Testing Async Code

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('async operations', () => {
    it('should handle promises', async () => {
        const result = await fetchData();
        expect(result).toEqual({ data: 'test' });
    });

    it('should handle rejected promises', async () => {
        await expect(failingFetch()).rejects.toThrow('Network error');
    });

    it('should wait for DOM updates', async () => {
        render(AsyncComponent);

        // Wait for element to appear
        const element = await screen.findByText('Loaded');
        expect(element).toBeInTheDocument();
    });

    it('should wait for condition', async () => {
        render(AsyncComponent);

        await waitFor(() => {
            expect(screen.getByText('Complete')).toBeInTheDocument();
        });
    });

    it('should handle timers', async () => {
        vi.useFakeTimers();

        const callback = vi.fn();
        scheduleTask(callback, 5000);

        expect(callback).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(5000);

        expect(callback).toHaveBeenCalled();

        vi.useRealTimers();
    });
});
```

---

## Testing SvelteKit Specifics

### Testing Load Functions

```typescript
// src/routes/users/+page.server.ts
export async function load({ fetch }) {
    const response = await fetch('/api/users');
    return { users: await response.json() };
}

// src/routes/users/+page.server.test.ts
import { describe, it, expect, vi } from 'vitest';
import { load } from './+page.server';

describe('+page.server load', () => {
    it('should fetch and return users', async () => {
        const mockUsers = [{ id: 1, name: 'Alice' }];
        const mockFetch = vi.fn().mockResolvedValue({
            json: () => Promise.resolve(mockUsers)
        });

        const result = await load({ fetch: mockFetch } as any);

        expect(mockFetch).toHaveBeenCalledWith('/api/users');
        expect(result.users).toEqual(mockUsers);
    });
});
```

### Testing Form Actions

```typescript
// src/routes/login/+page.server.ts
export const actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const email = data.get('email');
        // ... validation and auth
        return { success: true };
    }
};

// src/routes/login/+page.server.test.ts
import { describe, it, expect } from 'vitest';
import { actions } from './+page.server';

describe('login action', () => {
    it('should authenticate valid credentials', async () => {
        const formData = new FormData();
        formData.set('email', 'test@example.com');
        formData.set('password', 'password123');

        const request = new Request('http://localhost', {
            method: 'POST',
            body: formData
        });

        const result = await actions.default({ request } as any);

        expect(result.success).toBe(true);
    });
});
```

### Testing API Routes

```typescript
// src/routes/api/users/+server.ts
export async function GET() {
    const users = await db.users.findMany();
    return json(users);
}

// src/routes/api/users/+server.test.ts
import { describe, it, expect, vi } from 'vitest';
import { GET } from './+server';

vi.mock('$lib/db', () => ({
    db: {
        users: {
            findMany: vi.fn().mockResolvedValue([
                { id: 1, name: 'Alice' }
            ])
        }
    }
}));

describe('GET /api/users', () => {
    it('should return all users', async () => {
        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toHaveLength(1);
        expect(data[0].name).toBe('Alice');
    });
});
```

---

## Test Organization

### Directory Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── Button.svelte
│   │   └── Button.test.ts
│   ├── utils/
│   │   ├── format.ts
│   │   └── format.test.ts
│   └── stores/
│       ├── user.ts
│       └── user.test.ts
├── routes/
│   ├── +page.svelte
│   ├── +page.server.ts
│   └── +page.server.test.ts
└── tests/
    ├── setup.ts
    ├── mocks/
    │   └── $app/
    │       ├── navigation.ts
    │       └── stores.ts
    └── integration/
        └── auth-flow.test.ts
```

### Naming Conventions

- Test files: `*.test.ts` or `*.spec.ts`
- Co-locate tests with source files
- Integration tests in `tests/integration/`
- E2E tests in `tests/e2e/` (use Playwright)

---

## Coverage

### Vitest Coverage

```bash
# Install coverage provider
pnpm add -D @vitest/coverage-v8

# Run with coverage
npx vitest run --coverage
```

```typescript
// vite.config.ts
export default defineConfig({
    test: {
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            exclude: [
                'node_modules/',
                'src/tests/',
                '**/*.d.ts',
                '**/*.config.*'
            ],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 80,
                statements: 80
            }
        }
    }
});
```

### Jest Coverage

```bash
pnpm test --coverage --coverageReporters=text-summary
```

**Target Coverage**: Unit tests 80-90%, Critical paths 100%, Overall 75-85%

---

## Troubleshooting

### Common Issues

**"Cannot find module" errors**
```typescript
// vite.config.ts - ensure aliases are configured
resolve: {
    alias: {
        $lib: '/src/lib'
    }
}
```

**SvelteKit module mocks not working**
- Ensure mocks are in `setupFiles`, not `setupFilesAfterEnv`
- Use `vi.mock()` before importing the module being tested

**Tests pass locally, fail in CI**
- Check for hardcoded paths or environment dependencies
- Ensure `test:run` (not watch mode) is used in CI
- Add `--reporter=verbose` for better error output

**Svelte component not rendering**
- Ensure `jsdom` environment is set
- Check that `@testing-library/svelte` version matches Svelte version

**Async tests timing out**
```typescript
// Increase timeout for slow tests
it('slow operation', async () => {
    // ...
}, 10000); // 10 second timeout
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm test:run --coverage

      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## Related Guides

- **[svelte5_guide.md](svelte5_guide.md)** - Svelte 5 patterns with runes
- **[ci_cd_patterns.md](ci_cd_patterns.md)** - CI/CD pipelines
- **[code_quality.md](code_quality.md)** - Linting and formatting
- **[testing_python.md](testing_python.md)** - Python testing with pytest

---

*Last updated: 2025-11-28*
