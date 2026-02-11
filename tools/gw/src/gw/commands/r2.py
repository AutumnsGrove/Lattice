"""R2 bucket commands - manage Cloudflare R2 object storage."""

import json
from pathlib import Path
from typing import Optional

import click

from ..config import GWConfig
from ..ui import console, create_table, error, info, success, warning
from ..wrangler import Wrangler, WranglerError


@click.group()
@click.pass_context
def r2(ctx: click.Context) -> None:
    """R2 object storage operations.

    Manage Cloudflare R2 buckets and objects with safety guards.
    Read operations are always safe. Write operations require --write flag.
    Delete operations require --write --force flags.

    \b
    Examples:
        gw r2 list                      # List all buckets
        gw r2 create --write new-bucket # Create a bucket
        gw r2 ls grove-media            # List objects in bucket
        gw r2 get grove-media path/file # Download an object
        gw r2 put --write bucket file   # Upload an object
    """
    pass


@r2.command("list")
@click.pass_context
def r2_list(ctx: click.Context) -> None:
    """List all R2 buckets.

    Always safe - no --write flag required.

    \b
    Examples:
        gw r2 list
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    try:
        result = wrangler.execute(["r2", "bucket", "list"], use_json=True)
        buckets = json.loads(result)
    except (WranglerError, json.JSONDecodeError) as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to list buckets: {e}")
        return

    if output_json:
        output_data = {
            "configured": [b.name for b in config.r2_buckets],
            "remote": buckets,
        }
        console.print(json.dumps(output_data, indent=2))
        return

    # Human-readable output
    console.print("\n[bold green]R2 Buckets[/bold green]\n")

    # Show configured buckets
    if config.r2_buckets:
        console.print("[dim]Configured:[/dim]", ", ".join(b.name for b in config.r2_buckets))
        console.print()

    if buckets:
        bucket_table = create_table(title="Cloudflare R2 Buckets")
        bucket_table.add_column("Name", style="cyan")
        bucket_table.add_column("Created", style="yellow")

        for bucket in buckets:
            bucket_table.add_row(
                bucket.get("name", "unknown"),
                bucket.get("creation_date", "-")[:10] if bucket.get("creation_date") else "-",
            )

        console.print(bucket_table)
    else:
        info("No buckets found")


@r2.command("create")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("bucket")
@click.pass_context
def r2_create(ctx: click.Context, write: bool, bucket: str) -> None:
    """Create a new R2 bucket.

    Requires --write flag.

    \b
    Examples:
        gw r2 create --write grove-exports
        gw r2 create --write my-new-bucket
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    if not write:
        if output_json:
            console.print(json.dumps({"error": "R2 create requires --write flag"}))
        else:
            error("R2 create requires --write flag")
            info("Add --write to confirm this operation")
        raise SystemExit(1)

    try:
        wrangler.execute(["r2", "bucket", "create", bucket])
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to create bucket: {e}")
        raise SystemExit(1)

    if output_json:
        console.print(json.dumps({"bucket": bucket, "created": True}))
    else:
        success(f"Created R2 bucket '{bucket}'")


@r2.command("ls")
@click.argument("bucket")
@click.option("--prefix", "-p", help="Filter objects by prefix")
@click.option("--limit", "-n", default=100, help="Maximum objects to return (default: 100)")
@click.pass_context
def r2_ls(
    ctx: click.Context,
    bucket: str,
    prefix: Optional[str],
    limit: int,
) -> None:
    """List objects in a bucket.

    Always safe - no --write flag required.

    \b
    Examples:
        gw r2 ls grove-media
        gw r2 ls grove-media --prefix avatars/
        gw r2 ls grove-media --limit 50
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    cmd = ["r2", "object", "list", bucket]
    if prefix:
        cmd.extend(["--prefix", prefix])

    try:
        result = wrangler.execute(cmd, use_json=True)
        data = json.loads(result)
        objects = data.get("objects", []) if isinstance(data, dict) else data
        # Apply limit
        objects = objects[:limit] if len(objects) > limit else objects
    except (WranglerError, json.JSONDecodeError) as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to list objects: {e}")
        return

    if output_json:
        console.print(json.dumps({"bucket": bucket, "objects": objects}, indent=2))
        return

    # Human-readable output
    console.print(f"\n[bold green]Objects in {bucket}[/bold green]\n")

    if not objects:
        info("No objects found")
        return

    obj_table = create_table(title=f"{len(objects)} Objects")
    obj_table.add_column("Key", style="cyan")
    obj_table.add_column("Size", style="magenta", justify="right")
    obj_table.add_column("Modified", style="yellow")

    for obj in objects:
        size = obj.get("size", 0)
        size_str = _format_size(size)
        modified = obj.get("last_modified", obj.get("uploaded", "-"))
        if modified and len(modified) > 10:
            modified = modified[:10]
        obj_table.add_row(obj.get("key", "unknown"), size_str, modified or "-")

    console.print(obj_table)


@r2.command("get")
@click.argument("bucket")
@click.argument("key")
@click.option("--output", "-o", help="Output file path (default: key basename)")
@click.pass_context
def r2_get(
    ctx: click.Context,
    bucket: str,
    key: str,
    output: Optional[str],
) -> None:
    """Download an object from R2.

    Always safe - no --write flag required.

    \b
    Examples:
        gw r2 get grove-media avatars/user123.png
        gw r2 get grove-media data.json --output local.json
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    # Default output to the key's basename
    output_path = output or Path(key).name

    try:
        wrangler.execute(["r2", "object", "get", bucket, key, "--file", output_path])
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to download object: {e}")
        raise SystemExit(1)

    if output_json:
        console.print(json.dumps({
            "bucket": bucket,
            "key": key,
            "downloaded": output_path,
        }))
    else:
        success(f"Downloaded '{key}' to {output_path}")


@r2.command("put")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.argument("bucket")
@click.argument("file_path", type=click.Path(exists=True))
@click.option("--key", "-k", help="Object key (default: file name)")
@click.option("--content-type", "-t", help="Content-Type header")
@click.pass_context
def r2_put(
    ctx: click.Context,
    write: bool,
    bucket: str,
    file_path: str,
    key: Optional[str],
    content_type: Optional[str],
) -> None:
    """Upload an object to R2.

    Requires --write flag.

    \b
    Examples:
        gw r2 put --write grove-media ./image.png
        gw r2 put --write grove-media ./image.png --key avatars/user123.png
        gw r2 put --write grove-media ./data.json --content-type application/json
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    if not write:
        if output_json:
            console.print(json.dumps({"error": "R2 put requires --write flag"}))
        else:
            error("R2 put requires --write flag")
            info("Add --write to confirm this operation")
        raise SystemExit(1)

    # Default key to file name
    object_key = key or Path(file_path).name

    cmd = ["r2", "object", "put", bucket, object_key, "--file", file_path]
    if content_type:
        cmd.extend(["--content-type", content_type])

    try:
        wrangler.execute(cmd)
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to upload object: {e}")
        raise SystemExit(1)

    if output_json:
        console.print(json.dumps({
            "bucket": bucket,
            "key": object_key,
            "uploaded": True,
        }))
    else:
        success(f"Uploaded '{file_path}' to {bucket}/{object_key}")


@r2.command("rm")
@click.option("--write", is_flag=True, help="Confirm write operation")
@click.option("--force", is_flag=True, help="Confirm destructive operation")
@click.argument("bucket")
@click.argument("key")
@click.pass_context
def r2_rm(
    ctx: click.Context,
    write: bool,
    force: bool,
    bucket: str,
    key: str,
) -> None:
    """Delete an object from R2.

    Requires --write --force flags.

    \b
    Examples:
        gw r2 rm --write --force grove-media old/file.txt
    """
    config: GWConfig = ctx.obj["config"]
    output_json: bool = ctx.obj.get("output_json", False)
    wrangler = Wrangler(config)

    if not write:
        if output_json:
            console.print(json.dumps({"error": "R2 rm requires --write flag"}))
        else:
            error("R2 rm requires --write flag")
            info("Add --write to confirm this operation")
        raise SystemExit(1)

    if not force:
        if output_json:
            console.print(json.dumps({"error": "R2 rm requires --force flag (destructive operation)"}))
        else:
            error("R2 rm requires --force flag")
            info("This is a destructive operation")
        raise SystemExit(1)

    try:
        wrangler.execute(["r2", "object", "delete", bucket, key])
    except WranglerError as e:
        if output_json:
            console.print(json.dumps({"error": str(e)}))
        else:
            error(f"Failed to delete object: {e}")
        raise SystemExit(1)

    if output_json:
        console.print(json.dumps({
            "bucket": bucket,
            "key": key,
            "deleted": True,
        }))
    else:
        success(f"Deleted '{key}' from {bucket}")


def _format_size(size_bytes: int) -> str:
    """Format a size in bytes to human-readable."""
    if size_bytes >= 1024 * 1024 * 1024:
        return f"{size_bytes / 1024 / 1024 / 1024:.1f} GB"
    if size_bytes >= 1024 * 1024:
        return f"{size_bytes / 1024 / 1024:.1f} MB"
    if size_bytes >= 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes} B"
