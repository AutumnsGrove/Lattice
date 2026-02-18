import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import MobileTOC from "./MobileTOC.svelte";

describe("MobileTOC", () => {
  const mockHeaders = [
    { id: "intro", text: "Introduction", level: 2 },
    { id: "features", text: "Features", level: 2 },
    { id: "getting-started", text: "Getting Started", level: 3 },
  ];

  describe("Rendering", () => {
    it("renders nothing when headers array is empty", () => {
      const { container } = render(MobileTOC, { props: { headers: [] } });
      expect(container.querySelector(".mobile-toc-wrapper")).toBeFalsy();
    });

    it("renders wrapper when headers are provided", () => {
      const { container } = render(MobileTOC, {
        props: { headers: mockHeaders },
      });
      expect(container.querySelector(".mobile-toc-wrapper")).toBeTruthy();
    });

    it("has aria-expanded false initially", () => {
      render(MobileTOC, { props: { headers: mockHeaders } });
      const button = screen.getByLabelText("Toggle table of contents");
      expect(button.getAttribute("aria-expanded")).toBe("false");
    });

    it("renders toggle button with correct aria-label", () => {
      render(MobileTOC, { props: { headers: mockHeaders } });
      expect(screen.getByLabelText("Toggle table of contents")).toBeTruthy();
    });
  });

  describe("Menu Toggle", () => {
    it("shows menu when button is clicked", async () => {
      render(MobileTOC, { props: { headers: mockHeaders } });
      const button = screen.getByLabelText("Toggle table of contents");

      await fireEvent.click(button);

      expect(screen.getByText("Introduction")).toBeTruthy();
      expect(screen.getByText("Features")).toBeTruthy();
    });

    it("sets aria-expanded true when open", async () => {
      render(MobileTOC, { props: { headers: mockHeaders } });
      const button = screen.getByLabelText("Toggle table of contents");

      await fireEvent.click(button);

      expect(button.getAttribute("aria-expanded")).toBe("true");
    });

    it("renders default title in menu", async () => {
      render(MobileTOC, { props: { headers: mockHeaders } });
      const button = screen.getByLabelText("Toggle table of contents");

      await fireEvent.click(button);

      expect(screen.getByText("Table of Contents")).toBeTruthy();
    });

    it("renders custom title when provided", async () => {
      render(MobileTOC, { props: { headers: mockHeaders, title: "Jump to" } });
      const button = screen.getByLabelText("Toggle table of contents");

      await fireEvent.click(button);

      expect(screen.getByText("Jump to")).toBeTruthy();
    });
  });

  describe("Level Classes", () => {
    it("applies correct level-2 classes when menu is open", async () => {
      const { container } = render(MobileTOC, {
        props: { headers: mockHeaders },
      });
      const button = screen.getByLabelText("Toggle table of contents");

      await fireEvent.click(button);

      const level2Items = container.querySelectorAll(".level-2");
      expect(level2Items.length).toBe(2);
    });

    it("applies correct level-3 classes when menu is open", async () => {
      const { container } = render(MobileTOC, {
        props: { headers: mockHeaders },
      });
      const button = screen.getByLabelText("Toggle table of contents");

      await fireEvent.click(button);

      const level3Items = container.querySelectorAll(".level-3");
      expect(level3Items.length).toBe(1);
    });
  });

  describe("Structure", () => {
    it("has mobile-toc-wrapper class on container", () => {
      const { container } = render(MobileTOC, {
        props: { headers: mockHeaders },
      });
      expect(container.querySelector(".mobile-toc-wrapper")).toBeTruthy();
    });

    it("renders toc-button", () => {
      const { container } = render(MobileTOC, {
        props: { headers: mockHeaders },
      });
      expect(container.querySelector(".toc-button")).toBeTruthy();
    });

    it("renders menu with toc-menu class when open", async () => {
      const { container } = render(MobileTOC, {
        props: { headers: mockHeaders },
      });
      const button = screen.getByLabelText("Toggle table of contents");

      await fireEvent.click(button);

      expect(container.querySelector(".toc-menu")).toBeTruthy();
    });

    it("renders unordered list in menu", async () => {
      const { container } = render(MobileTOC, {
        props: { headers: mockHeaders },
      });
      const button = screen.getByLabelText("Toggle table of contents");

      await fireEvent.click(button);

      expect(container.querySelector("ul.toc-list")).toBeTruthy();
    });

    it("wraps header text in span elements", async () => {
      const { container } = render(MobileTOC, {
        props: { headers: mockHeaders },
      });
      const button = screen.getByLabelText("Toggle table of contents");

      await fireEvent.click(button);

      const spans = container.querySelectorAll(".toc-link span");
      expect(spans.length).toBe(mockHeaders.length);
    });
  });

  describe("Props", () => {
    it("accepts scrollOffset prop", () => {
      const { container } = render(MobileTOC, {
        props: { headers: mockHeaders, scrollOffset: 120 },
      });
      expect(container.querySelector(".mobile-toc-wrapper")).toBeTruthy();
    });

    it("uses default scrollOffset when not provided", () => {
      const { container } = render(MobileTOC, {
        props: { headers: mockHeaders },
      });
      expect(container.querySelector(".mobile-toc-wrapper")).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    it("has proper aria-label on FAB button", () => {
      render(MobileTOC, { props: { headers: mockHeaders } });
      const button = screen.getByLabelText("Toggle table of contents");
      expect(button).toBeTruthy();
    });

    it("uses button elements for menu items", async () => {
      render(MobileTOC, { props: { headers: mockHeaders } });
      const fabButton = screen.getByLabelText("Toggle table of contents");

      await fireEvent.click(fabButton);

      // All menu items should be buttons with type="button"
      const menuButtons = screen.getAllByRole("button");
      const menuItemButtons = menuButtons.filter((btn) =>
        btn.classList.contains("toc-link"),
      );
      expect(menuItemButtons.length).toBe(mockHeaders.length);
      menuItemButtons.forEach((button) => {
        expect(button.getAttribute("type")).toBe("button");
      });
    });

    it("uses heading for menu title", async () => {
      const { container } = render(MobileTOC, {
        props: { headers: mockHeaders },
      });
      const button = screen.getByLabelText("Toggle table of contents");

      await fireEvent.click(button);

      expect(container.querySelector("h3.toc-title")).toBeTruthy();
    });
  });

  describe("Icon Rendering", () => {
    // Create a simple mock Svelte component
    const MockIcon = function MockIcon() {
      return { $$: {}, $destroy: () => {}, $set: () => {} };
    };

    const headersWithIcons = [
      { id: "with-icon", text: "With Icon", level: 2, icon: MockIcon },
      { id: "without-icon", text: "Without Icon", level: 2 },
    ];

    it("adds has-icon class when icon is provided", async () => {
      const { container } = render(MobileTOC, {
        props: { headers: headersWithIcons },
      });
      const button = screen.getByLabelText("Toggle table of contents");

      await fireEvent.click(button);

      const itemsWithIcon = container.querySelectorAll(".has-icon");
      expect(itemsWithIcon.length).toBe(1);
    });

    it("does not add has-icon class when icon is not provided", async () => {
      const { container } = render(MobileTOC, {
        props: { headers: mockHeaders },
      });
      const button = screen.getByLabelText("Toggle table of contents");

      await fireEvent.click(button);

      const itemsWithIcon = container.querySelectorAll(".has-icon");
      expect(itemsWithIcon.length).toBe(0);
    });

    it("handles invalid icon gracefully", async () => {
      const headersWithInvalidIcon = [
        { id: "invalid", text: "Invalid Icon", level: 2, icon: {} as any },
      ];
      const { container } = render(MobileTOC, {
        props: { headers: headersWithInvalidIcon },
      });
      const button = screen.getByLabelText("Toggle table of contents");

      await fireEvent.click(button);

      // Should not throw, empty object fails isValidIcon
      expect(container.querySelector(".toc-menu")).toBeTruthy();
    });

    it("handles null icon gracefully", async () => {
      const headersWithNullIcon = [
        { id: "null-icon", text: "Null Icon", level: 2, icon: null as any },
      ];
      const { container } = render(MobileTOC, {
        props: { headers: headersWithNullIcon },
      });
      const button = screen.getByLabelText("Toggle table of contents");

      await fireEvent.click(button);

      expect(container.querySelector(".toc-menu")).toBeTruthy();
      expect(container.querySelectorAll(".has-icon").length).toBe(0);
    });
  });
});
