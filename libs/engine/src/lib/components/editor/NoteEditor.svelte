<!--
  NoteEditor — Live rich text editor for Meadow Notes.

  A TipTap-based WYSIWYG editor where formatting renders inline:
  **bold** becomes bold, _italic_ becomes italic, # Heading renders immediately.

  SSR-safe: TipTap only initializes on the client (inside onMount).
  On the server, renders an empty placeholder div.

  Props:
  - onupdate:       Called on every edit with (html, text, charCount)
  - onsubmit:       Called on Cmd/Ctrl+Enter
  - placeholder:    Placeholder text
  - maxChars:       Character count limit (text only)
  - disabled:       Disable editing
  - uploadsEnabled: Gate image drag/drop/paste
  - uploadImage:    Async function to upload a file, returns URL

  Exports:
  - clearContent(): Reset editor
  - focus():        Focus the editor
-->
<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Editor } from "@tiptap/core";
  import "./note-editor.css";

  interface Props {
    onupdate?: (html: string, text: string, charCount: number) => void;
    onsubmit?: () => void;
    placeholder?: string;
    maxChars?: number;
    disabled?: boolean;
    uploadsEnabled?: boolean;
    uploadImage?: (file: File) => Promise<string>;
  }

  const {
    onupdate,
    onsubmit,
    placeholder = "What's on your mind?",
    maxChars = 1000,
    disabled = false,
    uploadsEnabled = false,
    uploadImage,
  }: Props = $props();

  let editor: Editor | null = $state(null);
  let element: HTMLDivElement | undefined = $state();
  let uploading = $state(false);

  onMount(async () => {
    // Dynamic imports keep TipTap out of the SSR bundle
    const [
      { Editor },
      { default: StarterKit },
      { default: Underline },
      { default: ImageExt },
      { default: Placeholder },
      { default: CharacterCount },
    ] = await Promise.all([
      import("@tiptap/core"),
      import("@tiptap/starter-kit"),
      import("@tiptap/extension-underline"),
      import("@tiptap/extension-image"),
      import("@tiptap/extension-placeholder"),
      import("@tiptap/extension-character-count"),
    ]);

    if (!element) return;

    editor = new Editor({
      element,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Underline,
        ImageExt.configure({ inline: false }),
        Placeholder.configure({ placeholder }),
        CharacterCount.configure({ limit: maxChars }),
      ],
      editable: !disabled,
      editorProps: {
        attributes: {
          class: "text-base leading-relaxed text-foreground",
        },
        handleKeyDown: (_view, event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onsubmit?.();
            return true;
          }
          return false;
        },
        handleDrop: (_view, event) => {
          if (!uploadsEnabled || !uploadImage) return false;
          const files = event.dataTransfer?.files;
          if (!files?.length) return false;

          const imageFile = Array.from(files).find((f) =>
            f.type.startsWith("image/"),
          );
          if (!imageFile) return false;

          event.preventDefault();
          handleImageUpload(imageFile);
          return true;
        },
        handlePaste: (_view, event) => {
          if (!uploadsEnabled || !uploadImage) return false;
          const items = event.clipboardData?.items;
          if (!items) return false;

          for (const item of items) {
            if (item.type.startsWith("image/")) {
              const file = item.getAsFile();
              if (file) {
                event.preventDefault();
                handleImageUpload(file);
                return true;
              }
            }
          }
          return false;
        },
      },
      onTransaction: () => {
        if (!editor) return;
        const html = editor.getHTML();
        const text = editor.getText();
        const charCount = editor.storage.characterCount?.characters() ?? text.length;
        onupdate?.(html, text, charCount);
      },
    });
  });

  onDestroy(() => {
    editor?.destroy();
    editor = null;
  });

  async function handleImageUpload(file: File) {
    if (!uploadImage || !editor || uploading) return;
    uploading = true;
    try {
      const url = await uploadImage(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      // Upload error is handled by the consumer via toast
    } finally {
      uploading = false;
    }
  }

  /** Clear the editor content and reset */
  export function clearContent() {
    editor?.commands.clearContent(true);
  }

  /** Focus the editor */
  export function focus() {
    editor?.commands.focus();
  }
</script>

<div
  class="note-editor"
  class:opacity-50={disabled}
  class:pointer-events-none={disabled}
>
  <div bind:this={element}></div>
  {#if uploading}
    <div class="mt-1 text-xs text-foreground-muted animate-pulse">
      Uploading image...
    </div>
  {/if}
</div>
