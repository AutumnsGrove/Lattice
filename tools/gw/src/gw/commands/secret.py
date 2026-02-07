"""Secret commands - agent-safe secrets management.

This is the killer feature for agent safety. Secrets are stored in a local
vault and can be applied to Wrangler without the agent ever seeing the
actual value.

Security Model:
- Secrets stored encrypted at ~/.grove/secrets.enc
- Agent commands (apply, sync, exists) NEVER return secret values
- Human commands (set, delete) require interactive input
- Even `gw secret list` only shows names, not values
"""

import getpass
import json
import sys

import click

from ..secrets_vault import SecretsVault, VaultError, get_vault_password
from ..ui import console, create_table, error, info, success, warning
from ..wrangler import Wrangler, WranglerError


def _get_vault(ctx: click.Context) -> SecretsVault:
    """Get and unlock the secrets vault."""
    vault = SecretsVault()

    if not vault.exists:
        error("Vault does not exist. Run 'gw secret init' first.")
        ctx.exit(1)

    try:
        password = get_vault_password()
        vault.unlock(password)
    except VaultError as e:
        error(f"Failed to unlock vault: {e}")
        ctx.exit(1)

    return vault


@click.group()
@click.pass_context
def secret(ctx: click.Context) -> None:
    """Agent-safe secrets management.

    Store secrets locally in an encrypted vault and apply them to
    Cloudflare Workers without exposing values.

    The vault is stored at ~/.grove/secrets.enc and requires a
    password to access. Set GW_VAULT_PASSWORD environment variable
    to avoid prompts.
    """
    pass


@secret.command("init")
@click.pass_context
def secret_init(ctx: click.Context) -> None:
    """Initialize the secrets vault.

    Creates a new encrypted vault at ~/.grove/secrets.enc.
    You will be prompted to set a master password.

    Example:

        gw secret init
    """
    vault = SecretsVault()

    if vault.exists:
        warning("Vault already exists at ~/.grove/secrets.enc")
        info("Use 'gw secret list' to see stored secrets")
        return

    # Get password (prompt twice for confirmation)
    password1 = getpass.getpass("Set vault password: ")
    password2 = getpass.getpass("Confirm password: ")

    if password1 != password2:
        error("Passwords do not match")
        ctx.exit(1)

    if len(password1) < 8:
        error("Password must be at least 8 characters")
        ctx.exit(1)

    try:
        vault.create(password1)
        success("Vault created at ~/.grove/secrets.enc")
        info("Set GW_VAULT_PASSWORD to avoid password prompts")
    except VaultError as e:
        error(f"Failed to create vault: {e}")
        ctx.exit(1)


@secret.command("generate")
@click.argument("name")
@click.option("--length", "-l", default=32, help="Key length in bytes (default: 32)")
@click.option("--force", is_flag=True, help="Overwrite existing secret")
@click.pass_context
def secret_generate(ctx: click.Context, name: str, length: int, force: bool) -> None:
    """Generate and store a secure API key.

    Creates a cryptographically secure random key using secrets.token_urlsafe()
    and stores it in the vault. The value is NEVER shown - only confirmed.

    This is agent-safe: the secret value is generated and stored without
    ever being displayed or returned.

    Examples:

        gw secret generate ZEPHYR_API_KEY

        gw secret generate MY_KEY --length 48

        gw secret generate EXISTING_KEY --force
    """
    import secrets as secrets_module

    output_json: bool = ctx.obj.get("output_json", False)
    vault = SecretsVault()

    # Create vault if it doesn't exist
    if not vault.exists:
        if output_json:
            console.print(json.dumps({"error": "Vault does not exist. Run 'gw secret init' first."}))
        else:
            error("Vault does not exist. Run 'gw secret init' first.")
        ctx.exit(1)

    try:
        password = get_vault_password()
        vault.unlock(password)
    except VaultError as e:
        if output_json:
            console.print(json.dumps({"error": f"Failed to unlock vault: {e}"}))
        else:
            error(f"Failed to unlock vault: {e}")
        ctx.exit(1)

    # Check if secret already exists
    if vault.secret_exists(name) and not force:
        if output_json:
            console.print(json.dumps({"error": f"Secret '{name}' already exists. Use --force to overwrite."}))
        else:
            warning(f"Secret '{name}' already exists")
            info("Use --force to overwrite")
        ctx.exit(1)

    # Generate secure key
    key = secrets_module.token_urlsafe(length)

    try:
        vault.set_secret(name, key)
        if output_json:
            console.print(json.dumps({
                "name": name,
                "generated": True,
                "length": length,
                "note": "Value stored in vault (never shown)"
            }))
        else:
            success(f"Generated and stored '{name}' ({length} bytes)")
            console.print("[dim]🔒 Value stored in vault - never shown for security[/dim]")
            console.print(f"[dim]Apply with: gw secret apply {name} --worker WORKER_NAME[/dim]")
    except VaultError as e:
        if output_json:
            console.print(json.dumps({"error": f"Failed to store secret: {e}"}))
        else:
            error(f"Failed to store secret: {e}")
        ctx.exit(1)


@secret.command("set")
@click.argument("name")
@click.pass_context
def secret_set(ctx: click.Context, name: str) -> None:
    """Store a secret in the vault.

    Prompts for the secret value (never echoes). Can also read from
    stdin for scripting.

    Examples:

        gw secret set STRIPE_SECRET_KEY

        echo "sk_live_xxx" | gw secret set STRIPE_SECRET_KEY
    """
    vault = SecretsVault()

    # Create vault if it doesn't exist
    if not vault.exists:
        info("Vault does not exist. Creating new vault...")
        password1 = getpass.getpass("Set vault password: ")
        password2 = getpass.getpass("Confirm password: ")

        if password1 != password2:
            error("Passwords do not match")
            ctx.exit(1)

        try:
            vault.create(password1)
        except VaultError as e:
            error(f"Failed to create vault: {e}")
            ctx.exit(1)
    else:
        try:
            password = get_vault_password()
            vault.unlock(password)
        except VaultError as e:
            error(f"Failed to unlock vault: {e}")
            ctx.exit(1)

    # Get secret value
    if not sys.stdin.isatty():
        # Reading from pipe
        value = sys.stdin.read().strip()
    else:
        # Interactive prompt (never echoes)
        value = getpass.getpass(f"Enter value for {name}: ")

    if not value:
        error("Secret value cannot be empty")
        ctx.exit(1)

    try:
        vault.set_secret(name, value)
        success(f"Secret '{name}' stored in vault")
    except VaultError as e:
        error(f"Failed to store secret: {e}")
        ctx.exit(1)


@secret.command("list")
@click.pass_context
def secret_list(ctx: click.Context) -> None:
    """List all secrets in the vault.

    Shows secret names and timestamps. NEVER shows values.

    Example:

        gw secret list
    """
    output_json: bool = ctx.obj.get("output_json", False)
    vault = _get_vault(ctx)

    secrets = vault.list_secrets()

    if output_json:
        console.print(json.dumps({"secrets": secrets}, indent=2))
        return

    if not secrets:
        info("No secrets stored in vault")
        return

    console.print(
        f"\n[bold green]Secrets Vault[/bold green] ({len(secrets)} secrets)\n"
    )

    table = create_table()
    table.add_column("Name", style="cyan")
    table.add_column("Created", style="yellow")
    table.add_column("Updated", style="magenta")
    table.add_column("Deployed To", style="dim")

    for s in secrets:
        # Format timestamps
        created = s["created_at"][:10] if s["created_at"] else "-"
        updated = s["updated_at"][:10] if s["updated_at"] else "-"
        deployed = ", ".join(s.get("deployed_to", [])) or "[dim]—[/dim]"
        table.add_row(s["name"], created, updated, deployed)

    console.print(table)
    console.print(
        "\n[dim]Values are never shown. Use 'gw secret apply' to deploy.[/dim]"
    )


@secret.command("delete")
@click.argument("name")
@click.pass_context
def secret_delete(ctx: click.Context, name: str) -> None:
    """Delete a secret from the vault.

    Example:

        gw secret delete OLD_API_KEY
    """
    vault = _get_vault(ctx)

    if not vault.secret_exists(name):
        warning(f"Secret '{name}' not found in vault")
        ctx.exit(1)

    if vault.delete_secret(name):
        success(f"Secret '{name}' deleted from vault")
    else:
        error(f"Failed to delete secret '{name}'")
        ctx.exit(1)


@secret.command("exists")
@click.argument("name")
@click.pass_context
def secret_exists(ctx: click.Context, name: str) -> None:
    """Check if a secret exists in the vault.

    Returns exit code 0 if exists, 1 if not. Agent-safe.

    Example:

        gw secret exists STRIPE_KEY && echo "Secret found"
    """
    output_json: bool = ctx.obj.get("output_json", False)
    vault = _get_vault(ctx)

    exists = vault.secret_exists(name)

    if output_json:
        console.print(json.dumps({"name": name, "exists": exists}))
        ctx.exit(0 if exists else 1)

    if exists:
        success(f"Secret '{name}' exists")
    else:
        warning(f"Secret '{name}' not found")
        ctx.exit(1)


@secret.command("reveal")
@click.argument("name")
@click.option("--dangerous", is_flag=True, help="Confirm you want to reveal the secret value")
@click.pass_context
def secret_reveal(ctx: click.Context, name: str, dangerous: bool) -> None:
    """Reveal a secret value from the vault.

    ⚠️  HUMAN-ONLY COMMAND - NOT AGENT-SAFE ⚠️

    This command displays the actual secret value. Use it when you need
    to manually copy a secret to another system (like the CF dashboard).

    Requires --dangerous flag to confirm intent.

    Examples:

        gw secret reveal GROVE_KEK --dangerous

        gw secret reveal STRIPE_KEY --dangerous | pbcopy
    """
    output_json: bool = ctx.obj.get("output_json", False)

    if not dangerous:
        if output_json:
            console.print(json.dumps({"error": "Requires --dangerous flag to reveal secret values"}))
        else:
            error("This command reveals sensitive secret values")
            warning("Requires --dangerous flag to confirm")
            info("Example: gw secret reveal GROVE_KEK --dangerous")
        ctx.exit(1)

    vault = _get_vault(ctx)

    if not vault.secret_exists(name):
        if output_json:
            console.print(json.dumps({"error": f"Secret '{name}' not found"}))
        else:
            warning(f"Secret '{name}' not found in vault")
        ctx.exit(1)

    value = vault.get_secret(name)

    if output_json:
        console.print(json.dumps({"name": name, "value": value}))
    else:
        # Print just the value for easy piping (e.g., | pbcopy)
        console.print(f"\n[bold red]⚠️  SECRET VALUE - DO NOT SHARE[/bold red]\n")
        console.print(f"[cyan]{name}[/cyan] = [yellow]{value}[/yellow]")
        console.print(f"\n[dim]Tip: Use 'gw secret reveal {name} --dangerous | pbcopy' to copy to clipboard[/dim]\n")


@secret.command("apply")
@click.argument("names", nargs=-1, required=True)
@click.option("--worker", "-w", default=None, help="Worker name to apply secrets to")
@click.option("--pages", "-p", default=None, help="Pages project name to apply secrets to")
@click.option("--force", "-f", is_flag=True, help="Overwrite existing secrets without prompting")
@click.pass_context
def secret_apply(ctx: click.Context, names: tuple[str, ...], worker: str | None, pages: str | None, force: bool) -> None:
    """Apply secrets to a Cloudflare Worker or Pages project.

    Agent-safe: The secret value is never shown in output.
    Uses 'wrangler secret put' or 'wrangler pages secret put' under the hood.

    Examples:

        gw secret apply STRIPE_KEY --worker grove-lattice

        gw secret apply KEY1 KEY2 KEY3 --worker grove-lattice

        gw secret apply ZEPHYR_API_KEY --pages grove-landing

        gw secret apply GROVE_KEK --worker grove-lattice --force
    """
    from ..config import GWConfig

    output_json: bool = ctx.obj.get("output_json", False)
    config: GWConfig = ctx.obj["config"]
    vault = _get_vault(ctx)
    wrangler = Wrangler(config)

    # Validate: must specify exactly one of --worker or --pages
    if not worker and not pages:
        error("Must specify --worker (-w) or --pages (-p)")
        ctx.exit(1)
    if worker and pages:
        error("Cannot specify both --worker and --pages")
        ctx.exit(1)

    target = worker or pages
    is_pages = pages is not None
    target_label = f"Pages:{target}" if is_pages else target

    results = []

    for name in names:
        if not vault.secret_exists(name):
            results.append(
                {"name": name, "success": False, "error": "Not found in vault"}
            )
            if not output_json:
                warning(f"Secret '{name}' not found in vault")
            continue

        value = vault.get_secret(name)
        if not value:
            results.append({"name": name, "success": False, "error": "Empty value"})
            continue

        # Apply using wrangler secret put (piped via stdin)
        try:
            # wrangler secret put reads from stdin when piped
            # When --force is set, prepend "y\n" to auto-confirm overwrite prompts
            import subprocess

            stdin_value = f"y\n{value}" if force else value

            # Build command based on target type
            if is_pages:
                cmd = ["wrangler", "pages", "secret", "put", name, "--project-name", target]
            else:
                cmd = ["wrangler", "secret", "put", name, "--name", target]

            result = subprocess.run(
                cmd,
                input=stdin_value,
                capture_output=True,
                text=True,
            )

            if result.returncode == 0:
                results.append({"name": name, "success": True})
                vault.record_deployment(name, target_label)
                if not output_json:
                    success(f"Applied {name} to {target_label}")
            else:
                err_msg = result.stderr.strip()
                # Check if this is an "already exists" prompt that needs --force
                if "already exists" in err_msg.lower() or "overwrite" in err_msg.lower():
                    results.append(
                        {"name": name, "success": False, "error": "Secret already exists. Use --force to overwrite."}
                    )
                    if not output_json:
                        warning(f"Secret '{name}' already exists on {target_label}")
                        info("Use --force to overwrite")
                else:
                    results.append(
                        {"name": name, "success": False, "error": err_msg}
                    )
                    if not output_json:
                        error(f"Failed to apply {name}: {err_msg}")

        except Exception as e:
            results.append({"name": name, "success": False, "error": str(e)})
            if not output_json:
                error(f"Failed to apply {name}: {e}")

    if output_json:
        console.print(json.dumps({"target": target_label, "results": results}, indent=2))


@secret.command("sync")
@click.option("--worker", "-w", default=None, help="Worker name to sync secrets to")
@click.option("--pages", "-p", default=None, help="Pages project name to sync secrets to")
@click.option("--force", "-f", is_flag=True, help="Overwrite existing secrets without prompting")
@click.pass_context
def secret_sync(ctx: click.Context, worker: str | None, pages: str | None, force: bool) -> None:
    """Sync all secrets to a Cloudflare Worker or Pages project.

    Applies all secrets from the vault to the specified target.
    Agent-safe: Values are never shown.

    Examples:

        gw secret sync --worker grove-lattice

        gw secret sync --pages grove-landing

        gw secret sync --worker grove-lattice --force
    """
    output_json: bool = ctx.obj.get("output_json", False)

    if not worker and not pages:
        error("Must specify --worker (-w) or --pages (-p)")
        ctx.exit(1)
    if worker and pages:
        error("Cannot specify both --worker and --pages")
        ctx.exit(1)

    vault = _get_vault(ctx)
    secrets = vault.list_secrets()
    target_label = f"Pages:{pages}" if pages else worker

    if not secrets:
        if output_json:
            console.print(json.dumps({"error": "No secrets in vault"}))
        else:
            warning("No secrets in vault to sync")
        return

    if not output_json:
        info(f"Syncing {len(secrets)} secrets to {target_label}...")

    # Invoke apply for all secrets
    names = tuple(s["name"] for s in secrets)
    ctx.invoke(secret_apply, names=names, worker=worker, pages=pages, force=force)
