<!--
  NoteEditorBubbleMenu — Floating formatting toolbar.

  Appears on text selection inside the NoteEditor.
  Glass-styled pill with Bold, Italic, Underline, H2 toggle.
-->
<script lang="ts">
  import type { Editor } from "@tiptap/core";

  interface Props {
    editor: Editor;
  }

  const { editor }: Props = $props();

  function toggle(command: string) {
    switch (command) {
      case "bold":
        editor.chain().focus().toggleBold().run();
        break;
      case "italic":
        editor.chain().focus().toggleItalic().run();
        break;
      case "underline":
        editor.chain().focus().toggleUnderline().run();
        break;
      case "heading":
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
    }
  }

  const buttons = [
    { command: "bold", label: "Bold", icon: "B", checkActive: () => editor.isActive("bold") },
    { command: "italic", label: "Italic", icon: "I", checkActive: () => editor.isActive("italic") },
    { command: "underline", label: "Underline", icon: "U", checkActive: () => editor.isActive("underline") },
    { command: "heading", label: "Heading", icon: "H2", checkActive: () => editor.isActive("heading", { level: 2 }) },
  ] as const;
</script>

<div
  class="flex items-center gap-0.5 rounded-lg border border-white/30 bg-white/80 px-1 py-0.5 shadow-lg backdrop-blur-md dark:border-cream-100/20 dark:bg-cream-100/70"
>
  {#each buttons as btn}
    <button
      type="button"
      class="rounded px-2 py-1 text-xs font-medium transition-colors {btn.checkActive()
        ? 'bg-grove-100 text-grove-700 dark:bg-cream-100/40 dark:text-cream-900'
        : 'text-foreground-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10'}"
      aria-label={btn.label}
      aria-pressed={btn.checkActive()}
      onmousedown={(e) => {
        e.preventDefault();
        toggle(btn.command);
      }}
    >
      {#if btn.command === "italic"}
        <span class="italic">{btn.icon}</span>
      {:else if btn.command === "underline"}
        <span class="underline">{btn.icon}</span>
      {:else}
        {btn.icon}
      {/if}
    </button>
  {/each}
</div>
