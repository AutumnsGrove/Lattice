/**
 * ArborToggle — Component rendering tests
 *
 * Tests that the toggle button renders correctly with proper
 * accessibility attributes.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import ArborToggle from "./ArborToggle.svelte";

describe("ArborToggle", () => {
  it("should render a button with accessible label", () => {
    render(ArborToggle);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", "Toggle sidebar");
  });

  it("should have a title attribute", () => {
    render(ArborToggle);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("title", "Toggle sidebar");
  });
});
