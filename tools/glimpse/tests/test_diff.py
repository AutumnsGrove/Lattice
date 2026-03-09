"""Tests for glimpse.commands.diff — visual regression comparison."""

import struct
import zlib
from pathlib import Path

import pytest

from glimpse.commands.diff import _read_png, _write_png, diff_images


def _make_solid_png(path: Path, width: int, height: int, r: int, g: int, b: int, a: int = 255) -> None:
    """Create a solid-color PNG for testing."""
    # Build raw RGBA pixel data with filter byte 0 per row
    raw_rows = []
    for _ in range(height):
        raw_rows.append(b"\x00")  # Filter: None
        raw_rows.append(bytes([r, g, b, a]) * width)

    compressed = zlib.compress(b"".join(raw_rows), 6)

    def _chunk(chunk_type: bytes, chunk_data: bytes) -> bytes:
        crc = zlib.crc32(chunk_type + chunk_data) & 0xFFFFFFFF
        return struct.pack(">I", len(chunk_data)) + chunk_type + chunk_data + struct.pack(">I", crc)

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA

    png_data = b"\x89PNG\r\n\x1a\n"
    png_data += _chunk(b"IHDR", ihdr)
    png_data += _chunk(b"IDAT", compressed)
    png_data += _chunk(b"IEND", b"")

    path.write_bytes(png_data)


class TestReadPng:
    def test_reads_valid_png(self, tmp_path):
        p = tmp_path / "test.png"
        _make_solid_png(p, 10, 10, 255, 0, 0)
        w, h, data = _read_png(p)
        assert w == 10
        assert h == 10
        assert len(data) == 10 * 10 * 4  # RGBA

    def test_pixel_values(self, tmp_path):
        p = tmp_path / "test.png"
        _make_solid_png(p, 2, 2, 128, 64, 32)
        w, h, data = _read_png(p)
        # First pixel: R=128, G=64, B=32, A=255
        assert data[0] == 128
        assert data[1] == 64
        assert data[2] == 32
        assert data[3] == 255

    def test_invalid_file_raises(self, tmp_path):
        p = tmp_path / "bad.png"
        p.write_bytes(b"not a png")
        with pytest.raises(ValueError, match="Not a valid PNG"):
            _read_png(p)


class TestWritePng:
    def test_roundtrip(self, tmp_path):
        """Write then read should produce identical pixel data."""
        p = tmp_path / "out.png"
        rgba = bytes([255, 0, 0, 255] * 4)  # 2x2 red
        _write_png(p, 2, 2, rgba)
        assert p.exists()

        w, h, data = _read_png(p)
        assert w == 2
        assert h == 2
        assert data == rgba


class TestDiffImages:
    def test_identical_images(self, tmp_path):
        a = tmp_path / "a.png"
        b = tmp_path / "b.png"
        _make_solid_png(a, 10, 10, 100, 100, 100)
        _make_solid_png(b, 10, 10, 100, 100, 100)
        result = diff_images(a, b)
        assert result["similarity"] == 100.0
        assert result["changed_pixels"] == 0
        assert result["total_pixels"] == 100

    def test_completely_different(self, tmp_path):
        a = tmp_path / "a.png"
        b = tmp_path / "b.png"
        _make_solid_png(a, 10, 10, 0, 0, 0)
        _make_solid_png(b, 10, 10, 255, 255, 255)
        result = diff_images(a, b)
        assert result["similarity"] == 0.0
        assert result["changed_pixels"] == 100

    def test_generates_diff_image(self, tmp_path):
        a = tmp_path / "a.png"
        b = tmp_path / "b.png"
        out = tmp_path / "diff.png"
        _make_solid_png(a, 5, 5, 100, 100, 100)
        _make_solid_png(b, 5, 5, 200, 200, 200)
        result = diff_images(a, b, output_path=out)
        assert result["diff_path"] == out
        assert out.exists()

    def test_size_mismatch(self, tmp_path):
        a = tmp_path / "a.png"
        b = tmp_path / "b.png"
        _make_solid_png(a, 10, 10, 100, 100, 100)
        _make_solid_png(b, 20, 20, 100, 100, 100)
        result = diff_images(a, b)
        assert "error" in result
        assert "Size mismatch" in result["error"]

    def test_threshold_ignores_small_changes(self, tmp_path):
        a = tmp_path / "a.png"
        b = tmp_path / "b.png"
        _make_solid_png(a, 10, 10, 100, 100, 100)
        _make_solid_png(b, 10, 10, 105, 105, 105)  # diff of 5 per channel
        result = diff_images(a, b, threshold=10)
        assert result["similarity"] == 100.0  # Below threshold, considered same
        assert result["changed_pixels"] == 0

    def test_threshold_catches_larger_changes(self, tmp_path):
        a = tmp_path / "a.png"
        b = tmp_path / "b.png"
        _make_solid_png(a, 10, 10, 100, 100, 100)
        _make_solid_png(b, 10, 10, 115, 115, 115)  # diff of 15 per channel
        result = diff_images(a, b, threshold=10)
        assert result["similarity"] == 0.0  # Above threshold
        assert result["changed_pixels"] == 100

    def test_creates_parent_directories(self, tmp_path):
        a = tmp_path / "a.png"
        b = tmp_path / "b.png"
        out = tmp_path / "nested" / "deep" / "diff.png"
        _make_solid_png(a, 5, 5, 100, 100, 100)
        _make_solid_png(b, 5, 5, 100, 100, 100)
        result = diff_images(a, b, output_path=out)
        assert out.exists()
