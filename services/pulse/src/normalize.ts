/**
 * Pulse Worker — Event Payload Normalization
 *
 * Transforms raw GitHub webhook payloads into our normalized PulseEvent format.
 * Each handler is a simple mapping function (10-20 lines).
 */

import type { NormalizedEvent } from "./types";

/**
 * Normalize a GitHub webhook payload into a PulseEvent.
 * Returns null for unsupported events or actions we don't track.
 */
export function normalizeEvent(
  eventType: string,
  payload: Record<string, any>,
): NormalizedEvent | null {
  switch (eventType) {
    case "push":
      return normalizePush(payload);
    case "pull_request":
      return normalizePullRequest(payload);
    case "issues":
      return normalizeIssues(payload);
    case "release":
      return normalizeRelease(payload);
    case "workflow_run":
      return normalizeWorkflowRun(payload);
    case "star":
      return normalizeStar(payload);
    case "fork":
      return normalizeFork(payload);
    case "create":
      return normalizeCreate(payload);
    case "delete":
      return normalizeDelete(payload);
    default:
      return null;
  }
}

function baseFields(payload: Record<string, any>): {
  repoName: string;
  repoFullName: string;
  actor: string;
} {
  return {
    repoName: payload.repository?.name ?? "unknown",
    repoFullName: payload.repository?.full_name ?? "unknown/unknown",
    actor: payload.sender?.login ?? "unknown",
  };
}

function normalizePush(payload: Record<string, any>): NormalizedEvent {
  const commits = payload.commits ?? [];
  const headCommit = payload.head_commit;
  const ref = payload.ref?.replace("refs/heads/", "") ?? null;

  let additions = 0;
  let deletions = 0;
  let filesChanged = 0;

  for (const commit of commits) {
    additions += commit.added?.length ?? 0;
    deletions += commit.removed?.length ?? 0;
    filesChanged +=
      (commit.added?.length ?? 0) +
      (commit.removed?.length ?? 0) +
      (commit.modified?.length ?? 0);
  }

  return {
    eventType: "push",
    action: null,
    ...baseFields(payload),
    title: headCommit?.message?.split("\n")[0] ?? null,
    ref,
    data: {
      commits: commits.length,
      additions,
      deletions,
      files_changed: filesChanged,
      sha: headCommit?.id?.substring(0, 7) ?? null,
    },
    occurredAt: headCommit?.timestamp
      ? Math.floor(new Date(headCommit.timestamp).getTime() / 1000)
      : Math.floor(Date.now() / 1000),
  };
}

function normalizePullRequest(
  payload: Record<string, any>,
): NormalizedEvent | null {
  const action = payload.action;
  if (!["opened", "closed", "merged", "reopened"].includes(action)) return null;

  const pr = payload.pull_request;
  const merged = pr?.merged === true;
  const effectiveAction = merged ? "merged" : action;

  let mergeHours: number | undefined;
  if (merged && pr.created_at && pr.merged_at) {
    const created = new Date(pr.created_at).getTime();
    const mergedAt = new Date(pr.merged_at).getTime();
    mergeHours = Math.round(((mergedAt - created) / 3600000) * 10) / 10;
  }

  return {
    eventType: "pull_request",
    action: effectiveAction,
    ...baseFields(payload),
    title: pr?.title ?? null,
    ref: pr?.head?.ref ?? null,
    data: {
      number: pr?.number,
      draft: pr?.draft ?? false,
      labels: (pr?.labels ?? []).map((l: any) => l.name),
      merged,
      merge_hours: mergeHours,
    },
    occurredAt: pr?.updated_at
      ? Math.floor(new Date(pr.updated_at).getTime() / 1000)
      : Math.floor(Date.now() / 1000),
  };
}

function normalizeIssues(payload: Record<string, any>): NormalizedEvent | null {
  const action = payload.action;
  if (!["opened", "closed", "reopened", "labeled"].includes(action))
    return null;

  const issue = payload.issue;

  return {
    eventType: "issues",
    action,
    ...baseFields(payload),
    title: issue?.title ?? null,
    ref: null,
    data: {
      number: issue?.number,
      labels: (issue?.labels ?? []).map((l: any) => l.name),
    },
    occurredAt: issue?.updated_at
      ? Math.floor(new Date(issue.updated_at).getTime() / 1000)
      : Math.floor(Date.now() / 1000),
  };
}

function normalizeRelease(
  payload: Record<string, any>,
): NormalizedEvent | null {
  if (payload.action !== "published") return null;

  const release = payload.release;

  return {
    eventType: "release",
    action: "published",
    ...baseFields(payload),
    title: release?.name ?? release?.tag_name ?? null,
    ref: release?.tag_name ?? null,
    data: {
      tag: release?.tag_name,
      prerelease: release?.prerelease ?? false,
      name: release?.name,
    },
    occurredAt: release?.published_at
      ? Math.floor(new Date(release.published_at).getTime() / 1000)
      : Math.floor(Date.now() / 1000),
  };
}

function normalizeWorkflowRun(
  payload: Record<string, any>,
): NormalizedEvent | null {
  if (payload.action !== "completed") return null;

  const run = payload.workflow_run;

  return {
    eventType: "workflow_run",
    action: "completed",
    ...baseFields(payload),
    title: run?.name ?? null,
    ref: run?.head_branch ?? null,
    data: {
      name: run?.name,
      conclusion: run?.conclusion ?? "unknown",
      branch: run?.head_branch,
    },
    occurredAt: run?.updated_at
      ? Math.floor(new Date(run.updated_at).getTime() / 1000)
      : Math.floor(Date.now() / 1000),
  };
}

function normalizeStar(payload: Record<string, any>): NormalizedEvent | null {
  const action = payload.action;
  if (!["created", "deleted"].includes(action)) return null;

  return {
    eventType: "star",
    action,
    ...baseFields(payload),
    title: action === "created" ? "Starred" : "Unstarred",
    ref: null,
    data: {
      total: payload.repository?.stargazers_count ?? 0,
    },
    occurredAt: Math.floor(Date.now() / 1000),
  };
}

function normalizeFork(payload: Record<string, any>): NormalizedEvent | null {
  const forkee = payload.forkee;

  return {
    eventType: "fork",
    action: "created",
    ...baseFields(payload),
    title: `Forked to ${forkee?.full_name ?? "unknown"}`,
    ref: null,
    data: {
      total: payload.repository?.forks_count ?? 0,
      forker: forkee?.owner?.login ?? "unknown",
    },
    occurredAt: forkee?.created_at
      ? Math.floor(new Date(forkee.created_at).getTime() / 1000)
      : Math.floor(Date.now() / 1000),
  };
}

function normalizeCreate(payload: Record<string, any>): NormalizedEvent {
  return {
    eventType: "create",
    action: null,
    ...baseFields(payload),
    title: `Created ${payload.ref_type} ${payload.ref ?? ""}`.trim(),
    ref: payload.ref,
    data: {
      ref_type: payload.ref_type,
    },
    occurredAt: Math.floor(Date.now() / 1000),
  };
}

function normalizeDelete(payload: Record<string, any>): NormalizedEvent {
  return {
    eventType: "delete",
    action: null,
    ...baseFields(payload),
    title: `Deleted ${payload.ref_type} ${payload.ref ?? ""}`.trim(),
    ref: payload.ref,
    data: {
      ref_type: payload.ref_type,
    },
    occurredAt: Math.floor(Date.now() / 1000),
  };
}
