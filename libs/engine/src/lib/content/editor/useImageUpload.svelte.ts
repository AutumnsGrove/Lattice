import { toast } from "$lib/ui/components/ui/toast";
import { apiRequest } from "$lib/utils/api";
import {
	getActionableUploadError,
	isConvertibleFormat,
	isUploadGateError,
	normalizeFileForUpload,
} from "$lib/media/validation/upload-validation";
import { convertHeicToJpeg } from "$lib/media/processing/imageProcessor";

interface ImageUploadOptions {
	uploadsEnabled: () => boolean;
	readonly: () => boolean;
	insertAtCursor: (text: string) => void;
}

export function useImageUpload(options: ImageUploadOptions) {
	let isDragging = $state(false);
	let isUploading = $state(false);
	let uploadProgress = $state("");
	let uploadError: string | null = $state(null);
	/**
	 * The last failure was the upload gate, not a bad file.
	 *
	 * A toast that fades after eight seconds cannot hold a link, and "ask me to
	 * turn them on" is the only useful next step a suspended uploader has (#1626).
	 */
	let uploadGateBlocked = $state(false);
	let lastFailedFile: File | null = $state(null);

	async function uploadImage(file: File) {
		if (!options.uploadsEnabled()) {
			toast.warning(
				"Your grove needs a little time to sprout before photo uploads are available. You can paste external image URLs using the link button instead!",
			);
			return;
		}

		isUploading = true;
		uploadProgress = `Uploading ${file.name}...`;
		uploadError = null;
		uploadGateBlocked = false;
		lastFailedFile = null;

		try {
			const normalized = await normalizeFileForUpload(file);
			file = normalized.file;

			if (normalized.needsHeicConversion || isConvertibleFormat(file)) {
				uploadProgress = `Converting ${file.name}...`;
				file = await convertHeicToJpeg(file);
			}

			const formData = new FormData();
			formData.append("file", file);
			formData.append("folder", "blog");

			const result = await apiRequest<{ url: string }>("/api/images/upload", {
				method: "POST",
				body: formData,
			});

			if (!result) throw new Error("Upload failed: no response from server");

			const altText =
				file.name
					.replace(/\.[^/.]+$/, "")
					.replace(/[-_]/g, " ")
					.replace(/\s+/g, " ")
					.trim() || "Image";
			const imageMarkdown = `![${altText}](${result.url})\n`;
			options.insertAtCursor(imageMarkdown);

			toast.success(`Uploaded ${file.name}`);
			uploadProgress = "";
		} catch (err) {
			const rawMessage = err instanceof Error ? err.message : String(err);
			uploadError = getActionableUploadError(rawMessage);
			uploadGateBlocked = isUploadGateError(rawMessage);
			lastFailedFile = file;
			toast.error(uploadError);
			setTimeout(() => (uploadError = null), 8000);
		} finally {
			isUploading = false;
			uploadProgress = "";
		}
	}

	function retryUpload() {
		if (lastFailedFile) {
			const file = lastFailedFile;
			lastFailedFile = null;
			uploadError = null;
			uploadImage(file);
		}
	}

	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		if (options.readonly()) return;
		if (e.dataTransfer?.types?.includes("Files")) {
			isDragging = true;
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		if (options.readonly()) return;
		if (e.dataTransfer?.types?.includes("Files")) {
			e.dataTransfer.dropEffect = "copy";
			isDragging = true;
		}
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		const target = e.currentTarget as HTMLElement;
		if (!target.contains(e.relatedTarget as Node | null)) {
			isDragging = false;
		}
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (options.readonly()) return;

		const files = Array.from(e.dataTransfer?.files || []);
		const imageFiles = files.filter((f) => f.type.startsWith("image/"));

		if (imageFiles.length === 0) {
			uploadError = "No image files detected";
			setTimeout(() => (uploadError = null), 3000);
			return;
		}

		for (const file of imageFiles) {
			await uploadImage(file);
		}
	}

	function handlePaste(e: ClipboardEvent) {
		if (options.readonly()) return;

		const items = Array.from(e.clipboardData?.items || []);
		const imageItem = items.find((item) => item.type.startsWith("image/"));

		if (imageItem) {
			e.preventDefault();
			const file = imageItem.getAsFile();
			if (file) {
				const timestamp = Date.now();
				const extension = file.type.split("/")[1] || "png";
				const renamedFile = new File([file], `pasted-${timestamp}.${extension}`, {
					type: file.type,
				});
				uploadImage(renamedFile);
			}
		}
	}

	return {
		get isDragging() {
			return isDragging;
		},
		get isUploading() {
			return isUploading;
		},
		get uploadProgress() {
			return uploadProgress;
		},
		get uploadError() {
			return uploadError;
		},
		get uploadGateBlocked() {
			return uploadGateBlocked;
		},
		get lastFailedFile() {
			return lastFailedFile;
		},
		uploadImage,
		retryUpload,
		handleDragEnter,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		handlePaste,
	};
}
