"""Dev server lifecycle manager for Glimpse.

Handles detecting running servers, auto-starting them, health polling,
and PID file tracking. Only manages servers Glimpse itself started.
"""

import asyncio
import os
import signal
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

from glimpse.config import GlimpseConfig
from glimpse.server.health import check_server_reachable, poll_until_ready


class ServerManager:
    """Manages the lifecycle of local dev servers for Glimpse captures.

    Key safety rule: only stops servers it started (tracked via PID file).
    """

    def __init__(self, config: GlimpseConfig) -> None:
        self._config = config
        self._grove_root = self._find_grove_root()

    def ensure_server(self, target_url: str) -> tuple[bool, str]:
        """Ensure the target URL is reachable, starting a server if needed.

        Returns (True, "") if server is reachable, or (False, error) if not.
        """
        # Extract host:port from target URL
        parsed = urlparse(target_url)
        host = parsed.hostname or "localhost"
        port = parsed.port or self._config.server_port
        health_url = f"http://{host}:{port}/"

        # Check if already running
        if check_server_reachable(health_url):
            return True, ""

        # Try to start
        ok, err = self._start_server()
        if not ok:
            return False, err

        # Poll until ready
        ready, poll_err = asyncio.run(
            poll_until_ready(
                health_url,
                timeout_ms=self._config.server_health_timeout,
            )
        )
        if not ready:
            return False, f"{host}:{port} ({poll_err})"

        return True, ""

    def stop_server(self) -> tuple[bool, str]:
        """Stop a server that Glimpse started (identified by PID file).

        Returns (True, "") on success, (False, error) if no server to stop.
        """
        pid_path = self._pid_file_path()
        if not pid_path.exists():
            return False, "No Glimpse-managed server found (no PID file)"

        try:
            pid = int(pid_path.read_text().strip())
        except (ValueError, OSError):
            pid_path.unlink(missing_ok=True)
            return False, "Invalid PID file, removed"

        try:
            os.kill(pid, signal.SIGTERM)
            # Wait briefly for process to exit
            for _ in range(10):
                try:
                    os.kill(pid, 0)  # Check if still alive
                    time.sleep(0.5)
                except OSError:
                    break  # Process has exited
        except OSError:
            pass  # Process already gone

        pid_path.unlink(missing_ok=True)
        return True, ""

    def get_status(self) -> dict:
        """Check whether a Glimpse-managed server is running."""
        pid_path = self._pid_file_path()
        if not pid_path.exists():
            return {"managed": False, "running": False, "pid": None}

        try:
            pid = int(pid_path.read_text().strip())
            os.kill(pid, 0)  # Signal 0 = check existence
            return {"managed": True, "running": True, "pid": pid}
        except (OSError, ValueError):
            return {"managed": True, "running": False, "pid": None}

    def _start_server(self) -> tuple[bool, str]:
        """Start the dev server as a background process."""
        if not self._grove_root:
            return False, "Cannot auto-start: GROVE_ROOT not found"

        start_cwd = self._grove_root / self._config.server_start_cwd
        if not start_cwd.exists():
            return False, f"Cannot auto-start: directory not found: {start_cwd}"

        # Split command into args
        cmd_parts = self._config.server_start_command.split()

        try:
            # Start as background process, redirect output to log file
            log_dir = self._grove_root / ".glimpse"
            log_dir.mkdir(parents=True, exist_ok=True)
            log_file = log_dir / "server.log"

            with open(log_file, "w") as log:
                proc = subprocess.Popen(
                    cmd_parts,
                    cwd=str(start_cwd),
                    stdout=log,
                    stderr=subprocess.STDOUT,
                    start_new_session=True,  # Detach from parent
                )

            # Write PID file
            pid_path = self._pid_file_path()
            pid_path.parent.mkdir(parents=True, exist_ok=True)
            pid_path.write_text(str(proc.pid))

            return True, ""

        except FileNotFoundError:
            return False, f"Command not found: {cmd_parts[0]}"
        except Exception as e:
            return False, f"Failed to start server: {e}"

    def _pid_file_path(self) -> Path:
        """Resolve the PID file path."""
        if self._grove_root:
            return self._grove_root / self._config.server_pid_file
        return Path(self._config.server_pid_file)

    def _find_grove_root(self) -> Path | None:
        """Find the Grove monorepo root."""
        # Check environment variable first
        env_root = os.environ.get("GROVE_ROOT")
        if env_root:
            return Path(env_root)

        # Walk up from CWD looking for telltale files
        cwd = Path.cwd()
        for parent in [cwd, *cwd.parents]:
            if (parent / "pnpm-workspace.yaml").exists():
                return parent
            if (parent / ".glimpse.toml").exists():
                return parent

        return None
