"""Lumen Gateway AI detection for Glimpse.

Sends screenshots + accessibility trees to the Lumen Gateway for
AI-powered element detection. This is the expensive last resort in
the detection fallback chain.
"""

import base64
import os
from dataclasses import dataclass

import httpx


@dataclass
class BoundingBox:
    """A detected element's bounding box (normalized 0-1 coordinates)."""

    label: str
    confidence: float
    x: float
    y: float
    width: float
    height: float

    def to_pixels(self, viewport_width: int, viewport_height: int) -> dict:
        """Convert normalized coordinates to pixel values."""
        return {
            "x": int(self.x * viewport_width),
            "y": int(self.y * viewport_height),
            "width": int(self.width * viewport_width),
            "height": int(self.height * viewport_height),
        }


class LumenClient:
    """Async HTTP client for the Lumen Gateway AI detection API."""

    def __init__(
        self,
        gateway_url: str | None = None,
        model: str = "gemini-flash",
        api_key: str | None = None,
    ) -> None:
        self._gateway_url = gateway_url or "https://lumen.grove.place/api"
        self._model = model
        self._api_key = api_key or os.environ.get("LUMEN_API_KEY", "")

    @property
    def configured(self) -> bool:
        """Check if the client has a valid API key."""
        return bool(self._api_key)

    async def detect(
        self,
        screenshot_bytes: bytes,
        prompt: str,
        a11y_tree: dict | None = None,
    ) -> list[BoundingBox]:
        """Send a detection request to the Lumen Gateway.

        Returns a list of detected bounding boxes, or empty list on failure.
        """
        if not self._api_key:
            return []

        image_b64 = base64.b64encode(screenshot_bytes).decode("ascii")

        payload = {
            "model": self._model,
            "task": "bounding_box",
            "image": image_b64,
            "prompt": prompt,
            "format": "normalized",
        }

        if a11y_tree:
            payload["context"] = {"a11y_tree": a11y_tree}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{self._gateway_url}/detect",
                    json=payload,
                    headers={"Authorization": f"Bearer {self._api_key}"},
                )
                resp.raise_for_status()
                data = resp.json()

                boxes = []
                for box_data in data.get("boxes", []):
                    bounds = box_data.get("bounds", {})
                    boxes.append(BoundingBox(
                        label=box_data.get("label", ""),
                        confidence=box_data.get("confidence", 0.0),
                        x=bounds.get("x", 0.0),
                        y=bounds.get("y", 0.0),
                        width=bounds.get("width", 0.0),
                        height=bounds.get("height", 0.0),
                    ))
                return boxes

        except Exception:
            return []
