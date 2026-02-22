"""Pull Request commands for GitHub integration."""

import json
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt
from rich.syntax import Syntax
from rich.table import Table
from rich.markdown import Markdown

from ...gh_wrapper import GitHub, GitHubError, PRComment, PRCheck
from ...ui import is_interactive, render_comments
from ...safety.github import (
    GitHubSafetyError,
    check_github_safety,
    check_rate_limit,
    should_warn_rate_limit,
)

console = Console()


@click.group()
def pr() -> None:
    """Pull request operations.

    \b
    Examples:
        gw gh pr list              # List open PRs
        gw gh pr view 123          # View PR details
        gw gh pr create --write    # Create a PR
    """
    pass


@pr.command("list")
@click.option(
    "--state", default="open", help="Filter by state (open, closed, merged, all)"
)
@click.option("--author", help="Filter by author")
@click.option("--label", help="Filter by label")
@click.option("--limit", default=30, help="Maximum number to return")
@click.pass_context
def pr_list(
    ctx: click.Context,
    state: str,
    author: Optional[str],
    label: Optional[str],
    limit: int,
) -> None:
    """List pull requests.

    Always safe - no --write flag required.

    \b
    Examples:
        gw gh pr list
        gw gh pr list --author @me
        gw gh pr list --label bug
        gw gh pr list --state merged --limit 20
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        gh = GitHub()

        # Check rate limit
        rate = check_rate_limit(gh)
        if rate and should_warn_rate_limit(rate) and not output_json:
            console.print(
                f"[yellow]Rate limit warning:[/yellow] {rate.remaining} requests remaining"
            )

        prs = gh.pr_list(state=state, author=author, label=label, limit=limit)

        if output_json:
            data = [
                {
                    "number": pr.number,
                    "title": pr.title,
                    "state": pr.state,
                    "author": pr.author,
                    "url": pr.url,
                    "draft": pr.draft,
                }
                for pr in prs
            ]
            console.print(json.dumps(data, indent=2))
            return

        if not prs:
            console.print("[dim]No pull requests found[/dim]")
            return

        table = Table(title=f"Pull Requests ({state})", border_style="green")
        table.add_column("#", style="cyan", width=6)
        table.add_column("Title")
        table.add_column("Author", style="dim")
        table.add_column("Labels", style="yellow")

        for pr in prs:
            title = pr.title
            if pr.draft:
                title = f"[dim](Draft)[/dim] {title}"

            labels = ", ".join(pr.labels[:3]) if pr.labels else ""
            if len(pr.labels) > 3:
                labels += f" +{len(pr.labels) - 3}"

            table.add_row(str(pr.number), title, pr.author, labels)

        console.print(table)

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@pr.command("view")
@click.argument("number", type=int)
@click.option("--comments", is_flag=True, help="Show comments")
@click.option("--files", is_flag=True, help="Show changed files")
@click.pass_context
def pr_view(
    ctx: click.Context,
    number: int,
    comments: bool,
    files: bool,
) -> None:
    """View pull request details.

    Always safe - no --write flag required.

    \b
    Examples:
        gw gh pr view 123
        gw gh pr view 123 --comments
        gw gh pr view 123 --files
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        gh = GitHub()
        pr = gh.pr_view(number)

        if output_json:
            data = {
                "number": pr.number,
                "title": pr.title,
                "state": pr.state,
                "author": pr.author,
                "url": pr.url,
                "head": pr.head_branch,
                "base": pr.base_branch,
                "body": pr.body,
                "labels": pr.labels,
                "draft": pr.draft,
                "mergeable": pr.mergeable,
            }
            if comments:
                fetched = gh.pr_comments(number)
                data["comments"] = [
                    {
                        "author": c.author,
                        "body": c.body,
                        "created_at": c.created_at,
                        "is_review": c.is_review_comment,
                        "path": c.path,
                        "line": c.line,
                    }
                    for c in fetched
                ]
            console.print(json.dumps(data, indent=2))
            return

        # Header
        state_style = "green" if pr.state == "OPEN" else "red"
        draft_badge = " [dim](Draft)[/dim]" if pr.draft else ""

        console.print(
            Panel(
                f"[bold]{pr.title}[/bold]{draft_badge}\n\n"
                f"[{state_style}]{pr.state}[/{state_style}] • "
                f"[cyan]{pr.head_branch}[/cyan] → [cyan]{pr.base_branch}[/cyan]\n"
                f"Author: {pr.author} • {pr.url}",
                title=f"PR #{pr.number}",
                border_style="green",
            )
        )

        # Labels
        if pr.labels:
            console.print(f"\n[bold]Labels:[/bold] {', '.join(pr.labels)}")

        # Body
        if pr.body:
            console.print("\n[bold]Description:[/bold]")
            console.print(Markdown(pr.body))

        # Mergeable status
        if pr.mergeable is not None:
            status = (
                "[green]Mergeable[/green]"
                if pr.mergeable
                else "[red]Not mergeable[/red]"
            )
            console.print(f"\n[bold]Status:[/bold] {status}")

        # Comments (when --comments flag is passed)
        if comments:
            fetched = gh.pr_comments(number)
            render_comments(fetched, title="Comments")

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@pr.command("create")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--title", "-t", help="PR title")
@click.option("--body", "-b", help="PR body")
@click.option("--base", default="main", help="Base branch")
@click.option("--head", help="Head branch (default: current)")
@click.option("--draft", is_flag=True, help="Create as draft")
@click.option("--label", multiple=True, help="Labels to add")
@click.option("--reviewer", multiple=True, help="Reviewers to request")
@click.pass_context
def pr_create(
    ctx: click.Context,
    write: bool,
    title: Optional[str],
    body: Optional[str],
    base: str,
    head: Optional[str],
    draft: bool,
    label: tuple[str, ...],
    reviewer: tuple[str, ...],
) -> None:
    """Create a pull request.

    Requires --write flag.

    \b
    Examples:
        gw gh pr create --write
        gw gh pr create --write -t "feat: add feature" -b "Description"
        gw gh pr create --write --draft --label enhancement
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_github_safety("pr_create", write_flag=write)
    except GitHubSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    try:
        gh = GitHub()

        # Get current branch if head not specified
        if not head:
            from ...git_wrapper import Git

            git = Git()
            head = git.current_branch()

        # Interactive mode if title not provided
        if not title:
            if output_json:
                console.print("[red]Title required in JSON mode[/red]")
                raise SystemExit(1)

            console.print(
                Panel(
                    f"Creating PR for branch [cyan]{head}[/cyan] → [cyan]{base}[/cyan]",
                    title="Create Pull Request",
                    border_style="green",
                )
            )

            title = Prompt.ask("Title")
            body = Prompt.ask("Body (description)", default="")

        pr = gh.pr_create(
            title=title,
            body=body or "",
            base=base,
            head=head,
            draft=draft,
            labels=list(label) if label else None,
            reviewers=list(reviewer) if reviewer else None,
        )

        if output_json:
            console.print(
                json.dumps(
                    {
                        "number": pr.number,
                        "url": pr.url,
                        "title": pr.title,
                    }
                )
            )
        else:
            console.print(f"[green]Created PR #{pr.number}:[/green] {pr.title}")
            console.print(f"[dim]{pr.url}[/dim]")

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@pr.command("comment")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("number", type=int)
@click.option("--body", "-b", help="Comment body")
@click.pass_context
def pr_comment(
    ctx: click.Context,
    write: bool,
    number: int,
    body: Optional[str],
) -> None:
    """Add a comment to a pull request.

    Requires --write flag.

    \b
    Examples:
        gw gh pr comment --write 123 -b "LGTM!"
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_github_safety("pr_comment", write_flag=write)
    except GitHubSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    if not body:
        if output_json:
            console.print("[red]Body required[/red]")
            raise SystemExit(1)
        body = Prompt.ask("Comment")

    try:
        gh = GitHub()
        gh.pr_comment(number, body)

        if output_json:
            console.print(json.dumps({"commented": number}))
        else:
            console.print(f"[green]Commented on PR #{number}[/green]")

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@pr.command("review")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("number", type=int)
@click.option("--approve", is_flag=True, help="Approve the PR")
@click.option("--request-changes", is_flag=True, help="Request changes")
@click.option(
    "--comment", "comment_only", is_flag=True, help="Comment without approval"
)
@click.option("--body", "-b", help="Review body")
@click.pass_context
def pr_review(
    ctx: click.Context,
    write: bool,
    number: int,
    approve: bool,
    request_changes: bool,
    comment_only: bool,
    body: Optional[str],
) -> None:
    """Review a pull request.

    Requires --write flag.

    \b
    Examples:
        gw gh pr review --write 123 --approve
        gw gh pr review --write 123 --approve -b "Looks great!"
        gw gh pr review --write 123 --request-changes -b "See comments"
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_github_safety("pr_review", write_flag=write)
    except GitHubSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    # Determine action
    if approve:
        action = "approve"
    elif request_changes:
        action = "request-changes"
    elif comment_only:
        action = "comment"
    else:
        console.print(
            "[yellow]Specify --approve, --request-changes, or --comment[/yellow]"
        )
        raise SystemExit(1)

    try:
        gh = GitHub()
        gh.pr_review(number, action, body)

        if output_json:
            console.print(json.dumps({"reviewed": number, "action": action}))
        else:
            action_str = action.replace("-", " ").title()
            console.print(f"[green]Reviewed PR #{number}:[/green] {action_str}")

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@pr.command("merge")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("number", type=int)
@click.option("--squash", is_flag=True, help="Squash commits")
@click.option("--rebase", is_flag=True, help="Rebase commits")
@click.option("--auto", is_flag=True, help="Enable auto-merge when checks pass")
@click.option("--delete-branch", is_flag=True, help="Delete branch after merge")
@click.pass_context
def pr_merge(
    ctx: click.Context,
    write: bool,
    number: int,
    squash: bool,
    rebase: bool,
    auto: bool,
    delete_branch: bool,
) -> None:
    """Merge a pull request.

    Requires --write flag. This is a destructive operation.

    \b
    Examples:
        gw gh pr merge --write 123
        gw gh pr merge --write 123 --squash
        gw gh pr merge --write 123 --auto --delete-branch
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_github_safety("pr_merge", write_flag=write)
    except GitHubSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    # Determine method
    if squash:
        method = "squash"
    elif rebase:
        method = "rebase"
    else:
        method = "merge"

    # Confirm if interactive
    if not output_json and not auto and is_interactive():
        if not Confirm.ask(f"Merge PR #{number} using {method}?", default=True):
            console.print("[dim]Aborted[/dim]")
            raise SystemExit(0)

    try:
        gh = GitHub()
        gh.pr_merge(number, method=method, auto=auto, delete_branch=delete_branch)

        if output_json:
            console.print(json.dumps({"merged": number, "method": method}))
        else:
            if auto:
                console.print(f"[green]Auto-merge enabled for PR #{number}[/green]")
            else:
                console.print(f"[green]Merged PR #{number} ({method})[/green]")

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@pr.command("close")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("number", type=int)
@click.option("--comment", "-c", help="Closing comment")
@click.pass_context
def pr_close(
    ctx: click.Context,
    write: bool,
    number: int,
    comment: Optional[str],
) -> None:
    """Close a pull request without merging.

    Requires --write flag. This is a destructive operation.

    \b
    Examples:
        gw gh pr close --write 123
        gw gh pr close --write 123 -c "Superseded by #125"
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_github_safety("pr_close", write_flag=write)
    except GitHubSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    # Confirm if interactive
    if not output_json and is_interactive():
        if not Confirm.ask(f"Close PR #{number} without merging?", default=False):
            console.print("[dim]Aborted[/dim]")
            raise SystemExit(0)

    try:
        gh = GitHub()
        gh.pr_close(number, comment=comment)

        if output_json:
            console.print(json.dumps({"closed": number}))
        else:
            console.print(f"[green]Closed PR #{number}[/green]")

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@pr.command("comments")
@click.argument("number", type=int)
@click.option("--review-only", is_flag=True, help="Show only review comments")
@click.pass_context
def pr_comments(
    ctx: click.Context,
    number: int,
    review_only: bool,
) -> None:
    """List all comments on a pull request.

    Shows both regular comments and inline review comments.
    Agent-friendly output without needing jq.

    \b
    Examples:
        gw gh pr comments 123
        gw gh pr comments 123 --review-only
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        gh = GitHub()
        comments = gh.pr_comments(number)

        if review_only:
            comments = [c for c in comments if c.is_review_comment]

        if output_json:
            data = [
                {
                    "id": c.id,
                    "author": c.author,
                    "body": c.body,
                    "created_at": c.created_at,
                    "url": c.url,
                    "is_review_comment": c.is_review_comment,
                    "path": c.path,
                    "line": c.line,
                }
                for c in comments
            ]
            console.print(json.dumps(data, indent=2))
            return

        render_comments(comments, title="PR Comments")

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@pr.command("checks")
@click.argument("number", type=int)
@click.option("--watch", is_flag=True, help="Watch until all checks complete")
@click.pass_context
def pr_checks(
    ctx: click.Context,
    number: int,
    watch: bool,
) -> None:
    """Show CI/CD check status for a pull request.

    Displays pass/fail/pending status without needing to parse with jq.

    \b
    Examples:
        gw gh pr checks 123
        gw gh pr checks 123 --watch
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        gh = GitHub()

        if watch:
            # Use gh's built-in watch
            import subprocess

            subprocess.run(
                ["gh", "pr", "checks", str(number), "--repo", gh.repo, "--watch"]
            )
            return

        checks = gh.pr_checks(number)

        if output_json:
            data = [
                {
                    "name": c.name,
                    "status": c.status,
                    "conclusion": c.conclusion,
                    "url": c.url,
                }
                for c in checks
            ]
            console.print(json.dumps(data, indent=2))
            return

        if not checks:
            console.print("[dim]No checks found[/dim]")
            return

        # Summary counts
        passed = sum(1 for c in checks if c.conclusion == "success")
        failed = sum(1 for c in checks if c.conclusion in ("failure", "timed_out"))
        pending = sum(1 for c in checks if c.status in ("queued", "in_progress"))

        summary = []
        if passed:
            summary.append(f"[green]{passed} passed[/green]")
        if failed:
            summary.append(f"[red]{failed} failed[/red]")
        if pending:
            summary.append(f"[yellow]{pending} pending[/yellow]")

        console.print(
            Panel(
                " • ".join(summary) if summary else "[dim]No checks[/dim]",
                title=f"PR #{number} Checks",
                border_style=(
                    "green"
                    if not failed and not pending
                    else "yellow" if pending else "red"
                ),
            )
        )

        # Table of checks
        table = Table(border_style="dim")
        table.add_column("Status", width=8)
        table.add_column("Check")
        table.add_column("Details", style="dim")

        for c in checks:
            if c.conclusion == "success":
                status = "[green]✓[/green]"
            elif c.conclusion in ("failure", "timed_out"):
                status = "[red]✗[/red]"
            elif c.status in ("queued", "in_progress"):
                status = "[yellow]●[/yellow]"
            elif c.conclusion == "skipped":
                status = "[dim]○[/dim]"
            else:
                status = "[dim]?[/dim]"

            details = c.conclusion or c.status
            table.add_row(status, c.name, details)

        console.print(table)

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@pr.command("diff")
@click.argument("number", type=int)
@click.option("--file", "-f", "file_filter", help="Filter by file pattern (glob)")
@click.option("--stat", is_flag=True, help="Show diffstat only")
@click.option("--name-only", is_flag=True, help="Show changed file names only")
@click.pass_context
def pr_diff(
    ctx: click.Context,
    number: int,
    file_filter: Optional[str],
    stat: bool,
    name_only: bool,
) -> None:
    """View code changes in a pull request.

    Supports filtering by file pattern and summary modes.

    \b
    Examples:
        gw gh pr diff 123
        gw gh pr diff 123 --file "*.py"
        gw gh pr diff 123 --stat
        gw gh pr diff 123 --name-only
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        gh = GitHub()

        if stat or name_only:
            # Use gh's built-in options
            args = ["pr", "diff", str(number), "--repo", gh.repo]
            if stat:
                args.append("--stat")
            if name_only:
                args.append("--name-only")
            output = gh.execute(args, use_json=False)
            console.print(output)
            return

        diff = gh.pr_diff(number, file_filter=file_filter)

        if output_json:
            console.print(json.dumps({"diff": diff}))
            return

        if not diff:
            console.print("[dim]No changes found[/dim]")
            return

        # Syntax highlight the diff
        console.print(Syntax(diff, "diff", theme="monokai", line_numbers=False))

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@pr.command("resolve")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("number", type=int)
@click.option(
    "--thread", "-t", "thread_id", help="Thread ID to resolve (from gw gh pr comments)"
)
@click.option("--all", "resolve_all", is_flag=True, help="Resolve all threads")
@click.pass_context
def pr_resolve(
    ctx: click.Context,
    write: bool,
    number: int,
    thread_id: Optional[str],
    resolve_all: bool,
) -> None:
    """Resolve review threads on a pull request.

    Requires --write flag.

    \b
    Examples:
        gw gh pr resolve --write 123 --thread PRRT_xxx
        gw gh pr resolve --write 123 --all
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_github_safety("pr_resolve", write_flag=write)
    except GitHubSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    if not thread_id and not resolve_all:
        console.print("[yellow]Specify --thread <id> or --all[/yellow]")
        raise SystemExit(1)

    try:
        gh = GitHub()

        if resolve_all:
            # Get all unresolved threads
            threads = gh.pr_get_review_threads(number)
            unresolved = [t for t in threads if not t.get("isResolved")]

            if not unresolved:
                console.print("[dim]No unresolved threads[/dim]")
                return

            for thread in unresolved:
                gh.pr_resolve_thread(thread["id"])

            if output_json:
                console.print(json.dumps({"resolved": len(unresolved)}))
            else:
                console.print(f"[green]Resolved {len(unresolved)} threads[/green]")
        else:
            gh.pr_resolve_thread(thread_id)

            if output_json:
                console.print(json.dumps({"resolved": thread_id}))
            else:
                console.print(f"[green]Resolved thread[/green]")

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@pr.command("re-review")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("number", type=int)
@click.option(
    "--reviewer", "-r", multiple=True, required=True, help="Reviewer username(s)"
)
@click.pass_context
def pr_re_review(
    ctx: click.Context,
    write: bool,
    number: int,
    reviewer: tuple[str, ...],
) -> None:
    """Request re-review from reviewers.

    Requires --write flag.

    \b
    Examples:
        gw gh pr re-review --write 123 -r username
        gw gh pr re-review --write 123 -r user1 -r user2
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_github_safety("pr_re_review", write_flag=write)
    except GitHubSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    try:
        gh = GitHub()
        gh.pr_request_review(number, list(reviewer))

        if output_json:
            console.print(json.dumps({"requested": list(reviewer)}))
        else:
            reviewers_str = ", ".join(reviewer)
            console.print(f"[green]Requested review from:[/green] {reviewers_str}")

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)
