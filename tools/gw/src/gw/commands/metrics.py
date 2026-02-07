"""Usage metrics - track command usage statistics."""

import json
import sqlite3
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Optional

import click

from ..ui import console, create_table, create_panel, error, info, success, warning


# Metrics database path
METRICS_DB = Path.home() / ".grove" / "gw_metrics.db"


def _init_db() -> sqlite3.Connection:
    """Initialize the metrics database."""
    METRICS_DB.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(METRICS_DB)
    conn.row_factory = sqlite3.Row

    conn.execute("""
        CREATE TABLE IF NOT EXISTS command_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            command_group TEXT NOT NULL,
            command TEXT NOT NULL,
            subcommand TEXT,
            success BOOLEAN NOT NULL,
            exit_code INTEGER DEFAULT 0,
            error_type TEXT,
            error_message TEXT,
            duration_ms INTEGER DEFAULT 0,
            is_write BOOLEAN DEFAULT 0,
            is_mcp BOOLEAN DEFAULT 0,
            agent_mode BOOLEAN DEFAULT 0
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_metrics_timestamp
        ON command_metrics(timestamp DESC)
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_metrics_command_group
        ON command_metrics(command_group)
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_metrics_success
        ON command_metrics(success)
    """)
    conn.commit()

    return conn


def record_metric(
    command_group: str,
    command: str,
    subcommand: Optional[str] = None,
    success: bool = True,
    exit_code: int = 0,
    error_type: Optional[str] = None,
    error_message: Optional[str] = None,
    duration_ms: int = 0,
    is_write: bool = False,
    is_mcp: bool = False,
    agent_mode: bool = False,
) -> None:
    """Record a command execution metric.

    Args:
        command_group: Top-level command (git, gh, db, etc.)
        command: Specific command (status, query, push, etc.)
        subcommand: Optional subcommand
        success: Whether the command succeeded
        exit_code: Exit code if applicable
        error_type: Type of error (e.g., "WranglerError", "GitError")
        error_message: Error message if failed
        duration_ms: Execution time in milliseconds
        is_write: Whether this was a write operation
        is_mcp: Whether this was called via MCP
        agent_mode: Whether agent mode was active
    """
    try:
        import os
        agent_mode = agent_mode or os.environ.get("GW_AGENT_MODE") == "1"

        conn = _init_db()
        conn.execute(
            """
            INSERT INTO command_metrics
            (timestamp, command_group, command, subcommand, success, exit_code,
             error_type, error_message, duration_ms, is_write, is_mcp, agent_mode)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.now().isoformat(),
                command_group,
                command,
                subcommand,
                success,
                exit_code,
                error_type,
                error_message[:500] if error_message else None,  # Truncate long messages
                duration_ms,
                is_write,
                is_mcp,
                agent_mode,
            ),
        )
        conn.commit()
        conn.close()
    except sqlite3.Error:
        # Silently fail - metrics are not critical
        pass


def get_summary(days: int = 7) -> dict[str, Any]:
    """Get usage summary for the past N days."""
    try:
        conn = _init_db()
        since = (datetime.now() - timedelta(days=days)).isoformat()

        # Total counts
        total = conn.execute(
            "SELECT COUNT(*) FROM command_metrics WHERE timestamp > ?",
            (since,)
        ).fetchone()[0]

        successes = conn.execute(
            "SELECT COUNT(*) FROM command_metrics WHERE timestamp > ? AND success = 1",
            (since,)
        ).fetchone()[0]

        failures = conn.execute(
            "SELECT COUNT(*) FROM command_metrics WHERE timestamp > ? AND success = 0",
            (since,)
        ).fetchone()[0]

        writes = conn.execute(
            "SELECT COUNT(*) FROM command_metrics WHERE timestamp > ? AND is_write = 1",
            (since,)
        ).fetchone()[0]

        mcp_calls = conn.execute(
            "SELECT COUNT(*) FROM command_metrics WHERE timestamp > ? AND is_mcp = 1",
            (since,)
        ).fetchone()[0]

        agent_mode_calls = conn.execute(
            "SELECT COUNT(*) FROM command_metrics WHERE timestamp > ? AND agent_mode = 1",
            (since,)
        ).fetchone()[0]

        # By command group
        by_group = conn.execute(
            """
            SELECT command_group, COUNT(*) as count,
                   SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successes,
                   SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failures
            FROM command_metrics
            WHERE timestamp > ?
            GROUP BY command_group
            ORDER BY count DESC
            """,
            (since,)
        ).fetchall()

        # Top errors
        top_errors = conn.execute(
            """
            SELECT error_type, error_message, COUNT(*) as count
            FROM command_metrics
            WHERE timestamp > ? AND success = 0 AND error_type IS NOT NULL
            GROUP BY error_type, error_message
            ORDER BY count DESC
            LIMIT 5
            """,
            (since,)
        ).fetchall()

        # Average duration by group
        avg_duration = conn.execute(
            """
            SELECT command_group, AVG(duration_ms) as avg_ms
            FROM command_metrics
            WHERE timestamp > ? AND duration_ms > 0
            GROUP BY command_group
            ORDER BY avg_ms DESC
            """,
            (since,)
        ).fetchall()

        conn.close()

        return {
            "period_days": days,
            "total": total,
            "successes": successes,
            "failures": failures,
            "success_rate": round((successes / total * 100) if total > 0 else 0, 1),
            "writes": writes,
            "mcp_calls": mcp_calls,
            "agent_mode_calls": agent_mode_calls,
            "by_group": [dict(row) for row in by_group],
            "top_errors": [dict(row) for row in top_errors],
            "avg_duration_by_group": [dict(row) for row in avg_duration],
        }
    except sqlite3.Error as e:
        return {"error": str(e)}


@click.group(invoke_without_command=True)
@click.pass_context
def metrics(ctx: click.Context) -> None:
    """View usage metrics and statistics.

    Track how gw commands are being used, success rates,
    error patterns, and performance.

    \\b
    Examples:
        gw metrics                # Show summary
        gw metrics summary        # Show 7-day summary
        gw metrics summary --days 30  # Show 30-day summary
        gw metrics errors         # Show recent errors
        gw metrics export         # Export as JSON
        gw metrics clear --write  # Clear all metrics
    """
    if ctx.invoked_subcommand is None:
        ctx.invoke(metrics_summary)


@metrics.command("summary")
@click.option("--days", "-d", default=7, help="Number of days to summarize")
@click.pass_context
def metrics_summary(ctx: click.Context, days: int) -> None:
    """Show usage summary for the past N days."""
    output_json = ctx.obj.get("output_json", False)

    summary = get_summary(days)

    if "error" in summary:
        error(f"Failed to get metrics: {summary['error']}")
        return

    if output_json:
        console.print(json.dumps(summary, indent=2))
        return

    # Header
    console.print(f"\n[bold green]🌲 gw Usage Metrics[/bold green] (last {days} days)\n")

    # Overview stats
    total = summary["total"]
    if total == 0:
        info("No commands recorded yet. Start using gw to see metrics!")
        return

    console.print(f"[bold]Total Commands:[/bold] {total}")
    console.print(f"[bold]Success Rate:[/bold] {summary['success_rate']}% ({summary['successes']} ✓ / {summary['failures']} ✗)")
    console.print(f"[bold]Write Operations:[/bold] {summary['writes']}")
    console.print(f"[bold]MCP Calls:[/bold] {summary['mcp_calls']}")
    console.print(f"[bold]Agent Mode:[/bold] {summary['agent_mode_calls']}")
    console.print()

    # By command group
    if summary["by_group"]:
        table = create_table("Usage by Category")
        table.add_column("Category")
        table.add_column("Total")
        table.add_column("Success")
        table.add_column("Failures")
        table.add_column("Rate")
        for row in summary["by_group"]:
            rate = round((row["successes"] / row["count"] * 100) if row["count"] > 0 else 0, 1)
            rate_color = "green" if rate >= 95 else "yellow" if rate >= 80 else "red"
            table.add_row(
                row["command_group"],
                str(row["count"]),
                f"[green]{row['successes']}[/green]",
                f"[red]{row['failures']}[/red]" if row["failures"] > 0 else "0",
                f"[{rate_color}]{rate}%[/{rate_color}]"
            )
        console.print(table)
        console.print()

    # Average duration
    if summary["avg_duration_by_group"]:
        table = create_table("Average Duration")
        table.add_column("Category")
        table.add_column("Avg Time")
        for row in summary["avg_duration_by_group"]:
            avg_ms = row["avg_ms"]
            if avg_ms >= 1000:
                time_str = f"{avg_ms/1000:.1f}s"
            else:
                time_str = f"{int(avg_ms)}ms"
            table.add_row(row["command_group"], time_str)
        console.print(table)
        console.print()

    # Top errors
    if summary["top_errors"]:
        console.print("[bold red]Top Errors:[/bold red]")
        for err in summary["top_errors"]:
            msg = err["error_message"][:60] + "..." if err["error_message"] and len(err["error_message"]) > 60 else err["error_message"]
            console.print(f"  [{err['count']}x] {err['error_type']}: {msg}")
        console.print()


@metrics.command("errors")
@click.option("--limit", "-n", default=20, help="Number of errors to show")
@click.pass_context
def metrics_errors(ctx: click.Context, limit: int) -> None:
    """Show recent errors."""
    output_json = ctx.obj.get("output_json", False)

    try:
        conn = _init_db()
        errors_data = conn.execute(
            """
            SELECT timestamp, command_group, command, error_type, error_message
            FROM command_metrics
            WHERE success = 0
            ORDER BY timestamp DESC
            LIMIT ?
            """,
            (limit,)
        ).fetchall()
        conn.close()

        if output_json:
            console.print(json.dumps([dict(e) for e in errors_data], indent=2))
            return

        if not errors_data:
            success("No errors recorded!")
            return

        console.print(f"\n[bold red]Recent Errors[/bold red] (last {len(errors_data)})\n")

        for err in errors_data:
            ts = datetime.fromisoformat(err["timestamp"]).strftime("%Y-%m-%d %H:%M")
            msg = err["error_message"][:80] if err["error_message"] else "No message"
            console.print(f"[dim]{ts}[/dim] [cyan]{err['command_group']} {err['command']}[/cyan]")
            console.print(f"  [red]{err['error_type']}[/red]: {msg}")
            console.print()

    except sqlite3.Error as e:
        error(f"Failed to get errors: {e}")


@metrics.command("export")
@click.option("--days", "-d", default=30, help="Number of days to export")
@click.option("--output", "-o", type=click.Path(), help="Output file path")
@click.pass_context
def metrics_export(ctx: click.Context, days: int, output: Optional[str]) -> None:
    """Export metrics as JSON."""
    try:
        conn = _init_db()
        since = (datetime.now() - timedelta(days=days)).isoformat()

        data = conn.execute(
            "SELECT * FROM command_metrics WHERE timestamp > ? ORDER BY timestamp",
            (since,)
        ).fetchall()
        conn.close()

        export_data = {
            "exported_at": datetime.now().isoformat(),
            "period_days": days,
            "count": len(data),
            "metrics": [dict(row) for row in data],
        }

        if output:
            with open(output, "w") as f:
                json.dump(export_data, f, indent=2)
            success(f"Exported {len(data)} records to {output}")
        else:
            console.print(json.dumps(export_data, indent=2))

    except (sqlite3.Error, IOError) as e:
        error(f"Failed to export: {e}")


@metrics.command("clear")
@click.option("--write", is_flag=True, required=True, help="Required to confirm deletion")
@click.option("--days", "-d", type=int, help="Only clear records older than N days")
@click.pass_context
def metrics_clear(ctx: click.Context, write: bool, days: Optional[int]) -> None:
    """Clear metrics data."""
    if not write:
        warning("Add --write flag to confirm clearing metrics")
        return

    try:
        conn = _init_db()

        if days:
            cutoff = (datetime.now() - timedelta(days=days)).isoformat()
            result = conn.execute(
                "DELETE FROM command_metrics WHERE timestamp < ?",
                (cutoff,)
            )
            conn.commit()
            success(f"Cleared {result.rowcount} records older than {days} days")
        else:
            result = conn.execute("DELETE FROM command_metrics")
            conn.commit()
            success(f"Cleared all {result.rowcount} records")

        conn.close()

    except sqlite3.Error as e:
        error(f"Failed to clear metrics: {e}")


# Make summary the default command
@metrics.command("show", hidden=True)
@click.pass_context
def metrics_show(ctx: click.Context) -> None:
    """Alias for summary."""
    ctx.invoke(metrics_summary)


def _generate_dashboard_html(summary: dict[str, Any]) -> str:
    """Generate HTML dashboard with Chart.js."""
    by_group_labels = json.dumps([g["command_group"] for g in summary.get("by_group", [])])
    by_group_data = json.dumps([g["count"] for g in summary.get("by_group", [])])
    by_group_success = json.dumps([g["successes"] for g in summary.get("by_group", [])])
    by_group_failures = json.dumps([g["failures"] for g in summary.get("by_group", [])])

    # Pre-build errors HTML outside the f-string (Python 3.11 compat — no nested f-strings)
    error_items = []
    for e in summary.get('top_errors', []):
        error_type = e.get('error_type', 'Unknown')
        error_count = e.get('count', 0)
        error_msg = (e.get('error_message', '') or '')[:100]
        error_items.append(
            f'<div class="error-item">'
            f'<span class="error-type">{error_type}</span>'
            f'<span class="error-count">({error_count}x)</span>'
            f'<div style="color: #9ca3af; font-size: 0.85rem; margin-top: 0.25rem;">{error_msg}</div>'
            f'</div>'
        )
    errors_html = "".join(error_items) or '<div class="error-item" style="color: #4ade80;">No errors recorded!</div>'

    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🌲 Grove Wrap Metrics</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e0e0e0;
            min-height: 100vh;
            padding: 2rem;
        }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        h1 {{
            font-size: 2.5rem;
            margin-bottom: 2rem;
            text-align: center;
            color: #4ade80;
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }}
        .stat-card {{
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.5rem;
            text-align: center;
            backdrop-filter: blur(10px);
        }}
        .stat-value {{
            font-size: 2.5rem;
            font-weight: bold;
            color: #4ade80;
        }}
        .stat-value.warning {{ color: #facc15; }}
        .stat-value.error {{ color: #f87171; }}
        .stat-label {{
            font-size: 0.9rem;
            color: #9ca3af;
            margin-top: 0.5rem;
        }}
        .charts-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }}
        .chart-card {{
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.5rem;
            backdrop-filter: blur(10px);
        }}
        .chart-title {{
            font-size: 1.2rem;
            margin-bottom: 1rem;
            color: #e0e0e0;
        }}
        .errors-list {{
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 1.5rem;
        }}
        .error-item {{
            padding: 0.75rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }}
        .error-item:last-child {{ border-bottom: none; }}
        .error-type {{ color: #f87171; font-weight: bold; }}
        .error-count {{ color: #9ca3af; font-size: 0.85rem; }}
        .footer {{
            text-align: center;
            margin-top: 2rem;
            color: #6b7280;
            font-size: 0.85rem;
        }}
        .refresh-btn {{
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: #4ade80;
            color: #1a1a2e;
            border: none;
            padding: 1rem 1.5rem;
            border-radius: 50px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(74, 222, 128, 0.3);
        }}
        .refresh-btn:hover {{ transform: scale(1.05); }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🌲 Grove Wrap Metrics</h1>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">{summary.get('total', 0)}</div>
                <div class="stat-label">Total Commands</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color: #4ade80">{summary.get('success_rate', 0)}%</div>
                <div class="stat-label">Success Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{summary.get('successes', 0)}</div>
                <div class="stat-label">Successful</div>
            </div>
            <div class="stat-card">
                <div class="stat-value error">{summary.get('failures', 0)}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value warning">{summary.get('writes', 0)}</div>
                <div class="stat-label">Write Operations</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{summary.get('mcp_calls', 0)}</div>
                <div class="stat-label">MCP Calls</div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="chart-card">
                <div class="chart-title">Usage by Category</div>
                <canvas id="usageChart"></canvas>
            </div>
            <div class="chart-card">
                <div class="chart-title">Success vs Failures by Category</div>
                <canvas id="successChart"></canvas>
            </div>
        </div>

        <div class="errors-list">
            <div class="chart-title">Top Errors</div>
            {errors_html}
        </div>

        <div class="footer">
            Last {summary.get('period_days', 7)} days • Generated {datetime.now().strftime('%Y-%m-%d %H:%M')}
        </div>
    </div>

    <button class="refresh-btn" onclick="location.reload()">↻ Refresh</button>

    <script>
        const labels = {by_group_labels};
        const usageData = {by_group_data};
        const successData = {by_group_success};
        const failureData = {by_group_failures};

        new Chart(document.getElementById('usageChart'), {{
            type: 'doughnut',
            data: {{
                labels: labels,
                datasets: [{{
                    data: usageData,
                    backgroundColor: [
                        '#4ade80', '#60a5fa', '#f472b6', '#facc15',
                        '#a78bfa', '#fb923c', '#2dd4bf', '#e879f9'
                    ],
                    borderWidth: 0
                }}]
            }},
            options: {{
                plugins: {{
                    legend: {{ position: 'bottom', labels: {{ color: '#e0e0e0' }} }}
                }}
            }}
        }});

        new Chart(document.getElementById('successChart'), {{
            type: 'bar',
            data: {{
                labels: labels,
                datasets: [
                    {{
                        label: 'Success',
                        data: successData,
                        backgroundColor: '#4ade80'
                    }},
                    {{
                        label: 'Failures',
                        data: failureData,
                        backgroundColor: '#f87171'
                    }}
                ]
            }},
            options: {{
                responsive: true,
                scales: {{
                    x: {{ stacked: true, ticks: {{ color: '#9ca3af' }}, grid: {{ color: 'rgba(255,255,255,0.05)' }} }},
                    y: {{ stacked: true, ticks: {{ color: '#9ca3af' }}, grid: {{ color: 'rgba(255,255,255,0.05)' }} }}
                }},
                plugins: {{
                    legend: {{ labels: {{ color: '#e0e0e0' }} }}
                }}
            }}
        }});
    </script>
</body>
</html>'''


@metrics.command("ui")
@click.option("--port", "-p", default=8765, help="Port to serve on")
@click.option("--days", "-d", default=7, help="Number of days to show")
@click.option("--no-open", is_flag=True, help="Don't auto-open browser")
@click.pass_context
def metrics_ui(ctx: click.Context, port: int, days: int, no_open: bool) -> None:
    """Launch web dashboard for metrics visualization.

    Starts a local web server with an interactive dashboard showing
    usage charts, success rates, and error patterns.
    """
    import http.server
    import socketserver
    import threading
    import webbrowser

    summary = get_summary(days)

    if "error" in summary:
        error(f"Failed to get metrics: {summary['error']}")
        return

    html = _generate_dashboard_html(summary)

    class DashboardHandler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            # Refresh data on each request
            fresh_summary = get_summary(days)
            fresh_html = _generate_dashboard_html(fresh_summary)

            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(fresh_html.encode())

        def log_message(self, format, *args):
            pass  # Suppress logging

    url = f"http://localhost:{port}"

    console.print(f"\n[bold green]🌲 Grove Wrap Metrics Dashboard[/bold green]")
    console.print(f"[dim]Serving at:[/dim] [cyan]{url}[/cyan]")
    console.print(f"[dim]Press Ctrl+C to stop[/dim]\n")

    if not no_open:
        # Open browser after a short delay
        def open_browser():
            import time
            time.sleep(0.5)
            webbrowser.open(url)

        threading.Thread(target=open_browser, daemon=True).start()

    try:
        with socketserver.TCPServer(("", port), DashboardHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        console.print("\n[dim]Dashboard stopped[/dim]")
    except OSError as e:
        error(f"Could not start server: {e}")
