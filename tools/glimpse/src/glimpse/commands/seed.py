"""glimpse seed — bootstrap local D1 databases with migrations and test data."""

import sys

import click

from glimpse.seed.bootstrap import DataBootstrapper
from glimpse.seed.discovery import find_grove_root


@click.command()
@click.option("--reset", is_flag=True, default=False, help="Drop all local D1 data and recreate")
@click.option("--yes", "-y", is_flag=True, default=False, help="Skip confirmation for --reset")
@click.option("--tenant", type=str, default=None, help="Seed only a specific test tenant")
@click.option("--dry-run", is_flag=True, default=False, help="Show what would be executed")
@click.option(
    "--db",
    type=click.Choice(["engine", "curios", "observability"]),
    default=None,
    help="Target a specific database",
)
@click.pass_context
def seed(
    ctx: click.Context,
    reset: bool,
    yes: bool,
    tenant: str | None,
    dry_run: bool,
    db: str | None,
) -> None:
    """Bootstrap local D1 databases with migrations and seed data.

    Examples:

        glimpse seed

        glimpse seed --reset --yes

        glimpse seed --tenant midnight-bloom --db engine
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
            click.confirm(
                f"This will drop all local D1 data for {target} and recreate from scratch. Continue?",
                abort=True,
            )

        output_handler.print_info("Resetting local databases...")
        results = bootstrapper.reset(target_db=db)
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
    seed_results = bootstrapper.apply_seeds(tenant=tenant, target_db=db, dry_run=dry_run)
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
