"""GitHub Project board commands for badger-triage integration."""

import json
from typing import Any, Optional

import click

from ...gh_wrapper import GitHub as GitHubCLI, GitHubError
from ...safety.github import GitHubSafetyTier
from ...ui import console, create_table, error, info, success, warning


@click.group()
def project() -> None:
    """GitHub Project board operations.

    Manage project board items, move between columns, and set fields.
    Integrates with the badger-triage workflow.

    \b
    Safety Tiers:
    - READ: list, view (always safe)
    - WRITE: move, field, add (require --write)

    \b
    Examples:
        gw gh project list             # List project items
        gw gh project view 348         # View item by issue number
        gw gh project move --write 348 --status "In Progress"
    """
    pass


@project.command("list")
@click.option("--status", "-s", help="Filter by status column")
@click.option("--assignee", "-a", help="Filter by assignee")
@click.option("--limit", "-n", default=20, help="Maximum items to show")
@click.pass_context
def project_list(
    ctx: click.Context,
    status: Optional[str],
    assignee: Optional[str],
    limit: int,
) -> None:
    """List project board items.

    \b
    Examples:
        gw gh project list
        gw gh project list --status "In Progress"
        gw gh project list --assignee @me
    """
    output_json = ctx.obj.get("output_json", False)
    gh = GitHubCLI()

    # Build gh project item-list command
    # Note: gh project commands require project number
    cmd = ["project", "item-list", "--limit", str(limit)]

    # For now, we'll use the issues list as a proxy since project commands
    # require more setup. In a full implementation, you'd use GraphQL.
    cmd = ["issue", "list", "--limit", str(limit), "--json",
           "number,title,state,assignees,labels"]

    if status:
        # Map status to label filter
        status_map = {
            "backlog": "status:backlog",
            "ready": "status:ready",
            "in progress": "status:in-progress",
            "in review": "status:in-review",
            "done": "status:done",
        }
        label = status_map.get(status.lower(), f"status:{status.lower()}")
        cmd.extend(["--label", label.split(":")[-1]])

    if assignee:
        cmd.extend(["--assignee", assignee])

    try:
        result = gh.execute(cmd)
        items = json.loads(result) if result else []
    except (GitHubError, json.JSONDecodeError) as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to list project items: {e}")
        ctx.exit(1)

    if output_json:
        console.print(json.dumps({"items": items}, indent=2))
        return

    if not items:
        info("No project items found")
        return

    console.print("\n[bold green]Project Items[/bold green]\n")

    table = create_table()
    table.add_column("#", style="dim", justify="right")
    table.add_column("Title", style="white")
    table.add_column("Status", style="cyan")
    table.add_column("Assignee", style="magenta")

    for item in items:
        number = str(item.get("number", ""))
        title = item.get("title", "")[:50]
        if len(item.get("title", "")) > 50:
            title += "..."

        # Extract status from labels
        labels = item.get("labels", [])
        status_label = next(
            (l.get("name", "") for l in labels if l.get("name", "").startswith("status:")),
            item.get("state", "")
        )

        assignees = item.get("assignees", [])
        assignee_str = ", ".join(a.get("login", "") for a in assignees[:2])
        if len(assignees) > 2:
            assignee_str += f" +{len(assignees) - 2}"

        table.add_row(number, title, status_label, assignee_str)

    console.print(table)


@project.command("view")
@click.argument("issue_number", type=int)
@click.pass_context
def project_view(ctx: click.Context, issue_number: int) -> None:
    """View project item details.

    \b
    Examples:
        gw gh project view 348
    """
    output_json = ctx.obj.get("output_json", False)
    gh = GitHubCLI()

    try:
        result = gh.execute([
            "issue", "view", str(issue_number), "--json",
            "number,title,body,state,labels,assignees,milestone,projectItems"
        ])
        item = json.loads(result) if result else {}
    except (GitHubError, json.JSONDecodeError) as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to view item: {e}")
        ctx.exit(1)

    if output_json:
        console.print(json.dumps(item, indent=2))
        return

    console.print(f"\n[bold green]#{item.get('number')} {item.get('title')}[/bold green]\n")

    # Status
    console.print(f"[cyan]State:[/cyan] {item.get('state', '-')}")

    # Labels
    labels = item.get("labels", [])
    if labels:
        label_str = ", ".join(l.get("name", "") for l in labels)
        console.print(f"[cyan]Labels:[/cyan] {label_str}")

    # Assignees
    assignees = item.get("assignees", [])
    if assignees:
        assignee_str = ", ".join(f"@{a.get('login', '')}" for a in assignees)
        console.print(f"[cyan]Assignees:[/cyan] {assignee_str}")

    # Milestone
    milestone = item.get("milestone")
    if milestone:
        console.print(f"[cyan]Milestone:[/cyan] {milestone.get('title', '-')}")

    # Project items (if available)
    project_items = item.get("projectItems", {}).get("nodes", [])
    if project_items:
        console.print(f"\n[bold]Project Board Status:[/bold]")
        for pi in project_items:
            project_title = pi.get("project", {}).get("title", "Unknown")
            status = pi.get("status", {}).get("name", "-") if pi.get("status") else "-"
            console.print(f"  • {project_title}: {status}")

    # Body preview
    body = item.get("body", "")
    if body:
        console.print(f"\n[dim]{body[:200]}{'...' if len(body) > 200 else ''}[/dim]")


@project.command("move")
@click.argument("issue_number", type=int)
@click.option("--write", is_flag=True, required=True, help="Confirm write operation")
@click.option("--status", "-s", required=True, help="Target status column")
@click.option("--dry-run", is_flag=True, help="Preview without moving")
@click.pass_context
def project_move(
    ctx: click.Context,
    issue_number: int,
    write: bool,
    status: str,
    dry_run: bool,
) -> None:
    """Move item to a different status column.

    \b
    Status values: Backlog, Ready, In Progress, In Review, Done

    \b
    Examples:
        gw gh project move --write 348 --status "In Progress"
        gw gh project move --write 348 --status Done
    """
    output_json = ctx.obj.get("output_json", False)
    gh = GitHubCLI()

    # Normalize status
    status_normalized = status.lower().replace(" ", "-")

    if dry_run:
        if output_json:
            console.print(json.dumps({
                "dry_run": True,
                "issue": issue_number,
                "target_status": status,
            }))
        else:
            console.print(f"[bold yellow]DRY RUN[/bold yellow] - Would move #{issue_number} to '{status}'")
        return

    # For now, we implement this by adding/removing status labels
    # In a full implementation, you'd use the GitHub Projects GraphQL API
    try:
        # Remove existing status labels
        gh.execute([
            "issue", "edit", str(issue_number),
            "--remove-label", "status:backlog",
            "--remove-label", "status:ready",
            "--remove-label", "status:in-progress",
            "--remove-label", "status:in-review",
            "--remove-label", "status:done",
        ])

        # Add new status label
        gh.execute([
            "issue", "edit", str(issue_number),
            "--add-label", f"status:{status_normalized}",
        ])
    except GitHubError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to move item: {e}")
        ctx.exit(1)

    if output_json:
        console.print(json.dumps({
            "moved": issue_number,
            "status": status,
        }))
    else:
        success(f"Moved #{issue_number} to '{status}'")


@project.command("field")
@click.argument("issue_number", type=int)
@click.option("--write", is_flag=True, required=True, help="Confirm write operation")
@click.option("--size", type=click.Choice(["XS", "S", "M", "L", "XL"]), help="Set size")
@click.option("--priority", type=click.Choice(["Critical", "High", "Medium", "Low"]), help="Set priority")
@click.option("--dry-run", is_flag=True, help="Preview without setting")
@click.pass_context
def project_field(
    ctx: click.Context,
    issue_number: int,
    write: bool,
    size: Optional[str],
    priority: Optional[str],
    dry_run: bool,
) -> None:
    """Set custom fields on a project item.

    \b
    Examples:
        gw gh project field --write 348 --size M
        gw gh project field --write 348 --priority High
        gw gh project field --write 348 --size L --priority Medium
    """
    output_json = ctx.obj.get("output_json", False)
    gh = GitHubCLI()

    if not size and not priority:
        if output_json:
            console.print(json.dumps({"error": "Specify --size or --priority"}))
        else:
            error("Specify at least one field: --size or --priority")
        ctx.exit(1)

    fields_to_set = {}
    if size:
        fields_to_set["size"] = size
    if priority:
        fields_to_set["priority"] = priority

    if dry_run:
        if output_json:
            console.print(json.dumps({
                "dry_run": True,
                "issue": issue_number,
                "fields": fields_to_set,
            }))
        else:
            console.print(f"[bold yellow]DRY RUN[/bold yellow] - Would set on #{issue_number}:")
            for field, value in fields_to_set.items():
                console.print(f"  • {field}: {value}")
        return

    # Implement via labels for now
    # In a full implementation, use GitHub Projects GraphQL API
    try:
        labels_to_add = []
        labels_to_remove = []

        if size:
            # Remove existing size labels
            for s in ["XS", "S", "M", "L", "XL"]:
                labels_to_remove.append(f"size:{s.lower()}")
            labels_to_add.append(f"size:{size.lower()}")

        if priority:
            # Remove existing priority labels
            for p in ["critical", "high", "medium", "low"]:
                labels_to_remove.append(f"priority:{p}")
            labels_to_add.append(f"priority:{priority.lower()}")

        # Remove old labels
        if labels_to_remove:
            cmd = ["issue", "edit", str(issue_number)]
            for label in labels_to_remove:
                cmd.extend(["--remove-label", label])
            try:
                gh.execute(cmd)
            except GitHubError:
                pass  # Label might not exist

        # Add new labels
        if labels_to_add:
            cmd = ["issue", "edit", str(issue_number)]
            for label in labels_to_add:
                cmd.extend(["--add-label", label])
            gh.execute(cmd)

    except GitHubError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to set fields: {e}")
        ctx.exit(1)

    if output_json:
        console.print(json.dumps({
            "updated": issue_number,
            "fields": fields_to_set,
        }))
    else:
        success(f"Updated fields on #{issue_number}")
        for field, value in fields_to_set.items():
            console.print(f"  • {field}: {value}")


@project.command("bulk")
@click.option("--write", is_flag=True, required=True, help="Confirm write operation")
@click.option("--issues", "-i", required=True, help="Comma-separated issue numbers")
@click.option("--status", "-s", help="Set status for all")
@click.option("--priority", "-p", help="Set priority for all")
@click.option("--size", help="Set size for all")
@click.option("--dry-run", is_flag=True, help="Preview without changes")
@click.pass_context
def project_bulk(
    ctx: click.Context,
    write: bool,
    issues: str,
    status: Optional[str],
    priority: Optional[str],
    size: Optional[str],
    dry_run: bool,
) -> None:
    """Bulk update multiple project items.

    Useful for triage sessions.

    \b
    Examples:
        gw gh project bulk --write --issues 348,349,350 --status Ready
        gw gh project bulk --write --issues 348,349 --priority Medium --size M
    """
    output_json = ctx.obj.get("output_json", False)

    # Parse issue numbers
    try:
        issue_numbers = [int(n.strip()) for n in issues.split(",")]
    except ValueError:
        if output_json:
            console.print(json.dumps({"error": "Invalid issue numbers"}))
        else:
            error("Issue numbers must be comma-separated integers")
        ctx.exit(1)

    if not status and not priority and not size:
        if output_json:
            console.print(json.dumps({"error": "No fields specified"}))
        else:
            error("Specify at least one field to update")
        ctx.exit(1)

    if dry_run:
        if output_json:
            console.print(json.dumps({
                "dry_run": True,
                "issues": issue_numbers,
                "status": status,
                "priority": priority,
                "size": size,
            }))
        else:
            console.print(f"[bold yellow]DRY RUN[/bold yellow] - Would update {len(issue_numbers)} issues:")
            console.print(f"  Issues: {', '.join(f'#{n}' for n in issue_numbers)}")
            if status:
                console.print(f"  Status: {status}")
            if priority:
                console.print(f"  Priority: {priority}")
            if size:
                console.print(f"  Size: {size}")
        return

    # Process each issue
    results = {"success": [], "failed": []}

    for issue_num in issue_numbers:
        try:
            # Move status if specified
            if status:
                ctx.invoke(project_move, issue_number=issue_num, write=True, status=status, dry_run=False)

            # Set fields if specified
            if priority or size:
                ctx.invoke(project_field, issue_number=issue_num, write=True, size=size, priority=priority, dry_run=False)

            results["success"].append(issue_num)
        except Exception as e:
            results["failed"].append({"issue": issue_num, "error": str(e)})

    if output_json:
        console.print(json.dumps(results, indent=2))
    else:
        if results["success"]:
            success(f"Updated {len(results['success'])} issues")
        if results["failed"]:
            warning(f"Failed to update {len(results['failed'])} issues")
            for f in results["failed"]:
                console.print(f"  • #{f['issue']}: {f['error']}")


@project.command("add")
@click.argument("issue_number", type=int)
@click.option("--write", is_flag=True, required=True, help="Confirm write operation")
@click.pass_context
def project_add(ctx: click.Context, issue_number: int, write: bool) -> None:
    """Add an issue to the project board.

    \b
    Examples:
        gw gh project add --write 348
    """
    output_json = ctx.obj.get("output_json", False)
    gh = GitHubCLI()

    # Add the 'on-board' label to indicate it's on the project
    try:
        gh.execute([
            "issue", "edit", str(issue_number),
            "--add-label", "on-board",
            "--add-label", "status:backlog",
        ])
    except GitHubError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to add to project: {e}")
        ctx.exit(1)

    if output_json:
        console.print(json.dumps({"added": issue_number}))
    else:
        success(f"Added #{issue_number} to project board")


@project.command("remove")
@click.argument("issue_number", type=int)
@click.option("--write", is_flag=True, required=True, help="Confirm write operation")
@click.pass_context
def project_remove(ctx: click.Context, issue_number: int, write: bool) -> None:
    """Remove an issue from the project board.

    \b
    Examples:
        gw gh project remove --write 348
    """
    output_json = ctx.obj.get("output_json", False)
    gh = GitHubCLI()

    try:
        gh.execute([
            "issue", "edit", str(issue_number),
            "--remove-label", "on-board",
        ])
    except GitHubError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to remove from project: {e}")
        ctx.exit(1)

    if output_json:
        console.print(json.dumps({"removed": issue_number}))
    else:
        success(f"Removed #{issue_number} from project board")
