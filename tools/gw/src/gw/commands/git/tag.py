"""Git tag management commands."""

import json
from typing import Optional

import click
from rich.syntax import Syntax
from rich.table import Table

from ...git_wrapper import Git, GitError
from ...safety.git import GitSafetyError, check_git_safety
from ...ui import console, action, git_error, hint, not_a_repo, safety_error


@click.group()
def tag() -> None:
    """Manage tags for releases and versions.

    List and show are always safe; create/delete require --write.

    \b
    Examples:
        gw git tag list                             # List all tags
        gw git tag show v1.2.3                      # Show tag details
        gw git tag create --write v1.2.3            # Lightweight tag
        gw git tag create --write v1.2.3 -m "msg"   # Annotated tag
        gw git tag delete --write v1.2.3            # Delete a tag
    """
    pass


@tag.command("list")
@click.option("--sort", "sort_by", type=click.Choice(["name", "date", "version"]), default="version", help="Sort order")
@click.option("--limit", "-n", default=None, type=int, help="Limit number of tags shown")
@click.pass_context
def tag_list(ctx: click.Context, sort_by: str, limit: Optional[int]) -> None:
    """List all tags.

    Always safe - no --write flag required.

    \b
    Examples:
        gw git tag list                    # List all (newest first)
        gw git tag list --sort name        # Sort alphabetically
        gw git tag list --limit 10         # Last 10 tags
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        if not git.is_repo():
            not_a_repo()

        # Sort flags
        sort_flag = {
            "name": "--sort=refname",
            "date": "--sort=-creatordate",
            "version": "--sort=-version:refname",
        }.get(sort_by, "--sort=-version:refname")

        args = ["tag", "-l", sort_flag, "--format=%(refname:short)\t%(creatordate:relative)\t%(subject)"]
        output = git.execute(args)

        if not output.strip():
            if output_json:
                console.print(json.dumps({"tags": []}))
            else:
                console.print("[dim]No tags found[/dim]")
            return

        tags = []
        for line in output.strip().split("\n"):
            if not line.strip():
                continue
            parts = line.split("\t", 2)
            name = parts[0] if len(parts) > 0 else ""
            date = parts[1] if len(parts) > 1 else ""
            message = parts[2] if len(parts) > 2 else ""
            tags.append({"name": name, "date": date, "message": message})

        if limit:
            tags = tags[:limit]

        if output_json:
            console.print(json.dumps({"tags": tags}, indent=2))
            return

        table = Table(title="Tags", border_style="green")
        table.add_column("Tag", style="cyan")
        table.add_column("Date", style="dim")
        table.add_column("Message")

        for t in tags:
            table.add_row(t["name"], t["date"], t["message"])

        console.print(table)
        console.print(f"\n[dim]{len(tags)} tag(s)[/dim]")

    except GitError as e:
        git_error(e.message)
        raise SystemExit(1)


@tag.command("show")
@click.argument("name")
@click.pass_context
def tag_show(ctx: click.Context, name: str) -> None:
    """Show details of a specific tag.

    Always safe - no --write flag required.

    \b
    Examples:
        gw git tag show v1.2.3
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        git = Git()

        if not git.is_repo():
            not_a_repo()

        output = git.execute(["show", name])

        if output_json:
            console.print(json.dumps({"tag": name, "details": output.strip()}))
        else:
            syntax = Syntax(output, "diff", theme="monokai", line_numbers=False)
            console.print(syntax)

    except GitError as e:
        git_error(e.message)
        raise SystemExit(1)


@tag.command("create")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--message", "-m", help="Tag message (creates annotated tag)")
@click.option("--ref", default=None, help="Commit to tag (default: HEAD)")
@click.argument("name")
@click.pass_context
def tag_create(ctx: click.Context, write: bool, message: Optional[str], ref: Optional[str], name: str) -> None:
    """Create a new tag.

    Requires --write flag. Without -m, creates a lightweight tag.
    With -m, creates an annotated tag (recommended for releases).

    \b
    Examples:
        gw git tag create --write v1.2.3                        # Lightweight
        gw git tag create --write v1.2.3 -m "Release 1.2.3"    # Annotated
        gw git tag create --write v1.2.3 --ref abc123           # Tag specific commit
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("tag_create", write_flag=write)
    except GitSafetyError as e:
        safety_error(e.message, e.suggestion)
        raise SystemExit(1)

    try:
        git = Git()

        if not git.is_repo():
            not_a_repo()

        args = ["tag"]
        if message:
            args.extend(["-a", name, "-m", message])
        else:
            args.append(name)

        if ref:
            args.append(ref)

        git.execute(args)

        if output_json:
            console.print(json.dumps({
                "created": name,
                "annotated": message is not None,
                "message": message,
                "ref": ref,
            }))
        else:
            tag_type = "Annotated tag" if message else "Lightweight tag"
            action(f"{tag_type} created", name)
            if message:
                hint(f"Message: {message}")
            hint(f"Push with: gw git push --write origin {name}")

    except GitError as e:
        git_error(e.message)
        raise SystemExit(1)


@tag.command("delete")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("name")
@click.pass_context
def tag_delete(ctx: click.Context, write: bool, name: str) -> None:
    """Delete a tag.

    Requires --write flag. Only deletes the local tag.
    To remove from remote: git push origin --delete <tag>

    \b
    Examples:
        gw git tag delete --write v1.2.3
    """
    output_json = ctx.obj.get("output_json", False)

    try:
        check_git_safety("tag_delete", write_flag=write)
    except GitSafetyError as e:
        safety_error(e.message, e.suggestion)
        raise SystemExit(1)

    try:
        git = Git()

        if not git.is_repo():
            not_a_repo()

        git.execute(["tag", "-d", name])

        if output_json:
            console.print(json.dumps({"deleted": name}))
        else:
            action("Deleted tag", name)
            hint(f"To remove from remote: git push origin --delete {name}")

    except GitError as e:
        git_error(e.message)
        raise SystemExit(1)
