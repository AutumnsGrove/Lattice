/**
 * Theme Store Tests
 *
 * Tests the themeStore behavior including:
 * - Initial theme loading from localStorage
 * - Theme persistence to localStorage
 * - System preference detection and reactivity
 * - Toggle and setTheme behavior
 * - resolvedTheme computation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

// Mock matchMedia
const createMatchMediaMock = (prefersDark: boolean) => {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  return {
    matches: prefersDark,
    media: "(prefers-color-scheme: dark)",
    addEventListener: (
      _event: string,
      listener: (e: MediaQueryListEvent) => void,
    ) => {
      listeners.push(listener);
    },
    removeEventListener: (
      _event: string,
      listener: (e: MediaQueryListEvent) => void,
    ) => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    },
    // Helper for tests to simulate system preference change
    _simulateChange: (prefersDark: boolean) => {
      listeners.forEach((listener) =>
        listener({ matches: prefersDark } as MediaQueryListEvent),
      );
    },
    _listeners: listeners,
  };
};

describe("themeStore", () => {
  let matchMediaMock: ReturnType<typeof createMatchMediaMock>;

  beforeEach(() => {
    // Reset localStorage
    localStorageMock.clear();
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
    });

    // Reset matchMedia
    matchMediaMock = createMatchMediaMock(false);
    Object.defineProperty(globalThis, "matchMedia", {
      value: () => matchMediaMock,
      writable: true,
    });

    // Reset document.documentElement.classList
    document.documentElement.classList.remove("dark");

    // Clear module cache to get fresh store instance
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("should default to system theme when no localStorage value", async () => {
      const { themeStore } = await import("./theme.svelte");

      expect(themeStore.theme).toBe("system");
    });

    it("should load theme from localStorage if present", async () => {
      localStorageMock.setItem("theme", "dark");

      const { themeStore } = await import("./theme.svelte");

      expect(themeStore.theme).toBe("dark");
    });

    it("should load light theme from localStorage", async () => {
      localStorageMock.setItem("theme", "light");

      const { themeStore } = await import("./theme.svelte");

      expect(themeStore.theme).toBe("light");
    });
  });

  describe("resolvedTheme", () => {
    it("should resolve to light when theme is light", async () => {
      localStorageMock.setItem("theme", "light");

      const { themeStore } = await import("./theme.svelte");

      expect(themeStore.resolvedTheme).toBe("light");
    });

    it("should resolve to dark when theme is dark", async () => {
      localStorageMock.setItem("theme", "dark");

      const { themeStore } = await import("./theme.svelte");

      expect(themeStore.resolvedTheme).toBe("dark");
    });

    it("should resolve based on system preference when theme is system", async () => {
      matchMediaMock = createMatchMediaMock(true); // System prefers dark
      Object.defineProperty(globalThis, "matchMedia", {
        value: () => matchMediaMock,
        writable: true,
      });

      const { themeStore } = await import("./theme.svelte");

      expect(themeStore.theme).toBe("system");
      expect(themeStore.resolvedTheme).toBe("dark");
    });

    it("should resolve to light when system preference is light", async () => {
      matchMediaMock = createMatchMediaMock(false); // System prefers light
      Object.defineProperty(globalThis, "matchMedia", {
        value: () => matchMediaMock,
        writable: true,
      });

      const { themeStore } = await import("./theme.svelte");

      expect(themeStore.theme).toBe("system");
      expect(themeStore.resolvedTheme).toBe("light");
    });
  });

  describe("setTheme", () => {
    it("should update theme value", async () => {
      const { themeStore } = await import("./theme.svelte");

      themeStore.setTheme("dark");

      expect(themeStore.theme).toBe("dark");
    });

    it("should persist theme to localStorage", async () => {
      const { themeStore } = await import("./theme.svelte");

      themeStore.setTheme("dark");

      // Give $effect time to run (persistence now handled reactively)
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(localStorageMock.getItem("theme")).toBe("dark");
    });

    it("should update resolved theme", async () => {
      const { themeStore } = await import("./theme.svelte");

      themeStore.setTheme("dark");

      expect(themeStore.resolvedTheme).toBe("dark");
    });
  });

  describe("toggle", () => {
    it("should switch from light to dark", async () => {
      localStorageMock.setItem("theme", "light");
      const { themeStore } = await import("./theme.svelte");

      themeStore.toggle();

      expect(themeStore.theme).toBe("dark");
    });

    it("should switch from dark to light", async () => {
      localStorageMock.setItem("theme", "dark");
      const { themeStore } = await import("./theme.svelte");

      themeStore.toggle();

      expect(themeStore.theme).toBe("light");
    });

    it("should switch from system (dark) to light", async () => {
      matchMediaMock = createMatchMediaMock(true); // System prefers dark
      Object.defineProperty(globalThis, "matchMedia", {
        value: () => matchMediaMock,
        writable: true,
      });

      const { themeStore } = await import("./theme.svelte");
      expect(themeStore.resolvedTheme).toBe("dark");

      themeStore.toggle();

      expect(themeStore.theme).toBe("light");
    });

    it("should switch from system (light) to dark", async () => {
      matchMediaMock = createMatchMediaMock(false); // System prefers light
      Object.defineProperty(globalThis, "matchMedia", {
        value: () => matchMediaMock,
        writable: true,
      });

      const { themeStore } = await import("./theme.svelte");
      expect(themeStore.resolvedTheme).toBe("light");

      themeStore.toggle();

      expect(themeStore.theme).toBe("dark");
    });
  });

  describe("DOM application", () => {
    it("should apply dark class to document when resolved theme is dark", async () => {
      localStorageMock.setItem("theme", "dark");

      await import("./theme.svelte");

      // Give $effect time to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("should remove dark class when resolved theme is light", async () => {
      document.documentElement.classList.add("dark");
      localStorageMock.setItem("theme", "light");

      await import("./theme.svelte");

      // Give $effect time to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  describe("system preference reactivity", () => {
    it("should update resolvedTheme when system preference changes", async () => {
      // Start with system theme and light system preference
      matchMediaMock = createMatchMediaMock(false);
      Object.defineProperty(globalThis, "matchMedia", {
        value: () => matchMediaMock,
        writable: true,
      });

      const { themeStore } = await import("./theme.svelte");

      // Initial state: system theme, light preference
      expect(themeStore.theme).toBe("system");
      expect(themeStore.resolvedTheme).toBe("light");

      // Simulate system preference change to dark
      matchMediaMock._simulateChange(true);

      // Give $effect time to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      // resolvedTheme should now be dark
      expect(themeStore.theme).toBe("system"); // theme unchanged
      expect(themeStore.resolvedTheme).toBe("dark"); // resolved changed
    });

    it("should update resolvedTheme when system changes from dark to light", async () => {
      // Start with system theme and dark system preference
      matchMediaMock = createMatchMediaMock(true);
      Object.defineProperty(globalThis, "matchMedia", {
        value: () => matchMediaMock,
        writable: true,
      });

      const { themeStore } = await import("./theme.svelte");

      expect(themeStore.resolvedTheme).toBe("dark");

      // Simulate system preference change to light
      matchMediaMock._simulateChange(false);

      // Give $effect time to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(themeStore.resolvedTheme).toBe("light");
    });

    it("should update DOM class when system preference changes", async () => {
      // Start with system theme and light system preference
      matchMediaMock = createMatchMediaMock(false);
      Object.defineProperty(globalThis, "matchMedia", {
        value: () => matchMediaMock,
        writable: true,
      });

      await import("./theme.svelte");

      // Give initial $effect time to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(document.documentElement.classList.contains("dark")).toBe(false);

      // Simulate system preference change to dark
      matchMediaMock._simulateChange(true);

      // Give $effect time to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("should not react to system changes when theme is explicitly set", async () => {
      matchMediaMock = createMatchMediaMock(false);
      Object.defineProperty(globalThis, "matchMedia", {
        value: () => matchMediaMock,
        writable: true,
      });

      const { themeStore } = await import("./theme.svelte");

      // Explicitly set theme to dark
      themeStore.setTheme("dark");
      expect(themeStore.resolvedTheme).toBe("dark");

      // System preference changes (but should be ignored)
      matchMediaMock._simulateChange(true); // system now prefers dark too

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should still be dark (from explicit setting, not system)
      expect(themeStore.theme).toBe("dark");
      expect(themeStore.resolvedTheme).toBe("dark");

      // Change system back to light
      matchMediaMock._simulateChange(false);

      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should still be dark (explicit setting overrides system)
      expect(themeStore.resolvedTheme).toBe("dark");
    });
  });
});
