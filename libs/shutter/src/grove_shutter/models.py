"""
Pydantic models for request/response validation.
"""

from typing import Optional
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ShutterRequest:
    """Request parameters for shutter()"""
    url: str
    query: str
    model: str = "fast"
    max_tokens: int = 500
    extended_query: Optional[str] = None
    timeout: int = 30000


@dataclass
class PromptInjectionDetails:
    """Details about detected prompt injection"""
    detected: bool
    type: str
    snippet: str
    domain_flagged: bool
    confidence: float = 1.0  # 0.0-1.0 confidence score
    signals: list[str] = field(default_factory=list)  # Contributing detection signals


@dataclass
class ShutterResponse:
    """Response from shutter()"""
    url: str
    extracted: Optional[str]
    tokens_input: int
    tokens_output: int
    model_used: str
    prompt_injection: Optional[PromptInjectionDetails] = None


@dataclass
class Offender:
    """Domain in offenders list"""
    domain: str
    first_seen: datetime
    last_seen: datetime
    detection_count: int
    injection_types: list[str]
    avg_confidence: float = 0.0  # Running average of detection confidence
    max_confidence: float = 0.0  # Maximum confidence seen for this domain
