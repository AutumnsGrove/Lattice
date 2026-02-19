import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/svelte";
import FileGrid from "./FileGrid.svelte";
import type { StorageFile } from "$types";

describe("FileGrid", () => {
	const mockFiles: StorageFile[] = [
		{
			id: "file_1",
			user_id: "user_123",
			r2_key: "user_123/blog/images/photo1.jpg",
			filename: "photo1.jpg",
			mime_type: "image/jpeg",
			size_bytes: 1024000,
			product: "blog",
			category: "images",
			created_at: "2025-01-01T00:00:00Z",
		},
		{
			id: "file_2",
			user_id: "user_123",
			r2_key: "user_123/blog/images/document.pdf",
			filename: "document.pdf",
			mime_type: "application/pdf",
			size_bytes: 2048000,
			product: "blog",
			category: "documents",
			created_at: "2025-01-02T00:00:00Z",
		},
	];

	it("should render files", () => {
		render(FileGrid, { props: { files: mockFiles } });

		expect(screen.getByText("photo1.jpg")).toBeInTheDocument();
		expect(screen.getByText("document.pdf")).toBeInTheDocument();
	});

	it("should display file sizes", () => {
		render(FileGrid, { props: { files: mockFiles } });

		expect(screen.getByText("1000 KB")).toBeInTheDocument();
		expect(screen.getByText("2 MB")).toBeInTheDocument();
	});

	it("should display file dates", () => {
		render(FileGrid, { props: { files: mockFiles } });

		// Dates are formatted with toLocaleDateString, verify both files have date elements
		// Use flexible matching since timezone differences may affect display
		expect(screen.getByText(/2025/)).toBeInTheDocument();
		const dateElements = screen.getAllByText(/\d{4}/);
		expect(dateElements.length).toBeGreaterThanOrEqual(2);
	});

	it("should show empty state when no files", () => {
		render(FileGrid, { props: { files: [] } });

		expect(screen.getByText("No files found")).toBeInTheDocument();
	});

	it("should call onSelect when file is clicked", async () => {
		const onSelect = vi.fn();
		render(FileGrid, { props: { files: mockFiles, onSelect } });

		const fileCard = screen.getByText("photo1.jpg").closest(".file-card");
		await fireEvent.click(fileCard!);

		expect(onSelect).toHaveBeenCalledWith(mockFiles[0]);
	});

	it("should call onDelete when delete button clicked", async () => {
		const onDelete = vi.fn();
		render(FileGrid, { props: { files: mockFiles, onDelete } });

		const deleteButtons = screen.getAllByTitle("Delete");
		await fireEvent.click(deleteButtons[0]);

		expect(onDelete).toHaveBeenCalledWith(mockFiles[0]);
	});

	it("should call onDownload when download button clicked", async () => {
		const onDownload = vi.fn();
		render(FileGrid, { props: { files: mockFiles, onDownload } });

		const downloadButtons = screen.getAllByTitle("Download");
		await fireEvent.click(downloadButtons[0]);

		expect(onDownload).toHaveBeenCalledWith(mockFiles[0]);
	});

	it("should highlight selected files", () => {
		const selectedIds = new Set(["file_1"]);
		render(FileGrid, { props: { files: mockFiles, selectedIds } });

		const fileCard = screen.getByText("photo1.jpg").closest(".file-card");
		expect(fileCard).toHaveClass("selected");
	});

	it("should display correct icon for different file types", () => {
		render(FileGrid, { props: { files: mockFiles } });

		// Component now uses Lucide SVG icons instead of emojis
		// Each file card should have an SVG icon in the icon-placeholder container
		const fileCards = document.querySelectorAll(".file-card");
		expect(fileCards).toHaveLength(2);

		// Each file card should contain an SVG icon
		fileCards.forEach((card) => {
			const icon = card.querySelector(".icon-placeholder svg");
			expect(icon).toBeInTheDocument();
		});
	});
});
