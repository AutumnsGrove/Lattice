"""glimpse seed — bootstrap local D1 databases with migrations and test data."""

import sys

import click

from glimpse.seed.bootstrap import DataBootstrapper, PROFILES, DEFAULT_PROFILE
from glimpse.seed.discovery import find_grove_root


@click.command()
@click.option("--reset", is_flag=True, default=False, help="Drop all local D1 data and recreate")
@click.option("--yes", "-y", is_flag=True, default=False, help="Skip confirmation for --reset")
@click.option("--tenant", type=str, default=None, help="Seed only a specific test tenant (legacy)")
@click.option("--dry-run", is_flag=True, default=False, help="Show what would be executed")
@click.option(
    "--db",
    type=click.Choice(["engine", "curios", "observability"]),
    default=None,
    help="Target a specific database",
)
@click.option(
    "--profile",
    "-p",
    type=click.Choice(list(PROFILES.keys())),
    default=None,
    help="Data profile to seed (blog=full content, empty=tenant only, fresh=no data)",
)
@click.pass_context
def seed(
    ctx: click.Context,
    reset: bool,
    yes: bool,
    tenant: str | None,
    dry_run: bool,
    db: str | None,
    profile: str | None,
) -> None:
    """Bootstrap local D1 databases with migrations and seed data.

    Data profiles control what test content is seeded:

    \b
      blog   Full Midnight Bloom tea shop (3 posts, 5 pages) [default]
      empty  Tenant exists with defaults, no posts or custom pages
      fresh  Clean databases with migrations only, no tenant data

    Examples:

    \b
        glimpse seed                         # Apply migrations + default seeds
        glimpse seed --profile blog          # Full blog content
        glimpse seed --profile empty         # Empty state (test blank pages)
        glimpse seed --profile fresh         # Migrations only, no content
        glimpse seed --reset --yes           # Nuke and rebuild with blog profile
        glimpse seed --reset -p empty --yes  # Nuke and rebuild with empty state
    """
    config = ctx.obj["config"]
    output_handler = ctx.obj["output"]

    grove_root = find_grove_root()
    if not grove_root:
        output_handler.print_error("GROVE_ROOT not found. Run from within the Grove monorepo.")
        ctx.exit(1)
        return

    bootstrapper = DataBootstrapper(
        grove_root=grove_root,
        scripts_dir=config.seed_scripts_dir,
        migrations_dir=config.seed_migrations_dir,
    )

    if reset:
        # Safety gate: require --yes in non-interactive mode
        if not yes:
            if not sys.stdin.isatty():
                output_handler.print_error("--reset requires --yes in non-interactive mode")
                ctx.exit(1)
                return
            # Interactive confirmation
            target = db or "all databases"
            profile_name = profile or DEFAULT_PROFILE
            click.confirm(
                f"This will drop all local D1 data for {target} and recreate with profile '{profile_name}'. Continue?",
                abort=True,
            )

        profile_name = profile or DEFAULT_PROFILE
        output_handler.print_info(f"Resetting local databases with profile '{profile_name}'...")
        results = bootstrapper.reset(target_db=db, profile=profile_name)
        for r in results:
            if r["success"]:
                output_handler.print_success(r["output"])
            else:
                output_handler.print_error(r["output"])
        return

    # Normal flow: apply migrations then seeds
    output_handler.print_info("Applying migrations...")
    migration_results = bootstrapper.apply_migrations(target_db=db, dry_run=dry_run)
    for r in migration_results:
        if r["success"]:
            output_handler.print_success(r["output"])
        else:
            output_handler.print_error(r["output"])

    output_handler.print_info("Applying seed data...")
    seed_results = bootstrapper.apply_seeds(
        tenant=tenant,
        target_db=db,
        dry_run=dry_run,
        profile=profile,
    )
    for r in seed_results:
        if r["success"]:
            output_handler.print_success(r["output"])
        else:
            output_handler.print_error(r["output"])

    failures = sum(1 for r in migration_results + seed_results if not r["success"])
    if failures:
        output_handler.print_error(f"{failures} step(s) failed")
        ctx.exit(1)
    else:
        output_handler.print_success("Seed complete")
