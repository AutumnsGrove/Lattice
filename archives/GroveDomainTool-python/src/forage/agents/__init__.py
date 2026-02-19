"""
AI agents for grove-domain-tool

Driver agent generates domain candidates.
Swarm agent evaluates candidates in parallel.
"""

from .driver import DriverAgent, DomainCandidate
from .swarm import SwarmAgent, DomainEvaluation
from .prompts import DRIVER_SYSTEM_PROMPT, DRIVER_GENERATE_PROMPT, SWARM_EVALUATE_PROMPT

__all__ = [
    "DriverAgent",
    "DomainCandidate",
    "SwarmAgent",
    "DomainEvaluation",
    "DRIVER_SYSTEM_PROMPT",
    "DRIVER_GENERATE_PROMPT",
    "SWARM_EVALUATE_PROMPT",
]
