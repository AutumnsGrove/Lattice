<!--
  Grove — A place to Be
  Copyright (c) 2025 Autumn Brown

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published
  by the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program. If not, see <https://www.gnu.org/licenses/>.
-->

<script lang="ts">
  import {
    Play,
    Pause,
    Grid3X3,
    Trash2,
    Copy,
    Download,
    Save,
    ZoomIn,
    ZoomOut,
    FlipHorizontal,
    FlipVertical,
    Palette,
    X,
  } from "lucide-svelte";
  import { cn } from "$lib/ui/utils";
  import { CANVAS_BACKGROUNDS } from "./types";

  /**
   * Terrarium Toolbar
   *
   * Top toolbar for Terrarium canvas actions and settings.
   * Features scene naming, animation/grid controls, and action buttons.
   */

  interface Props {
    sceneName: string;
    animationsEnabled: boolean;
    gridEnabled: boolean;
    gridSize: 16 | 32 | 64;
    hasSelection: boolean;
    zoom: number;
    background: string;
    onToggleAnimations: () => void;
    onToggleGrid: () => void;
    onSetGridSize: (size: 16 | 32 | 64) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onExport: () => void;
    onSave: () => void;
    onRename: (name: string) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetZoom: () => void;
    onSetBackground: (background: string) => void;
    onFlipX: () => void;
    onFlipY: () => void;
  }

  let {
    sceneName = $bindable(),
    animationsEnabled,
    gridEnabled,
    gridSize,
    hasSelection,
    zoom,
    background,
    onToggleAnimations,
    onToggleGrid,
    onSetGridSize,
    onDelete,
    onDuplicate,
    onExport,
    onSave,
    onRename,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onSetBackground,
    onFlipX,
    onFlipY,
  }: Props = $props();

  let isEditingName = $state(false);
  let nameInput: HTMLInputElement | null = $state(null);
  let editedName = $state(sceneName);
  let showBackgroundPicker = $state(false);
  let customColor = $state("#87CEEB");

  // Grid size options
  const gridSizes: Array<16 | 32 | 64> = [16, 32, 64];

  // Format zoom percentage
  const zoomPercent = $derived(Math.round(zoom * 100));

  // Start editing scene name
  function startEditingName() {
    isEditingName = true;
    editedName = sceneName;
    setTimeout(() => {
      nameInput?.focus();
      nameInput?.select();
    }, 0);
  }

  // Finish editing scene name
  function finishEditingName() {
    if (isEditingName) {
      const trimmed = editedName.trim();
      if (trimmed && trimmed !== sceneName) {
        onRename(trimmed);
      } else {
        editedName = sceneName;
      }
      isEditingName = false;
    }
  }

  // Handle name input keydown
  function handleNameKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      finishEditingName();
    } else if (e.key === "Escape") {
      e.preventDefault();
      editedName = sceneName;
      isEditingName = false;
    }
  }

  // Glass button styles
  const buttonClass = cn(
    "inline-flex items-center justify-center gap-2",
    "h-9 px-3 rounded-lg",
    "bg-white/80 dark:bg-grove-950/25",
    "border border-white/40 dark:border-grove-800/25",
    "text-foreground text-sm font-medium",
    "hover:bg-white/75 dark:hover:bg-grove-950/35",
    "hover:border-white/50 dark:hover:border-grove-700/30",
    "transition-all duration-200",
    "backdrop-blur-md shadow-sm hover:shadow-md",
    "disabled:opacity-50 disabled:pointer-events-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
    "[&_svg]:w-4 [&_svg]:h-4 [&_svg]:flex-shrink-0",
  );

  const iconButtonClass = cn(
    "inline-flex items-center justify-center",
    "h-9 w-9 rounded-lg",
    "bg-white/80 dark:bg-grove-950/25",
    "border border-white/40 dark:border-grove-800/25",
    "text-foreground",
    "hover:bg-white/75 dark:hover:bg-grove-950/35",
    "hover:border-white/50 dark:hover:border-grove-700/30",
    "transition-all duration-200",
    "backdrop-blur-md shadow-sm hover:shadow-md",
    "disabled:opacity-50 disabled:pointer-events-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
    "[&_svg]:w-4 [&_svg]:h-4",
  );

  const activeButtonClass = cn(
    iconButtonClass,
    "bg-accent/70 dark:bg-accent/60",
    "border-accent/40 dark:border-accent/30",
    "text-white",
    "hover:bg-accent/85 dark:hover:bg-accent/75",
    "hover:border-accent/60 dark:hover:border-accent/50",
  );
</script>

<nav
  class={cn(
    "flex flex-col",
    "bg-white/80 dark:bg-grove-950/25",
    "border-b border-white/40 dark:border-grove-800/25",
    "backdrop-blur-md shadow-sm",
  )}
>
  <!-- Row 1: Scene Name -->
  <div
    class="flex items-center px-4 py-2 border-b border-white/30 dark:border-grove-800/20"
  >
    {#if isEditingName}
      <input
        bind:this={nameInput}
        bind:value={editedName}
        onblur={finishEditingName}
        onkeydown={handleNameKeydown}
        class={cn(
          "px-3 py-1.5 rounded-lg text-xl font-semibold",
          "bg-white/80 dark:bg-grove-950/40",
          "border border-accent/40 dark:border-accent/30",
          "focus:outline-none focus:ring-2 focus:ring-accent/50",
          "min-w-[300px] max-w-[600px]",
        )}
        maxlength="100"
      />
    {:else}
      <button
        onclick={startEditingName}
        class={cn(
          "px-3 py-1.5 rounded-lg text-xl font-semibold truncate",
          "hover:bg-white/60 dark:hover:bg-grove-950/20",
          "transition-colors duration-200",
          "text-left max-w-[600px]",
        )}
        title="Click to rename scene"
      >
        {sceneName}
      </button>
    {/if}
  </div>

  <!-- Row 2: Controls -->
  <div class="flex items-center gap-3 px-4 py-2">
    <!-- Controls Section -->
    <div class="flex items-center gap-2">
      <!-- Animation Toggle -->
      <button
        onclick={onToggleAnimations}
        class={animationsEnabled ? activeButtonClass : iconButtonClass}
        title={animationsEnabled
          ? "Pause animations (Space)"
          : "Play animations (Space)"}
        aria-label={animationsEnabled ? "Pause animations" : "Play animations"}
      >
        {#if animationsEnabled}
          <Pause />
        {:else}
          <Play />
        {/if}
      </button>

      <!-- Grid Toggle -->
      <button
        onclick={onToggleGrid}
        class={gridEnabled ? activeButtonClass : iconButtonClass}
        title={gridEnabled ? "Hide grid (G)" : "Show grid (G)"}
        aria-label={gridEnabled ? "Hide grid" : "Show grid"}
      >
        <Grid3X3 />
      </button>

      <!-- Grid Size Dropdown -->
      {#if gridEnabled}
        <select
          value={gridSize}
          onchange={(e) =>
            onSetGridSize(Number(e.currentTarget.value) as 16 | 32 | 64)}
          class={cn(
            "h-9 px-3 rounded-lg",
            "bg-white/80 dark:bg-grove-950/25",
            "border border-white/40 dark:border-grove-800/25",
            "text-foreground text-sm font-medium",
            "hover:bg-white/75 dark:hover:bg-grove-950/35",
            "transition-all duration-200",
            "backdrop-blur-md shadow-sm",
            "focus:outline-none focus:ring-2 focus:ring-accent/50",
            "cursor-pointer",
          )}
          title="Grid size"
          aria-label="Select grid size"
        >
          {#each gridSizes as size}
            <option value={size}>{size}px</option>
          {/each}
        </select>
      {/if}
    </div>

    <!-- Divider -->
    <div class="w-px h-6 bg-white/60 dark:bg-grove-800/25"></div>

    <!-- Zoom Controls -->
    <div class="flex items-center gap-1">
      <button
        onclick={onZoomOut}
        class={iconButtonClass}
        title="Zoom out"
        aria-label="Zoom out"
      >
        <ZoomOut />
      </button>

      <button
        onclick={onResetZoom}
        class={cn(
          "h-9 px-2 rounded-lg min-w-[60px]",
          "bg-white/80 dark:bg-grove-950/25",
          "border border-white/40 dark:border-grove-800/25",
          "text-foreground text-sm font-medium",
          "hover:bg-white/75 dark:hover:bg-grove-950/35",
          "transition-all duration-200",
          "backdrop-blur-md shadow-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        )}
        title="Reset zoom (click to reset to 100%)"
        aria-label="Zoom level {zoomPercent}%, click to reset"
      >
        {zoomPercent}%
      </button>

      <button
        onclick={onZoomIn}
        class={iconButtonClass}
        title="Zoom in"
        aria-label="Zoom in"
      >
        <ZoomIn />
      </button>
    </div>

    <!-- Divider -->
    <div class="w-px h-6 bg-white/60 dark:bg-grove-800/25"></div>

    <!-- Background Picker -->
    <div class="relative" data-background-picker>
      <button
        onclick={() => (showBackgroundPicker = !showBackgroundPicker)}
        class={cn(iconButtonClass, "relative overflow-hidden")}
        title="Canvas background"
        aria-label="Choose canvas background"
        aria-expanded={showBackgroundPicker}
      >
        <div
          class="absolute inset-1 rounded"
          style="background: {background};"
        ></div>
        <Palette class="relative z-10 drop-shadow-sm" />
      </button>

      {#if showBackgroundPicker}
        <!-- Background picker popover -->
        <div
          class={cn(
            "absolute top-full left-0 mt-2 p-3 rounded-lg z-50",
            "bg-white/90 dark:bg-grove-950/90",
            "border border-white/40 dark:border-grove-800/40",
            "backdrop-blur-xl shadow-xl",
            "min-w-[220px]",
          )}
        >
          <!-- Header with close button -->
          <div class="flex items-center justify-between mb-3">
            <span
              class="text-sm font-semibold text-bark-700 dark:text-cream-200"
            >
              Background
            </span>
            <button
              onclick={() => (showBackgroundPicker = false)}
              class={cn(
                "w-6 h-6 flex items-center justify-center rounded",
                "text-bark-500 dark:text-bark-400",
                "hover:bg-cream-200/50 dark:hover:bg-bark-700/50",
                "transition-colors duration-150",
              )}
              title="Close"
              aria-label="Close background picker"
            >
              <X class="w-4 h-4" />
            </button>
          </div>

          <div
            class="text-xs font-medium text-bark-600 dark:text-bark-400 mb-2"
          >
            Presets
          </div>
          <div class="grid grid-cols-4 gap-2 mb-3">
            {#each CANVAS_BACKGROUNDS as bg}
              <button
                onclick={() => {
                  onSetBackground(bg.value);
                  showBackgroundPicker = false;
                }}
                class={cn(
                  "w-10 h-10 rounded-lg border-2 transition-all",
                  background === bg.value
                    ? "border-accent ring-2 ring-accent/30"
                    : "border-white/40 dark:border-grove-800/40 hover:border-accent/50",
                )}
                style="background: {bg.value};"
                title={bg.name}
                aria-label={bg.name}
              ></button>
            {/each}
          </div>

          <div
            class="text-xs font-medium text-bark-600 dark:text-bark-400 mb-2"
          >
            Custom Color
          </div>
          <div class="flex items-center gap-2">
            <input
              type="color"
              bind:value={customColor}
              class="w-10 h-10 rounded-lg border border-white/40 dark:border-grove-800/40 cursor-pointer"
              title="Pick custom color"
            />
            <button
              onclick={() => {
                onSetBackground(customColor);
                showBackgroundPicker = false;
              }}
              class={cn(
                "flex-1 h-9 px-3 rounded-lg text-sm font-medium",
                "bg-accent/70 text-white",
                "hover:bg-accent/85",
                "transition-all duration-200",
              )}
            >
              Apply
            </button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Divider -->
    <div class="w-px h-6 bg-white/60 dark:bg-grove-800/25"></div>

    <!-- Flip Buttons -->
    <div class="flex items-center gap-1">
      <button
        onclick={onFlipX}
        disabled={!hasSelection}
        class={iconButtonClass}
        title="Flip horizontal"
        aria-label="Flip selected asset horizontally"
      >
        <FlipHorizontal />
      </button>

      <button
        onclick={onFlipY}
        disabled={!hasSelection}
        class={iconButtonClass}
        title="Flip vertical"
        aria-label="Flip selected asset vertically"
      >
        <FlipVertical />
      </button>
    </div>

    <!-- Divider -->
    <div class="w-px h-6 bg-white/60 dark:bg-grove-800/25"></div>

    <!-- Action Buttons Section -->
    <div class="flex items-center gap-2">
      <!-- Delete -->
      <button
        onclick={onDelete}
        disabled={!hasSelection}
        class={iconButtonClass}
        title="Delete selected (⌫)"
        aria-label="Delete selected asset"
      >
        <Trash2 />
      </button>

      <!-- Duplicate -->
      <button
        onclick={onDuplicate}
        disabled={!hasSelection}
        class={iconButtonClass}
        title="Duplicate selected (⌘D)"
        aria-label="Duplicate selected asset"
      >
        <Copy />
      </button>

      <!-- Export PNG -->
      <button
        onclick={onExport}
        class={buttonClass}
        title="Export as PNG (⌘E)"
        aria-label="Export scene as PNG"
      >
        <Download />
        <span>Export PNG</span>
      </button>
    </div>

    <!-- Divider -->
    <div class="w-px h-6 bg-white/60 dark:bg-grove-800/25"></div>

    <!-- Save Button -->
    <button
      onclick={onSave}
      class={cn(
        buttonClass,
        "bg-accent dark:bg-accent/80",
        "border-accent/60 dark:border-accent/40",
        "text-white [&_svg]:text-white",
        "hover:bg-accent/90 dark:hover:bg-accent/70",
        "hover:border-accent/80 dark:hover:border-accent/60",
      )}
      title="Save scene (⌘S)"
      aria-label="Save scene"
    >
      <Save />
      <span>Save</span>
    </button>
  </div>
</nav>
