<!--
  ReportModal — Report a post for moderation.

  Reason picker (spam/harassment/misinformation/other) with optional detail text.
-->
<script lang="ts">
  interface Props {
    postId: string;
    onclose: () => void;
    onsubmit: (postId: string, reason: string, details: string) => void;
  }

  const { postId, onclose, onsubmit }: Props = $props();

  let selectedReason = $state('');
  let details = $state('');
  let submitting = $state(false);

  const reasons = [
    { id: 'spam', label: 'Spam', description: 'Irrelevant or promotional content' },
    { id: 'harassment', label: 'Harassment', description: 'Targeting or bullying someone' },
    { id: 'misinformation', label: 'Misinformation', description: 'Deliberately false or misleading' },
    { id: 'other', label: 'Other', description: 'Something else that needs attention' },
  ];

  async function handleSubmit() {
    if (!selectedReason || submitting) return;
    submitting = true;
    onsubmit(postId, selectedReason, details);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
  role="dialog"
  aria-modal="true"
  aria-label="Report post"
>
  <!-- Modal -->
  <div class="w-full max-w-md rounded-xl bg-white/95 shadow-xl backdrop-blur-md dark:bg-cream-100/90 border border-white/20 dark:border-cream-100/20">
    <div class="px-6 pt-5 pb-4">
      <h2 class="text-lg font-serif font-semibold text-foreground">Report this post</h2>
      <p class="mt-1 text-sm text-foreground-muted">
        Help keep the meadow safe. Reports are reviewed by our team.
      </p>
    </div>

    <div class="px-6 pb-4">
      <fieldset>
        <legend class="sr-only">Reason for reporting</legend>
        <div class="flex flex-col gap-2">
          {#each reasons as reason}
            <label
              class="flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors {selectedReason === reason.id
                ? 'border-grove-400 bg-grove-50/50 dark:border-grove-500 dark:bg-cream-100/20'
                : 'border-divider hover:bg-grove-50/30 dark:hover:bg-cream-100/10'}"
            >
              <input
                type="radio"
                name="reason"
                value={reason.id}
                bind:group={selectedReason}
                class="mt-0.5"
              />
              <div>
                <span class="text-sm font-medium text-foreground">{reason.label}</span>
                <span class="block text-xs text-foreground-muted">{reason.description}</span>
              </div>
            </label>
          {/each}
        </div>
      </fieldset>

      <!-- Optional details -->
      <div class="mt-4">
        <label for="report-details" class="block text-sm font-medium text-foreground mb-1">
          Details (optional)
        </label>
        <textarea
          id="report-details"
          bind:value={details}
          rows="3"
          maxlength="500"
          placeholder="Anything else you'd like us to know..."
          class="w-full rounded-lg border border-divider bg-white/60 px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-grove-400 focus:outline-none focus:ring-1 focus:ring-grove-400 dark:bg-cream-100/20 dark:focus:border-grove-500 dark:focus:ring-grove-500"
        ></textarea>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-3 border-t border-divider px-6 py-4">
      <button
        type="button"
        class="rounded-lg px-4 py-2 text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
        onclick={onclose}
      >
        Cancel
      </button>
      <button
        type="button"
        class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        disabled={!selectedReason || submitting}
        onclick={handleSubmit}
      >
        {submitting ? 'Reporting...' : 'Submit report'}
      </button>
    </div>
  </div>
</div>
