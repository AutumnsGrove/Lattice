"""Issue commands for GitHub integration."""

import json
from typing import Optional

import click
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt
from rich.table import Table
from rich.markdown import Markdown

from ...gh_wrapper import GitHub, GitHubError
from ...safety.github import (
    GitHubSafetyError,
    check_github_safety,
    check_rate_limit,
    should_warn_rate_limit,
)

console = Console()


@click.group()
def issue() -> None:
    """Issue operations.

    \b
    Examples:
        gw gh issue list              # List open issues
        gw gh issue view 348          # View issue details
        gw gh issue create --write    # Create an issue
    """
    pass


@issue.command("list")
@click.option("--state", default="open", help="Filter by state (open, closed, all)")
@click.option("--author", help="Filter by author")
@click.option("--assignee", help="Filter by assignee")
@click.option("--label", help="Filter by label")
@click.option("--milestone", help="Filter by milestone")
@click.option("--limit", default=30, help="Maximum number to return")
@click.pass_context
def issue_list(
    ctx: click.Context,
    state: str,
    author: Optional[str],
    assignee: Optional[str],
    label: Optional[str],
    milestone: Optional[str],
    limit: int,
) -> None:
    """List issues.

    Always safe - no --write flag required.

    \b
    Examples:
        gw gh issue list
        gw gh issue list --label bug
        gw gh issue list --assignee @me
        gw gh issue list --milestone "February 2026"
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

        issues = gh.issue_list(
            state=state,
            author=author,
            assignee=assignee,
            label=label,
            milestone=milestone,
            limit=limit,
        )

        if output_json:
            data = [
                {
                    "number": issue.number,
                    "title": issue.title,
                    "state": issue.state,
                    "author": issue.author,
                    "url": issue.url,
                    "labels": issue.labels,
                }
                for issue in issues
            ]
            console.print(json.dumps(data, indent=2))
            return

        if not issues:
            console.print("[dim]No issues found[/dim]")
            return

        table = Table(title=f"Issues ({state})", border_style="green")
        table.add_column("#", style="cyan", width=6)
        table.add_column("Title")
        table.add_column("Author", style="dim")
        table.add_column("Labels", style="yellow")

        for issue in issues:
            labels = ", ".join(issue.labels[:3]) if issue.labels else ""
            if len(issue.labels) > 3:
                labels += f" +{len(issue.labels) - 3}"

            table.add_row(str(issue.number), issue.title, issue.author, labels)

        console.print(table)

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@issue.command("view")
@click.argument("number", type=int)
@click.option("--comments", is_flag=True, help="Show comments")
@click.pass_context
def issue_view(
    ctx: click.Context,
    number: int,
    comments: bool,
) -> None:
    """View issue details.

    Always safe - no --write flag required.

    \b
    Examples:
        gw gh issue view 348
        gw gh issue view 348 --comments
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        gh = GitHub()
        issue = gh.issue_view(number)

        if output_json:
            data = {
                "number": issue.number,
                "title": issue.title,
                "state": issue.state,
                "author": issue.author,
                "url": issue.url,
                "body": issue.body,
                "labels": issue.labels,
                "assignees": issue.assignees,
                "milestone": issue.milestone,
            }
            console.print(json.dumps(data, indent=2))
            return

        # Header
        state_style = "green" if issue.state == "OPEN" else "red"

        console.print(Panel(
            f"[bold]{issue.title}[/bold]\n\n"
            f"[{state_style}]{issue.state}[/{state_style}] • "
            f"Author: {issue.author} • {issue.url}",
            title=f"Issue #{issue.number}",
            border_style="green",
        ))

        # Labels
        if issue.labels:
            console.print(f"\n[bold]Labels:[/bold] {', '.join(issue.labels)}")

        # Assignees
        if issue.assignees:
            console.print(f"[bold]Assignees:[/bold] {', '.join(issue.assignees)}")

        # Milestone
        if issue.milestone:
            console.print(f"[bold]Milestone:[/bold] {issue.milestone}")

        # Body
        if issue.body:
            console.print("\n[bold]Description:[/bold]")
            console.print(Markdown(issue.body))

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@issue.command("create")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--title", "-t", help="Issue title")
@click.option("--body", "-b", help="Issue body")
@click.option("--label", multiple=True, help="Labels to add")
@click.option("--assignee", multiple=True, help="Assignees")
@click.option("--milestone", help="Milestone")
@click.pass_context
def issue_create(
    ctx: click.Context,
    write: bool,
    title: Optional[str],
    body: Optional[str],
    label: tuple[str, ...],
    assignee: tuple[str, ...],
    milestone: Optional[str],
) -> None:
    """Create an issue.

    Requires --write flag.

    \b
    Examples:
        gw gh issue create --write -t "Bug: cache issue"
        gw gh issue create --write -t "Feature request" --label enhancement
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_github_safety("issue_create", write_flag=write)
    except GitHubSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    # Interactive mode if title not provided
    if not title:
        if output_json:
            console.print("[red]Title required in JSON mode[/red]")
            raise SystemExit(1)

        console.print(Panel(
            "Create a new issue",
            title="Create Issue",
            border_style="green",
        ))

        title = Prompt.ask("Title")
        body = Prompt.ask("Body (description)", default="")

    try:
        gh = GitHub()
        issue = gh.issue_create(
            title=title,
            body=body or "",
            labels=list(label) if label else None,
            assignees=list(assignee) if assignee else None,
            milestone=milestone,
        )

        if output_json:
            console.print(json.dumps({
                "number": issue.number,
                "url": issue.url,
                "title": issue.title,
            }))
        else:
            console.print(f"[green]Created issue #{issue.number}:[/green] {issue.title}")
            console.print(f"[dim]{issue.url}[/dim]")

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@issue.command("comment")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("number", type=int)
@click.option("--body", "-b", help="Comment body")
@click.pass_context
def issue_comment(
    ctx: click.Context,
    write: bool,
    number: int,
    body: Optional[str],
) -> None:
    """Add a comment to an issue.

    Requires --write flag.

    \b
    Examples:
        gw gh issue comment --write 348 -b "Investigating..."
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_github_safety("issue_comment", write_flag=write)
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
        gh.issue_comment(number, body)

        if output_json:
            console.print(json.dumps({"commented": number}))
        else:
            console.print(f"[green]Commented on issue #{number}[/green]")

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@issue.command("close")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("number", type=int)
@click.option("--reason", default="completed", help="Close reason (completed, not_planned)")
@click.option("--comment", "-c", help="Closing comment")
@click.pass_context
def issue_close(
    ctx: click.Context,
    write: bool,
    number: int,
    reason: str,
    comment: Optional[str],
) -> None:
    """Close an issue.

    Requires --write flag. This is a destructive operation.

    \b
    Examples:
        gw gh issue close --write 348
        gw gh issue close --write 348 --reason completed
        gw gh issue close --write 348 -c "Fixed in #124"
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_github_safety("issue_close", write_flag=write)
    except GitHubSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    # Confirm if not in JSON mode
    if not output_json:
        if not Confirm.ask(f"Close issue #{number}?", default=True):
            console.print("[dim]Aborted[/dim]")
            raise SystemExit(0)

    try:
        gh = GitHub()
        gh.issue_close(number, reason=reason, comment=comment)

        if output_json:
            console.print(json.dumps({"closed": number, "reason": reason}))
        else:
            console.print(f"[green]Closed issue #{number}[/green] ({reason})")

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)


@issue.command("reopen")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("number", type=int)
@click.pass_context
def issue_reopen(
    ctx: click.Context,
    write: bool,
    number: int,
) -> None:
    """Reopen an issue.

    Requires --write flag.

    \b
    Examples:
        gw gh issue reopen --write 348
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_github_safety("issue_reopen", write_flag=write)
    except GitHubSafetyError as e:
        console.print(f"[red]Safety check failed:[/red] {e.message}")
        if e.suggestion:
            console.print(f"[dim]{e.suggestion}[/dim]")
        raise SystemExit(1)

    try:
        gh = GitHub()
        gh.issue_reopen(number)

        if output_json:
            console.print(json.dumps({"reopened": number}))
        else:
            console.print(f"[green]Reopened issue #{number}[/green]")

    except GitHubError as e:
        console.print(f"[red]GitHub error:[/red] {e.message}")
        raise SystemExit(1)
