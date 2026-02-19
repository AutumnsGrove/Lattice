/**
 * ArborSection — Component rendering tests
 *
 * Tests the section page wrapper renders title, description,
 * icon, and content correctly.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import ArborSection from "./ArborSection.svelte";

describe("ArborSection", () => {
  it("should render a title", () => {
    render(ArborSection, {
      props: {
        title: "Dashboard",
        children: (() => {}) as any,
      },
    });

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("should render a description when provided", () => {
    render(ArborSection, {
      props: {
        title: "Garden",
        description: "Manage your blog posts",
        children: (() => {}) as any,
      },
    });

    expect(screen.getByText("Manage your blog posts")).toBeInTheDocument();
  });

  it("should not render a description when not provided", () => {
    render(ArborSection, {
      props: {
        title: "Pages",
        children: (() => {}) as any,
      },
    });

    expect(screen.queryByText("Manage")).not.toBeInTheDocument();
  });

  it("should render the title in an h1 element", () => {
    render(ArborSection, {
      props: {
        title: "Settings",
        children: (() => {}) as any,
      },
    });

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Settings");
  });
});
