<script>
  import { Button, Spinner } from '$lib/ui';
  import { toast } from "$lib/ui/components/ui/toast";
  import { api } from "$lib/utils/api.js";

  /**
   * @typedef {Object} HealthStatus
   * @property {string} [status]
   * @property {string} [error]
   * @property {boolean} [r2_configured]
   * @property {boolean} [d1_configured]
   * @property {boolean} [kv_configured]
   * @property {boolean} [github_token_configured]
   * @property {string} [timestamp]
   */

  let clearingCache = $state(false);
  let cacheMessage = $state('');
  /** @type {HealthStatus | null} */
  let healthStatus = $state(null);
  let loadingHealth = $state(true);

  // Font settings state
  let currentFont = $state('lexend');
  let savingFont = $state(false);
  let fontMessage = $state('');
  let loadingFont = $state(true);

  async function fetchHealth() {
    loadingHealth = true;
    try {
      healthStatus = await api.get('/api/git/health');
    } catch (error) {
      toast.error('Failed to check system health');
      console.error('Failed to fetch health:', error);
      healthStatus = { status: 'error', error: error instanceof Error ? error.message : String(error) };
    }
    loadingHealth = false;
  }

  async function clearCache() {
    if (!confirm('Are you sure you want to clear the cache? This will cause the next requests to be slower while data is refetched.')) {
      return;
    }

    clearingCache = true;
    cacheMessage = '';

    try {
      await api.post('/api/admin/cache/clear', {});
      cacheMessage = 'Cache cleared successfully!';
    } catch (error) {
      cacheMessage = 'Error: ' + (error instanceof Error ? error.message : String(error));
    }

    clearingCache = false;
  }

  // Fetch current font setting
  async function fetchCurrentFont() {
    loadingFont = true;
    try {
      const data = await api.get('/api/settings');
      currentFont = data.font_family || 'lexend';
    } catch (error) {
      toast.error('Failed to load font settings');
      console.error('Failed to fetch font setting:', error);
      currentFont = 'lexend';
    }
    loadingFont = false;
  }

  // Save font setting
  async function saveFont() {
    savingFont = true;
    fontMessage = '';

    try {
      await api.put('/api/admin/settings', {
        setting_key: 'font_family',
        setting_value: currentFont
      });

      fontMessage = 'Font setting saved! Refresh to see changes site-wide.';
      // Apply immediately for preview
      /** @type {Record<string, string>} */
      const fontMap = {
        lexend: "'Lexend', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        atkinson: "'Atkinson Hyperlegible', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        opendyslexic: "'OpenDyslexic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        luciole: "'Luciole', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        nunito: "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        quicksand: "'Quicksand', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        manrope: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        'instrument-sans': "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        'plus-jakarta-sans': "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        cormorant: "'Cormorant', Georgia, 'Times New Roman', serif",
        'bodoni-moda': "'Bodoni Moda', Georgia, 'Times New Roman', serif",
        lora: "'Lora', Georgia, 'Times New Roman', serif",
        'eb-garamond': "'EB Garamond', Georgia, 'Times New Roman', serif",
        merriweather: "'Merriweather', Georgia, 'Times New Roman', serif",
        fraunces: "'Fraunces', Georgia, 'Times New Roman', serif",
        'ibm-plex-mono': "'IBM Plex Mono', 'Courier New', Consolas, monospace",
        cozette: "'Cozette', 'Courier New', Consolas, monospace",
        alagard: "'Alagard', fantasy, cursive",
        calistoga: "'Calistoga', Georgia, serif",
        caveat: "'Caveat', cursive, sans-serif"
      };
      document.documentElement.style.setProperty('--font-family-main', fontMap[currentFont] || fontMap.lexend);
    } catch (error) {
      fontMessage = 'Error: ' + (error instanceof Error ? error.message : String(error));
    }

    savingFont = false;
  }

  $effect(() => {
    fetchHealth();
    fetchCurrentFont();
  });
</script>

<div class="settings">
  <header class="page-header">
    <h1>Settings</h1>
    <p class="subtitle">Manage site configuration and maintenance</p>
  </header>

  <section class="settings-section">
    <h2>System Health</h2>
    {#if loadingHealth}
      <div class="health-grid">
        <Spinner />
      </div>
    {:else}
      <div class="health-grid">
        <div class="health-item">
          <span class="health-label">Overall Status</span>
          <span class="health-value" class:healthy={healthStatus?.status === 'healthy'} class:error={healthStatus?.status !== 'healthy'}>
            {healthStatus?.status === 'healthy' ? 'Healthy' : 'Issues Detected'}
          </span>
        </div>

        <div class="health-item">
          <span class="health-label">GitHub Token</span>
          <span class="health-value" class:healthy={healthStatus?.github_token_configured} class:error={!healthStatus?.github_token_configured}>
            {healthStatus?.github_token_configured ? 'Configured' : 'Missing'}
          </span>
        </div>

        <div class="health-item">
          <span class="health-label">KV Cache</span>
          <span class="health-value" class:healthy={healthStatus?.kv_configured} class:error={!healthStatus?.kv_configured}>
            {healthStatus?.kv_configured ? 'Connected' : 'Not Configured'}
          </span>
        </div>

        <div class="health-item">
          <span class="health-label">D1 Database</span>
          <span class="health-value" class:healthy={healthStatus?.d1_configured} class:error={!healthStatus?.d1_configured}>
            {healthStatus?.d1_configured ? 'Connected' : 'Not Configured'}
          </span>
        </div>

        {#if healthStatus?.timestamp}
          <div class="health-item full-width">
            <span class="health-label">Last Check</span>
            <span class="health-value">{new Date(healthStatus.timestamp).toLocaleString()}</span>
          </div>
        {/if}
      </div>
    {/if}

    <Button onclick={fetchHealth} variant="secondary" disabled={loadingHealth}>
      {loadingHealth ? 'Checking...' : 'Refresh Status'}
    </Button>
  </section>

  <section class="settings-section">
    <h2>Typography</h2>
    <p class="section-description">
      Choose the font family used across the entire site. Changes take effect immediately.
    </p>

    {#if loadingFont}
      <Spinner />
    {:else}
      <div class="font-selector">
        <label class="font-option" class:selected={currentFont === 'alagard'}>
          <input
            type="radio"
            name="font"
            value="alagard"
            bind:group={currentFont}
          />
          <div class="font-info">
            <span class="font-name" style="font-family: 'Alagard', sans-serif;">Alagard</span>
            <span class="font-description">Medieval pixel font for fantasy vibes</span>
          </div>
        </label>

        <label class="font-option" class:selected={currentFont === 'cozette'}>
          <input
            type="radio"
            name="font"
            value="cozette"
            bind:group={currentFont}
          />
          <div class="font-info">
            <span class="font-name" style="font-family: 'Cozette', sans-serif;">Cozette</span>
            <span class="font-description">Bitmap programming font</span>
          </div>
        </label>

        <label class="font-option" class:selected={currentFont === 'atkinson'}>
          <input
            type="radio"
            name="font"
            value="atkinson"
            bind:group={currentFont}
          />
          <div class="font-info">
            <span class="font-name" style="font-family: 'Atkinson Hyperlegible', sans-serif;">Atkinson Hyperlegible</span>
            <span class="font-description">Accessibility font for low vision</span>
          </div>
        </label>

        <label class="font-option" class:selected={currentFont === 'opendyslexic'}>
          <input
            type="radio"
            name="font"
            value="opendyslexic"
            bind:group={currentFont}
          />
          <div class="font-info">
            <span class="font-name" style="font-family: 'OpenDyslexic', sans-serif;">OpenDyslexic</span>
            <span class="font-description">Accessibility font for dyslexia</span>
          </div>
        </label>

        <label class="font-option" class:selected={currentFont === 'lexend'}>
          <input
            type="radio"
            name="font"
            value="lexend"
            bind:group={currentFont}
          />
          <div class="font-info">
            <span class="font-name" style="font-family: 'Lexend', sans-serif;">Lexend</span>
            <span class="font-description">Modern accessibility font for reading fluency (default)</span>
          </div>
        </label>

        <label class="font-option" class:selected={currentFont === 'cormorant'}>
          <input
            type="radio"
            name="font"
            value="cormorant"
            bind:group={currentFont}
          />
          <div class="font-info">
            <span class="font-name" style="font-family: 'Cormorant', serif;">Cormorant</span>
            <span class="font-description">Elegant display serif for fantasy aesthetic</span>
          </div>
        </label>

        <label class="font-option" class:selected={currentFont === 'quicksand'}>
          <input
            type="radio"
            name="font"
            value="quicksand"
            bind:group={currentFont}
          />
          <div class="font-info">
            <span class="font-name" style="font-family: 'Quicksand', sans-serif;">Quicksand</span>
            <span class="font-description">Rounded, friendly geometric sans-serif</span>
          </div>
        </label>
      </div>

      {#if fontMessage}
        <div class="message" class:success={fontMessage.includes('saved')} class:error={!fontMessage.includes('saved')}>
          {fontMessage}
        </div>
      {/if}

      <div class="button-row">
        <Button onclick={saveFont} variant="primary" disabled={savingFont}>
          {savingFont ? 'Saving...' : 'Save Font Setting'}
        </Button>
      </div>

      <p class="note">
        See <a href="/credits">font credits and licenses</a> for attribution.
      </p>
    {/if}
  </section>

  <section class="settings-section">
    <h2>Cache Management</h2>
    <p class="section-description">
      The site uses KV for caching API responses. Clearing the cache will cause
      data to be refetched from the source on the next request.
    </p>

    {#if cacheMessage}
      <div class="message" class:success={cacheMessage.includes('success')} class:error={!cacheMessage.includes('success')}>
        {cacheMessage}
      </div>
    {/if}

    <Button onclick={clearCache} variant="danger" disabled={clearingCache}>
      {clearingCache ? 'Clearing...' : 'Clear All Cache'}
    </Button>

    <p class="note">
      Note: The cache clear endpoint needs to be implemented at <code>/api/admin/cache/clear</code>
    </p>
  </section>

  <section class="settings-section">
    <h2>Environment</h2>
    <div class="env-info">
      <div class="env-item">
        <span class="env-label">Cache TTL</span>
        <span class="env-value">1 hour (3600 seconds)</span>
      </div>
      <div class="env-item">
        <span class="env-label">AI Cache TTL</span>
        <span class="env-value">6 hours (21600 seconds)</span>
      </div>
    </div>
  </section>

  <section class="settings-section">
    <h2>Links</h2>
    <ul class="links-list">
      <li>
        <a href="https://dash.cloudflare.com" target="_blank">Cloudflare Dashboard</a>
      </li>
      <li>
        <a href="https://github.com/AutumnsGrove/AutumnsGrove" target="_blank">GitHub Repository</a>
      </li>
      <li>
        <a href="https://github.com/AutumnsGrove/AutumnsGrove/actions" target="_blank">GitHub Actions</a>
      </li>
    </ul>
  </section>
</div>

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
  .settings-section {
    background: var(--mobile-menu-bg);
    border-radius: var(--border-radius-standard);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    transition: background-color 0.3s ease;
  }
  .settings-section h2 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    color: var(--color-text);
    transition: color 0.3s ease;
  }
  .section-description {
    margin: 0 0 1rem 0;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    transition: color 0.3s ease;
  }
  .health-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .health-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .health-item.full-width {
    grid-column: 1 / -1;
  }
  .health-label {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    transition: color 0.3s ease;
  }
  .health-value {
    font-weight: 600;
  }
  .health-value.healthy {
    color: var(--accent-success);
  }
  .health-value.error {
    color: var(--accent-danger);
  }
  .health-value.loading {
    color: var(--color-text-subtle);
    transition: color 0.3s ease;
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
  .note code {
    background: var(--color-bg-secondary);
    padding: 0.125rem 0.25rem;
    border-radius: var(--border-radius-small);
    font-size: 0.85em;
    transition: background-color 0.3s ease;
  }
  .env-info {
    display: grid;
    gap: 0.75rem;
  }
  .env-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-border);
    transition: border-color 0.3s ease;
  }
  .env-item:last-child {
    border-bottom: none;
  }
  .env-label {
    color: var(--color-text-muted);
    font-size: 0.9rem;
    transition: color 0.3s ease;
  }
  .env-value {
    font-weight: 500;
    font-size: 0.9rem;
  }
  .links-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .links-list li {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-border);
    transition: border-color 0.3s ease;
  }
  .links-list li:last-child {
    border-bottom: none;
  }
  .links-list a {
    color: var(--color-primary);
    text-decoration: none;
    font-size: 0.9rem;
    transition: color 0.3s ease;
  }
  .links-list a:hover {
    text-decoration: underline;
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
    transition: border-color 0.2s, background-color 0.2s;
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
  .loading-text {
    color: var(--color-text-muted);
    font-style: italic;
  }
</style>
