<!--
  CodeExample.svelte
  Syntax-highlighted code block with copy functionality

  Usage:
  <CodeExample language="typescript" filename="src/routes/+layout.svelte">
    {codeString}
  </CodeExample>
-->
<script lang="ts">
  import type { CodeExampleProps } from '../../types/index.js';
  import type { Snippet } from 'svelte';
  import { Copy, Check, FileCode } from 'lucide-svelte';

  interface Props extends CodeExampleProps {
    children: Snippet;
  }

  let { language, filename, children }: Props = $props();

  let copied = $state(false);
  let copyFailed = $state(false);
  let codeElement: HTMLElement | null = $state(null);

  async function copyCode() {
    if (!codeElement) return;
    const text = codeElement.textContent || '';
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch {
      console.error('Failed to copy code');
      copyFailed = true;
      setTimeout(() => {
        copyFailed = false;
      }, 3000);
    }
  }

  const languageLabels: Record<string, string> = {
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    js: 'JavaScript',
    svelte: 'Svelte',
    html: 'HTML',
    css: 'CSS',
    json: 'JSON',
    bash: 'Bash',
    shell: 'Shell'
  };
</script>

<div class="code-example" data-language={language}>
  <header class="code-header">
    <div class="code-info">
      <FileCode size={14} />
      {#if filename}
        <span class="filename">{filename}</span>
      {/if}
      <span class="language">{languageLabels[language] ?? language}</span>
    </div>
    <button class="copy-btn" class:copy-failed={copyFailed} onclick={copyCode} aria-label="Copy code">
      {#if copied}
        <Check size={14} />
        <span>Copied!</span>
      {:else if copyFailed}
        <Copy size={14} />
        <span>Copy failed</span>
      {:else}
        <Copy size={14} />
        <span>Copy</span>
      {/if}
    </button>
  </header>

  <pre class="code-content"><code bind:this={codeElement}>{@render children()}</code></pre>
</div>

<style>
  .code-example {
    --code-bg: #1c1917;
    --code-border: #292524;
    --code-text: #e7e5e4;
    --code-comment: #78716c;
    --code-keyword: #f59e0b;
    --code-string: #22c55e;
    --code-function: #3b82f6;

    border-radius: 0.75rem;
    overflow: hidden;
    border: 1px solid var(--color-border-subtle, var(--code-border));
  }

  .code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.625rem 1rem;
    background: var(--code-border);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .code-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--code-comment);
  }

  .filename {
    font-size: 0.8125rem;
    color: var(--code-text);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .language {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.125rem 0.5rem;
    background: rgba(22, 163, 74, 0.15);
    color: #4ade80;
    border-radius: 0.25rem;
    font-weight: 600;
  }

  .copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.375rem;
    color: var(--code-comment);
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .copy-btn:hover {
    background: rgba(255, 255, 255, 0.05);
    color: var(--code-text);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .copy-btn.copy-failed {
    color: #f87171;
    border-color: rgba(248, 113, 113, 0.3);
  }

  .code-content {
    margin: 0;
    padding: 1rem;
    background: var(--code-bg);
    overflow-x: auto;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--code-text);
    tab-size: 2;
  }

  .code-content code {
    display: block;
    white-space: pre;
  }

  /* Basic syntax highlighting via CSS */
  :global(.code-content .keyword) {
    color: var(--code-keyword);
  }

  :global(.code-content .string) {
    color: var(--code-string);
  }

  :global(.code-content .comment) {
    color: var(--code-comment);
    font-style: italic;
  }

  :global(.code-content .function) {
    color: var(--code-function);
  }

  @media (prefers-reduced-motion: reduce) {
    .copy-btn {
      transition: none;
    }
  }
</style>
