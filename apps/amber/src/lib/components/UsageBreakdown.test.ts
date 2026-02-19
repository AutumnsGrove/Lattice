import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/svelte";
import UsageBreakdown from "./UsageBreakdown.svelte";
import type { UsageBreakdown as UsageBreakdownType } from "$types";

describe("UsageBreakdown", () => {
	const mockBreakdown: UsageBreakdownType[] = [
		{ product: "blog", category: "images", bytes: 5000000000, file_count: 100 },
		{ product: "blog", category: "content", bytes: 500000000, file_count: 50 },
		{ product: "ivy", category: "attachments", bytes: 2000000000, file_count: 30 },
		{ product: "profile", category: "avatar", bytes: 100000000, file_count: 2 },
	];

	const totalBytes = 7600000000;

	it("should render section title", () => {
		render(UsageBreakdown, { props: { breakdown: mockBreakdown, totalBytes } });

		expect(screen.getByText("Usage by Product")).toBeInTheDocument();
	});

	it("should display products with correct labels", () => {
		render(UsageBreakdown, { props: { breakdown: mockBreakdown, totalBytes } });

		expect(screen.getByText("Blog")).toBeInTheDocument();
		expect(screen.getByText("Email (Ivy)")).toBeInTheDocument();
		expect(screen.getByText("Profile")).toBeInTheDocument();
	});

	it("should display product icons", () => {
		render(UsageBreakdown, { props: { breakdown: mockBreakdown, totalBytes } });

		// Component now uses Lucide SVG icons via Icon component
		// Check that product rows exist with their data-product attributes
		const blogRow = document.querySelector('[data-product="blog"]');
		const ivyRow = document.querySelector('[data-product="ivy"]');
		const profileRow = document.querySelector('[data-product="profile"]');

		expect(blogRow).toBeInTheDocument();
		expect(ivyRow).toBeInTheDocument();
		expect(profileRow).toBeInTheDocument();

		// Each product row should have an SVG icon
		expect(blogRow?.querySelector("svg")).toBeInTheDocument();
		expect(ivyRow?.querySelector("svg")).toBeInTheDocument();
		expect(profileRow?.querySelector("svg")).toBeInTheDocument();
	});

	it("should aggregate categories under products", () => {
		render(UsageBreakdown, { props: { breakdown: mockBreakdown, totalBytes } });

		// Blog should show both images and content categories
		expect(screen.getByText("images")).toBeInTheDocument();
		expect(screen.getByText("content")).toBeInTheDocument();
	});

	it("should display file counts", () => {
		render(UsageBreakdown, { props: { breakdown: mockBreakdown, totalBytes } });

		// Blog has 100 + 50 = 150 files
		expect(screen.getByText(/150 files/)).toBeInTheDocument();
		// Ivy has 30 files
		expect(screen.getByText(/30 files/)).toBeInTheDocument();
	});

	it("should show empty state when no breakdown", () => {
		render(UsageBreakdown, { props: { breakdown: [], totalBytes: 0 } });

		expect(screen.getByText("No files uploaded yet.")).toBeInTheDocument();
	});

	it("should format bytes correctly", () => {
		render(UsageBreakdown, { props: { breakdown: mockBreakdown, totalBytes } });

		// Blog should show ~5.12 GB (5000000000 + 500000000 bytes)
		expect(screen.getByText(/5\.\d+ GB/)).toBeInTheDocument();
	});
});
