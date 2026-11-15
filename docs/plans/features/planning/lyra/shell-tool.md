---
title: "Lyra shell tool"
status: planning
category: features
---

# The shell tool

Last updated: 2026-11-15. Decisions 79 to 82 are decided. Decision 78 and the leftovers (decision 89) are proposed. Built from Nova's `tools/bash/`, `permission/`, and `docs/DECISIONS.md`, and from the README of your `pi-background` extension. Nothing was run.

This is a later slice (see `first-slice.md`). The timeline does not use it. It is for hosts with a real shell, such as a GitHub Action runner doing a review (decisions 16, 17, and 38).

## What is already decided

- A fifth, optional slot runs a command and returns its output. The tool is called `bash` on every host, a real shell on Node, and absent on Workers at first (decision 17).
- Models prefer the command-line tools they were trained on, so a runner task gets a real `bash` (decision 16).
- A command still running at its deadline keeps running instead of being killed. The model gets an id and carries on, and is told when it exits. While an approval is pending, that notice queues (decision 38).
- Each tool is allow, ask, or deny in the task's recipe, with a risk label setting the default. A request that needs an answer and nothing can deliver it is denied (decision 35).
- A tool declares whether it is safe to repeat, defaulting to no (decision 24).

## Facts from Nova and `pi-background`

**Nova's `bash` tool** (`tools/bash/`):
- A foreground command is **killed at its timeout**: 120 seconds by default, 600 at most. Nova has no background mode in this tool.
- Output is captured as a tail, capped at 51,200 bytes, with a truncated flag.
- Stdin is the null device, so a command that reads input cannot hang.
- The **whole process group** is force-killed at the end of every call, including a clean exit, so a child that redirected its output cannot outlive the call (D51).
- Nova's own provider keys, OAuth tokens, and server token are **removed from the environment** the command sees (D135). The reason is on record: a model-run `env` printed the user's keys into the transcript, the session file, and the provider's logs, and an injected command could exfiltrate them. Other variables stay, because builds often need `GITHUB_TOKEN` or a registry token. Extra variables can be hidden by name, and the default can be turned off.

**Nova's permission policy** (`permission/`):
- Three actions, allow, ask, deny. Rules are evaluated together and the **most restrictive match wins**. `ask` with no one to answer becomes the headless action, which defaults to deny and may not itself be ask.
- An allow rule **cannot match a command containing a shell control operator** (`; & | \` > <`, a newline, or `$(`), so `git status*` does not allow `git status; rm -rf /`. A consequence: a pipeline like `grep foo | head` never matches a prefix allow rule, so it asks, and headless it is denied.

**`pi-background`** (your extension, from its README):
- A foreground command still running at its deadline (120 seconds by default) **moves to the background** instead of being killed. `sleep` is killed instead. `run_in_background: true` starts a command detached right away.
- A `jobs` tool with `list`, `output`, `attach` (wait, default 120 seconds, at most 600), `kill`, `search` (regex across recent job logs), and `clear`.
- A job notifies **exactly once** when it exits, and reading a finished job suppresses a pending notice. While a question is open, notices queue until it closes.
- Finished jobs stay in the list for 10 minutes. The logs are searched over their last 4 MB.

**`pi-review`'s guard** (`.github/workflows/pi-review.yml` in Nova): the review job runs only for pull requests from the same repository, not from forks, so untrusted code does not get the agent and its secrets.

## Proposed

### 78. The tool and its defaults
One `bash` tool, with `command`, an optional `timeout`, and an optional `run_in_background`. Defaults taken from Nova and `pi-background`, which agree: a 120 second deadline, at which the command moves to the background (decision 38), and a 600 second ceiling for waiting. Output is a tail capped at 51,200 bytes, with a truncated flag. Stdin is null. The working directory is fixed for the run. When a foreground call ends, its whole process group is killed. All of these are configuration, with these as the defaults.

### 79. Background jobs (decided)
A started job has an id. A `jobs` tool lists, reads output from, waits for, and kills jobs. Each job notifies once on exit, and the notice queues behind a pending approval (decision 34 note). Finished jobs are remembered **for the life of the run**, where `pi-background` keeps them 10 minutes, because a Lyra run can park for hours and a person's answer may be what the next step needs. Logs keep a capped tail, 4 MiB by default.

### 80. If the host is lost (decided)
A command running when the host dies is not reattached in version one. On resume, the tool call has no result, and `bash` is not safe to repeat (decision 24), so the model is told the outcome is unknown. A background job from before the loss is reported as lost, with that reason. Reattaching would mean persisting process ids and log paths and checking they are still the same process, which is a lot of machinery for a rare case.

### 81. Command policy: strict by default, open by recipe (decided)
- **Strict (the default):** Nova's rules as they are. Allow patterns, most restrictive match wins, headless is deny, and an allow rule never matches a command with a control operator.
- **Open (set in a recipe):** for a host declared disposable, such as a runner that is thrown away after the job. Commands are allowed, with a deny list for the clearly destructive ones, and the credential scrub (below) stays on. A pipeline works.
A recipe picks one. A task that reads untrusted text (a pull request from outside) should not use open mode unless the host also guards who triggers the run, as `pi-review` does by running only same-repository pull requests.

### 82. The credential scrub (decided)
Lyra's own secrets are always removed from the command's environment: the model keys (`OPENROUTER_API_KEY`, `OPENCODE_GO_API_KEY`, `OPENCODE_API_KEY`), any token Lyra itself holds, and the tenant secrets it uses. A recipe can add more names to hide (for example `GITHUB_TOKEN` for a review that does not need to push). The default does not scrub by pattern, because Nova found that breaks builds, and a recipe cannot turn off the scrub of Lyra's own secrets.

### Where it lives
A Node-only entry point, `@autumnsgrove/lyra/node`, holding the real shell and a file-backed storage adapter. It arrives with the Node host in a later slice and does not touch the core (decision 69). The slot's contract is small: run a command with a working directory, an environment, a deadline, and a cancel signal, and return the exit code, the output tail, and whether it timed out or was truncated, plus start, read, wait, kill, and list for background jobs. Workers have no implementation at first. A virtual shell such as `just-bash`, whose core works in browsers, could fill it later. It is beta software and has not been tried on Workers.

## Tests

The cases below come from Nova's catalog, adapted. Each becomes a spec row with an ID and a test (decision 62).

- Exit code zero, non-zero, killed by a signal, command not found, no output, output over the cap, only stderr, binary output, invalid UTF-8, a single very long line.
- A timeout, and the **whole process group is killed**, children and grandchildren included. A call cancelled mid-command. A command that reads stdin must not hang. A command that backgrounds a child and exits. A missing working directory.
- The environment is as specified, and the model keys are absent. A recipe's extra names are absent. `env` and `printenv` output contains no key.
- Background: a command moves to the background at the deadline, `sleep` is killed instead, a job notifies exactly once, reading a finished job suppresses its pending notice, a notice queues behind a pending approval, a job is remembered after a run parks, and a job from before a host loss is reported lost.
- Policy: a prefix allow rule does not match `git status; rm -rf /`, a pipeline asks in strict mode and is allowed in open mode, a deny rule beats an allow rule, and headless ask becomes deny.
- A fake shell with the same scripts as the fake model, so the core and the policy are tested without a real process, and a small set of tests with a real shell on Node.
- Fuzzing the command splitter and the policy matcher with hostile strings: quotes, escapes, unicode, very long input, nested substitutions.

## Leftovers (proposed, decision 89)

- The deny list for open mode is written when the shell is built.
- A recipe names allow patterns directly in version one. Named sets (for example `tests`, `git-read`) can come later.
- There is no "allow for this session" answer in version one. It only matters in interactive use, and Reverie's flow is preview then confirm.
