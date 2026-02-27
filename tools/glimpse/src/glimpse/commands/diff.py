"""glimpse diff — visual regression comparison between two screenshots.

Compares two PNG images pixel-by-pixel and produces a diff image
highlighting changed regions. Returns a similarity score (0-100%)
and optional diff overlay.

No extra dependencies — uses Python's built-in zlib for PNG decoding.
"""

import struct
import zlib
from pathlib import Path

import click


def _read_png(path: Path) -> tuple[int, int, bytes]:
    """Read a PNG file and return (width, height, raw_rgba_bytes).

    Minimal PNG decoder — handles 8-bit RGBA and RGB with no interlacing.
    Sufficient for Playwright screenshots which are always standard PNGs.
    """
    data = path.read_bytes()

    # Verify PNG signature
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError(f"Not a valid PNG file: {path}")

    # Parse chunks
    offset = 8
    width = height = bit_depth = color_type = 0
    idat_chunks = []

    while offset < len(data):
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        chunk_type = data[offset + 4:offset + 8]
        chunk_data = data[offset + 8:offset + 8 + length]
        offset += 12 + length  # 4 length + 4 type + data + 4 crc

        if chunk_type == b"IHDR":
            width = struct.unpack(">I", chunk_data[0:4])[0]
            height = struct.unpack(">I", chunk_data[4:8])[0]
            bit_depth = chunk_data[8]
            color_type = chunk_data[9]
        elif chunk_type == b"IDAT":
            idat_chunks.append(chunk_data)
        elif chunk_type == b"IEND":
            break

    if not idat_chunks:
        raise ValueError(f"No image data found in {path}")

    # Decompress pixel data
    raw = zlib.decompress(b"".join(idat_chunks))

    # Determine bytes per pixel
    if color_type == 6:  # RGBA
        bpp = 4
    elif color_type == 2:  # RGB
        bpp = 3
    else:
        raise ValueError(f"Unsupported PNG color type {color_type} in {path}")

    stride = 1 + width * bpp  # +1 for filter byte per row

    # Reconstruct filtered rows
    pixels = bytearray(width * height * 4)  # Always output RGBA
    prev_row = bytearray(width * bpp)

    for y in range(height):
        row_start = y * stride
        filter_type = raw[row_start]
        row_data = bytearray(raw[row_start + 1:row_start + stride])

        # Apply PNG row filters
        if filter_type == 1:  # Sub
            for i in range(bpp, len(row_data)):
                row_data[i] = (row_data[i] + row_data[i - bpp]) & 0xFF
        elif filter_type == 2:  # Up
            for i in range(len(row_data)):
                row_data[i] = (row_data[i] + prev_row[i]) & 0xFF
        elif filter_type == 3:  # Average
            for i in range(len(row_data)):
                left = row_data[i - bpp] if i >= bpp else 0
                row_data[i] = (row_data[i] + (left + prev_row[i]) // 2) & 0xFF
        elif filter_type == 4:  # Paeth
            for i in range(len(row_data)):
                a = row_data[i - bpp] if i >= bpp else 0
                b = prev_row[i]
                c = prev_row[i - bpp] if i >= bpp else 0
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                if pa <= pb and pa <= pc:
                    pr = a
                elif pb <= pc:
                    pr = b
                else:
                    pr = c
                row_data[i] = (row_data[i] + pr) & 0xFF

        # Copy to output as RGBA
        for x in range(width):
            src_idx = x * bpp
            dst_idx = (y * width + x) * 4
            pixels[dst_idx] = row_data[src_idx]      # R
            pixels[dst_idx + 1] = row_data[src_idx + 1]  # G
            pixels[dst_idx + 2] = row_data[src_idx + 2]  # B
            pixels[dst_idx + 3] = row_data[src_idx + 3] if bpp == 4 else 255  # A

        prev_row = row_data

    return width, height, bytes(pixels)


def _write_png(path: Path, width: int, height: int, rgba: bytes) -> None:
    """Write raw RGBA pixel data as a PNG file."""
    # Build raw image data with filter byte 0 (None) per row
    raw_rows = []
    for y in range(height):
        raw_rows.append(b"\x00")  # Filter: None
        offset = y * width * 4
        raw_rows.append(rgba[offset:offset + width * 4])

    compressed = zlib.compress(b"".join(raw_rows), 6)

    # Build PNG file
    chunks = []

    def _chunk(chunk_type: bytes, chunk_data: bytes) -> bytes:
        crc = zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF
        return struct.pack(">I", len(chunk_data)) + chunk_type + chunk_data + struct.pack(">I", crc)

    # IHDR
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA
    chunks.append(_chunk(b"IHDR", ihdr))

    # IDAT
    chunks.append(_chunk(b"IDAT", compressed))

    # IEND
    chunks.append(_chunk(b"IEND", b""))

    path.write_bytes(b"\x89PNG\r\n\x1a\n" + b"".join(chunks))


def diff_images(
    before_path: Path,
    after_path: Path,
    output_path: Path | None = None,
    threshold: int = 10,
) -> dict:
    """Compare two screenshots and produce a diff result.

    threshold: per-channel color difference to consider "changed" (0-255).

    Returns dict with:
        similarity: float (0.0 to 100.0)
        changed_pixels: int
        total_pixels: int
        diff_path: Path | None (if output_path was given)
    """
    w1, h1, px1 = _read_png(before_path)
    w2, h2, px2 = _read_png(after_path)

    if (w1, h1) != (w2, h2):
        return {
            "similarity": 0.0,
            "changed_pixels": max(w1 * h1, w2 * h2),
            "total_pixels": max(w1 * h1, w2 * h2),
            "diff_path": None,
            "error": f"Size mismatch: {w1}x{h1} vs {w2}x{h2}",
        }

    total = w1 * h1
    changed = 0
    diff_pixels = bytearray(total * 4)

    for i in range(total):
        off = i * 4
        r1, g1, b1 = px1[off], px1[off + 1], px1[off + 2]
        r2, g2, b2 = px2[off], px2[off + 1], px2[off + 2]

        dr = abs(r2 - r1)
        dg = abs(g2 - g1)
        db = abs(b2 - b1)

        if dr > threshold or dg > threshold or db > threshold:
            changed += 1
            # Highlight changed pixels in magenta with intensity
            intensity = min(255, max(dr, dg, db) * 3)
            diff_pixels[off] = intensity       # R
            diff_pixels[off + 1] = 0           # G
            diff_pixels[off + 2] = intensity   # B
            diff_pixels[off + 3] = 255         # A
        else:
            # Dim the unchanged pixels
            diff_pixels[off] = r2 // 3       # R
            diff_pixels[off + 1] = g2 // 3   # G
            diff_pixels[off + 2] = b2 // 3   # B
            diff_pixels[off + 3] = 255       # A

    similarity = ((total - changed) / total) * 100 if total > 0 else 100.0

    diff_path = None
    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        _write_png(output_path, w1, h1, bytes(diff_pixels))
        diff_path = output_path

    return {
        "similarity": round(similarity, 2),
        "changed_pixels": changed,
        "total_pixels": total,
        "diff_path": diff_path,
    }


@click.command("diff")
@click.argument("before", type=click.Path(exists=True))
@click.argument("after", type=click.Path(exists=True))
@click.option(
    "--output", "-o",
    type=str,
    default=None,
    help="Output path for diff image (auto-generated if omitted)",
)
@click.option(
    "--threshold", "-T",
    type=int,
    default=10,
    help="Per-channel color threshold to count as changed (0-255, default: 10)",
)
@click.option(
    "--fail-under",
    type=float,
    default=None,
    help="Exit with error if similarity is below this percentage",
)
@click.pass_context
def diff(
    ctx: click.Context,
    before: str,
    after: str,
    output: str | None,
    threshold: int,
    fail_under: float | None,
) -> None:
    """Compare two screenshots for visual regression.

    Produces a diff image highlighting changed pixels in magenta
    and reports a similarity score (0-100%).

    Examples:

        glimpse diff before.png after.png

        glimpse diff baseline.png current.png -o diff.png --fail-under 99

        glimpse diff v1.png v2.png --threshold 20
    """
    output_handler = ctx.obj["output"]

    before_path = Path(before)
    after_path = Path(after)

    # Auto-generate output path if not specified
    output_path = None
    if output:
        output_path = Path(output)
    else:
        output_path = before_path.parent / f"{before_path.stem}-diff{before_path.suffix}"

    try:
        result = diff_images(before_path, after_path, output_path, threshold)
    except (ValueError, OSError) as e:
        output_handler.print_error(f"Diff failed: {e}")
        ctx.exit(1)
        return

    if "error" in result:
        output_handler.print_error(result["error"])
        ctx.exit(1)
        return

    similarity = result["similarity"]
    changed = result["changed_pixels"]
    total = result["total_pixels"]

    if ctx.obj["output"].mode == "json":
        import json
        click.echo(json.dumps({
            "before": str(before_path),
            "after": str(after_path),
            "diff": str(result["diff_path"]) if result["diff_path"] else None,
            "similarity": similarity,
            "changed_pixels": changed,
            "total_pixels": total,
            "threshold": threshold,
        }, indent=2))
    elif ctx.obj["output"].mode == "agent":
        click.echo(str(result["diff_path"]) if result["diff_path"] else "[FAIL] no diff generated")
        if changed > 0:
            click.echo(f"similarity={similarity}% changed={changed}/{total}", err=True)
    else:
        if similarity == 100.0:
            output_handler.print_success(f"Identical — 100% match ({total:,} pixels)")
        elif similarity >= 99.0:
            output_handler.print_success(
                f"Nearly identical — {similarity}% match "
                f"({changed:,} of {total:,} pixels changed)"
            )
        elif similarity >= 90.0:
            output_handler.print_info(
                f"Minor differences — {similarity}% match "
                f"({changed:,} of {total:,} pixels changed)"
            )
        else:
            output_handler.print_error(
                f"Significant differences — {similarity}% match "
                f"({changed:,} of {total:,} pixels changed)"
            )

        if result["diff_path"]:
            output_handler.print_info(f"Diff image → {result['diff_path']}")

    # Fail-under gate for CI
    if fail_under is not None and similarity < fail_under:
        output_handler.print_error(
            f"Similarity {similarity}% is below threshold {fail_under}%"
        )
        ctx.exit(1)
