<script lang="ts">
	import { copyToClipboard as copyText } from "@autumnsgrove/lattice/utils/share";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import ImageUploadForm from "./ImageUploadForm.svelte";
	import ImageGallery from "./ImageGallery.svelte";

	let {
		data,
	}: {
		data: {
			grafts?: Record<string, boolean>;
			/** From the page's own load — the real gate, not just the graft. */
			uploadsAllowed?: boolean | null;
			uploadAccessUrl?: string | null;
		};
	} = $props();

	// The graft says the feature exists; the gate says this grove may use it today,
	// and `uploads_suspended` is what a new grove trips (#1626). Null means the
	// gate could not be evaluated, so trust the graft rather than invent a banner.
	const uploadsEnabled = $derived(
		(data.grafts?.image_uploads ?? true) && (data.uploadsAllowed ?? true),
	);

	// Copy format preference - load from localStorage or default to 'url'
	const COPY_FORMAT_STORAGE_KEY = "grove-copy-format";
	let copyFormat = $state(
		(typeof localStorage !== "undefined" && localStorage.getItem(COPY_FORMAT_STORAGE_KEY)) || "url",
	);

	// Persist copy format preference to localStorage when it changes
	$effect(() => {
		if (typeof localStorage !== "undefined") {
			localStorage.setItem(COPY_FORMAT_STORAGE_KEY, copyFormat);
		}
	});

	// Shared UI state for copy feedback
	let copiedItem = $state<string | number | null>(null);

	// Gallery ref for refreshing after uploads
	let galleryRef: ReturnType<typeof ImageGallery> | null = $state(null);

	async function handleCopy(text: string, itemId: string | number | null) {
		const result = await copyText(text);
		if (result.success) {
			copiedItem = itemId;
			setTimeout(() => {
				if (copiedItem === itemId) copiedItem = null;
			}, 2000);
		} else {
			toast.error("Failed to copy to clipboard");
		}
	}

	function handleCopiedItemChange(item: string | number | null) {
		copiedItem = item;
	}
</script>

<div class="images-page">
	<header class="page-header">
		<div class="header-content">
			<h1>Images</h1>
			<p class="subtitle">Upload, organize, and manage your image library</p>
		</div>
	</header>

	<ImageUploadForm
		{uploadsEnabled}
		uploadAccessUrl={data.uploadAccessUrl ?? null}
		{copyFormat}
		{copiedItem}
		onCopyFormatChange={(format) => (copyFormat = format)}
		onCopy={handleCopy}
		onUploadsComplete={() => galleryRef?.refresh()}
	/>

	<ImageGallery
		bind:this={galleryRef}
		{copyFormat}
		{copiedItem}
		onCopiedItemChange={handleCopiedItemChange}
	/>
</div>

<style>
	.images-page {
		max-width: 1000px;
	}

	/* Header */
	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
		gap: 1rem;
	}

	.header-content h1 {
		margin: 0 0 0.25rem 0;
		font-size: 1.75rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.subtitle {
		margin: 0;
		color: var(--color-text-muted);
		font-size: 0.9rem;
	}

	@media (max-width: 768px) {
		.page-header {
			flex-direction: column;
		}
	}
</style>
