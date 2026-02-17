"""Custom exceptions for grove-find."""


class GroveFindError(Exception):
    """Base exception for grove-find errors."""

    pass


class ToolNotFoundError(GroveFindError):
    """Raised when a required external tool is not found."""

    def __init__(self, tool_name: str, install_hint: str = ""):
        self.tool_name = tool_name
        self.install_hint = install_hint
        message = f"Required tool not found: {tool_name}"
        if install_hint:
            message += f"\n  Install with: {install_hint}"
        super().__init__(message)


class RootNotFoundError(GroveFindError):
    """Raised when Grove project root cannot be detected."""

    def __init__(self, search_path: str = ""):
        message = "Could not detect Grove project root."
        if search_path:
            message += f"\n  Searched from: {search_path}"
        message += "\n  Run from within a Grove project, or set GROVE_ROOT."
        super().__init__(message)
