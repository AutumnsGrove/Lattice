<script>
  import {
    Button,
    Spinner,
    GlassCard,
    GlassConfirmDialog,
    Waystone,
    GroveTerm,
  } from "$lib/ui";
  import { GreenhouseStatusCard, GraftControlPanel } from "$lib/grafts/greenhouse";
  import { Smartphone, Laptop, Monitor, Leaf } from "lucide-svelte";
  import { groveModeStore } from "$lib/ui/stores/grove-mode.svelte";
  import { toast } from "$lib/ui/components/ui/toast";
  import { api, apiRequest } from "$lib/utils";
  import {
    COLOR_PRESETS,
    FONT_PRESETS,
    getFontFamily,
    DEFAULT_ACCENT_COLOR,
    DEFAULT_FONT,
  } from "$lib/config/presets";
  import {
    CANOPY_CATEGORIES,
    CANOPY_CATEGORY_LABELS,
  } from "$lib/config/canopy-categories";
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";

  // Load all font faces so the font picker previews render correctly
  import "$lib/styles/fonts-optional.css";

  /**
   * @typedef {Object} Session
   * @property {string} id
   * @property {string} deviceId
   * @property {string} deviceName
   * @property {number} createdAt
   * @property {number} lastActiveAt
   * @property {number} expiresAt
   * @property {string | null} ipAddress
   * @property {string | null} userAgent
   * @property {boolean} [isCurrent]
   */

  // Props from parent layout (user data)
  let { data } = $props();

  // Font settings state
  let currentFont = $state(DEFAULT_FONT);
  let savingFont = $state(false);
  let fontMessage = $state("");
  let loadingFont = $state(true);

  // Accent color settings state
  let currentAccentColor = $state(DEFAULT_ACCENT_COLOR);
  let savingColor = $state(false);
  let colorMessage = $state("");

  // Header branding state
  let groveTitle = $state("");
  let savingTitle = $state(false);
  let titleMessage = $state("");
  let showGroveLogo = $state(false);
  let savingLogo = $state(false);
  let logoMessage = $state("");

  // Profile photo state
  /** @type {string | null} */
  let avatarUrl = $state(null);
  let uploadingAvatar = $state(false);
  let clearingAvatar = $state(false);
  const oauthAvatarUrl = $derived(data.oauthAvatarUrl ?? null);
  const displayAvatar = $derived(avatarUrl || oauthAvatarUrl);

  // Active sessions state
  /** @type {Session[]} */
  let sessions = $state([]);
  let loadingSessions = $state(true);
  /** @type {string | null} */
  let revokingSessionId = $state(null);
  let revokingAllSessions = $state(false);
  let showRevokeAllDialog = $state(false);

  // Greenhouse graft toggle state
  /** @type {string | undefined} */
  let loadingGraftId = $state(undefined);
  let resettingGrafts = $state(false);
  /** @type {HTMLFormElement | undefined} */
  let toggleGraftForm = $state();
  /** @type {HTMLFormElement | undefined} */
  let resetGraftsForm = $state();
  let toggleGraftId = $state("");
  let toggleGraftEnabled = $state("");

  // Fetch current settings (font, accent color, header branding)
  async function fetchCurrentSettings() {
    loadingFont = true;
    try {
      const data = await api.get("/api/settings");
      currentFont = data.font_family || DEFAULT_FONT;
      currentAccentColor = data.accent_color || DEFAULT_ACCENT_COLOR;
      groveTitle = data.grove_title || "";
      showGroveLogo =
        data.show_grove_logo === true || data.show_grove_logo === "true";
      avatarUrl = data.avatar_url || null;
    } catch (error) {
      toast.error("Failed to load settings");
      console.error("Failed to fetch settings:", error);
      currentFont = DEFAULT_FONT;
      currentAccentColor = DEFAULT_ACCENT_COLOR;
      groveTitle = "";
      showGroveLogo = false;
    }
    loadingFont = false;
  }

  // Save font setting
  async function saveFont() {
    savingFont = true;
    fontMessage = "";

    try {
      await api.put("/api/admin/settings", {
        setting_key: "font_family",
        setting_value: currentFont,
      });

      fontMessage = "Font setting saved! Refresh to see changes site-wide.";
      // Apply immediately for preview using shared font config
      document.documentElement.style.setProperty(
        "--font-family-main",
        getFontFamily(currentFont),
      );
    } catch (error) {
      fontMessage =
        "Error: " + (error instanceof Error ? error.message : String(error));
    }

    savingFont = false;
  }

  // Save accent color setting
  async function saveAccentColor() {
    savingColor = true;
    colorMessage = "";

    try {
      await api.put("/api/admin/settings", {
        setting_key: "accent_color",
        setting_value: currentAccentColor,
      });

      colorMessage =
        "Accent color saved! Refresh to see changes across your blog.";
    } catch (error) {
      colorMessage =
        "Error: " + (error instanceof Error ? error.message : String(error));
    }

    savingColor = false;
  }

  // Save Grove title setting
  async function saveGroveTitle() {
    savingTitle = true;
    titleMessage = "";

    try {
      await api.put("/api/admin/settings", {
        setting_key: "grove_title",
        setting_value: groveTitle.trim(),
      });

      titleMessage = groveTitle.trim()
        ? "Title saved! Refresh to see it in the header."
        : "Title cleared — your default name will show instead.";
    } catch (error) {
      titleMessage =
        "Error: " + (error instanceof Error ? error.message : String(error));
    }

    savingTitle = false;
  }

  // Save Grove logo setting
  async function saveGroveLogo() {
    savingLogo = true;
    logoMessage = "";

    try {
      await api.put("/api/admin/settings", {
        setting_key: "show_grove_logo",
        setting_value: showGroveLogo ? "true" : "false",
      });

      logoMessage = showGroveLogo
        ? "Grove logo enabled! Tap it to cycle through seasons."
        : "Grove logo hidden from header.";
    } catch (error) {
      logoMessage =
        "Error: " + (error instanceof Error ? error.message : String(error));
    }

    savingLogo = false;
  }

  // =========================================================================
  // PROFILE PHOTO
  // =========================================================================

  /** Opens native file picker and uploads to the avatar endpoint */
  function handleAvatarUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      // Client-side size check (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Photo must be under 5 MB");
        return;
      }

      uploadingAvatar = true;
      try {
        const formData = new FormData();
        formData.append("file", file);

        const result = await apiRequest("/api/settings/avatar", {
          method: "POST",
          body: formData,
        });

        if (result?.url) {
          avatarUrl = result.url;
          toast.success("Profile photo updated!");
          // Refresh layout data so the nav avatar updates immediately
          invalidateAll();
        } else {
          toast.error(
            "Upload completed but no photo URL was returned. Please try again.",
          );
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to upload photo",
        );
      }
      uploadingAvatar = false;
    };
    input.click();
  }

  /** Remove the custom avatar and fall back to OAuth photo or placeholder */
  async function handleAvatarClear() {
    clearingAvatar = true;
    try {
      await apiRequest("/api/settings/avatar", { method: "DELETE" });
      avatarUrl = null;
      toast.success("Profile photo removed");
      // Refresh layout data so the nav avatar reverts immediately
      invalidateAll();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove photo",
      );
    }
    clearingAvatar = false;
  }

  // =========================================================================
  // ACTIVE SESSIONS (Security)
  // =========================================================================

  /**
   * Format timestamp to relative time (e.g., "5m ago", "2h ago")
   * @param {number} timestamp
   * @returns {string}
   */
  function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  /**
   * Get device icon component based on device name
   * @param {string} deviceName
   */
  function getDeviceIcon(deviceName) {
    const name = deviceName.toLowerCase();
    if (
      name.includes("iphone") ||
      name.includes("android") ||
      name.includes("mobile")
    ) {
      return Smartphone;
    }
    if (
      name.includes("mac") ||
      name.includes("windows") ||
      name.includes("linux")
    ) {
      return Laptop;
    }
    return Monitor;
  }

  /**
   * Fetch active sessions from Heartwood SessionDO
   */
  async function fetchSessions() {
    loadingSessions = true;
    try {
      const result = await api.get("/api/auth/sessions");
      sessions = result.sessions || [];
    } catch (error) {
      toast.error("Couldn't load your sessions");
      console.error("Failed to fetch sessions:", error);
      sessions = [];
    }
    loadingSessions = false;
  }

  /**
   * Revoke a specific session
   * @param {string} sessionId
   */
  async function revokeSession(sessionId) {
    revokingSessionId = sessionId;
    try {
      await api.delete(`/api/auth/sessions/${sessionId}`);
      toast.success("Session revoked");
      sessions = sessions.filter((s) => s.id !== sessionId);
    } catch (error) {
      toast.error("Failed to revoke session");
      console.error("Revoke session error:", error);
    }
    revokingSessionId = null;
  }

  /**
   * Revoke all sessions except current
   */
  async function revokeAllSessions() {
    revokingAllSessions = true;
    try {
      const result = await api.post("/api/auth/sessions/revoke-all", { keepCurrent: true });
      toast.success(
        `Signed out of ${result.revokedCount || "all other"} devices`,
      );
      // Refresh the list
      await fetchSessions();
    } catch (error) {
      toast.error("Failed to revoke sessions");
      console.error("Revoke all sessions error:", error);
    }
    revokingAllSessions = false;
    showRevokeAllDialog = false;
  }

  $effect(() => {
    fetchCurrentSettings();
    fetchSessions();
  });
  // CANOPY SETTINGS
  // =========================================================================

  // Canopy categories - derived from engine config
  // Transforms the engine's string array + labels record into UI-friendly objects
  const CANOPY_CATEGORY_OPTIONS = CANOPY_CATEGORIES.map((id) => ({
    id,
    label: CANOPY_CATEGORY_LABELS[id],
  }));

  // Canopy settings state
  let canopyVisible = $state(false);
  let canopyBanner = $state("");
  /** @type {string[]} */
  let canopyCategories = $state([]);
  let canopyShowForests = $state(true);
  let loadingCanopy = $state(true);
  let savingCanopy = $state(false);
  let canopyMessage = $state("");

  /**
   * Fetch Canopy settings
   */
  async function fetchCanopySettings() {
    loadingCanopy = true;
    try {
      const settings = await api.get("/api/settings");
      canopyVisible = settings.canopy_visible === "true" || settings.canopy_visible === true;
      canopyBanner = settings.canopy_banner || "";
      canopyShowForests = settings.canopy_show_forests !== "false" && settings.canopy_show_forests !== false;
      
      // Parse categories
      try {
        const cats = settings.canopy_categories ? JSON.parse(settings.canopy_categories) : [];
        canopyCategories = Array.isArray(cats) ? cats : [];
      } catch {
        canopyCategories = [];
      }
    } catch (error) {
      console.error("Failed to fetch Canopy settings:", error);
    }
    loadingCanopy = false;
  }

  /**
   * Toggle category selection
   * @param {string} categoryId
   */
  function toggleCategory(categoryId) {
    if (canopyCategories.includes(categoryId)) {
      canopyCategories = canopyCategories.filter(c => c !== categoryId);
    } else {
      canopyCategories = [...canopyCategories, categoryId];
    }
  }

  /**
   * Save all Canopy settings
   */
  async function saveCanopySettings() {
    savingCanopy = true;
    canopyMessage = "";

    try {
      // Save visibility
      await api.put("/api/admin/settings", {
        setting_key: "canopy_visible",
        setting_value: canopyVisible ? "true" : "false"
      });

      // Save banner
      await api.put("/api/admin/settings", {
        setting_key: "canopy_banner",
        setting_value: canopyBanner.trim()
      });

      // Save categories
      await api.put("/api/admin/settings", {
        setting_key: "canopy_categories",
        setting_value: JSON.stringify(canopyCategories)
      });

      // Save show forests
      await api.put("/api/admin/settings", {
        setting_key: "canopy_show_forests",
        setting_value: canopyShowForests ? "true" : "false"
      });

      canopyMessage = "Canopy settings saved! You'll appear in the directory.";
      toast.success("Canopy settings saved");
    } catch (error) {
      canopyMessage = "Error: " + (error instanceof Error ? error.message : String(error));
      toast.error("Failed to save Canopy settings");
    }

    savingCanopy = false;
  }

  // Load Canopy settings on mount
  $effect(() => {
    fetchCanopySettings();
  });

  // =========================================================================
  // MEADOW SETTINGS
  // =========================================================================

  let meadowOptIn = $state(data.meadowOptIn ?? false);
  let savingMeadow = $state(false);
  let meadowMessage = $state("");

  async function saveMeadowSettings() {
    savingMeadow = true;
    meadowMessage = "";

    try {
      await api.put("/api/admin/meadow", {
        meadow_opt_in: meadowOptIn,
      });

      meadowMessage = meadowOptIn
        ? "Meadow enabled! Your published posts will appear in the community feed."
        : "Meadow disabled. Your posts will no longer appear in the community feed.";
      toast.success(meadowOptIn ? "Sharing to Meadow" : "Meadow sharing disabled");
    } catch (error) {
      meadowMessage = "Error: " + (error instanceof Error ? error.message : String(error));
      toast.error("Failed to save Meadow settings");
    }

    savingMeadow = false;
  }

</script>

<div class="settings">
  <header class="page-header">
    <h1>Settings</h1>
    <p class="subtitle">Manage site configuration and maintenance</p>
  </header>

  <!-- Profile Photo -->
  <GlassCard variant="frosted" class="mb-6">
    <div class="section-header">
      <h2>Profile Photo</h2>
    </div>
    <p class="section-description">
      Your photo appears in the <GroveTerm term="canopy">Canopy</GroveTerm> directory and across your <GroveTerm term="grove">grove</GroveTerm>.
    </p>

    <div class="avatar-section">
      <div class="avatar-preview">
        {#if displayAvatar}
          <img
            src={displayAvatar}
            alt="Profile photo"
            class="avatar-image"
          />
        {:else}
          <span class="avatar-placeholder">
            {data.user?.name?.[0] || data.user?.email?.[0] || "?"}
          </span>
        {/if}
      </div>

      <div class="avatar-actions">
        <Button
          onclick={handleAvatarUpload}
          variant="primary"
          disabled={uploadingAvatar}
        >
          {#if uploadingAvatar}
            <Spinner size="sm" /> Uploading...
          {:else}
            {avatarUrl ? "Change Photo" : "Upload Photo"}
          {/if}
        </Button>

        {#if avatarUrl}
          <Button
            onclick={handleAvatarClear}
            variant="danger"
            disabled={clearingAvatar}
          >
            {clearingAvatar ? "Removing..." : "Remove"}
          </Button>
        {/if}

        {#if !avatarUrl && oauthAvatarUrl}
          <p class="avatar-hint">Currently using your sign-in photo</p>
        {/if}
      </div>
    </div>
  </GlassCard>


  <GlassCard variant="frosted" class="mb-6">
    <div class="section-header">
      <h2>Preferences</h2>
    </div>
    <p class="section-description">
      Personal display preferences for your <GroveTerm term="arbor">Arbor</GroveTerm>.
    </p>

    <label class="logo-toggle">
      <input type="checkbox" checked={groveModeStore.current} onchange={() => groveModeStore.toggle()} />
      <span class="toggle-label">
        <span class="toggle-title">
          <Leaf class="inline-icon" size={16} />
          Grove Mode
        </span>
        <span class="toggle-description">
          {groveModeStore.current
            ? 'Nature-themed terminology is active. Navigation and features use Grove names.'
            : 'Standard terminology is active. Navigation and features use familiar web terms.'}
        </span>
      </span>
    </label>
  </GlassCard>

  <!-- Greenhouse Status -->
  <GreenhouseStatusCard
    inGreenhouse={data.greenhouseStatus?.inGreenhouse ?? false}
    enrolledAt={data.greenhouseStatus?.enrolledAt}
    notes={data.greenhouseStatus?.notes}
    class="mb-6"
  />

  <!-- Graft Control Panel (greenhouse members with available grafts) -->
  {#if data.greenhouseStatus?.inGreenhouse && data.tenantGrafts?.length > 0}
    <!-- Hidden form for toggling individual grafts -->
    <form
      method="POST"
      action="?/toggleGraft"
      bind:this={toggleGraftForm}
      class="hidden"
      use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            toast.success(String(result.data?.message || 'Feature updated'));
            await invalidateAll();
          } else if (result.type === 'failure') {
            toast.error(String(result.data?.error || 'Failed to toggle feature'));
          }
          loadingGraftId = undefined;
          await update({ reset: false });
        };
      }}
    >
      <input type="hidden" name="graftId" bind:value={toggleGraftId} />
      <input type="hidden" name="enabled" bind:value={toggleGraftEnabled} />
    </form>

    <!-- Hidden form for resetting all grafts -->
    <form
      method="POST"
      action="?/resetGrafts"
      bind:this={resetGraftsForm}
      class="hidden"
      use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === 'success') {
            toast.success(String(result.data?.message || 'Preferences reset'));
            await invalidateAll();
          } else if (result.type === 'failure') {
            toast.error(String(result.data?.error || 'Failed to reset preferences'));
          }
          resettingGrafts = false;
          await update({ reset: false });
        };
      }}
    />

    <div class="mb-6">
      <GraftControlPanel
        grafts={data.tenantGrafts}
        currentValues={data.grafts}
        onToggle={(graftId, enabled) => {
          loadingGraftId = graftId;
          toggleGraftId = graftId;
          toggleGraftEnabled = String(enabled);
          toggleGraftForm?.requestSubmit();
        }}
        onReset={() => {
          resettingGrafts = true;
          resetGraftsForm?.requestSubmit();
        }}
        {loadingGraftId}
        resetting={resettingGrafts}
      />
    </div>
  {/if}

  <GlassCard variant="frosted" class="mb-6">
    <div class="section-header">
      <h2>Typography</h2>
      <Waystone slug="custom-fonts" label="Learn about fonts" />
    </div>
    <p class="section-description">
      Choose the font family used across the entire site. Changes take effect
      immediately.
    </p>

    {#if loadingFont}
      <Spinner />
    {:else}
      <div class="font-selector">
        <label class="font-option" class:selected={currentFont === "lexend"}>
          <input
            type="radio"
            name="font"
            value="lexend"
            bind:group={currentFont}
          />
          <div class="font-info">
            <span class="font-name" style="font-family: 'Lexend', sans-serif;"
              >Lexend</span
            >
            <span class="font-description"
              >Modern accessibility font for reading fluency (default)</span
            >
          </div>
        </label>

        <label class="font-option" class:selected={currentFont === "atkinson"}>
          <input
            type="radio"
            name="font"
            value="atkinson"
            bind:group={currentFont}
          />
          <div class="font-info">
            <span
              class="font-name"
              style="font-family: 'Atkinson Hyperlegible', sans-serif;"
              >Atkinson Hyperlegible</span
            >
            <span class="font-description"
              >Accessibility font for low vision readers</span
            >
          </div>
        </label>

        <label
          class="font-option"
          class:selected={currentFont === "opendyslexic"}
        >
          <input
            type="radio"
            name="font"
            value="opendyslexic"
            bind:group={currentFont}
          />
          <div class="font-info">
            <span
              class="font-name"
              style="font-family: 'OpenDyslexic', sans-serif;"
              >OpenDyslexic</span
            >
            <span class="font-description">Accessibility font for dyslexia</span
            >
          </div>
        </label>

        <label class="font-option" class:selected={currentFont === "quicksand"}>
          <input
            type="radio"
            name="font"
            value="quicksand"
            bind:group={currentFont}
          />
          <div class="font-info">
            <span
              class="font-name"
              style="font-family: 'Quicksand', sans-serif;">Quicksand</span
            >
            <span class="font-description"
              >Rounded, friendly geometric sans-serif</span
            >
          </div>
        </label>

        <label
          class="font-option"
          class:selected={currentFont === "plus-jakarta-sans"}
        >
          <input
            type="radio"
            name="font"
            value="plus-jakarta-sans"
            bind:group={currentFont}
          />
          <div class="font-info">
            <span
              class="font-name"
              style="font-family: 'Plus Jakarta Sans', sans-serif;"
              >Plus Jakarta Sans</span
            >
            <span class="font-description"
              >Contemporary geometric sans, balanced and versatile</span
            >
          </div>
        </label>

        <label
          class="font-option"
          class:selected={currentFont === "ibm-plex-mono"}
        >
          <input
            type="radio"
            name="font"
            value="ibm-plex-mono"
            bind:group={currentFont}
          />
          <div class="font-info">
            <span
              class="font-name"
              style="font-family: 'IBM Plex Mono', monospace;"
              >IBM Plex Mono</span
            >
            <span class="font-description"
              >Clean, highly readable code font</span
            >
          </div>
        </label>

        <label class="font-option" class:selected={currentFont === "cozette"}>
          <input
            type="radio"
            name="font"
            value="cozette"
            bind:group={currentFont}
          />
          <div class="font-info">
            <span class="font-name" style="font-family: 'Cozette', monospace;"
              >Cozette</span
            >
            <span class="font-description"
              >Bitmap-style programming font, retro aesthetic</span
            >
          </div>
        </label>

        <label class="font-option" class:selected={currentFont === "alagard"}>
          <input
            type="radio"
            name="font"
            value="alagard"
            bind:group={currentFont}
          />
          <div class="font-info">
            <span class="font-name" style="font-family: 'Alagard', fantasy;"
              >Alagard</span
            >
            <span class="font-description"
              >Medieval pixel font for fantasy vibes</span
            >
          </div>
        </label>

        <label class="font-option" class:selected={currentFont === "calistoga"}>
          <input
            type="radio"
            name="font"
            value="calistoga"
            bind:group={currentFont}
          />
          <div class="font-info">
            <span class="font-name" style="font-family: 'Calistoga', serif;"
              >Calistoga</span
            >
            <span class="font-description"
              >Casual brush serif, warm and friendly</span
            >
          </div>
        </label>

        <label class="font-option" class:selected={currentFont === "caveat"}>
          <input
            type="radio"
            name="font"
            value="caveat"
            bind:group={currentFont}
          />
          <div class="font-info">
            <span class="font-name" style="font-family: 'Caveat', cursive;"
              >Caveat</span
            >
            <span class="font-description"
              >Handwritten script, personal and informal</span
            >
          </div>
        </label>
      </div>

      {#if fontMessage}
        <div
          class="message"
          class:success={fontMessage.includes("saved")}
          class:error={!fontMessage.includes("saved")}
        >
          {fontMessage}
        </div>
      {/if}

      <div class="button-row">
        <Button onclick={saveFont} variant="primary" disabled={savingFont}>
          {savingFont ? "Saving..." : "Save Font Setting"}
        </Button>
      </div>

      <p class="note">
        See <a href="https://grove.place/credits">font credits and licenses</a> for attribution.
      </p>
    {/if}
  </GlassCard>

  <GlassCard variant="frosted" class="mb-6">
    <div class="section-header">
      <h2>Accent Color</h2>
      <Waystone slug="choosing-a-theme" label="Learn about themes" />
    </div>
    <p class="section-description">
      Customize the accent color used for tags and interactive elements on your
      blog.
    </p>

    <div class="color-picker-section">
      <div class="color-preview-wrapper">
        <input
          type="color"
          id="accent-color"
          bind:value={currentAccentColor}
          class="color-input"
        />
        <div class="color-preview" style:background-color={currentAccentColor}>
          <span class="color-hex">{currentAccentColor}</span>
        </div>
      </div>

      <div class="color-presets">
        <span class="presets-label">Presets:</span>
        {#each COLOR_PRESETS as color}
          <button
            type="button"
            class="preset-btn"
            class:selected={currentAccentColor === color.hex}
            style:background={color.hex}
            title={color.name}
            onclick={() => (currentAccentColor = color.hex)}
          ></button>
        {/each}
      </div>
    </div>

    {#if colorMessage}
      <div
        class="message"
        class:success={colorMessage.includes("saved")}
        class:error={!colorMessage.includes("saved")}
      >
        {colorMessage}
      </div>
    {/if}

    <div class="button-row">
      <Button
        onclick={saveAccentColor}
        variant="primary"
        disabled={savingColor}
      >
        {savingColor ? "Saving..." : "Save Accent Color"}
      </Button>
    </div>
  </GlassCard>

  <GlassCard variant="frosted" class="mb-6">
    <div class="section-header">
      <h2>Header Branding</h2>
    </div>
    <p class="section-description">
      Customize what appears in the header of your <GroveTerm term="grove">grove</GroveTerm>.
    </p>

    <div class="canopy-field">
      <label for="grove-title" class="field-label">Grove Title</label>
      <input
        type="text"
        id="grove-title"
        bind:value={groveTitle}
        placeholder="My Grove"
        maxlength="50"
        class="canopy-input"
      />
      <p class="field-help">
        The name that appears in the header and browser tab. Leave empty to use your default display name.
        <span class="char-count">{groveTitle.length}/50</span>
      </p>
    </div>

    {#if titleMessage}
      <div
        class="message"
        class:success={!titleMessage.includes("Error")}
        class:error={titleMessage.includes("Error")}
      >
        {titleMessage}
      </div>
    {/if}

    <div class="button-row">
      <Button onclick={saveGroveTitle} variant="primary" disabled={savingTitle}>
        {savingTitle ? "Saving..." : "Save Title"}
      </Button>
    </div>

    <label class="logo-toggle">
      <input type="checkbox" bind:checked={showGroveLogo} />
      <span class="toggle-label">
        <span class="toggle-title">Show Grove Logo</span>
        <span class="toggle-description">
          Displays the seasonal Grove tree icon next to your site title. Visitors can tap it to cycle
          through seasonal themes!
        </span>
      </span>
    </label>

    {#if logoMessage}
      <div
        class="message"
        class:success={!logoMessage.includes("Error")}
        class:error={logoMessage.includes("Error")}
      >
        {logoMessage}
      </div>
    {/if}

    <div class="button-row">
      <Button onclick={saveGroveLogo} variant="primary" disabled={savingLogo}>
        {savingLogo ? "Saving..." : "Save Logo Setting"}
      </Button>
    </div>
  </GlassCard>

  <!-- Canopy Settings -->
  <GlassCard variant="frosted" class="mb-6">
    <div class="section-header">
      <h2>Canopy</h2>
    </div>
    <p class="section-description">
      Let other wanderers discover your <GroveTerm term="grove">grove</GroveTerm> in the public directory.
      <a href="https://grove.place/canopy" target="_blank" rel="noopener noreferrer" class="canopy-link">View the Canopy &rarr;</a>
    </p>

    {#if loadingCanopy}
      <div class="sessions-loading">
        <Spinner />
      </div>
    {:else}
      <!-- Visibility Toggle -->
      <label class="logo-toggle canopy-toggle">
        <input type="checkbox" bind:checked={canopyVisible} />
        <span class="toggle-label">
          <span class="toggle-title">Rise into the Canopy</span>
          <span class="toggle-description">
            When enabled, your grove appears in the Canopy — Grove's public directory where wanderers discover each other.
          </span>
        </span>
      </label>

      {#if canopyVisible}
        <!-- Banner Input -->
        <div class="canopy-field">
          <label for="canopy-banner" class="field-label">Your Banner</label>
          <input
            type="text"
            id="canopy-banner"
            bind:value={canopyBanner}
            placeholder="What brings you to the grove?"
            maxlength="160"
            class="canopy-input"
          />
          <p class="field-help">
            The flag you fly from the canopy — a short line about you or your grove. 
            <span class="char-count">{canopyBanner.length}/160</span>
          </p>
        </div>

        <!-- Categories -->
        <div class="canopy-field">
          <label class="field-label">Categories</label>
          <div class="category-grid">
            {#each CANOPY_CATEGORY_OPTIONS as category}
              <label class="category-checkbox">
                <input
                  type="checkbox"
                  checked={canopyCategories.includes(category.id)}
                  onchange={() => toggleCategory(category.id)}
                />
                <span class="checkbox-label">{category.label}</span>
              </label>
            {/each}
          </div>
          <p class="field-help">Select categories that describe your grove. This helps others find you.</p>
        </div>

        <!-- Show Forests Toggle -->
        <label class="logo-toggle">
          <input type="checkbox" bind:checked={canopyShowForests} />
          <span class="toggle-label">
            <span class="toggle-title">Show my Forests</span>
            <span class="toggle-description">
              Display which Forest communities you're part of (when Forests become available)
            </span>
          </span>
        </label>
      {/if}

      {#if canopyMessage}
        <div
          class="message"
          class:success={canopyMessage.includes("saved")}
          class:error={canopyMessage.includes("Error")}
        >
          {canopyMessage}
        </div>
      {/if}

      <div class="button-row">
        <Button onclick={saveCanopySettings} variant="primary" disabled={savingCanopy}>
          {savingCanopy ? "Saving..." : "Save Canopy Settings"}
        </Button>
      </div>
    {/if}
  </GlassCard>

  <!-- Meadow Settings -->
  <GlassCard variant="frosted" class="mb-6">
    <div class="section-header">
      <h2>Meadow</h2>
    </div>
    <p class="section-description">
      Share your published <GroveTerm term="blooms">posts</GroveTerm> to the community feed at <a href="https://meadow.grove.place" target="_blank" rel="noopener noreferrer" class="canopy-link">meadow.grove.place</a>.
    </p>

    <label class="logo-toggle">
      <input type="checkbox" bind:checked={meadowOptIn} />
      <span class="toggle-label">
        <span class="toggle-title">Share to Meadow</span>
        <span class="toggle-description">
          When enabled, your published posts appear in Meadow — Grove's community feed where wanderers discover each other's writing. You can exclude individual posts from the bloom editor.
        </span>
      </span>
    </label>

    {#if meadowMessage}
      <div
        class="message"
        class:success={!meadowMessage.includes("Error")}
        class:error={meadowMessage.includes("Error")}
      >
        {meadowMessage}
      </div>
    {/if}

    <div class="button-row">
      <Button onclick={saveMeadowSettings} variant="primary" disabled={savingMeadow}>
        {savingMeadow ? "Saving..." : "Save Meadow Settings"}
      </Button>
    </div>
  </GlassCard>

  <!-- Active Sessions / Security -->
  <GlassCard variant="frosted" class="mb-6">
    <div class="section-header">
      <h2>Active Sessions</h2>
    </div>
    <p class="section-description">
      Devices where you're currently signed in to your <GroveTerm term="grove">grove</GroveTerm>.
    </p>

    {#if loadingSessions}
      <div class="sessions-loading">
        <Spinner />
      </div>
    {:else if sessions.length === 0}
      <p class="sessions-empty">No active sessions found</p>
    {:else}
      <div class="sessions-list">
        {#each sessions as session (session.id)}
          {@const DeviceIcon = getDeviceIcon(session.deviceName)}
          <div
            class="session-card"
            class:current={session.isCurrent}
            class:revoking={revokingSessionId === session.id}
          >
            <div class="session-icon">
              <DeviceIcon size={24} />
            </div>
            <div class="session-info">
              <div class="session-header">
                <span class="session-name">{session.deviceName}</span>
                {#if session.isCurrent}
                  <span class="session-badge">This device</span>
                {/if}
              </div>
              <div class="session-meta">
                <span
                  >Last active: {formatRelativeTime(session.lastActiveAt)}</span
                >
                {#if session.ipAddress}
                  <span class="session-ip">· {session.ipAddress}</span>
                {/if}
              </div>
            </div>
            {#if !session.isCurrent}
              <Button
                variant="danger"
                size="sm"
                onclick={() => revokeSession(session.id)}
                disabled={revokingSessionId === session.id}
              >
                {revokingSessionId === session.id ? "Revoking..." : "Revoke"}
              </Button>
            {/if}
          </div>
        {/each}
      </div>

      {#if sessions.filter((s) => !s.isCurrent).length > 0}
        <div class="sessions-actions">
          <Button
            variant="danger"
            onclick={() => (showRevokeAllDialog = true)}
            disabled={revokingAllSessions}
          >
            {revokingAllSessions
              ? "Signing out..."
              : "Sign out of all other devices"}
          </Button>
        </div>
      {/if}
    {/if}
  </GlassCard>

</div>

<GlassConfirmDialog
  bind:open={showRevokeAllDialog}
  title="Sign Out of All Devices"
  message="This will sign you out of all other devices. You'll stay signed in on this device."
  confirmLabel="Sign Out All"
  variant="danger"
  loading={revokingAllSessions}
  onconfirm={revokeAllSessions}
/>

<style>
  .settings {
    max-width: 800px;
  }
  .page-header {
    margin-bottom: 2rem;
  }
  .page-header h1 {
    margin: 0 0 0.25rem 0;
    font-size: 2rem;
    color: var(--color-text);
    transition: color 0.3s ease;
  }
  .subtitle {
    margin: 0;
    color: var(--color-text-muted);
    transition: color 0.3s ease;
  }
  :global(.settings .glass-card) {
    padding: 1.5rem;
  }
  :global(.settings h2) {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: var(--color-text);
    transition: color 0.3s ease;
  }
  .section-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  .section-header h2 {
    margin: 0;
  }
  .section-description {
    margin: 0 0 1rem 0;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    transition: color 0.3s ease;
  }
  .canopy-link {
    display: inline-block;
    margin-left: 0.25rem;
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 500;
  }
  .canopy-link:hover {
    text-decoration: underline;
  }
  .message {
    padding: 0.75rem 1rem;
    border-radius: var(--border-radius-button);
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
  .message.success {
    background: #dcffe4;
    color: var(--accent-success-dark);
  }
  .message.error {
    background: #ffeef0;
    color: var(--accent-danger);
  }
  .note {
    margin: 1rem 0 0 0;
    font-size: 0.8rem;
    color: var(--color-text-subtle);
    transition: color 0.3s ease;
  }
  /* Font selector styles */
  .font-selector {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  .font-option {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border: 2px solid var(--color-border);
    border-radius: var(--border-radius-standard);
    cursor: pointer;
    transition:
      border-color 0.2s,
      background-color 0.2s;
  }
  .font-option:hover {
    border-color: var(--color-primary);
  }
  .font-option.selected {
    border-color: var(--color-primary);
    background: rgba(44, 95, 45, 0.05);
  }
  :global(.dark) .font-option.selected {
    border-color: var(--color-primary-light);
    background: rgba(92, 184, 95, 0.1);
  }
  .font-option input[type="radio"] {
    width: 18px;
    height: 18px;
    accent-color: var(--color-primary);
  }
  .font-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .font-name {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text);
    transition: color 0.3s ease;
  }
  .font-description {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    transition: color 0.3s ease;
  }
  .button-row {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  /* Color picker styles */
  .color-picker-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .color-preview-wrapper {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .color-input {
    width: 60px;
    height: 60px;
    padding: 0;
    border: 2px solid var(--color-border);
    border-radius: var(--border-radius-standard);
    cursor: pointer;
    background: transparent;
  }
  .color-input::-webkit-color-swatch-wrapper {
    padding: 4px;
  }
  .color-input::-webkit-color-swatch {
    border: none;
    border-radius: calc(var(--border-radius-standard) - 4px);
  }
  .color-preview {
    flex: 1;
    padding: 1rem 1.5rem;
    border-radius: var(--border-radius-standard);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  }
  .color-hex {
    font-family: "IBM Plex Mono", monospace;
    font-size: 1.1rem;
    font-weight: 600;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    text-transform: uppercase;
  }
  .color-presets {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .presets-label {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin-right: 0.25rem;
  }
  .preset-btn {
    width: 32px;
    height: 32px;
    border: 2px solid transparent;
    border-radius: 50%;
    cursor: pointer;
    transition:
      transform 0.15s,
      border-color 0.15s;
  }
  .preset-btn:hover {
    transform: scale(1.15);
    border-color: var(--color-text);
  }
  .preset-btn.selected {
    border-color: var(--color-text);
    box-shadow:
      0 0 0 2px var(--color-surface),
      0 0 0 4px var(--color-text);
  }
  .preset-btn:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
  /* Logo toggle styles */
  .logo-toggle {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    padding: 1rem;
    border: 2px solid var(--color-border);
    border-radius: var(--border-radius-standard);
    cursor: pointer;
    transition:
      border-color 0.2s,
      background-color 0.2s;
    margin-bottom: 1rem;
  }
  .logo-toggle:hover {
    border-color: var(--color-primary);
  }
  .logo-toggle:has(input:checked) {
    border-color: var(--color-primary);
    background: rgba(44, 95, 45, 0.05);
  }
  :global(.dark) .logo-toggle:has(input:checked) {
    border-color: var(--color-primary-light);
    background: rgba(92, 184, 95, 0.1);
  }
  .logo-toggle input[type="checkbox"] {
    width: 20px;
    height: 20px;
    accent-color: var(--color-primary);
    margin-top: 2px;
    flex-shrink: 0;
  }
  .toggle-label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .toggle-title {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    transition: color 0.3s ease;
  }
  .toggle-description {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    transition: color 0.3s ease;
  }
  /* Active sessions styles */
  /* Active sessions styles - Enhanced with Grove polish */
  .sessions-loading {
    padding: 2rem;
    display: flex;
    justify-content: center;
  }
  .sessions-empty {
    padding: 1.5rem;
    text-align: center;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    font-style: italic;
  }
  .sessions-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  .session-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border: 2px solid var(--color-border);
    border-radius: var(--border-radius-standard);
    transition:
      border-color 0.2s ease,
      transform 0.2s ease,
      box-shadow 0.2s ease,
      opacity 0.3s ease;
  }
  .session-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  :global(.dark) .session-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  /* Current device - soft breathing glow */
  .session-card.current {
    border-color: var(--color-primary);
    background: linear-gradient(
      135deg,
      rgba(44, 95, 45, 0.08) 0%,
      rgba(44, 95, 45, 0.03) 100%
    );
    box-shadow:
      0 0 0 1px rgba(44, 95, 45, 0.1),
      0 0 20px rgba(44, 95, 45, 0.1);
    animation: session-glow 3s ease-in-out infinite;
  }
  :global(.dark) .session-card.current {
    border-color: var(--color-primary-light);
    background: linear-gradient(
      135deg,
      rgba(92, 184, 95, 0.12) 0%,
      rgba(92, 184, 95, 0.05) 100%
    );
    box-shadow:
      0 0 0 1px rgba(92, 184, 95, 0.15),
      0 0 20px rgba(92, 184, 95, 0.15);
  }
  @keyframes session-glow {
    0%,
    100% {
      box-shadow:
        0 0 0 1px rgba(44, 95, 45, 0.1),
        0 0 20px rgba(44, 95, 45, 0.1);
    }
    50% {
      box-shadow:
        0 0 0 1px rgba(44, 95, 45, 0.15),
        0 0 25px rgba(44, 95, 45, 0.15);
    }
  }
  :global(.dark) .session-card.current {
    animation-name: session-glow-dark;
  }
  @keyframes session-glow-dark {
    0%,
    100% {
      box-shadow:
        0 0 0 1px rgba(92, 184, 95, 0.15),
        0 0 20px rgba(92, 184, 95, 0.15);
    }
    50% {
      box-shadow:
        0 0 0 1px rgba(92, 184, 95, 0.2),
        0 0 25px rgba(92, 184, 95, 0.2);
    }
  }
  /* Revoking animation - fade and slide */
  .session-card.revoking {
    opacity: 0.5;
    transform: translateX(10px);
    pointer-events: none;
  }
  /* Device icon - enhanced with gradient */
  .session-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: var(--border-radius-button);
    background: linear-gradient(
      135deg,
      var(--color-surface-elevated) 0%,
      rgba(44, 95, 45, 0.08) 100%
    );
    color: var(--color-primary);
    flex-shrink: 0;
    transition:
      transform 0.2s ease,
      background 0.2s ease;
  }
  .session-card:hover .session-icon {
    transform: scale(1.05);
    background: linear-gradient(
      135deg,
      var(--color-surface-elevated) 0%,
      rgba(44, 95, 45, 0.12) 100%
    );
  }
  :global(.dark) .session-icon {
    color: var(--color-primary-light);
    background: linear-gradient(
      135deg,
      var(--color-surface-elevated) 0%,
      rgba(92, 184, 95, 0.1) 100%
    );
  }
  :global(.dark) .session-card:hover .session-icon {
    background: linear-gradient(
      135deg,
      var(--color-surface-elevated) 0%,
      rgba(92, 184, 95, 0.15) 100%
    );
  }
  .session-info {
    flex: 1;
    min-width: 0;
  }
  .session-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .session-name {
    font-weight: 600;
    color: var(--color-text);
    transition: color 0.2s ease;
  }
  /* Badge with subtle shimmer */
  .session-badge {
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
    background: linear-gradient(135deg, var(--color-primary) 0%, #2d7a32 100%);
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    box-shadow: 0 2px 4px rgba(44, 95, 45, 0.2);
  }
  :global(.dark) .session-badge {
    background: linear-gradient(
      135deg,
      var(--color-primary-light) 0%,
      #4ade80 100%
    );
    color: #0d4a1c;
    box-shadow: 0 2px 4px rgba(92, 184, 95, 0.3);
  }
  .session-meta {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin-top: 0.25rem;
    transition: color 0.2s ease;
  }
  .session-ip {
    opacity: 0.7;
  }
  .sessions-actions {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
  }
  /* Respect reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .session-card {
      transition: none;
    }
    .session-card.current {
      animation: none;
    }
    .session-card:hover {
      transform: none;
    }
    .session-card:hover .session-icon {
      transform: none;
    }
  }
  /* Profile photo styles */
  .avatar-section {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 0.5rem;
  }
  .avatar-preview {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    border: 3px solid var(--color-border);
    background: var(--color-surface-elevated);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.2s ease;
  }
  .avatar-preview:hover {
    border-color: var(--color-primary);
  }
  .avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .avatar-placeholder {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text-muted);
    text-transform: uppercase;
    user-select: none;
  }
  .avatar-actions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
  .avatar-hint {
    font-size: 0.8rem;
    color: var(--color-text-subtle);
    margin: 0;
    font-style: italic;
  }
  /* Canopy styles */
  .canopy-field {
    margin-bottom: 1.5rem;
  }
  .field-label {
    display: block;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }
  .canopy-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid var(--color-border);
    border-radius: var(--border-radius-standard);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.95rem;
    transition: border-color 0.2s;
  }
  .canopy-input:focus {
    outline: none;
    border-color: var(--color-primary);
  }
  .field-help {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin: 0.5rem 0 0 0;
  }
  .char-count {
    float: right;
    opacity: 0.7;
  }
  .category-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 0.5rem;
  }
  .category-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    border: 2px solid var(--color-border);
    border-radius: var(--border-radius-button);
    cursor: pointer;
    transition: all 0.2s;
  }
  .category-checkbox:hover {
    border-color: var(--color-primary);
    background: rgba(44, 95, 45, 0.05);
  }
  .category-checkbox input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--color-primary);
    flex-shrink: 0;
  }
  .checkbox-label {
    font-size: 0.875rem;
    color: var(--color-text);
  }
  .canopy-toggle {
    margin-bottom: 1.5rem;
  }
</style>
