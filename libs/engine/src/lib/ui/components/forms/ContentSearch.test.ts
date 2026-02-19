import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import ContentSearch from "./ContentSearch.svelte";

// Mock SvelteKit modules
vi.mock("$app/state", () => ({
  page: {
    url: new URL("http://localhost/test"),
    params: {},
    route: { id: "/" },
    status: 200,
    error: null,
    data: {},
    form: null,
  },
}));

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
}));

describe("ContentSearch Component", () => {
  const mockItems = [
    {
      id: 1,
      title: "JavaScript Fundamentals",
      tags: ["javascript", "tutorial"],
    },
    { id: 2, title: "TypeScript Guide", tags: ["typescript", "guide"] },
    { id: 3, title: "Svelte 5 Runes", tags: ["svelte", "runes"] },
  ];

  const mockFilterFn = (item: any, query: string) => {
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.tags.some((tag: string) => tag.toLowerCase().includes(q))
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("Rendering", () => {
    it("should render search input with placeholder", () => {
      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          placeholder: "Search posts...",
        },
      });

      const input = screen.getByRole("searchbox");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "Search posts...");
    });

    it("should render with search icon by default", () => {
      const { container } = render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
        },
      });

      const icon = container.querySelector(".content-search-icon");
      expect(icon).toBeInTheDocument();
    });

    it("should not render search icon when showIcon is false", () => {
      const { container } = render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          showIcon: false,
        },
      });

      const icon = container.querySelector(".content-search-icon");
      expect(icon).not.toBeInTheDocument();
    });

    it("should render clear button when there is a query", async () => {
      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          searchQuery: "test",
        },
      });

      const clearButton = screen.getByLabelText("Clear search query");
      expect(clearButton).toBeInTheDocument();
    });

    it("should not render clear button when query is empty", () => {
      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          searchQuery: "",
        },
      });

      const clearButton = screen.queryByLabelText("Clear search query");
      expect(clearButton).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA roles and labels", () => {
      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          placeholder: "Search items",
        },
      });

      const searchContainer = screen.getByRole("search");
      expect(searchContainer).toBeInTheDocument();

      const input = screen.getByRole("searchbox");
      expect(input).toHaveAttribute("aria-label", "Search items");
    });

    it('should have type="search" on input', () => {
      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
        },
      });

      const input = screen.getByRole("searchbox");
      expect(input).toHaveAttribute("type", "search");
    });

    it("should have aria-describedby when clear button is present", async () => {
      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          searchQuery: "test",
        },
      });

      const input = screen.getByRole("searchbox");
      const clearButton = screen.getByLabelText("Clear search query");

      expect(input).toHaveAttribute("aria-describedby", clearButton.id);
    });

    it("should announce results to screen readers", async () => {
      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          searchQuery: "javascript",
          debounceDelay: 0,
        },
      });

      // Wait for Svelte 5's reactive system to settle
      await tick();
      await tick();

      const status = screen.getByRole("status");
      expect(status).toHaveTextContent('Found 1 result matching "javascript"');
    });

    it("should use correct plural for multiple results", async () => {
      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          searchQuery: "script",
          debounceDelay: 0,
        },
      });

      // Wait for Svelte 5's reactive system to settle
      await tick();
      await tick();

      const status = screen.getByRole("status");
      expect(status).toHaveTextContent('Found 2 results matching "script"');
    });

    it("should mark decorative icons as aria-hidden", () => {
      const { container } = render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          searchQuery: "test",
        },
      });

      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  // Use real timers with wide margins - Svelte 5's $effect() doesn't work with fake timers.
  // Delays are set large enough that CI/event-loop pressure can't cause false failures.
  describe("Debouncing", () => {
    it("should debounce search input", async () => {
      const onSearchChange = vi.fn();

      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          onSearchChange,
          debounceDelay: 100,
        },
      });

      // Clear any initial mount calls
      await tick();
      onSearchChange.mockClear();

      const input = screen.getByRole("searchbox");
      await fireEvent.input(input, { target: { value: "java" } });

      // Should not call immediately (before debounce completes)
      expect(onSearchChange).not.toHaveBeenCalled();

      // Wait for debounce + generous buffer
      await new Promise((r) => setTimeout(r, 200));
      await tick();

      expect(onSearchChange).toHaveBeenCalledWith("java", expect.any(Array));
    });

    it("should respect custom debounce delay", async () => {
      const onSearchChange = vi.fn();

      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          onSearchChange,
          debounceDelay: 200,
        },
      });

      // Clear any initial mount calls
      await tick();
      onSearchChange.mockClear();

      const input = screen.getByRole("searchbox");
      await fireEvent.input(input, { target: { value: "test" } });

      // Check well before debounce fires (10ms vs 200ms delay = 190ms margin)
      await new Promise((r) => setTimeout(r, 10));
      expect(onSearchChange).not.toHaveBeenCalled();

      // Wait well past debounce delay
      await new Promise((r) => setTimeout(r, 300));
      await tick();

      expect(onSearchChange).toHaveBeenCalled();
    });

    it("should clear previous timer on rapid input changes", async () => {
      const onSearchChange = vi.fn();

      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          onSearchChange,
          debounceDelay: 150,
        },
      });

      // Clear any initial mount calls
      await tick();
      onSearchChange.mockClear();

      const input = screen.getByRole("searchbox");

      // Rapid inputs - each should reset the debounce timer
      await fireEvent.input(input, { target: { value: "j" } });
      await new Promise((r) => setTimeout(r, 30));

      await fireEvent.input(input, { target: { value: "ja" } });
      await new Promise((r) => setTimeout(r, 30));

      await fireEvent.input(input, { target: { value: "jav" } });

      // Wait well past debounce to let final timer fire
      await new Promise((r) => setTimeout(r, 250));
      await tick();

      // Should only be called once with the final value
      expect(onSearchChange).toHaveBeenCalledTimes(1);
      expect(onSearchChange).toHaveBeenCalledWith("jav", expect.any(Array));
    });
  });

  describe("Filtering", () => {
    it("should call filterFn for each item", async () => {
      const filterFn = vi.fn(mockFilterFn);
      const onSearchChange = vi.fn();

      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn,
          onSearchChange,
          searchQuery: "javascript",
          debounceDelay: 0,
        },
      });

      await waitFor(() => {
        expect(filterFn).toHaveBeenCalledTimes(mockItems.length);
      });
    });

    it("should return all items when query is empty", async () => {
      const onSearchChange = vi.fn();

      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          onSearchChange,
          searchQuery: "",
          debounceDelay: 0,
        },
      });

      await waitFor(() => {
        expect(onSearchChange).toHaveBeenCalledWith("", mockItems);
      });
    });

    it("should filter items correctly", async () => {
      const onSearchChange = vi.fn();

      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          onSearchChange,
          searchQuery: "svelte",
          debounceDelay: 0,
        },
      });

      await waitFor(() => {
        expect(onSearchChange).toHaveBeenCalledWith("svelte", [
          { id: 3, title: "Svelte 5 Runes", tags: ["svelte", "runes"] },
        ]);
      });
    });

    it("should call onSearchChange callback with results", async () => {
      const onSearchChange = vi.fn();

      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          onSearchChange,
          searchQuery: "script",
          debounceDelay: 0,
        },
      });

      await waitFor(() => {
        expect(onSearchChange).toHaveBeenCalledWith(
          "script",
          expect.any(Array),
        );
        const [, results] = onSearchChange.mock.calls[0];
        expect(results).toHaveLength(2);
      });
    });
  });

  describe("Clear Functionality", () => {
    it("should clear search when clear button is clicked", async () => {
      const onSearchChange = vi.fn();

      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          onSearchChange,
          searchQuery: "test",
          debounceDelay: 0,
        },
      });

      const clearButton = screen.getByLabelText("Clear search query");
      await fireEvent.click(clearButton);

      await waitFor(() => {
        const input = screen.getByRole("searchbox") as HTMLInputElement;
        expect(input.value).toBe("");
      });
    });

    it("should call onSearchChange with empty results after clearing", async () => {
      const onSearchChange = vi.fn();

      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          onSearchChange,
          searchQuery: "test",
          debounceDelay: 0,
        },
      });

      const clearButton = screen.getByLabelText("Clear search query");
      await fireEvent.click(clearButton);

      await waitFor(() => {
        expect(onSearchChange).toHaveBeenCalledWith("", mockItems);
      });
    });
  });

  describe("Custom Styling", () => {
    it("should apply custom wrapper class", () => {
      const { container } = render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          wrapperClass: "custom-wrapper",
        },
      });

      const wrapper = container.querySelector(".content-search-wrapper");
      expect(wrapper).toHaveClass("custom-wrapper");
    });

    it("should apply custom input class", () => {
      render(ContentSearch, {
        props: {
          items: mockItems,
          filterFn: mockFilterFn,
          inputClass: "custom-input",
        },
      });

      const input = screen.getByRole("searchbox");
      expect(input).toHaveClass("custom-input");
    });
  });
});
