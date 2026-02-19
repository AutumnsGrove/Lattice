<script lang="ts">
  import { enhance } from "$app/forms";
  import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
  import { Music, ArrowLeft, Trash2 } from "lucide-svelte";
  import {
    DISPLAY_STYLE_OPTIONS,
    PROVIDER_OPTIONS,
    formatPlayedAt,
    type NowPlayingStyle,
    type NowPlayingProvider,
  } from "$lib/curios/nowplaying";

  let { data, form } = $props();

  // Config state
  let provider = $state<NowPlayingProvider>("manual");
  let displayStyle = $state<NowPlayingStyle>("compact");
  let showAlbumArt = $state(true);
  let showProgress = $state(false);
  let fallbackText = $state("");
  let lastFmUsername = $state("");
  let isSubmitting = $state(false);

  // Manual track state
  let trackName = $state("");
  let artist = $state("");
  let album = $state("");
  let albumArtUrl = $state("");

  // Sync with loaded data
  $effect(() => {
    if (data.config) {
      provider = (data.config.provider as NowPlayingProvider) ?? "manual";
      displayStyle = (data.config.displayStyle as NowPlayingStyle) ?? "compact";
      showAlbumArt = data.config.showAlbumArt ?? true;
      showProgress = data.config.showProgress ?? false;
      fallbackText = data.config.fallbackText ?? "";
      lastFmUsername = data.config.lastFmUsername ?? "";
    }
  });

  // Show toast on form result
  $effect(() => {
    if (form?.success && form?.trackSet) {
      toast.success("Now playing updated!");
      trackName = "";
      artist = "";
      album = "";
      albumArtUrl = "";
    } else if (form?.success && form?.cleared) {
      toast.success("History cleared!");
    } else if (form?.success) {
      toast.success("Settings saved!");
    } else if (form?.error) {
      toast.error("Failed", { description: form.error });
    }
  });

  const currentTrack = $derived(
    data.history && data.history.length > 0 ? data.history[0] : null,
  );
</script>

<svelte:head>
  <title>Now Playing - Admin</title>
</svelte:head>

<div class="nowplaying-admin">
  <header class="page-header">
    <div class="header-top">
      <GlassButton href="/arbor/curios" variant="ghost" class="back-link">
        <ArrowLeft class="w-4 h-4" />
        Back to Curios
      </GlassButton>
    </div>
    <div class="title-row">
      <Music class="header-icon" />
      <h1>Now Playing</h1>
    </div>
    <p class="subtitle">
      Share what you're listening to — music fills the grove.
    </p>
  </header>

  <!-- Current Track -->
  <GlassCard class="current-card">
    <h3>Currently Playing</h3>
    {#if currentTrack}
      <div class="current-track">
        {#if currentTrack.albumArtUrl}
          <img
            src={currentTrack.albumArtUrl}
            alt=""
            class="album-art"
            width="64"
            height="64"
          />
        {:else}
          <div class="album-art-placeholder">
            <Music class="w-6 h-6" />
          </div>
        {/if}
        <div class="track-info">
          <span class="track-name">{currentTrack.trackName}</span>
          <span class="track-artist">{currentTrack.artist}</span>
          {#if currentTrack.album}
            <span class="track-album">{currentTrack.album}</span>
          {/if}
        </div>
      </div>
    {:else}
      <p class="empty-state">Nothing playing right now.</p>
    {/if}
  </GlassCard>

  <!-- Set Manual Track -->
  <GlassCard class="manual-card">
    <h3>Set a Track</h3>
    <form
      method="POST"
      action="?/setTrack"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ update }) => {
          isSubmitting = false;
          await update();
        };
      }}
    >
      <div class="form-grid">
        <div class="input-group">
          <label class="input-label" for="trackName">Song</label>
          <input
            id="trackName"
            type="text"
            name="trackName"
            bind:value={trackName}
            placeholder="Midnight City"
            maxlength="200"
            class="text-input"
            required
          />
        </div>
        <div class="input-group">
          <label class="input-label" for="artist">Artist</label>
          <input
            id="artist"
            type="text"
            name="artist"
            bind:value={artist}
            placeholder="M83"
            maxlength="200"
            class="text-input"
            required
          />
        </div>
        <div class="input-group">
          <label class="input-label" for="album">Album <span class="optional">(optional)</span></label>
          <input
            id="album"
            type="text"
            name="album"
            bind:value={album}
            placeholder="Hurry Up, We're Dreaming"
            maxlength="200"
            class="text-input"
          />
        </div>
        <div class="input-group">
          <label class="input-label" for="albumArtUrl">Album Art URL <span class="optional">(optional)</span></label>
          <input
            id="albumArtUrl"
            type="url"
            name="albumArtUrl"
            bind:value={albumArtUrl}
            placeholder="https://..."
            class="text-input"
          />
        </div>
      </div>
      <div class="form-actions">
        <GlassButton
          type="submit"
          variant="accent"
          disabled={isSubmitting || !trackName.trim() || !artist.trim()}
        >
          {isSubmitting ? "Setting..." : "Set Track"}
        </GlassButton>
      </div>
    </form>
  </GlassCard>

  <!-- Settings -->
  <GlassCard class="settings-card">
    <h3>Display Settings</h3>
    <form
      method="POST"
      action="?/saveConfig"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ update }) => {
          isSubmitting = false;
          await update();
        };
      }}
    >
      <!-- Provider -->
      <div class="form-section">
        <h4>Provider</h4>
        <div class="style-grid">
          {#each PROVIDER_OPTIONS as option}
            <label
              class="style-option"
              class:selected={provider === option.value}
            >
              <input
                type="radio"
                name="provider"
                value={option.value}
                bind:group={provider}
              />
              <span class="style-name">{option.label}</span>
              <span class="style-desc">{option.description}</span>
            </label>
          {/each}
        </div>
      </div>

      {#if provider === "lastfm"}
        <div class="form-section">
          <div class="input-group">
            <label class="input-label" for="lastFmUsername">Last.fm Username</label>
            <input
              id="lastFmUsername"
              type="text"
              name="lastFmUsername"
              bind:value={lastFmUsername}
              placeholder="your-username"
              maxlength="50"
              class="text-input"
            />
          </div>
        </div>
      {/if}

      <!-- Display Style -->
      <div class="form-section">
        <h4>Display Style</h4>
        <div class="style-grid">
          {#each DISPLAY_STYLE_OPTIONS as option}
            <label
              class="style-option"
              class:selected={displayStyle === option.value}
            >
              <input
                type="radio"
                name="displayStyle"
                value={option.value}
                bind:group={displayStyle}
              />
              <span class="style-name">{option.label}</span>
              <span class="style-desc">{option.description}</span>
            </label>
          {/each}
        </div>
      </div>

      <!-- Options -->
      <div class="form-section">
        <h4>Options</h4>
        <label class="toggle-row">
          <span class="toggle-label">
            <strong>Show album art</strong>
          </span>
          <input
            type="checkbox"
            name="showAlbumArt"
            value="true"
            bind:checked={showAlbumArt}
            class="toggle-input"
          />
        </label>
        <label class="toggle-row">
          <span class="toggle-label">
            <strong>Show progress bar</strong>
            <span class="toggle-hint">Only works with Spotify</span>
          </span>
          <input
            type="checkbox"
            name="showProgress"
            value="true"
            bind:checked={showProgress}
            class="toggle-input"
          />
        </label>
      </div>

      <!-- Fallback Text -->
      <div class="form-section">
        <div class="input-group">
          <label class="input-label" for="fallbackText">Fallback text</label>
          <input
            id="fallbackText"
            type="text"
            name="fallbackText"
            bind:value={fallbackText}
            placeholder="the forest rests"
            maxlength="100"
            class="text-input"
          />
          <span class="input-hint">Shown when nothing is playing</span>
        </div>
      </div>

      <div class="form-actions">
        <GlassButton type="submit" variant="accent" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Settings"}
        </GlassButton>
      </div>
    </form>
  </GlassCard>

  <!-- History -->
  {#if data.history && data.history.length > 0}
    <GlassCard class="history-card">
      <div class="section-header">
        <h3>Recent Listens</h3>
        <form
          method="POST"
          action="?/clearHistory"
          use:enhance={({ cancel }) => {
            if (!confirm("Clear all listening history?")) {
              cancel();
              return;
            }
            return async ({ update }) => {
              await update();
            };
          }}
        >
          <GlassButton type="submit" variant="ghost" class="clear-btn">
            <Trash2 class="w-4 h-4" />
            Clear
          </GlassButton>
        </form>
      </div>
      <div class="history-list">
        {#each data.history as entry (entry.id)}
          <div class="history-item">
            <div class="history-info">
              <span class="history-track">{entry.trackName}</span>
              <span class="history-artist">{entry.artist}</span>
            </div>
            <span class="history-time">{formatPlayedAt(entry.playedAt)}</span>
          </div>
        {/each}
      </div>
    </GlassCard>
  {/if}
</div>

<style>
  .nowplaying-admin {
    max-width: 800px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .header-top {
    margin-bottom: 1rem;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  :global(.header-icon) {
    width: 2rem;
    height: 2rem;
    color: var(--color-primary);
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    color: var(--color-text-muted);
    font-size: 1rem;
    line-height: 1.6;
    font-style: italic;
  }

  /* ─── Current Track ─── */
  :global(.current-card) {
    padding: 1.5rem !important;
    margin-bottom: 1.5rem;
  }

  :global(.current-card) h3,
  :global(.manual-card) h3,
  :global(.settings-card) h3,
  :global(.history-card) h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 1rem;
  }

  .current-track {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border-radius: 0.75rem;
    background: var(--grove-overlay-4, rgba(0, 0, 0, 0.02));
  }

  .album-art {
    width: 64px;
    height: 64px;
    border-radius: 0.5rem;
    object-fit: cover;
  }

  .album-art-placeholder {
    width: 64px;
    height: 64px;
    border-radius: 0.5rem;
    background: var(--grove-overlay-8, rgba(0, 0, 0, 0.06));
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
  }

  .track-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .track-name {
    font-weight: 600;
    font-size: 1rem;
    color: var(--color-text);
  }

  .track-artist {
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }

  .track-album {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  .empty-state {
    text-align: center;
    padding: 1rem;
    color: var(--color-text-muted);
  }

  /* ─── Manual Track Form ─── */
  :global(.manual-card),
  :global(.settings-card),
  :global(.history-card) {
    padding: 1.5rem !important;
    margin-bottom: 1.5rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .form-section {
    margin-bottom: 1.5rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .form-section:last-of-type {
    border-bottom: none;
  }

  .form-section h4 {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 0.75rem;
  }

  .input-group {
    display: flex;
    flex-direction: column;
  }

  .input-label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 0.375rem;
  }

  .optional {
    font-weight: 400;
    color: var(--color-text-muted);
  }

  .text-input {
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    font-size: 0.9rem;
    color: var(--color-text);
    background: hsl(var(--background));
  }

  .text-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .input-hint {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin-top: 0.25rem;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
  }

  /* ─── Style Grid ─── */
  .style-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .style-option {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem;
    border: 2px solid var(--color-border, #e5e7eb);
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .style-option:hover {
    border-color: var(--color-primary);
  }

  .style-option.selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  }

  .style-option input[type="radio"] {
    display: none;
  }

  .style-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--color-text);
  }

  .style-desc {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  /* ─── Toggle ─── */
  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    cursor: pointer;
    padding: 0.5rem 0;
  }

  .toggle-row + .toggle-row {
    border-top: 1px solid var(--color-border, #e5e7eb);
    padding-top: 0.75rem;
  }

  .toggle-label {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .toggle-hint {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .toggle-input {
    width: 2.5rem;
    height: 1.25rem;
    accent-color: var(--color-primary);
    cursor: pointer;
  }

  /* ─── History ─── */
  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .section-header h3 {
    margin: 0 !important;
  }

  :global(.clear-btn) {
    color: hsl(var(--destructive)) !important;
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .history-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    background: var(--grove-overlay-4, rgba(0, 0, 0, 0.02));
  }

  .history-info {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  .history-track {
    font-weight: 500;
    font-size: 0.9rem;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .history-artist {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .history-time {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }

  @media (max-width: 640px) {
    .title-row {
      flex-wrap: wrap;
    }

    .form-grid,
    .style-grid {
      grid-template-columns: 1fr;
    }

    .section-header {
      flex-wrap: wrap;
      align-items: stretch;
    }

    .current-track {
      flex-wrap: wrap;
    }

    .toggle-row {
      flex-wrap: wrap;
    }

    .history-item {
      flex-wrap: wrap;
    }
  }
</style>
