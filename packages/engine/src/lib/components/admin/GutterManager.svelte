<script>
  import { marked } from "marked";
  import { Input, Button } from '$lib/ui';
  import Dialog from "$lib/ui/components/ui/Dialog.svelte";
  import Select from "$lib/ui/components/ui/Select.svelte";
  import { toast } from "$lib/ui/components/ui/toast";
  import { MessageSquare, ImageIcon, Images, Pin, Plus, ChevronUp, ChevronDown, Pencil, X, Trash2 } from "lucide-svelte";

  /**
   * @typedef {Object} GutterItem
   * @property {string} type
   * @property {string} [anchor]
   * @property {string} [content]
   * @property {string} [url]
   * @property {string} [file]
   * @property {string} [caption]
   * @property {GalleryImage[]} [images]
   */

  /**
   * @typedef {Object} GalleryImage
   * @property {string} url
   * @property {string} [alt]
   * @property {string} [caption]
   */

  /**
   * @typedef {Object} CdnImage
   * @property {string} key
   * @property {string} url
   */

  // Props
  let {
    gutterItems = $bindable(/** @type {GutterItem[]} */ ([])),
    onInsertAnchor = /** @type {(anchorName: string) => void} */ ((anchorName) => {}),
    availableAnchors = /** @type {string[]} */ ([]),
  } = $props();

  // State
  let showAddModal = $state(false);
  /** @type {number | null} */
  let editingIndex = $state(null);
  let showImagePicker = $state(false);
  /** @type {((url: string) => void) | null} */
  let imagePickerCallback = $state(null);

  // Form state for add/edit
  let itemType = $state("comment");
  let itemAnchor = $state("");
  let itemContent = $state("");
  let itemCaption = $state("");
  let itemUrl = $state("");
  /** @type {GalleryImage[]} */
  let galleryImages = $state([]);

  // Image picker state
  /** @type {CdnImage[]} */
  let cdnImages = $state([]);
  let cdnLoading = $state(false);
  let cdnFilter = $state("");

  function resetForm() {
    itemType = "comment";
    itemAnchor = "";
    itemContent = "";
    itemCaption = "";
    itemUrl = "";
    galleryImages = [];
  }

  function openAddModal() {
    resetForm();
    editingIndex = null;
    showAddModal = true;
  }

  /** @param {number} index */
  function openEditModal(index) {
    const item = gutterItems[index];
    itemType = item.type;
    itemAnchor = item.anchor || "";
    itemContent = item.content || "";
    itemCaption = item.caption || "";
    itemUrl = item.url || item.file || "";
    galleryImages = item.images ? [...item.images] : [];
    editingIndex = index;
    showAddModal = true;
  }

  function closeModal() {
    showAddModal = false;
    editingIndex = null;
    resetForm();
  }

  function saveItem() {
    /** @type {GutterItem} */
    const newItem = {
      type: itemType,
      anchor: itemAnchor,
    };

    if (itemType === "comment") {
      newItem.content = itemContent;
    } else if (itemType === "photo") {
      newItem.url = itemUrl;
      if (itemCaption) newItem.caption = itemCaption;
    } else if (itemType === "gallery") {
      newItem.images = galleryImages;
    }

    if (editingIndex !== null) {
      gutterItems[editingIndex] = newItem;
      gutterItems = [...gutterItems]; // Trigger reactivity
    } else {
      gutterItems = [...gutterItems, newItem];
    }

    closeModal();
  }

  /** @param {number} index */
  function deleteItem(index) {
    gutterItems = gutterItems.filter((/** @type {GutterItem} */ _, /** @type {number} */ i) => i !== index);
    toast.success("Vine removed");
  }

  /**
   * @param {number} index
   * @param {number} direction
   */
  function moveItem(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= gutterItems.length) return;

    const items = [...gutterItems];
    const temp = items[index];
    items[index] = items[newIndex];
    items[newIndex] = temp;
    gutterItems = items;
  }

  // Generate anchor name from text
  /** @param {string} text */
  function generateAnchorName(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 30);
  }

  // Insert anchor at cursor in editor
  function handleInsertAnchor() {
    const name = prompt("Enter anchor name (e.g., my-note):");
    if (name) {
      const safeName = generateAnchorName(name);
      onInsertAnchor(safeName);
      // Update the anchor field
      itemAnchor = `anchor:${safeName}`;
    }
  }

  // CDN Image Picker
  async function loadCdnImages() {
    cdnLoading = true;
    try {
      const params = new URLSearchParams();
      if (cdnFilter) params.set("prefix", cdnFilter);
      params.set("limit", "50");

      const response = await fetch(`/api/images/list?${params}`);
      const data = await response.json();

      if (response.ok) {
        const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
        cdnImages = data.images.filter((/** @type {CdnImage} */ img) => {
          const key = img.key.toLowerCase();
          return imageExtensions.some((ext) => key.endsWith(ext));
        });
      }
    } catch (err) {
      toast.error('Failed to load CDN images');
      console.error("Failed to load CDN images:", err);
      cdnImages = [];
    } finally {
      cdnLoading = false;
    }
  }

  /** @param {(url: string) => void} callback */
  function openImagePicker(callback) {
    imagePickerCallback = callback;
    showImagePicker = true;
    loadCdnImages();
  }

  /** @param {CdnImage} image */
  function selectImage(image) {
    if (imagePickerCallback) {
      imagePickerCallback(image.url);
    }
    showImagePicker = false;
    imagePickerCallback = null;
  }

  function closeImagePicker() {
    showImagePicker = false;
    imagePickerCallback = null;
  }

  // Gallery helpers
  function addGalleryImage() {
    openImagePicker((url) => {
      galleryImages = [
        ...galleryImages,
        { url, alt: "", caption: "" },
      ];
    });
  }

  /** @param {number} index */
  function removeGalleryImage(index) {
    galleryImages = galleryImages.filter((/** @type {GalleryImage} */ _, /** @type {number} */ i) => i !== index);
  }

  /**
   * @param {number} index
   * @param {keyof GalleryImage} field
   * @param {string} value
   */
  function updateGalleryImage(index, field, value) {
    galleryImages[index][field] = value;
    galleryImages = [...galleryImages];
  }

  // Get preview of item content
  /** @param {GutterItem} item */
  function getItemPreview(item) {
    if (item.type === "comment" && item.content) {
      return item.content.substring(0, 50) + (item.content.length > 50 ? "..." : "");
    }
    if (item.type === "photo") {
      return item.caption || item.url || "Photo";
    }
    if (item.type === "gallery") {
      return `${item.images?.length || 0} images`;
    }
    return "";
  }

</script>

<div class="vines-manager">
  <div class="vines-header">
    <h3>Vines</h3>
    <button class="add-btn" onclick={openAddModal}>
      <Plus class="btn-icon" />
      <span>Add Item</span>
    </button>
  </div>

  {#if gutterItems.length === 0}
    <div class="empty-state">
      <p>No vines yet.</p>
      <p class="hint">Add comments, images, or galleries that appear alongside your content.</p>
    </div>
  {:else}
    <div class="vines-list">
      {#each gutterItems as item, index (index)}
        <div class="vine-item">
          <div class="item-header">
            <span class="item-type">
              {#if item.type === "comment"}
                <MessageSquare class="type-icon" />
              {:else if item.type === "photo"}
                <ImageIcon class="type-icon" />
              {:else if item.type === "gallery"}
                <Images class="type-icon" />
              {:else}
                <Pin class="type-icon" />
              {/if}
            </span>
            <span class="item-anchor" title={item.anchor}>{item.anchor || "No anchor"}</span>
            <div class="item-actions">
              <button
                class="action-btn"
                onclick={() => moveItem(index, -1)}
                disabled={index === 0}
                title="Move up"
              >
                <ChevronUp class="action-icon" />
              </button>
              <button
                class="action-btn"
                onclick={() => moveItem(index, 1)}
                disabled={index === gutterItems.length - 1}
                title="Move down"
              >
                <ChevronDown class="action-icon" />
              </button>
              <button
                class="action-btn"
                onclick={() => openEditModal(index)}
                title="Edit"
              >
                <Pencil class="action-icon" />
              </button>
              <button
                class="action-btn delete"
                onclick={() => deleteItem(index)}
                title="Delete"
              >
                <X class="action-icon" />
              </button>
            </div>
          </div>
          <div class="item-preview">{getItemPreview(item)}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Add/Edit Modal -->
<Dialog bind:open={showAddModal} title={editingIndex !== null ? "Edit Vine" : "Add Vine"}>
  {#snippet children()}
    <div class="form-group">
      <label for="item-type">Type</label>
      <Select
        bind:value={itemType}
        options={[
          { value: "comment", label: "Comment (Markdown)" },
          { value: "photo", label: "Photo" },
          { value: "gallery", label: "Image Gallery" }
        ]}
      />
    </div>

  <div class="form-group">
    <label for="item-anchor">Anchor</label>
    <div class="anchor-input-row">
      <Input
        type="text"
        id="item-anchor"
        bind:value={itemAnchor}
        placeholder="## Heading or anchor:name"
      />
      <Button
        variant="outline"
        onclick={handleInsertAnchor}
        title="Insert new anchor in editor"
      >
        + Anchor
      </Button>
    </div>
    <span class="form-hint">
      Use <code>## Heading</code>, <code>paragraph:N</code>, or <code>anchor:name</code>
    </span>
  </div>

  {#if availableAnchors.length > 0}
    <div class="available-anchors">
      <span class="anchors-label">Available:</span>
      {#each availableAnchors as anchor}
        <button
          type="button"
          class="anchor-chip"
          onclick={() => (itemAnchor = anchor)}
        >
          {anchor}
        </button>
      {/each}
    </div>
  {/if}

      {#if itemType === "comment"}
        <div class="form-group">
          <label for="item-content">Content (Markdown)</label>
          <textarea
            id="item-content"
            bind:value={itemContent}
            placeholder="Write your note in markdown..."
            rows="6"
            class="form-input form-textarea"
          ></textarea>
        </div>
      {/if}

  {#if itemType === "photo"}
    <div class="form-group">
      <label for="item-url">Image URL</label>
      <div class="url-input-row">
        <Input
          type="text"
          id="item-url"
          bind:value={itemUrl}
          placeholder="https://cdn.autumnsgrove.com/..."
        />
        <Button
          variant="outline"
          onclick={() => openImagePicker((url) => (itemUrl = url))}
        >
          Browse CDN
        </Button>
      </div>
    </div>

    <div class="form-group">
      <label for="item-caption">Caption (optional)</label>
      <Input
        type="text"
        id="item-caption"
        bind:value={itemCaption}
        placeholder="Photo caption"
      />
    </div>

    {#if itemUrl}
      <div class="image-preview">
        <img src={itemUrl} alt="Preview" />
      </div>
    {/if}
  {/if}

  {#if itemType === "gallery"}
    <div class="form-group">
      <div class="gallery-label">Gallery Images</div>
      <div class="gallery-list">
        {#each galleryImages as image, i (i)}
          <div class="gallery-image-item">
            <img src={image.url} alt={image.alt || "Gallery image"} class="gallery-thumb" />
            <div class="gallery-image-fields">
              <Input
                type="text"
                value={image.alt}
                oninput={(/** @type {Event} */ e) => updateGalleryImage(i, "alt", /** @type {HTMLInputElement} */ (e.target).value)}
                placeholder="Alt text"
                class="small"
              />
              <Input
                type="text"
                value={image.caption}
                oninput={(/** @type {Event} */ e) => updateGalleryImage(i, "caption", /** @type {HTMLInputElement} */ (e.target).value)}
                placeholder="Caption"
                class="small"
              />
            </div>
            <button
              type="button"
              class="remove-btn"
              onclick={() => removeGalleryImage(i)}
            >×</button>
          </div>
        {/each}
      </div>
      <button type="button" class="add-image-btn" onclick={addGalleryImage}>
        + Add Image
      </button>
    </div>
  {/if}
  {/snippet}

  {#snippet footer()}
    <Button variant="outline" onclick={closeModal}>Cancel</Button>
    <Button onclick={saveItem}>
      {editingIndex !== null ? "Update" : "Add"} Item
    </Button>
  {/snippet}
</Dialog>

<!-- Image Picker Modal -->
<Dialog bind:open={showImagePicker} title="Select Image from CDN">
  {#snippet children()}
    <div class="picker-controls">
    <Input
      type="text"
      bind:value={cdnFilter}
      placeholder="Filter by folder (e.g., blog/)"
    />
    <Button onclick={loadCdnImages} disabled={cdnLoading}>
      {cdnLoading ? "Loading..." : "Filter"}
    </Button>
  </div>

      <div class="image-grid">
        {#if cdnLoading}
          <div class="loading">Loading images...</div>
        {:else if cdnImages.length === 0}
          <div class="no-images">No images found</div>
        {:else}
          {#each cdnImages as image (image.key)}
            <button
              class="image-option"
              onclick={() => selectImage(image)}
            >
              <img src={image.url} alt={image.key} />
              <span class="image-name">{image.key.split("/").pop()}</span>
            </button>
          {/each}
        {/if}
      </div>
  {/snippet}

  {#snippet footer()}
    <Button variant="outline" onclick={closeImagePicker}>Cancel</Button>
  {/snippet}
</Dialog>

<style>
  .vines-manager {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(34, 197, 94, 0.15);
    border-radius: 12px;
    overflow: hidden;
  }

  :global(.dark) .vines-manager {
    background: rgba(20, 30, 25, 0.92);
    border-color: rgba(74, 124, 89, 0.25);
  }

  .vines-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.875rem 1rem;
    background: rgba(34, 197, 94, 0.05);
    border-bottom: 1px solid rgba(34, 197, 94, 0.1);
  }

  :global(.dark) .vines-header {
    background: rgba(74, 222, 128, 0.08);
    border-color: rgba(74, 124, 89, 0.2);
  }

  .vines-header h3 {
    margin: 0;
    font-size: 0.95rem;
    color: var(--color-primary);
    font-weight: 600;
  }

  :global(.dark) .vines-header h3 {
    color: #86efac;
  }

  .add-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.75rem;
    background: rgba(34, 197, 94, 0.1);
    color: var(--color-primary);
    border: 1px solid rgba(34, 197, 94, 0.2);
    border-radius: var(--border-radius-button);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  :global(.dark) .add-btn {
    background: rgba(74, 222, 128, 0.12);
    border-color: rgba(74, 222, 128, 0.2);
    color: #86efac;
  }

  .add-btn:hover {
    background: rgba(34, 197, 94, 0.18);
    border-color: rgba(34, 197, 94, 0.35);
  }

  :global(.dark) .add-btn:hover {
    background: rgba(74, 222, 128, 0.2);
    border-color: rgba(74, 222, 128, 0.35);
  }

  :global(.btn-icon) {
    width: 0.875rem;
    height: 0.875rem;
  }

  .empty-state {
    padding: 2rem 1rem;
    text-align: center;
    color: var(--color-text-muted);
  }

  :global(.dark) .empty-state {
    color: rgba(167, 199, 183, 0.7);
  }

  .empty-state p {
    margin: 0.5rem 0;
  }

  .empty-state .hint {
    font-size: 0.85rem;
    color: var(--color-text-subtle);
  }

  :global(.dark) .empty-state .hint {
    color: rgba(167, 199, 183, 0.5);
  }

  .vines-list {
    padding: 0.5rem;
  }

  .vine-item {
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(34, 197, 94, 0.1);
    border-radius: 8px;
    padding: 0.625rem 0.875rem;
    margin-bottom: 0.5rem;
    transition: border-color 0.15s ease;
  }

  :global(.dark) .vine-item {
    background: rgba(30, 45, 35, 0.6);
    border-color: rgba(74, 124, 89, 0.2);
  }

  .vine-item:hover {
    border-color: rgba(34, 197, 94, 0.25);
  }

  :global(.dark) .vine-item:hover {
    border-color: rgba(74, 222, 128, 0.3);
  }

  .item-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .item-type {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary);
  }

  :global(.dark) .item-type {
    color: #86efac;
  }

  :global(.type-icon) {
    width: 1rem;
    height: 1rem;
  }

  .item-anchor {
    flex: 1;
    font-family: monospace;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.dark) .item-anchor {
    color: rgba(167, 199, 183, 0.8);
  }

  .item-actions {
    display: flex;
    gap: 0.125rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    background: transparent;
    border: 1px solid transparent;
    color: var(--color-text-subtle);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  :global(.dark) .action-btn {
    color: rgba(167, 199, 183, 0.5);
  }

  :global(.action-icon) {
    width: 0.875rem;
    height: 0.875rem;
  }

  .action-btn:hover:not(:disabled) {
    background: rgba(34, 197, 94, 0.1);
    color: var(--color-primary);
  }

  :global(.dark) .action-btn:hover:not(:disabled) {
    background: rgba(74, 222, 128, 0.15);
    color: #86efac;
  }

  .action-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .action-btn.delete:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  :global(.dark) .action-btn.delete:hover {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
  }

  .item-preview {
    margin-top: 0.35rem;
    font-size: 0.8rem;
    color: var(--color-text-subtle);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.dark) .item-preview {
    color: rgba(167, 199, 183, 0.5);
  }

  /* Form Styles */
  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label,
  .gallery-label {
    display: block;
    margin-bottom: 0.4rem;
    font-size: 0.85rem;
    color: #9d9d9d;
  }

  .form-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: #252526;
    border: 1px solid #3a3a3a;
    border-radius: 4px;
    color: #d4d4d4;
    font-size: 0.9rem;
    font-family: inherit;
  }

  .form-input:focus {
    outline: none;
    border-color: #4a7c4a;
  }

  .form-textarea {
    resize: vertical;
    min-height: 100px;
    font-family: "JetBrains Mono", "Fira Code", monospace;
  }

  .form-hint {
    display: block;
    margin-top: 0.35rem;
    font-size: 0.75rem;
    color: #6a6a6a;
  }

  .form-hint code {
    background: #252526;
    padding: 0.1rem 0.3rem;
    border-radius: 2px;
    color: #ce9178;
  }

  .anchor-input-row,
  .url-input-row {
    display: flex;
    gap: 0.5rem;
  }

  .anchor-input-row .form-input,
  .url-input-row .form-input {
    flex: 1;
  }

  .available-anchors {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
    margin-bottom: 1rem;
  }

  .anchors-label {
    font-size: 0.75rem;
    color: #6a6a6a;
  }

  .anchor-chip {
    padding: 0.2rem 0.5rem;
    background: #252526;
    border: 1px solid #3a3a3a;
    border-radius: 12px;
    color: #9d9d9d;
    font-size: 0.7rem;
    font-family: monospace;
    cursor: pointer;
  }

  .anchor-chip:hover {
    background: #3a3a3a;
    color: #d4d4d4;
  }

  .image-preview {
    margin-top: 0.5rem;
    max-height: 150px;
    overflow: hidden;
    border-radius: 4px;
    background: #252526;
  }

  .image-preview img {
    width: 100%;
    height: auto;
    object-fit: contain;
  }

  .gallery-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .gallery-image-item {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    background: #252526;
    padding: 0.5rem;
    border-radius: 4px;
    border: 1px solid #3a3a3a;
  }

  .gallery-thumb {
    width: 50px;
    height: 50px;
    object-fit: cover;
    border-radius: 3px;
  }

  .gallery-image-fields {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .remove-btn {
    padding: 0.25rem 0.5rem;
    background: transparent;
    border: none;
    color: #f85149;
    font-size: 1.2rem;
    cursor: pointer;
  }

  .add-image-btn {
    padding: 0.5rem;
    background: transparent;
    border: 1px dashed #3a3a3a;
    border-radius: 4px;
    color: #6a6a6a;
    cursor: pointer;
    font-size: 0.85rem;
    width: 100%;
  }

  .add-image-btn:hover {
    border-color: #4a7c4a;
    color: #8bc48b;
  }

  /* Image Picker */
  .picker-controls {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .picker-controls .form-input {
    flex: 1;
  }

  .image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 0.5rem;
    max-height: 400px;
    overflow-y: auto;
    padding: 0.5rem;
    background: #252526;
    border-radius: 4px;
  }

  .loading,
  .no-images {
    grid-column: 1 / -1;
    text-align: center;
    padding: 2rem;
    color: #6a6a6a;
  }

  .image-option {
    display: flex;
    flex-direction: column;
    background: #1e1e1e;
    border: 2px solid transparent;
    border-radius: 4px;
    padding: 0.25rem;
    cursor: pointer;
    transition: border-color 0.15s ease;
  }

  .image-option:hover {
    border-color: #4a7c4a;
  }

  .image-option img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 2px;
  }

  .image-name {
    font-size: 0.65rem;
    color: #6a6a6a;
    margin-top: 0.25rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
