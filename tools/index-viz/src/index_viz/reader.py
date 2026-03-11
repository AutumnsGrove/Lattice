"""Read the GFIDX binary format produced by gf ask --index.

Binary format (little-endian):
  Header:
    5 bytes   "GFIDX" magic
    1 byte    version (uint8, must be 1)
    2 bytes   dimensions (uint16)
    4 bytes   chunk_count (uint32)
    string    embed_model (uint16 length prefix + bytes)

  Per entry (repeated chunk_count times):
    string    file_path
    4 bytes   start_line (uint32)
    4 bytes   end_line (uint32)
    string    snippet
    8 bytes   mtime (int64)
    dims*4    vector (float32 array)

  Strings are uint16-length-prefixed UTF-8.
"""

from dataclasses import dataclass
import struct
import numpy as np
from pathlib import Path


MAGIC = b"GFIDX"
EXPECTED_VERSION = 1


@dataclass
class IndexEntry:
    file_path: str
    start_line: int
    end_line: int
    snippet: str
    mtime: int
    vector: np.ndarray


@dataclass
class Index:
    dimensions: int
    embed_model: str
    entries: list[IndexEntry]


def _read_string(f) -> str:
    (length,) = struct.unpack("<H", f.read(2))
    return f.read(length).decode("utf-8")


def read_index(path: str | Path) -> Index:
    """Read a GFIDX binary index file."""
    path = Path(path)
    with open(path, "rb") as f:
        # Magic
        magic = f.read(5)
        if magic != MAGIC:
            raise ValueError(f"Bad magic: {magic!r} (expected {MAGIC!r})")

        # Version
        (version,) = struct.unpack("<B", f.read(1))
        if version != EXPECTED_VERSION:
            raise ValueError(f"Unsupported version {version} (expected {EXPECTED_VERSION})")

        # Dimensions
        (dims,) = struct.unpack("<H", f.read(2))

        # Chunk count
        (count,) = struct.unpack("<I", f.read(4))

        # Embed model
        embed_model = _read_string(f)

        # Pre-compute the byte size of one vector
        vec_bytes = dims * 4

        # Read entries
        entries = []
        for _ in range(count):
            file_path = _read_string(f)
            start_line, end_line = struct.unpack("<II", f.read(8))
            snippet = _read_string(f)
            (mtime,) = struct.unpack("<q", f.read(8))
            vector = np.frombuffer(f.read(vec_bytes), dtype=np.float32).copy()
            entries.append(IndexEntry(
                file_path=file_path,
                start_line=start_line,
                end_line=end_line,
                snippet=snippet,
                mtime=mtime,
                vector=vector,
            ))

    return Index(dimensions=dims, embed_model=embed_model, entries=entries)
