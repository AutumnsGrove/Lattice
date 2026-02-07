"""Wrapper for Git subprocess operations."""

import json
import os
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional


class GitError(Exception):
    """Raised when a Git command fails."""

    def __init__(self, message: str, returncode: int = 1, stderr: str = ""):
        """Initialize Git error.

        Args:
            message: Error message
            returncode: Git command return code
            stderr: Standard error output
        """
        self.message = message
        self.returncode = returncode
        self.stderr = stderr
        super().__init__(message)


@dataclass
class GitStatus:
    """Parsed git status information."""

    branch: str
    ahead: int
    behind: int
    staged: list[tuple[str, str]]  # (status, path)
    unstaged: list[tuple[str, str]]  # (status, path)
    untracked: list[str]
    is_clean: bool
    is_detached: bool
    upstream: Optional[str]


@dataclass
class GitCommit:
    """Parsed git commit information."""

    hash: str
    short_hash: str
    author: str
    author_email: str
    date: str
    subject: str
    body: str


@dataclass
class GitDiff:
    """Parsed git diff information."""

    files: list[dict[str, Any]]  # file path, additions, deletions, etc.
    stats: dict[str, int]  # total additions, deletions, files changed
    raw: str  # raw diff output


class Git:
    """Wrapper for Git CLI operations."""

    def __init__(self, working_dir: Optional[Path] = None):
        """Initialize Git wrapper.

        Args:
            working_dir: Working directory for git commands (default: cwd)
        """
        self.working_dir = working_dir or Path.cwd()
        self._version_cache: Optional[str] = None

    def is_installed(self) -> bool:
        """Check if Git is installed."""
        try:
            subprocess.run(
                ["git", "--version"],
                capture_output=True,
                check=True,
            )
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False

    def is_repo(self) -> bool:
        """Check if current directory is a git repository."""
        try:
            self.execute(["rev-parse", "--git-dir"])
            return True
        except GitError:
            return False

    def get_version(self) -> str:
        """Get Git version string."""
        if self._version_cache is not None:
            return self._version_cache

        result = self.execute(["--version"])
        # Parse "git version 2.39.0" -> "2.39.0"
        match = re.search(r"git version (\d+\.\d+\.\d+)", result)
        self._version_cache = match.group(1) if match else result.strip()
        return self._version_cache

    def execute(
        self,
        args: list[str],
        capture_output: bool = True,
        check: bool = True,
        env: Optional[dict[str, str]] = None,
    ) -> str:
        """Execute a Git command.

        Args:
            args: Command arguments (without 'git')
            capture_output: Capture stdout/stderr
            check: Raise on non-zero exit
            env: Additional environment variables

        Returns:
            Command output (stdout)

        Raises:
            GitError: If command fails and check=True
        """
        cmd = ["git"] + args

        # Merge environment
        run_env = os.environ.copy()
        if env:
            run_env.update(env)

        try:
            result = subprocess.run(
                cmd,
                capture_output=capture_output,
                text=True,
                check=check,
                cwd=self.working_dir,
                env=run_env,
            )
            return result.stdout if capture_output else ""
        except subprocess.CalledProcessError as e:
            stderr_text = (e.stderr or "").strip()
            stdout_text = (e.stdout or "").strip()
            msg = f"Git command failed: {' '.join(cmd)}"
            if stderr_text:
                msg += f"\n{stderr_text}"
            # Include stdout in error output — git hooks (pre-push, pre-commit)
            # write their diagnostics to stdout, which is captured separately.
            # Without this, hook failures are invisible to error handlers.
            combined = e.stderr or ""
            if stdout_text:
                combined = f"{combined}\n{e.stdout}" if combined.strip() else e.stdout
            raise GitError(
                msg,
                returncode=e.returncode,
                stderr=combined,
            ) from e

    def status(self) -> GitStatus:
        """Get repository status.

        Returns:
            GitStatus with parsed status information
        """
        # Get porcelain status for machine parsing
        output = self.execute(["status", "--porcelain=v2", "--branch"])

        branch = "HEAD"
        ahead = 0
        behind = 0
        upstream = None
        is_detached = False
        staged: list[tuple[str, str]] = []
        unstaged: list[tuple[str, str]] = []
        untracked: list[str] = []

        for line in output.strip().split("\n"):
            if not line:
                continue

            if line.startswith("# branch.head"):
                branch = line.split()[-1]
                is_detached = branch == "(detached)"
            elif line.startswith("# branch.upstream"):
                upstream = line.split()[-1]
            elif line.startswith("# branch.ab"):
                # Parse "+N -M" format
                parts = line.split()
                for part in parts[2:]:
                    if part.startswith("+"):
                        ahead = int(part[1:])
                    elif part.startswith("-"):
                        behind = int(part[1:])
            elif line.startswith("1 ") or line.startswith("2 "):
                # Changed entry
                parts = line.split()
                xy = parts[1]
                path = parts[-1]

                # X = staged status, Y = unstaged status
                x_status = xy[0]
                y_status = xy[1]

                if x_status != ".":
                    staged.append((x_status, path))
                if y_status != ".":
                    unstaged.append((y_status, path))
            elif line.startswith("? "):
                # Untracked file
                untracked.append(line[2:])
            elif line.startswith("u "):
                # Unmerged entry - treat as unstaged
                parts = line.split()
                path = parts[-1]
                unstaged.append(("U", path))

        is_clean = not staged and not unstaged and not untracked

        return GitStatus(
            branch=branch,
            ahead=ahead,
            behind=behind,
            staged=staged,
            unstaged=unstaged,
            untracked=untracked,
            is_clean=is_clean,
            is_detached=is_detached,
            upstream=upstream,
        )

    def log(
        self,
        limit: int = 10,
        oneline: bool = False,
        author: Optional[str] = None,
        since: Optional[str] = None,
        file_path: Optional[str] = None,
        format_string: Optional[str] = None,
    ) -> list[GitCommit]:
        """Get commit log.

        Args:
            limit: Maximum number of commits
            oneline: Use oneline format
            author: Filter by author
            since: Show commits since date
            file_path: Show commits for specific file
            format_string: Custom format string

        Returns:
            List of GitCommit objects
        """
        args = ["log", f"-{limit}"]

        # Use JSON-like format for parsing
        if not format_string:
            format_string = (
                "%H%x00%h%x00%an%x00%ae%x00%aI%x00%s%x00%b%x00%x1e"
            )
        args.append(f"--format={format_string}")

        if author:
            args.append(f"--author={author}")
        if since:
            args.append(f"--since={since}")
        if file_path:
            args.extend(["--", file_path])

        output = self.execute(args)
        commits = []

        for entry in output.split("\x1e"):
            entry = entry.strip()
            if not entry:
                continue

            parts = entry.split("\x00")
            if len(parts) >= 6:
                commits.append(
                    GitCommit(
                        hash=parts[0],
                        short_hash=parts[1],
                        author=parts[2],
                        author_email=parts[3],
                        date=parts[4],
                        subject=parts[5],
                        body=parts[6] if len(parts) > 6 else "",
                    )
                )

        return commits

    def diff(
        self,
        staged: bool = False,
        ref: Optional[str] = None,
        stat_only: bool = False,
        file_path: Optional[str] = None,
    ) -> GitDiff:
        """Get diff output.

        Args:
            staged: Show staged changes (--staged)
            ref: Compare against reference (branch/commit)
            stat_only: Show only statistics (--stat)
            file_path: Diff specific file

        Returns:
            GitDiff with parsed diff information
        """
        # Build base args: options first, then ref, then -- path
        # Git requires options (--stat, --staged) before non-option args
        base_options = ["diff"]

        if staged:
            base_options.append("--staged")

        # Get stat separately (options must precede ref/path)
        stat_args = base_options.copy() + ["--stat", "--numstat"]
        if ref:
            stat_args.append(ref)
        if file_path:
            stat_args.extend(["--", file_path])

        stat_output = self.execute(stat_args)

        # Parse numstat for precise counts
        files = []
        total_additions = 0
        total_deletions = 0

        for line in stat_output.strip().split("\n"):
            if not line or "\t" not in line:
                continue

            parts = line.split("\t")
            if len(parts) >= 3:
                additions = int(parts[0]) if parts[0] != "-" else 0
                deletions = int(parts[1]) if parts[1] != "-" else 0
                file_path_parsed = parts[2]

                files.append({
                    "path": file_path_parsed,
                    "additions": additions,
                    "deletions": deletions,
                })
                total_additions += additions
                total_deletions += deletions

        # Get raw diff if not stat_only
        raw = ""
        if not stat_only:
            raw_args = base_options.copy()
            if ref:
                raw_args.append(ref)
            if file_path:
                raw_args.extend(["--", file_path])
            raw = self.execute(raw_args)

        return GitDiff(
            files=files,
            stats={
                "additions": total_additions,
                "deletions": total_deletions,
                "files_changed": len(files),
            },
            raw=raw,
        )

    def blame(
        self,
        file_path: str,
        line_start: Optional[int] = None,
        line_end: Optional[int] = None,
    ) -> str:
        """Get blame output for a file.

        Args:
            file_path: Path to file
            line_start: Starting line number
            line_end: Ending line number

        Returns:
            Blame output string
        """
        args = ["blame"]

        if line_start and line_end:
            args.extend(["-L", f"{line_start},{line_end}"])

        args.append(file_path)

        return self.execute(args)

    def show(self, ref: str = "HEAD", stat_only: bool = False) -> str:
        """Show commit details.

        Args:
            ref: Commit reference
            stat_only: Show only statistics

        Returns:
            Show output string
        """
        args = ["show", ref]

        if stat_only:
            args.append("--stat")

        return self.execute(args)

    def current_branch(self) -> str:
        """Get current branch name.

        Returns:
            Branch name or 'HEAD' if detached
        """
        try:
            output = self.execute(["rev-parse", "--abbrev-ref", "HEAD"])
            return output.strip()
        except GitError:
            return "HEAD"

    def get_remote_url(self, remote: str = "origin") -> Optional[str]:
        """Get URL for a remote.

        Args:
            remote: Remote name

        Returns:
            Remote URL or None
        """
        try:
            output = self.execute(["remote", "get-url", remote])
            return output.strip()
        except GitError:
            return None

    def is_dirty(self) -> bool:
        """Check if working tree has changes.

        Returns:
            True if there are uncommitted changes
        """
        status = self.status()
        return not status.is_clean

    def add(self, paths: list[str], all_files: bool = False) -> None:
        """Stage files for commit.

        Args:
            paths: File paths to stage
            all_files: Stage all changes (-A)
        """
        args = ["add"]
        if all_files:
            args.append("-A")
        else:
            args.extend(paths)
        self.execute(args)

    def commit(
        self,
        message: str,
        no_verify: bool = False,
        amend: bool = False,
    ) -> str:
        """Create a commit.

        Args:
            message: Commit message
            no_verify: Skip pre-commit hooks
            amend: Amend the last commit

        Returns:
            Commit hash
        """
        args = ["commit", "-m", message]

        if no_verify:
            args.append("--no-verify")
        if amend:
            args.append("--amend")

        self.execute(args)

        # Get the commit hash
        return self.execute(["rev-parse", "HEAD"]).strip()

    def push(
        self,
        remote: str = "origin",
        branch: Optional[str] = None,
        force: bool = False,
        force_with_lease: bool = False,
        set_upstream: bool = False,
    ) -> None:
        """Push to remote.

        Args:
            remote: Remote name
            branch: Branch to push
            force: Force push (--force)
            force_with_lease: Force with lease (--force-with-lease)
            set_upstream: Set upstream tracking (-u)
        """
        args = ["push"]

        if set_upstream:
            args.append("-u")
        if force:
            args.append("--force")
        elif force_with_lease:
            args.append("--force-with-lease")

        args.append(remote)

        if branch:
            args.append(branch)

        self.execute(args)

    def fetch(self, remote: str = "origin", prune: bool = False) -> None:
        """Fetch from remote.

        Args:
            remote: Remote name
            prune: Prune deleted remote branches
        """
        args = ["fetch", remote]
        if prune:
            args.append("--prune")
        self.execute(args)

    def pull(
        self,
        remote: str = "origin",
        branch: Optional[str] = None,
        rebase: bool = False,
    ) -> None:
        """Pull from remote.

        Args:
            remote: Remote name
            branch: Branch to pull
            rebase: Use rebase instead of merge
        """
        args = ["pull"]
        if rebase:
            args.append("--rebase")
        args.append(remote)
        if branch:
            args.append(branch)
        self.execute(args)

    def branch_create(self, name: str, start_point: Optional[str] = None) -> None:
        """Create a new branch.

        Args:
            name: Branch name
            start_point: Starting commit/branch
        """
        args = ["branch", name]
        if start_point:
            args.append(start_point)
        self.execute(args)

    def branch_delete(self, name: str, force: bool = False) -> None:
        """Delete a branch.

        Args:
            name: Branch name
            force: Force delete even if not merged
        """
        flag = "-D" if force else "-d"
        self.execute(["branch", flag, name])

    def checkout(self, ref: str, create: bool = False) -> None:
        """Checkout a branch or commit.

        Args:
            ref: Branch/commit reference
            create: Create branch if it doesn't exist (-b)
        """
        args = ["checkout"]
        if create:
            args.append("-b")
        args.append(ref)
        self.execute(args)

    def switch(self, branch: str, create: bool = False) -> None:
        """Switch to a branch.

        Args:
            branch: Branch name
            create: Create branch if it doesn't exist (-c)
        """
        args = ["switch"]
        if create:
            args.append("-c")
        args.append(branch)
        self.execute(args)

    def stash_push(self, message: Optional[str] = None) -> None:
        """Stash current changes.

        Args:
            message: Stash message
        """
        args = ["stash", "push"]
        if message:
            args.extend(["-m", message])
        self.execute(args)

    def stash_pop(self, index: int = 0) -> None:
        """Pop a stash.

        Args:
            index: Stash index
        """
        self.execute(["stash", "pop", f"stash@{{{index}}}"])

    def stash_apply(self, index: int = 0) -> None:
        """Apply a stash without removing it.

        Args:
            index: Stash index
        """
        self.execute(["stash", "apply", f"stash@{{{index}}}"])

    def stash_list(self) -> list[dict[str, str]]:
        """List stashes.

        Returns:
            List of stash entries
        """
        try:
            output = self.execute(["stash", "list"])
        except GitError:
            return []

        stashes = []
        for line in output.strip().split("\n"):
            if not line:
                continue
            # Parse "stash@{0}: WIP on main: abc123 message"
            match = re.match(r"stash@\{(\d+)\}: (.+)", line)
            if match:
                stashes.append({
                    "index": int(match.group(1)),
                    "description": match.group(2),
                })

        return stashes

    def stash_drop(self, index: int = 0) -> None:
        """Drop a stash.

        Args:
            index: Stash index
        """
        self.execute(["stash", "drop", f"stash@{{{index}}}"])

    def reset(
        self,
        ref: str = "HEAD",
        mode: str = "mixed",
    ) -> None:
        """Reset to a commit.

        Args:
            ref: Commit reference
            mode: Reset mode (soft, mixed, hard)
        """
        self.execute(["reset", f"--{mode}", ref])

    def rebase(
        self,
        onto: str,
        interactive: bool = False,
        continue_rebase: bool = False,
        abort_rebase: bool = False,
    ) -> None:
        """Rebase onto a branch.

        Args:
            onto: Branch to rebase onto
            interactive: Interactive rebase (not supported in non-interactive mode)
            continue_rebase: Continue a paused rebase
            abort_rebase: Abort a paused rebase
        """
        if continue_rebase:
            self.execute(["rebase", "--continue"])
        elif abort_rebase:
            self.execute(["rebase", "--abort"])
        else:
            args = ["rebase", onto]
            self.execute(args)

    def merge(
        self,
        branch: str,
        no_ff: bool = False,
        squash: bool = False,
        abort_merge: bool = False,
    ) -> None:
        """Merge a branch.

        Args:
            branch: Branch to merge
            no_ff: Create merge commit even for fast-forward
            squash: Squash commits
            abort_merge: Abort a merge in progress
        """
        if abort_merge:
            self.execute(["merge", "--abort"])
        else:
            args = ["merge"]
            if no_ff:
                args.append("--no-ff")
            if squash:
                args.append("--squash")
            args.append(branch)
            self.execute(args)

    def has_merge_conflicts(self) -> bool:
        """Check if there are merge conflicts.

        Returns:
            True if merge conflicts exist
        """
        try:
            output = self.execute(["diff", "--name-only", "--diff-filter=U"])
            return bool(output.strip())
        except GitError:
            return False

    def get_conflicted_files(self) -> list[str]:
        """Get list of files with merge conflicts.

        Returns:
            List of conflicted file paths
        """
        try:
            output = self.execute(["diff", "--name-only", "--diff-filter=U"])
            return [f.strip() for f in output.strip().split("\n") if f.strip()]
        except GitError:
            return []

    def extract_issue_from_branch(self, branch: Optional[str] = None) -> Optional[int]:
        """Extract issue number from branch name.

        Looks for patterns like:
        - feature/348-description
        - fix/123-bug
        - 456-something

        Args:
            branch: Branch name (default: current branch)

        Returns:
            Issue number or None
        """
        if branch is None:
            branch = self.current_branch()

        # Pattern: number followed by dash or at start after slash
        match = re.search(r"(?:^|/)(\d+)[-_]", branch)
        if match:
            return int(match.group(1))

        return None

    def get_commits_ahead_behind(
        self,
        branch: Optional[str] = None,
        upstream: Optional[str] = None,
    ) -> tuple[int, int]:
        """Get number of commits ahead/behind upstream.

        Args:
            branch: Branch to check (default: current)
            upstream: Upstream ref (default: tracking branch)

        Returns:
            Tuple of (ahead, behind) counts
        """
        if branch is None:
            branch = self.current_branch()

        if upstream is None:
            # Get tracking branch
            try:
                upstream = self.execute(
                    ["rev-parse", "--abbrev-ref", f"{branch}@{{upstream}}"]
                ).strip()
            except GitError:
                return (0, 0)

        try:
            output = self.execute(
                ["rev-list", "--left-right", "--count", f"{upstream}...{branch}"]
            )
            parts = output.strip().split()
            if len(parts) >= 2:
                return (int(parts[1]), int(parts[0]))
        except GitError:
            pass

        return (0, 0)
