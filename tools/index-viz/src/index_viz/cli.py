"""CLI for index-viz: visualize the gf ask vector index."""

import click
from pathlib import Path
from rich.console import Console

console = Console()

DEFAULT_INDEX_PATH = ".grove/gf-index.bin"


@click.group()
def main():
    """Visualize the gf ask vector index as an interactive 2D map."""
    pass


@main.command()
@click.option("--index", "-i", "index_path", default=DEFAULT_INDEX_PATH,
              help="Path to the GFIDX index file")
@click.option("--output", "-o", default="index-map.html",
              help="Output HTML file path")
@click.option("--color-by", type=click.Choice(["directory", "extension"]),
              default="directory", help="How to color the dots")
@click.option("--neighbors", "-n", default=15, type=int,
              help="UMAP n_neighbors (higher = more global structure)")
@click.option("--min-dist", "-d", default=0.1, type=float,
              help="UMAP min_dist (lower = tighter clusters)")
@click.option("--open", "open_browser", is_flag=True,
              help="Open the HTML file in the default browser")
def map(index_path, output, color_by, neighbors, min_dist, open_browser):
    """Generate an interactive 2D map of the vector index."""
    from .reader import read_index
    from .visualize import generate_html

    index_file = Path(index_path)
    if not index_file.exists():
        console.print(f"[red]Index file not found:[/] {index_file}")
        console.print("Run [bold]gf ask --index[/] to build it first.")
        raise SystemExit(1)

    console.print(f"[bold]Reading index:[/] {index_file}")
    index = read_index(index_file)
    console.print(
        f"  {len(index.entries):,} chunks, "
        f"{index.dimensions}D vectors, "
        f"model: {index.embed_model}"
    )

    output_path = Path(output)
    generate_html(
        index,
        output_path,
        color_by=color_by,
        n_neighbors=neighbors,
        min_dist=min_dist,
    )

    console.print(f"\n[bold green]Map saved to {output_path}[/]")

    if open_browser:
        import webbrowser
        webbrowser.open(str(output_path.resolve()))


@main.command()
@click.option("--index", "-i", "index_path", default=DEFAULT_INDEX_PATH,
              help="Path to the GFIDX index file")
def stats(index_path):
    """Show statistics about the vector index."""
    from .reader import read_index
    from collections import Counter

    index_file = Path(index_path)
    if not index_file.exists():
        console.print(f"[red]Index file not found:[/] {index_file}")
        raise SystemExit(1)

    index = read_index(index_file)
    entries = index.entries

    # File stats
    file_paths = [e.file_path for e in entries]
    unique_files = set(file_paths)

    # Extension distribution
    ext_counts = Counter(Path(f).suffix.lower() for f in file_paths)

    # Directory distribution
    dir_counts = Counter(f.split("/")[0] if "/" in f else "(root)" for f in file_paths)

    # Size
    size_bytes = index_file.stat().st_size
    size_mb = size_bytes / (1024 * 1024)

    console.print(f"\n[bold]Index: {index_file}[/]")
    console.print(f"  Model:      {index.embed_model}")
    console.print(f"  Dimensions: {index.dimensions}")
    console.print(f"  Chunks:     {len(entries):,}")
    console.print(f"  Files:      {len(unique_files):,}")
    console.print(f"  Size:       {size_mb:.1f} MB")

    console.print(f"\n[bold]By extension:[/]")
    for ext, count in ext_counts.most_common(15):
        bar = "#" * min(count // 50, 40)
        console.print(f"  {ext or '(none)':10s} {count:6,}  {bar}")

    console.print(f"\n[bold]By directory:[/]")
    for dir_name, count in dir_counts.most_common(15):
        bar = "#" * min(count // 50, 40)
        console.print(f"  {dir_name:20s} {count:6,}  {bar}")

    console.print()
