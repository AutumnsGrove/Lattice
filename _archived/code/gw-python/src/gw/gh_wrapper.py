"""Wrapper for GitHub CLI (gh) subprocess operations."""

import json
import os
import re
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from .git_wrapper import Git


class GitHubError(Exception):
    """Raised when a GitHub CLI command fails."""

    def __init__(self, message: str, returncode: int = 1, stderr: str = ""):
        """Initialize GitHub error.

        Args:
            message: Error message
            returncode: Command return code
            stderr: Standard error output
        """
        self.returncode = returncode
        self.stderr = stderr
        # Include stderr in message if available (the actual useful error!)
        if stderr and stderr.strip():
            self.message = f"{message}\n{stderr.strip()}"
        else:
            self.message = message
        super().__init__(self.message)


@dataclass
class RateLimit:
    """GitHub API rate limit information."""

    resource: str
    limit: int
    used: int
    remaining: int
    reset: datetime

    @property
    def is_low(self) -> bool:
        """Check if rate limit is running low (< 100 remaining)."""
        return self.remaining < 100

    @property
    def is_exhausted(self) -> bool:
        """Check if rate limit is exhausted."""
        return self.remaining == 0


@dataclass
class PullRequest:
    """Parsed pull request information."""

    number: int
    title: str
    state: str
    author: str
    url: str
    head_branch: str
    base_branch: str
    created_at: str
    updated_at: str
    body: Optional[str] = None
    labels: list[str] = None
    reviewers: list[str] = None
    mergeable: Optional[bool] = None
    draft: bool = False

    def __post_init__(self):
        if self.labels is None:
            self.labels = []
        if self.reviewers is None:
            self.reviewers = []


@dataclass
class Issue:
    """Parsed issue information."""

    number: int
    title: str
    state: str
    author: str
    url: str
    created_at: str
    updated_at: str
    body: Optional[str] = None
    labels: list[str] = None
    assignees: list[str] = None
    milestone: Optional[str] = None

    def __post_init__(self):
        if self.labels is None:
            self.labels = []
        if self.assignees is None:
            self.assignees = []


@dataclass
class JobStep:
    """Parsed job step information."""

    name: str
    status: str
    conclusion: Optional[str]
    number: int


@dataclass
class JobInfo:
    """Parsed workflow job information."""

    name: str
    status: str
    conclusion: Optional[str]
    steps: list[JobStep]


@dataclass
class WorkflowRun:
    """Parsed workflow run information."""

    id: int
    name: str
    status: str
    conclusion: Optional[str]
    workflow_name: str
    branch: str
    event: str
    created_at: str
    url: str
    head_sha: str = ""
    jobs: list[JobInfo] | None = None


@dataclass
class PRComment:
    """Parsed PR comment information."""

    id: int
    author: str
    body: str
    created_at: str
    updated_at: str
    url: str
    is_review_comment: bool = False
    path: Optional[str] = None  # For review comments on specific files
    line: Optional[int] = None  # For review comments on specific lines


@dataclass
class PRCheck:
    """Parsed PR check/status information."""

    name: str
    status: str  # queued, in_progress, completed
    conclusion: Optional[str]  # success, failure, neutral, cancelled, skipped, timed_out
    url: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class GitHub:
    """Wrapper for GitHub CLI operations."""

    def __init__(self, repo: Optional[str] = None):
        """Initialize GitHub wrapper.

        Args:
            repo: Repository in owner/repo format (auto-detected if not provided)
        """
        self._repo = repo
        self._rate_limit_cache: Optional[dict[str, RateLimit]] = None
        self._rate_limit_checked: Optional[datetime] = None

    @property
    def repo(self) -> str:
        """Get repository in owner/repo format."""
        if self._repo:
            return self._repo

        # Try to detect from git remote
        try:
            git = Git()
            remote_url = git.get_remote_url("origin")
            if remote_url:
                self._repo = self._parse_repo_from_url(remote_url)
                if self._repo:
                    return self._repo
        except Exception:
            pass

        raise GitHubError("Could not determine repository. Use --repo or set git remote.")

    def _parse_repo_from_url(self, url: str) -> Optional[str]:
        """Parse owner/repo from a git remote URL.

        Handles:
        - https://github.com/owner/repo.git
        - git@github.com:owner/repo.git
        - https://github.com/owner/repo
        """
        patterns = [
            r"github\.com[:/]([^/]+)/([^/]+?)(?:\.git)?$",
        ]

        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return f"{match.group(1)}/{match.group(2)}"

        return None

    def is_installed(self) -> bool:
        """Check if GitHub CLI is installed."""
        try:
            subprocess.run(
                ["gh", "--version"],
                capture_output=True,
                check=True,
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False

    def is_authenticated(self) -> bool:
        """Check if GitHub CLI is authenticated."""
        try:
            subprocess.run(
                ["gh", "auth", "status"],
                capture_output=True,
                check=True,
            )
            return True
        except subprocess.CalledProcessError:
            return False

    def execute(
        self,
        args: list[str],
        use_json: bool = True,
        check: bool = True,
    ) -> str:
        """Execute a GitHub CLI command.

        Args:
            args: Command arguments (without 'gh')
            use_json: Request JSON output where supported
            check: Raise on non-zero exit

        Returns:
            Command output (stdout)

        Raises:
            GitHubError: If command fails and check=True
        """
        cmd = ["gh"] + args

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=check,
            )
            return result.stdout
        except subprocess.CalledProcessError as e:
            raise GitHubError(
                f"GitHub CLI command failed: {' '.join(cmd)}",
                returncode=e.returncode,
                stderr=e.stderr or "",
            ) from e

    def execute_json(self, args: list[str]) -> Any:
        """Execute a command and parse JSON output.

        Args:
            args: Command arguments

        Returns:
            Parsed JSON data
        """
        output = self.execute(args)
        try:
            return json.loads(output)
        except json.JSONDecodeError as e:
            raise GitHubError(f"Failed to parse JSON output: {e}") from e

    # =========================================================================
    # Rate Limit
    # =========================================================================

    def get_rate_limit(self, force_refresh: bool = False) -> dict[str, RateLimit]:
        """Get current rate limit status.

        Args:
            force_refresh: Force refresh of cached rate limit

        Returns:
            Dict of resource name to RateLimit
        """
        # Use cached value if recent (within 60 seconds)
        if (
            not force_refresh
            and self._rate_limit_cache
            and self._rate_limit_checked
            and (datetime.now() - self._rate_limit_checked).seconds < 60
        ):
            return self._rate_limit_cache

        try:
            data = self.execute_json(["api", "rate_limit"])
            limits = {}

            for resource, info in data.get("resources", {}).items():
                limits[resource] = RateLimit(
                    resource=resource,
                    limit=info["limit"],
                    used=info["used"],
                    remaining=info["remaining"],
                    reset=datetime.fromtimestamp(info["reset"]),
                )

            self._rate_limit_cache = limits
            self._rate_limit_checked = datetime.now()
            return limits

        except GitHubError:
            return {}

    def check_rate_limit(self, resource: str = "core") -> Optional[RateLimit]:
        """Check rate limit for a specific resource.

        Args:
            resource: API resource (core, search, graphql)

        Returns:
            RateLimit or None if unavailable
        """
        limits = self.get_rate_limit()
        return limits.get(resource)

    # =========================================================================
    # Pull Requests
    # =========================================================================

    def pr_list(
        self,
        state: str = "open",
        author: Optional[str] = None,
        label: Optional[str] = None,
        limit: int = 30,
    ) -> list[PullRequest]:
        """List pull requests.

        Args:
            state: Filter by state (open, closed, merged, all)
            author: Filter by author
            label: Filter by label
            limit: Maximum number to return

        Returns:
            List of PullRequest objects
        """
        args = [
            "pr", "list",
            "--repo", self.repo,
            "--state", state,
            "--limit", str(limit),
            "--json", "number,title,state,author,url,headRefName,baseRefName,createdAt,updatedAt,labels,isDraft",
        ]

        if author:
            args.extend(["--author", author])
        if label:
            args.extend(["--label", label])

        data = self.execute_json(args)
        return [self._parse_pr(pr) for pr in data]

    def pr_view(self, number: int) -> PullRequest:
        """Get pull request details.

        Args:
            number: PR number

        Returns:
            PullRequest object
        """
        args = [
            "pr", "view", str(number),
            "--repo", self.repo,
            "--json", "number,title,state,author,url,headRefName,baseRefName,createdAt,updatedAt,body,labels,reviewRequests,mergeable,isDraft",
        ]

        data = self.execute_json(args)
        return self._parse_pr(data)

    def pr_create(
        self,
        title: str,
        body: str,
        base: str = "main",
        head: Optional[str] = None,
        draft: bool = False,
        labels: Optional[list[str]] = None,
        reviewers: Optional[list[str]] = None,
    ) -> PullRequest:
        """Create a pull request.

        Args:
            title: PR title
            body: PR body/description
            base: Base branch
            head: Head branch (default: current branch)
            draft: Create as draft
            labels: Labels to add
            reviewers: Reviewers to request

        Returns:
            Created PullRequest
        """
        args = [
            "pr", "create",
            "--repo", self.repo,
            "--title", title,
            "--body", body,
            "--base", base,
        ]

        if head:
            args.extend(["--head", head])
        if draft:
            args.append("--draft")
        if labels:
            for label in labels:
                args.extend(["--label", label])
        if reviewers:
            for reviewer in reviewers:
                args.extend(["--reviewer", reviewer])

        # Get the PR URL from output
        output = self.execute(args, use_json=False)

        # Parse the PR number from the URL
        match = re.search(r"/pull/(\d+)", output)
        if match:
            return self.pr_view(int(match.group(1)))

        raise GitHubError("Failed to parse created PR")

    def pr_merge(
        self,
        number: int,
        method: str = "merge",
        auto: bool = False,
        delete_branch: bool = False,
    ) -> None:
        """Merge a pull request.

        Args:
            number: PR number
            method: Merge method (merge, squash, rebase)
            auto: Enable auto-merge when checks pass
            delete_branch: Delete branch after merge
        """
        args = [
            "pr", "merge", str(number),
            "--repo", self.repo,
            f"--{method}",
        ]

        if auto:
            args.append("--auto")
        if delete_branch:
            args.append("--delete-branch")

        self.execute(args, use_json=False)

    def pr_close(self, number: int, comment: Optional[str] = None) -> None:
        """Close a pull request without merging.

        Args:
            number: PR number
            comment: Optional closing comment
        """
        args = ["pr", "close", str(number), "--repo", self.repo]

        if comment:
            args.extend(["--comment", comment])

        self.execute(args, use_json=False)

    def pr_comment(self, number: int, body: str) -> None:
        """Add a comment to a pull request.

        Args:
            number: PR number
            body: Comment body
        """
        self.execute([
            "pr", "comment", str(number),
            "--repo", self.repo,
            "--body", body,
        ], use_json=False)

    def pr_review(
        self,
        number: int,
        action: str,
        body: Optional[str] = None,
    ) -> None:
        """Review a pull request.

        Args:
            number: PR number
            action: Review action (approve, request-changes, comment)
            body: Review body
        """
        args = [
            "pr", "review", str(number),
            "--repo", self.repo,
            f"--{action}",
        ]

        if body:
            args.extend(["--body", body])

        self.execute(args, use_json=False)

    def pr_comments(self, number: int) -> list[PRComment]:
        """Get all comments on a pull request (both regular and review comments).

        Args:
            number: PR number

        Returns:
            List of PRComment objects, sorted by creation time
        """
        comments = []

        # Regular comments via API
        try:
            data = self.execute_json([
                "api", f"repos/{self.repo}/issues/{number}/comments"
            ])
            for c in data:
                comments.append(PRComment(
                    id=c["id"],
                    author=c["user"]["login"],
                    body=c["body"],
                    created_at=c["created_at"],
                    updated_at=c["updated_at"],
                    url=c["html_url"],
                    is_review_comment=False,
                ))
        except GitHubError:
            pass

        # Review comments via API
        try:
            data = self.execute_json([
                "api", f"repos/{self.repo}/pulls/{number}/comments"
            ])
            for c in data:
                comments.append(PRComment(
                    id=c["id"],
                    author=c["user"]["login"],
                    body=c["body"],
                    created_at=c["created_at"],
                    updated_at=c["updated_at"],
                    url=c["html_url"],
                    is_review_comment=True,
                    path=c.get("path"),
                    line=c.get("line"),
                ))
        except GitHubError:
            pass

        # Sort by creation time
        comments.sort(key=lambda c: c.created_at)
        return comments

    def issue_comments(self, number: int) -> list[PRComment]:
        """Get all comments on an issue.

        Args:
            number: Issue number

        Returns:
            List of PRComment objects sorted by creation time
        """
        comments = []
        try:
            data = self.execute_json([
                "api", f"repos/{self.repo}/issues/{number}/comments"
            ])
            for c in data:
                comments.append(PRComment(
                    id=c["id"],
                    author=c["user"]["login"],
                    body=c["body"],
                    created_at=c["created_at"],
                    updated_at=c["updated_at"],
                    url=c["html_url"],
                    is_review_comment=False,
                ))
        except GitHubError:
            pass
        comments.sort(key=lambda c: c.created_at)
        return comments

    def pr_checks(self, number: int) -> list[PRCheck]:
        """Get CI/CD check status for a pull request.

        Args:
            number: PR number

        Returns:
            List of PRCheck objects
        """
        args = [
            "pr", "checks", str(number),
            "--repo", self.repo,
            "--json", "name,state,conclusion,detailsUrl,startedAt,completedAt",
        ]

        try:
            data = self.execute_json(args)
            return [
                PRCheck(
                    name=c["name"],
                    status=c.get("state", "unknown"),
                    conclusion=c.get("conclusion"),
                    url=c.get("detailsUrl"),
                    started_at=c.get("startedAt"),
                    completed_at=c.get("completedAt"),
                )
                for c in data
            ]
        except GitHubError:
            return []

    def pr_diff(
        self,
        number: int,
        file_filter: Optional[str] = None,
    ) -> str:
        """Get the diff for a pull request.

        Args:
            number: PR number
            file_filter: Optional glob pattern to filter files

        Returns:
            Diff string
        """
        args = ["pr", "diff", str(number), "--repo", self.repo]

        output = self.execute(args, use_json=False)

        # Filter by file if requested
        if file_filter and output:
            import fnmatch
            lines = output.split('\n')
            filtered_lines = []
            include_file = False

            for line in lines:
                if line.startswith('diff --git'):
                    # Extract filename from "diff --git a/path/file b/path/file"
                    parts = line.split()
                    if len(parts) >= 4:
                        filename = parts[2][2:]  # Remove "a/" prefix
                        include_file = fnmatch.fnmatch(filename, file_filter)

                if include_file:
                    filtered_lines.append(line)

            return '\n'.join(filtered_lines)

        return output

    def pr_request_review(self, number: int, reviewers: list[str]) -> None:
        """Request review from users.

        Args:
            number: PR number
            reviewers: List of GitHub usernames
        """
        args = ["pr", "edit", str(number), "--repo", self.repo]
        for reviewer in reviewers:
            args.extend(["--add-reviewer", reviewer])

        self.execute(args, use_json=False)

    def pr_resolve_thread(self, thread_id: str) -> None:
        """Resolve a review thread using GraphQL.

        Args:
            thread_id: The node ID of the review thread
        """
        query = """
    mutation ResolveThread($threadId: ID!) {
      resolveReviewThread(input: {threadId: $threadId}) {
        thread {
          isResolved
        }
      }
    }
    """

        self.execute([
            "api", "graphql",
            "-f", f"query={query}",
            "-f", f"threadId={thread_id}",
        ], use_json=False)

    def pr_get_review_threads(self, number: int) -> list[dict]:
        """Get review threads for a PR to find thread IDs.

        Args:
            number: PR number

        Returns:
            List of thread info dicts with id, isResolved, path, line, comments
        """
        query = """
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          reviewThreads(first: 100) {
            nodes {
              id
              isResolved
              path
              line
              comments(first: 10) {
                nodes {
                  body
                  author { login }
                }
              }
            }
          }
        }
      }
    }
    """

        owner, repo = self.repo.split("/")

        result = self.execute_json([
            "api", "graphql",
            "-f", f"query={query}",
            "-f", f"owner={owner}",
            "-f", f"repo={repo}",
            "-F", f"number={number}",
        ])

        threads = result.get("data", {}).get("repository", {}).get("pullRequest", {}).get("reviewThreads", {}).get("nodes", [])
        return threads

    def _parse_pr(self, data: dict) -> PullRequest:
        """Parse PR data into PullRequest object."""
        return PullRequest(
            number=data["number"],
            title=data["title"],
            state=data["state"],
            author=data["author"]["login"] if isinstance(data["author"], dict) else data["author"],
            url=data["url"],
            head_branch=data.get("headRefName", ""),
            base_branch=data.get("baseRefName", ""),
            created_at=data.get("createdAt", ""),
            updated_at=data.get("updatedAt", ""),
            body=data.get("body"),
            labels=[l["name"] if isinstance(l, dict) else l for l in data.get("labels", [])],
            reviewers=[r["login"] if isinstance(r, dict) else r for r in data.get("reviewRequests", [])],
            mergeable=data.get("mergeable"),
            draft=data.get("isDraft", False),
        )

    # =========================================================================
    # Issues
    # =========================================================================

    def issue_list(
        self,
        state: str = "open",
        author: Optional[str] = None,
        assignee: Optional[str] = None,
        label: Optional[str] = None,
        milestone: Optional[str] = None,
        limit: int = 30,
    ) -> list[Issue]:
        """List issues.

        Args:
            state: Filter by state (open, closed, all)
            author: Filter by author
            assignee: Filter by assignee
            label: Filter by label
            milestone: Filter by milestone
            limit: Maximum number to return

        Returns:
            List of Issue objects
        """
        args = [
            "issue", "list",
            "--repo", self.repo,
            "--state", state,
            "--limit", str(limit),
            "--json", "number,title,state,author,url,createdAt,updatedAt,labels,assignees,milestone",
        ]

        if author:
            args.extend(["--author", author])
        if assignee:
            args.extend(["--assignee", assignee])
        if label:
            args.extend(["--label", label])
        if milestone:
            args.extend(["--milestone", milestone])

        data = self.execute_json(args)
        return [self._parse_issue(issue) for issue in data]

    def issue_view(self, number: int) -> Issue:
        """Get issue details.

        Args:
            number: Issue number

        Returns:
            Issue object
        """
        args = [
            "issue", "view", str(number),
            "--repo", self.repo,
            "--json", "number,title,state,author,url,createdAt,updatedAt,body,labels,assignees,milestone",
        ]

        data = self.execute_json(args)
        return self._parse_issue(data)

    def issue_create(
        self,
        title: str,
        body: str,
        labels: Optional[list[str]] = None,
        assignees: Optional[list[str]] = None,
        milestone: Optional[str] = None,
    ) -> Issue:
        """Create an issue.

        Args:
            title: Issue title
            body: Issue body
            labels: Labels to add
            assignees: Assignees
            milestone: Milestone

        Returns:
            Created Issue
        """
        args = [
            "issue", "create",
            "--repo", self.repo,
            "--title", title,
            "--body", body,
        ]

        if labels:
            for label in labels:
                args.extend(["--label", label])
        if assignees:
            for assignee in assignees:
                args.extend(["--assignee", assignee])
        if milestone:
            args.extend(["--milestone", milestone])

        output = self.execute(args, use_json=False)

        # Parse the issue number from the URL
        match = re.search(r"/issues/(\d+)", output)
        if match:
            return self.issue_view(int(match.group(1)))

        raise GitHubError("Failed to parse created issue")

    def issue_close(
        self,
        number: int,
        reason: str = "completed",
        comment: Optional[str] = None,
    ) -> None:
        """Close an issue.

        Args:
            number: Issue number
            reason: Close reason (completed, not_planned)
            comment: Optional closing comment
        """
        args = [
            "issue", "close", str(number),
            "--repo", self.repo,
            "--reason", reason,
        ]

        if comment:
            args.extend(["--comment", comment])

        self.execute(args, use_json=False)

    def issue_reopen(self, number: int) -> None:
        """Reopen an issue.

        Args:
            number: Issue number
        """
        self.execute([
            "issue", "reopen", str(number),
            "--repo", self.repo,
        ], use_json=False)

    def issue_comment(self, number: int, body: str) -> None:
        """Add a comment to an issue.

        Args:
            number: Issue number
            body: Comment body
        """
        self.execute([
            "issue", "comment", str(number),
            "--repo", self.repo,
            "--body", body,
        ], use_json=False)

    def _parse_issue(self, data: dict) -> Issue:
        """Parse issue data into Issue object."""
        milestone = data.get("milestone")
        if isinstance(milestone, dict):
            milestone = milestone.get("title")

        return Issue(
            number=data["number"],
            title=data["title"],
            state=data["state"],
            author=data["author"]["login"] if isinstance(data["author"], dict) else data["author"],
            url=data["url"],
            created_at=data.get("createdAt", ""),
            updated_at=data.get("updatedAt", ""),
            body=data.get("body"),
            labels=[l["name"] if isinstance(l, dict) else l for l in data.get("labels", [])],
            assignees=[a["login"] if isinstance(a, dict) else a for a in data.get("assignees", [])],
            milestone=milestone,
        )

    # =========================================================================
    # Workflow Runs
    # =========================================================================

    def run_list(
        self,
        workflow: Optional[str] = None,
        branch: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 20,
    ) -> list[WorkflowRun]:
        """List workflow runs.

        Args:
            workflow: Filter by workflow file name
            branch: Filter by branch
            status: Filter by status
            limit: Maximum number to return

        Returns:
            List of WorkflowRun objects
        """
        args = [
            "run", "list",
            "--repo", self.repo,
            "--limit", str(limit),
            "--json", "databaseId,displayTitle,status,conclusion,workflowName,headBranch,event,createdAt,url,headSha",
        ]

        if workflow:
            args.extend(["--workflow", workflow])
        if branch:
            args.extend(["--branch", branch])
        if status:
            args.extend(["--status", status])

        data = self.execute_json(args)
        return [self._parse_run(run) for run in data]

    def run_view(self, run_id: int) -> WorkflowRun:
        """Get workflow run details.

        Args:
            run_id: Run ID

        Returns:
            WorkflowRun object
        """
        args = [
            "run", "view", str(run_id),
            "--repo", self.repo,
            "--json", "databaseId,displayTitle,status,conclusion,workflowName,headBranch,event,createdAt,url,headSha",
        ]

        data = self.execute_json(args)
        return self._parse_run(data)

    def run_view_with_jobs(self, run_id: int) -> WorkflowRun:
        """Get workflow run details including job breakdown.

        Args:
            run_id: Run ID

        Returns:
            WorkflowRun object with jobs populated
        """
        args = [
            "run", "view", str(run_id),
            "--repo", self.repo,
            "--json", "databaseId,displayTitle,status,conclusion,workflowName,headBranch,event,createdAt,url,headSha,jobs",
        ]

        data = self.execute_json(args)
        run = self._parse_run(data)

        # Parse jobs
        jobs_data = data.get("jobs", [])
        run.jobs = [
            JobInfo(
                name=j.get("name", "unknown"),
                status=j.get("status", "unknown"),
                conclusion=j.get("conclusion"),
                steps=[
                    JobStep(
                        name=s.get("name", "unknown"),
                        status=s.get("status", "unknown"),
                        conclusion=s.get("conclusion"),
                        number=s.get("number", 0),
                    )
                    for s in j.get("steps", [])
                ],
            )
            for j in jobs_data
        ]

        return run

    def run_failed_logs(self, run_id: int) -> str:
        """Get logs for failed jobs only.

        Args:
            run_id: Run ID

        Returns:
            Log output as string
        """
        args = ["run", "view", str(run_id), "--repo", self.repo, "--log-failed"]
        return self.execute(args, use_json=False)

    def run_rerun(self, run_id: int, failed_only: bool = False) -> None:
        """Rerun a workflow.

        Args:
            run_id: Run ID
            failed_only: Only rerun failed jobs
        """
        args = ["run", "rerun", str(run_id), "--repo", self.repo]

        if failed_only:
            args.append("--failed")

        self.execute(args, use_json=False)

    def run_cancel(self, run_id: int) -> None:
        """Cancel a workflow run.

        Args:
            run_id: Run ID
        """
        self.execute([
            "run", "cancel", str(run_id),
            "--repo", self.repo,
        ], use_json=False)

    def run_watch(self, run_id: int) -> None:
        """Watch a workflow run (blocks until complete).

        Args:
            run_id: Run ID
        """
        # This is interactive, so we run without capturing
        subprocess.run([
            "gh", "run", "watch", str(run_id),
            "--repo", self.repo,
        ])

    def _parse_run(self, data: dict) -> WorkflowRun:
        """Parse run data into WorkflowRun object."""
        return WorkflowRun(
            id=data["databaseId"],
            name=data.get("displayTitle", ""),
            status=data["status"],
            conclusion=data.get("conclusion"),
            workflow_name=data.get("workflowName", ""),
            branch=data.get("headBranch", ""),
            event=data.get("event", ""),
            created_at=data.get("createdAt", ""),
            url=data.get("url", ""),
            head_sha=data.get("headSha", ""),
        )

    # =========================================================================
    # Raw API Access
    # =========================================================================

    def api(
        self,
        endpoint: str,
        method: str = "GET",
        data: Optional[dict] = None,
        fields: Optional[dict[str, str]] = None,
    ) -> Any:
        """Make a raw API request.

        Args:
            endpoint: API endpoint (e.g., "repos/{owner}/{repo}/issues")
            method: HTTP method
            data: JSON body data
            fields: Form fields (-f flag)

        Returns:
            Parsed JSON response
        """
        args = ["api", endpoint, "--method", method]

        if data:
            args.extend(["--input", "-"])

        if fields:
            for key, value in fields.items():
                args.extend(["-f", f"{key}={value}"])

        if data:
            # Pass JSON data via stdin
            result = subprocess.run(
                ["gh"] + args,
                input=json.dumps(data),
                capture_output=True,
                text=True,
                check=True,
            )
            output = result.stdout
        else:
            output = self.execute(args)

        try:
            return json.loads(output) if output.strip() else {}
        except json.JSONDecodeError:
            return output
