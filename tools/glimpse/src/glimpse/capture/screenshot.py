"""Data structures for screenshot capture requests and results.

These dataclasses define the contract between the CLI layer (which builds
requests from flags + config) and the capture engine (which executes them).
"""

from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class ConsoleMessage:
    """A single browser console message captured during page load.

    Represents console.log/warn/error calls and uncaught exceptions.
    """

    level: str  # "error", "warning", "log", "info", "debug"
    text: str
    url: str = ""
    line: int = 0
    col: int = 0

    def to_dict(self) -> dict:
        """Convert to a JSON-serializable dictionary."""
        d: dict = {"level": self.level, "text": self.text}
        if self.url:
            d["url"] = self.url
        if self.line:
            d["line"] = self.line
        if self.col:
            d["col"] = self.col
        return d


@dataclass
class CaptureRequest:
    """Everything needed to capture a single screenshot.

    Defaults match the spec: 1920x1080 viewport, 2x scale (retina),
    500ms wait after theme injection, PNG format at 90% quality.
    """

    url: str
    season: str | None = None
    theme: str | None = None
    grove_mode: bool | None = None
    selector: str | None = None
    width: int = 1920
    height: int = 1080
    scale: int = 2
    full_page: bool = False
    wait_ms: int = 500
    wait_strategy: str = "fixed"  # "fixed" or "networkidle"
    wait_for: str | None = None  # CSS selector to wait for before capture
    output_path: Path | None = None
    format: str = "png"
    quality: int = 90
    no_inject: bool = False
    timeout_ms: int = 30000
    logs: bool = False
    login: str | None = None  # Mock auth persona: "owner", "admin", "wanderer"


@dataclass
class A11ySummary:
    """Brief accessibility snapshot from the page's a11y tree.

    Gives agents a quick sense of page structure and common issues
    without needing a separate accessibility audit tool.
    """

    page_title: str = ""
    heading_count: int = 0
    headings: list[str] = field(default_factory=list)  # e.g. ["h1: Welcome", "h2: Posts"]
    landmark_count: int = 0
    landmarks: list[str] = field(default_factory=list)  # e.g. ["navigation", "main", "banner"]
    link_count: int = 0
    image_count: int = 0
    images_missing_alt: int = 0

    def to_dict(self) -> dict:
        d: dict = {"page_title": self.page_title}
        if self.headings:
            d["headings"] = self.headings
            d["heading_count"] = self.heading_count
        if self.landmarks:
            d["landmarks"] = self.landmarks
            d["landmark_count"] = self.landmark_count
        d["link_count"] = self.link_count
        if self.image_count:
            d["image_count"] = self.image_count
            d["images_missing_alt"] = self.images_missing_alt
        return d


@dataclass
class CaptureResult:
    """The outcome of a screenshot capture.

    On success: output_path is set, error is None.
    On failure: error describes what went wrong.
    Console messages are populated when logs=True was requested.
    """

    output_path: Path | None = None
    url: str = ""
    season: str | None = None
    theme: str | None = None
    viewport: tuple[int, int] = (1920, 1080)
    scale: int = 2
    size_bytes: int = 0
    duration_ms: int = 0
    http_status: int = 0
    page_title: str = ""
    a11y: A11ySummary | None = None
    error: str | None = None
    console_messages: list[ConsoleMessage] = field(default_factory=list)

    @property
    def success(self) -> bool:
        """True if capture succeeded (output path exists, no error)."""
        return self.error is None and self.output_path is not None

    @property
    def error_count(self) -> int:
        """Count of console messages with level 'error'."""
        return sum(1 for m in self.console_messages if m.level == "error")

    @property
    def warning_count(self) -> int:
        """Count of console messages with level 'warning'."""
        return sum(1 for m in self.console_messages if m.level == "warning")

    @property
    def log_count(self) -> int:
        """Count of console messages that are not errors or warnings."""
        return sum(
            1 for m in self.console_messages
            if m.level not in ("error", "warning")
        )

    def to_dict(self) -> dict:
        """Convert to a JSON-serializable dictionary."""
        d: dict = {
            "url": self.url,
            "output": str(self.output_path) if self.output_path else None,
            "season": self.season,
            "theme": self.theme,
            "viewport": {"width": self.viewport[0], "height": self.viewport[1]},
            "scale": self.scale,
            "size_bytes": self.size_bytes,
            "duration_ms": self.duration_ms,
        }
        if self.http_status:
            d["http_status"] = self.http_status
        if self.page_title:
            d["page_title"] = self.page_title
        if self.a11y:
            d["a11y"] = self.a11y.to_dict()
        if self.error:
            d["error"] = self.error
        if self.console_messages:
            d["console"] = [m.to_dict() for m in self.console_messages]
            d["error_count"] = self.error_count
            d["warning_count"] = self.warning_count
            d["log_count"] = self.log_count
        return d
