"""Project vectors to 2D with UMAP and render an interactive Plotly scatter plot."""

import numpy as np
import plotly.graph_objects as go
from pathlib import Path
from rich.progress import Progress, SpinnerColumn, TextColumn

from .reader import Index

# Color palette — warm, nature-themed, distinct per directory
DIRECTORY_COLORS = {
    "apps": "#e8a838",       # amber gold
    "libs": "#6ec47e",       # grove green
    "services": "#7eb8da",   # sky blue
    "workers": "#c47ed4",    # lavender
    "tools": "#d4a07e",      # bark brown
    "docs": "#8e9eab",       # stone gray
}
DEFAULT_COLOR = "#b0b0b0"    # muted gray for everything else

# Extension colors for the file-type view
EXTENSION_COLORS = {
    ".ts": "#3178c6",        # TypeScript blue
    ".svelte": "#ff3e00",    # Svelte orange
    ".go": "#00add8",        # Go cyan
    ".js": "#f7df1e",        # JavaScript yellow
    ".md": "#8e9eab",        # Markdown gray
    ".json": "#a0a0a0",      # JSON light gray
    ".css": "#264de4",       # CSS blue
    ".html": "#e34c26",      # HTML orange
    ".py": "#3776ab",        # Python blue
    ".rs": "#dea584",        # Rust copper
    ".yaml": "#cb171e",      # YAML red
    ".yml": "#cb171e",       # YAML red
}


def get_top_dir(path: str) -> str:
    """Extract top-level directory from a file path."""
    parts = path.split("/")
    return parts[0] if len(parts) > 1 else "(root)"


def get_extension(path: str) -> str:
    """Extract file extension."""
    p = Path(path)
    return p.suffix.lower() if p.suffix else "(none)"


def get_module(path: str) -> str:
    """Extract the second-level directory (module/package name)."""
    parts = path.split("/")
    if len(parts) >= 2:
        return "/".join(parts[:2])
    return parts[0]


def run_umap(vectors: np.ndarray, n_neighbors: int = 15, min_dist: float = 0.1) -> np.ndarray:
    """Project high-dimensional vectors to 2D using UMAP."""
    import umap

    reducer = umap.UMAP(
        n_components=2,
        n_neighbors=n_neighbors,
        min_dist=min_dist,
        metric="cosine",
        random_state=42,
    )
    return reducer.fit_transform(vectors)


def build_figure(index: Index, coords: np.ndarray, color_by: str = "directory") -> go.Figure:
    """Build an interactive Plotly figure from projected coordinates."""
    entries = index.entries

    # Assign colors based on grouping
    if color_by == "extension":
        groups = {}
        for i, e in enumerate(entries):
            ext = get_extension(e.file_path)
            groups.setdefault(ext, []).append(i)
        color_map = EXTENSION_COLORS
        default = DEFAULT_COLOR
    else:
        groups = {}
        for i, e in enumerate(entries):
            top = get_top_dir(e.file_path)
            groups.setdefault(top, []).append(i)
        color_map = DIRECTORY_COLORS
        default = DEFAULT_COLOR

    # Sort groups by size (largest first) for legend ordering
    sorted_groups = sorted(groups.items(), key=lambda x: -len(x[1]))

    fig = go.Figure()

    for group_name, indices in sorted_groups:
        color = color_map.get(group_name, default)
        xs = coords[indices, 0]
        ys = coords[indices, 1]

        # Build hover text
        hover_texts = []
        for idx in indices:
            e = entries[idx]
            snippet = e.snippet[:100].replace("\n", " ") if e.snippet else ""
            lines = f":{e.start_line}-{e.end_line}" if e.start_line > 0 else ""
            hover_texts.append(
                f"<b>{e.file_path}{lines}</b><br>"
                f"<i>{snippet}</i>"
            )

        fig.add_trace(go.Scattergl(
            x=xs,
            y=ys,
            mode="markers",
            marker=dict(
                size=4,
                color=color,
                opacity=0.7,
                line=dict(width=0),
            ),
            name=f"{group_name} ({len(indices)})",
            text=hover_texts,
            hoverinfo="text",
            hoverlabel=dict(
                bgcolor="rgba(20, 20, 20, 0.9)",
                font_size=11,
                font_color="white",
                font_family="monospace",
            ),
        ))

    fig.update_layout(
        title=dict(
            text=f"Lattice Codebase — {len(entries):,} chunks, {index.dimensions}D → 2D",
            font=dict(size=18, color="#e0e0e0"),
        ),
        paper_bgcolor="#1a1a2e",
        plot_bgcolor="#16213e",
        font=dict(color="#e0e0e0"),
        legend=dict(
            bgcolor="rgba(0,0,0,0.5)",
            bordercolor="rgba(255,255,255,0.1)",
            borderwidth=1,
            font=dict(size=11),
            itemsizing="constant",
        ),
        xaxis=dict(
            showgrid=False,
            zeroline=False,
            showticklabels=False,
            title="",
        ),
        yaxis=dict(
            showgrid=False,
            zeroline=False,
            showticklabels=False,
            title="",
        ),
        width=1600,
        height=1000,
        margin=dict(l=40, r=40, t=60, b=40),
    )

    return fig


def generate_html(index: Index, output_path: Path, color_by: str = "directory",
                  n_neighbors: int = 15, min_dist: float = 0.1):
    """Full pipeline: read index → UMAP → Plotly → HTML file."""
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold green]{task.description}"),
    ) as progress:
        # Extract vectors
        task = progress.add_task("Extracting vectors...", total=None)
        vectors = np.array([e.vector for e in index.entries])
        progress.update(task, description=f"Extracted {len(vectors):,} vectors ({index.dimensions}D)")

        # UMAP projection
        progress.update(task, description=f"Running UMAP on {len(vectors):,} vectors...")
        coords = run_umap(vectors, n_neighbors=n_neighbors, min_dist=min_dist)
        progress.update(task, description="UMAP projection complete")

        # Build figure
        progress.update(task, description="Building interactive plot...")
        fig = build_figure(index, coords, color_by=color_by)

        # Write HTML
        progress.update(task, description=f"Writing {output_path}...")
        fig.write_html(
            str(output_path),
            include_plotlyjs=True,
            full_html=True,
            config={
                "scrollZoom": True,
                "displayModeBar": True,
                "modeBarButtonsToAdd": ["select2d", "lasso2d"],
            },
        )
        progress.update(task, description=f"Done! Open {output_path} in your browser")
