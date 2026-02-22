"""Shell completion generation for gw CLI."""

from .bash import generate_bash_completion
from .zsh import generate_zsh_completion
from .fish import generate_fish_completion

__all__ = [
    "generate_bash_completion",
    "generate_zsh_completion",
    "generate_fish_completion",
]
