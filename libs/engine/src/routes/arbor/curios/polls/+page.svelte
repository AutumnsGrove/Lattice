<script lang="ts">
  import { enhance } from "$app/forms";
  import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
  import { BarChart3, ArrowLeft, Plus, Trash2 } from "lucide-svelte";
  import {
    POLL_TYPE_OPTIONS,
    RESULTS_VISIBILITY_OPTIONS,
    isPollClosed,
  } from "$lib/curios/polls";

  let { data, form } = $props();

  let showCreateForm = $state(false);
  let question = $state("");
  let description = $state("");
  let pollType = $state("single");
  let resultsVisibility = $state("after-vote");
  let optionInputs = $state(["", "", ""]);
  let isPinned = $state(false);
  let closeDate = $state("");
  let isSubmitting = $state(false);

  // Show toast
  $effect(() => {
    if (form?.success && form?.pollCreated) {
      toast.success("Poll created!");
      showCreateForm = false;
      question = "";
      description = "";
      optionInputs = ["", "", ""];
    } else if (form?.success && form?.pollRemoved) {
      toast.success("Poll deleted.");
    } else if (form?.error) {
      toast.error("Failed", { description: form.error });
    }
  });

  function addOption() {
    if (optionInputs.length < 20) {
      optionInputs = [...optionInputs, ""];
    }
  }

  function removeOption(index: number) {
    if (optionInputs.length > 2) {
      optionInputs = optionInputs.filter((_, i) => i !== index);
    }
  }
</script>

<svelte:head>
  <title>Polls - Admin</title>
</svelte:head>

<div class="polls-admin">
  <header class="page-header">
    <div class="header-top">
      <GlassButton href="/arbor/curios" variant="ghost" class="back-link">
        <ArrowLeft class="w-4 h-4" />
        Back to Curios
      </GlassButton>
    </div>
    <div class="title-row">
      <BarChart3 class="header-icon" />
      <h1>Polls</h1>
    </div>
    <p class="subtitle">
      Ask your visitors anything — live results, no login required.
    </p>
  </header>

  <div class="section-header">
    <h3>Your Polls</h3>
    <GlassButton
      variant="accent"
      onclick={() => (showCreateForm = !showCreateForm)}
    >
      <Plus class="w-4 h-4" />
      New Poll
    </GlassButton>
  </div>

  {#if showCreateForm}
    <GlassCard class="create-card">
      <h4>Create a Poll</h4>
      <form
        method="POST"
        action="?/create"
        use:enhance={() => {
          isSubmitting = true;
          return async ({ update }) => {
            isSubmitting = false;
            await update();
          };
        }}
      >
        <div class="form-section">
          <div class="input-group">
            <label class="input-label" for="question">Question</label>
            <input
              id="question"
              type="text"
              name="question"
              bind:value={question}
              placeholder="What's your favorite season?"
              maxlength="300"
              class="text-input"
              required
            />
          </div>

          <div class="input-group">
            <label class="input-label" for="description">Description <span class="optional">(optional)</span></label>
            <input
              id="description"
              type="text"
              name="description"
              bind:value={description}
              placeholder="A quick poll for the community..."
              maxlength="500"
              class="text-input"
            />
          </div>
        </div>

        <div class="form-section">
          <h4>Options</h4>
          {#each optionInputs as _, i}
            <div class="option-row">
              <input
                type="text"
                name="option_{i}"
                bind:value={optionInputs[i]}
                placeholder="Option {i + 1}"
                maxlength="200"
                class="text-input"
              />
              {#if optionInputs.length > 2}
                <button
                  type="button"
                  class="remove-option"
                  onclick={() => removeOption(i)}
                  aria-label="Remove option {i + 1}"
                >
                  &times;
                </button>
              {/if}
            </div>
          {/each}
          {#if optionInputs.length < 20}
            <button type="button" class="add-option-btn" onclick={addOption}>
              + Add Option
            </button>
          {/if}
        </div>

        <div class="form-section settings-row">
          <div class="input-group">
            <label class="input-label" for="pollType">Type</label>
            <select id="pollType" name="pollType" bind:value={pollType} class="select-input">
              {#each POLL_TYPE_OPTIONS as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>
          <div class="input-group">
            <label class="input-label" for="resultsVisibility">Results Visible</label>
            <select id="resultsVisibility" name="resultsVisibility" bind:value={resultsVisibility} class="select-input">
              {#each RESULTS_VISIBILITY_OPTIONS as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="form-actions">
          <GlassButton variant="ghost" onclick={() => (showCreateForm = false)}>
            Cancel
          </GlassButton>
          <GlassButton
            type="submit"
            variant="accent"
            disabled={isSubmitting || !question.trim() || optionInputs.filter((o) => o.trim()).length < 2}
          >
            {isSubmitting ? "Creating..." : "Create Poll"}
          </GlassButton>
        </div>
      </form>
    </GlassCard>
  {/if}

  {#if data.polls && data.polls.length > 0}
    <div class="poll-list">
      {#each data.polls as poll (poll.id)}
        <GlassCard class="poll-card">
          <div class="poll-header">
            <div class="poll-info">
              <h4>{poll.question}</h4>
              <span class="poll-meta">
                {poll.options.length} options &middot; {poll.voteCount} vote{poll.voteCount !== 1 ? "s" : ""}
                {#if poll.isPinned}
                  &middot; Pinned
                {/if}
                {#if poll.closeDate && isPollClosed(poll.closeDate)}
                  &middot; Closed
                {/if}
              </span>
            </div>
            <form
              method="POST"
              action="?/remove"
              use:enhance={({ cancel }) => {
                if (!confirm("Delete this poll and all votes?")) {
                  cancel();
                  return;
                }
                return async ({ update }) => {
                  await update();
                };
              }}
            >
              <input type="hidden" name="pollId" value={poll.id} />
              <button type="submit" class="remove-btn" aria-label="Delete poll">
                <Trash2 class="w-4 h-4" />
              </button>
            </form>
          </div>
          <div class="poll-options-preview">
            {#each poll.options as option}
              <span class="option-chip">{option.text}</span>
            {/each}
          </div>
        </GlassCard>
      {/each}
    </div>
  {:else if !showCreateForm}
    <GlassCard class="empty-card">
      <p class="empty-state">
        No polls yet. Create one to start asking your visitors questions.
      </p>
    </GlassCard>
  {/if}
</div>

<style>
  .polls-admin { max-width: 800px; margin: 0 auto; }
  .page-header { margin-bottom: 2rem; }
  .header-top { margin-bottom: 1rem; }
  .title-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
  :global(.header-icon) { width: 2rem; height: 2rem; color: var(--color-primary); }
  h1 { font-size: 2rem; font-weight: 700; color: var(--color-text); margin: 0; }
  .subtitle { color: var(--color-text-muted); font-size: 1rem; line-height: 1.6; }
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; }
  .section-header h3 { font-size: 1.1rem; font-weight: 600; color: var(--color-text); margin: 0; }

  :global(.create-card), :global(.poll-card), :global(.empty-card) { padding: 1.5rem !important; margin-bottom: 1rem; }
  :global(.create-card) h4 { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0 0 1rem; }

  .form-section { margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--color-border, #e5e7eb); }
  .form-section:last-of-type { border-bottom: none; }
  .form-section h4 { font-size: 0.95rem; font-weight: 600; color: var(--color-text); margin: 0 0 0.75rem; }

  .input-group { margin-bottom: 0.75rem; }
  .input-label { display: block; font-size: 0.85rem; font-weight: 500; color: var(--color-text); margin-bottom: 0.375rem; }
  .optional { font-weight: 400; color: var(--color-text-muted); }
  .text-input, .select-input { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.5rem; font-size: 0.9rem; color: var(--color-text); background: hsl(var(--background)); }
  .text-input:focus, .select-input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent); }

  .settings-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

  .option-row { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
  .option-row .text-input { flex: 1; }
  .remove-option { display: flex; align-items: center; justify-content: center; min-width: 2.75rem; min-height: 2.75rem; background: none; border: none; color: var(--color-text-muted); cursor: pointer; font-size: 1.25rem; border-radius: 0.25rem; }
  .remove-option:hover { color: hsl(var(--destructive)); background: hsl(var(--destructive) / 0.1); }
  .add-option-btn { background: none; border: 1px dashed var(--color-border, #e5e7eb); border-radius: 0.5rem; padding: 0.5rem; width: 100%; color: var(--color-text-muted); cursor: pointer; font-size: 0.85rem; transition: all 0.2s ease; }
  .add-option-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }

  .form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }

  .poll-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .poll-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 0.75rem; }
  .poll-info h4 { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0 0 0.25rem; }
  .poll-meta { font-size: 0.8rem; color: var(--color-text-muted); }
  .remove-btn { display: flex; align-items: center; justify-content: center; min-width: 2.75rem; min-height: 2.75rem; background: none; border: 1px solid transparent; border-radius: 0.5rem; color: var(--color-text-muted); cursor: pointer; transition: all 0.2s ease; }
  .remove-btn:hover { color: hsl(var(--destructive)); background: hsl(var(--destructive) / 0.1); border-color: hsl(var(--destructive) / 0.2); }

  .poll-options-preview { display: flex; flex-wrap: wrap; gap: 0.375rem; }
  .option-chip { font-size: 0.8rem; padding: 0.25rem 0.625rem; border-radius: 999px; background: var(--grove-overlay-8, rgba(0, 0, 0, 0.06)); color: var(--color-text-muted); }
  .empty-state { text-align: center; padding: 1.5rem; color: var(--color-text-muted); font-size: 0.95rem; }

  @media (max-width: 640px) {
    .title-row { flex-wrap: wrap; }
    .section-header { flex-wrap: wrap; align-items: stretch; }
    .settings-row { grid-template-columns: 1fr; }
    .poll-header { flex-wrap: wrap; }
    .option-row { flex-wrap: wrap; }
    .form-actions { flex-wrap: wrap; }
  }
</style>
