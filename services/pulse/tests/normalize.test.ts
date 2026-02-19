/**
 * Tests for Pulse Worker — Event Normalization
 *
 * Verifies each GitHub webhook event type is correctly normalized
 * into our internal format, and unsupported events/actions are rejected.
 */

import { describe, it, expect } from "vitest";
import { normalizeEvent } from "../src/normalize";

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function makeRepo(name = "my-repo", fullName = "user/my-repo") {
  return { name, full_name: fullName };
}

function makeSender(login = "octocat") {
  return { login };
}

function basePL(overrides: Record<string, unknown> = {}) {
  return {
    repository: makeRepo(),
    sender: makeSender(),
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// push
// ──────────────────────────────────────────────────────────────────────────────

describe("normalizeEvent — push", () => {
  it("normalizes a simple push event", () => {
    const payload = basePL({
      ref: "refs/heads/main",
      head_commit: {
        id: "abc1234567890",
        message: "fix: resolve issue #42\n\nLong description",
        timestamp: "2025-01-15T10:00:00Z",
      },
      commits: [
        {
          added: ["file1.ts"],
          removed: [],
          modified: ["file2.ts"],
        },
      ],
    });

    const result = normalizeEvent("push", payload);

    expect(result).not.toBeNull();
    expect(result!.eventType).toBe("push");
    expect(result!.action).toBeNull();
    expect(result!.repoName).toBe("my-repo");
    expect(result!.repoFullName).toBe("user/my-repo");
    expect(result!.actor).toBe("octocat");
    expect(result!.title).toBe("fix: resolve issue #42");
    expect(result!.ref).toBe("main");
    expect(result!.data).toMatchObject({
      commits: 1,
      additions: 1,
      deletions: 0,
      files_changed: 2,
      sha: "abc1234",
    });
    expect(result!.occurredAt).toBe(
      Math.floor(new Date("2025-01-15T10:00:00Z").getTime() / 1000),
    );
  });

  it("uses Date.now() when head_commit has no timestamp", () => {
    const before = Math.floor(Date.now() / 1000);
    const payload = basePL({
      ref: "refs/heads/main",
      head_commit: { id: "abc", message: "test" },
      commits: [],
    });

    const result = normalizeEvent("push", payload)!;
    const after = Math.floor(Date.now() / 1000);

    expect(result.occurredAt).toBeGreaterThanOrEqual(before);
    expect(result.occurredAt).toBeLessThanOrEqual(after);
  });

  it("handles push with no commits", () => {
    const payload = basePL({
      ref: "refs/heads/main",
      head_commit: null,
      commits: [],
    });

    const result = normalizeEvent("push", payload)!;
    expect(result.data).toMatchObject({
      commits: 0,
      additions: 0,
      deletions: 0,
      files_changed: 0,
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// pull_request
// ──────────────────────────────────────────────────────────────────────────────

describe("normalizeEvent — pull_request", () => {
  function prPayload(action: string, merged = false) {
    return basePL({
      action,
      pull_request: {
        number: 42,
        title: "Add new feature",
        draft: false,
        labels: [{ name: "enhancement" }],
        merged,
        head: { ref: "feature-branch" },
        created_at: "2025-01-10T10:00:00Z",
        merged_at: merged ? "2025-01-15T10:00:00Z" : null,
        updated_at: "2025-01-15T10:00:00Z",
      },
    });
  }

  it("normalizes PR opened", () => {
    const result = normalizeEvent("pull_request", prPayload("opened"))!;
    expect(result.action).toBe("opened");
    expect(result.title).toBe("Add new feature");
    expect(result.ref).toBe("feature-branch");
    expect(result.data).toMatchObject({ number: 42, draft: false });
  });

  it("normalizes PR closed (merged)", () => {
    const result = normalizeEvent("pull_request", prPayload("closed", true))!;
    expect(result.action).toBe("merged");
    expect(result.data).toMatchObject({ merged: true });
    expect((result.data as any).merge_hours).toBeCloseTo(120, 0);
  });

  it("normalizes PR closed (not merged)", () => {
    const result = normalizeEvent("pull_request", prPayload("closed", false))!;
    expect(result.action).toBe("closed");
    expect(result.data).toMatchObject({ merged: false });
  });

  it("rejects unsupported PR actions", () => {
    expect(normalizeEvent("pull_request", prPayload("edited"))).toBeNull();
    expect(
      normalizeEvent("pull_request", prPayload("review_requested")),
    ).toBeNull();
    expect(normalizeEvent("pull_request", prPayload("synchronize"))).toBeNull();
  });

  it("normalizes PR reopened", () => {
    const result = normalizeEvent("pull_request", prPayload("reopened"))!;
    expect(result).not.toBeNull();
    expect(result.action).toBe("reopened");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// issues
// ──────────────────────────────────────────────────────────────────────────────

describe("normalizeEvent — issues", () => {
  function issuePayload(action: string) {
    return basePL({
      action,
      issue: {
        number: 7,
        title: "Bug report",
        labels: [{ name: "bug" }],
        updated_at: "2025-01-15T10:00:00Z",
      },
    });
  }

  it("normalizes issue opened", () => {
    const result = normalizeEvent("issues", issuePayload("opened"))!;
    expect(result.eventType).toBe("issues");
    expect(result.action).toBe("opened");
    expect(result.title).toBe("Bug report");
    expect(result.data).toMatchObject({ number: 7, labels: ["bug"] });
  });

  it("normalizes issue closed", () => {
    const result = normalizeEvent("issues", issuePayload("closed"))!;
    expect(result.action).toBe("closed");
  });

  it("rejects unsupported issue actions", () => {
    expect(normalizeEvent("issues", issuePayload("assigned"))).toBeNull();
    expect(normalizeEvent("issues", issuePayload("transferred"))).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// release
// ──────────────────────────────────────────────────────────────────────────────

describe("normalizeEvent — release", () => {
  it("normalizes published release", () => {
    const payload = basePL({
      action: "published",
      release: {
        tag_name: "v1.2.0",
        name: "Version 1.2.0",
        prerelease: false,
        published_at: "2025-01-15T10:00:00Z",
      },
    });

    const result = normalizeEvent("release", payload)!;
    expect(result.eventType).toBe("release");
    expect(result.action).toBe("published");
    expect(result.title).toBe("Version 1.2.0");
    expect(result.ref).toBe("v1.2.0");
    expect(result.data).toMatchObject({
      tag: "v1.2.0",
      prerelease: false,
    });
  });

  it("rejects non-published releases", () => {
    const payload = basePL({
      action: "created",
      release: { tag_name: "v1.0.0" },
    });
    expect(normalizeEvent("release", payload)).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// workflow_run
// ──────────────────────────────────────────────────────────────────────────────

describe("normalizeEvent — workflow_run", () => {
  it("normalizes completed workflow", () => {
    const payload = basePL({
      action: "completed",
      workflow_run: {
        name: "CI",
        conclusion: "success",
        head_branch: "main",
        updated_at: "2025-01-15T10:00:00Z",
      },
    });

    const result = normalizeEvent("workflow_run", payload)!;
    expect(result.action).toBe("completed");
    expect(result.data).toMatchObject({
      name: "CI",
      conclusion: "success",
      branch: "main",
    });
  });

  it("rejects non-completed workflows", () => {
    const payload = basePL({
      action: "requested",
      workflow_run: { name: "CI" },
    });
    expect(normalizeEvent("workflow_run", payload)).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// star, fork, create, delete
// ──────────────────────────────────────────────────────────────────────────────

describe("normalizeEvent — star", () => {
  it("normalizes star created", () => {
    const payload = basePL({
      action: "created",
      repository: { ...makeRepo(), stargazers_count: 42 },
    });
    const result = normalizeEvent("star", payload)!;
    expect(result.title).toBe("Starred");
    expect(result.data).toMatchObject({ total: 42 });
  });

  it("normalizes star deleted", () => {
    const payload = basePL({ action: "deleted" });
    const result = normalizeEvent("star", payload)!;
    expect(result.title).toBe("Unstarred");
  });

  it("rejects unknown star actions", () => {
    const payload = basePL({ action: "something" });
    expect(normalizeEvent("star", payload)).toBeNull();
  });
});

describe("normalizeEvent — fork", () => {
  it("normalizes fork event", () => {
    const payload = basePL({
      forkee: {
        full_name: "other/my-repo",
        owner: { login: "other" },
        created_at: "2025-01-15T10:00:00Z",
      },
      repository: { ...makeRepo(), forks_count: 5 },
    });
    const result = normalizeEvent("fork", payload)!;
    expect(result.title).toBe("Forked to other/my-repo");
    expect(result.data).toMatchObject({ total: 5, forker: "other" });
  });
});

describe("normalizeEvent — create", () => {
  it("normalizes branch creation", () => {
    const payload = basePL({ ref_type: "branch", ref: "feature-x" });
    const result = normalizeEvent("create", payload)!;
    expect(result.title).toBe("Created branch feature-x");
    expect(result.data).toMatchObject({ ref_type: "branch" });
  });

  it("normalizes tag creation", () => {
    const payload = basePL({ ref_type: "tag", ref: "v2.0" });
    const result = normalizeEvent("create", payload)!;
    expect(result.title).toBe("Created tag v2.0");
  });
});

describe("normalizeEvent — delete", () => {
  it("normalizes branch deletion", () => {
    const payload = basePL({ ref_type: "branch", ref: "old-branch" });
    const result = normalizeEvent("delete", payload)!;
    expect(result.title).toBe("Deleted branch old-branch");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Unknown events
// ──────────────────────────────────────────────────────────────────────────────

describe("normalizeEvent — unknown", () => {
  it("returns null for unsupported event types", () => {
    expect(normalizeEvent("gollum", basePL())).toBeNull();
    expect(normalizeEvent("deployment", basePL())).toBeNull();
    expect(normalizeEvent("check_run", basePL())).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Edge cases: missing fields
// ──────────────────────────────────────────────────────────────────────────────

describe("normalizeEvent — missing fields", () => {
  it("handles missing repository", () => {
    const payload = {
      sender: makeSender(),
      ref: "refs/heads/main",
      commits: [],
      head_commit: null,
    };
    const result = normalizeEvent("push", payload)!;
    expect(result.repoName).toBe("unknown");
    expect(result.repoFullName).toBe("unknown/unknown");
  });

  it("handles missing sender", () => {
    const payload = {
      repository: makeRepo(),
      ref: "refs/heads/main",
      commits: [],
      head_commit: null,
    };
    const result = normalizeEvent("push", payload)!;
    expect(result.actor).toBe("unknown");
  });
});
