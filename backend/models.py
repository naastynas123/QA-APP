"""Pydantic models for wall detection API request/response schemas."""

from __future__ import annotations

import base64
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared geometry primitives
# ---------------------------------------------------------------------------

class Point(BaseModel):
    """A 2-D point in pixel coordinates."""

    x: float
    y: float


class BoundingBox(BaseModel):
    """Axis-aligned bounding box."""

    x: float
    y: float
    width: float
    height: float


# ---------------------------------------------------------------------------
# Wall detection
# ---------------------------------------------------------------------------

class HSVColor(BaseModel):
    """HSV colour value (OpenCV convention: H 0-179, S 0-255, V 0-255)."""

    h: int = Field(..., ge=0, le=179)
    s: int = Field(..., ge=0, le=255)
    v: int = Field(..., ge=0, le=255)


class DetectWallsRequest(BaseModel):
    """Request body for ``POST /detect_walls``."""

    image_base64: str = Field(..., description="Base64-encoded image (PNG/JPEG)")
    brown_hsv_lower: HSVColor = Field(
        default=HSVColor(h=8, s=60, v=40),
        description="Lower bound of brown HSV range",
    )
    brown_hsv_upper: HSVColor = Field(
        default=HSVColor(h=25, s=255, v=200),
        description="Upper bound of brown HSV range",
    )
    tolerance: int = Field(
        default=10,
        ge=0,
        le=50,
        description="Tolerance to expand HSV range symmetrically",
    )
    min_area: int = Field(
        default=500,
        ge=0,
        description="Minimum contour area in pixels to keep",
    )
    fill_holes: bool = Field(
        default=True,
        description="Fill interior holes in the mask before skeletonisation",
    )


class WallObject(BaseModel):
    """A single detected wall."""

    wall_id: int
    polyline: list[Point]
    bounding_box: BoundingBox
    area: float
    length_pixels: float


class DetectWallsResponse(BaseModel):
    """Response from ``POST /detect_walls``."""

    walls: list[WallObject]
    mask_preview_base64: str = Field(
        ..., description="Base64-encoded PNG of the binary mask"
    )
    debug_images: dict[str, str] = Field(
        default_factory=dict,
        description="Optional debug images keyed by stage name (base64 PNG)",
    )
    wall_count: int


# ---------------------------------------------------------------------------
# Label placement
# ---------------------------------------------------------------------------

class LabelWallsRequest(BaseModel):
    """Request body for ``POST /label_walls``."""

    walls: list[WallObject]
    scale_metres_per_pixel: float = Field(
        ..., gt=0, description="Conversion factor: metres per pixel"
    )
    spacing_metres: float = Field(
        default=1.0, gt=0, description="Label spacing along each wall in metres"
    )
    prefix: str = Field(
        default="RW", description="Label prefix, e.g. 'RW'"
    )
    min_remaining_fraction: float = Field(
        default=0.5,
        ge=0,
        le=1,
        description="Skip last label if remaining distance < fraction × spacing",
    )


class CalloutGeometry(BaseModel):
    """Geometry for a callout line from the wall to the label."""

    start: Point
    end: Point


class WallLabel(BaseModel):
    """A positioned label for a wall."""

    text: str
    position: Point
    angle_degrees: float = Field(
        description="Rotation angle (degrees) perpendicular to wall direction"
    )
    wall_id: int
    callout: CalloutGeometry


class LabelWallsResponse(BaseModel):
    """Response from ``POST /label_walls``."""

    labels: list[WallLabel]
    label_count: int


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

class ExportRequest(BaseModel):
    """Request body for ``POST /export``."""

    image_base64: str = Field(..., description="Base64-encoded original image")
    walls: list[WallObject]
    labels: list[WallLabel]
    line_color: list[int] = Field(
        default=[0, 0, 255],
        min_length=3,
        max_length=4,
        description="BGR(A) colour for wall polylines",
    )
    line_thickness: int = Field(default=2, ge=1)
    font_scale: float = Field(default=0.4, gt=0)
    label_color: list[int] = Field(
        default=[255, 0, 0],
        min_length=3,
        max_length=4,
        description="BGR(A) colour for label text",
    )


class ExportResponse(BaseModel):
    """Response from ``POST /export``."""

    annotated_image_base64: str


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    """Response from ``GET /health``."""

    status: str = "ok"
    version: str = "1.0.0"
