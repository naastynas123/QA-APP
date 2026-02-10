"""Core wall detection logic using OpenCV and scikit-image.

Pipeline:
1. Decode image → BGR → HSV
2. Build a binary mask for the configured brown HSV range (± tolerance)
3. Morphological clean-up (close, open, optional hole-fill)
4. Filter small connected components by ``min_area``
5. Skeletonise the mask to single-pixel-wide centrelines
6. Extract contours / polylines and split into individual wall objects
"""

from __future__ import annotations

import base64
from dataclasses import dataclass, field
from typing import Sequence

import cv2
import numpy as np
from skimage.morphology import skeletonize

from models import BoundingBox, Point, WallObject


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _encode_image_base64(image: np.ndarray) -> str:
    """Encode a BGR or greyscale image as a base64 PNG string."""
    _, buf = cv2.imencode(".png", image)
    return base64.b64encode(buf.tobytes()).decode("ascii")


def _clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, value))


def _polyline_length(pts: list[Point]) -> float:
    """Compute the total Euclidean length of a polyline."""
    total = 0.0
    for i in range(1, len(pts)):
        dx = pts[i].x - pts[i - 1].x
        dy = pts[i].y - pts[i - 1].y
        total += (dx * dx + dy * dy) ** 0.5
    return total


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def detect_walls(
    image_bytes: bytes,
    brown_hsv_lower: tuple[int, int, int] = (8, 60, 40),
    brown_hsv_upper: tuple[int, int, int] = (25, 255, 200),
    tolerance: int = 10,
    min_area: int = 500,
    fill_holes: bool = True,
) -> tuple[list[WallObject], str, dict[str, str]]:
    """Detect walls in *image_bytes* and return structured results.

    Parameters
    ----------
    image_bytes:
        Raw image file bytes (PNG / JPEG).
    brown_hsv_lower / brown_hsv_upper:
        Base HSV range for brown colour detection (OpenCV convention).
    tolerance:
        Symmetric expansion applied to the HSV range.
    min_area:
        Minimum contour area (px²) – smaller blobs are discarded.
    fill_holes:
        If ``True``, fill interior holes in the mask before skeletonisation.

    Returns
    -------
    walls : list[WallObject]
    mask_preview_b64 : str
    debug_images : dict[str, str]
    """
    # 1. Decode -----------------------------------------------------------
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("Failed to decode image bytes")
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)

    debug: dict[str, str] = {}

    # 2. Colour mask ------------------------------------------------------
    lower = np.array([
        _clamp(brown_hsv_lower[0] - tolerance, 0, 179),
        _clamp(brown_hsv_lower[1] - tolerance, 0, 255),
        _clamp(brown_hsv_lower[2] - tolerance, 0, 255),
    ], dtype=np.uint8)
    upper = np.array([
        _clamp(brown_hsv_upper[0] + tolerance, 0, 179),
        _clamp(brown_hsv_upper[1] + tolerance, 0, 255),
        _clamp(brown_hsv_upper[2] + tolerance, 0, 255),
    ], dtype=np.uint8)

    mask = cv2.inRange(hsv, lower, upper)
    debug["raw_mask"] = _encode_image_base64(mask)

    # 3. Morphological clean-up -------------------------------------------
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

    if fill_holes:
        mask = _fill_holes(mask)

    debug["cleaned_mask"] = _encode_image_base64(mask)

    # 4. Remove small components ------------------------------------------
    mask = _remove_small_components(mask, min_area)
    debug["filtered_mask"] = _encode_image_base64(mask)

    # 5. Skeletonise ------------------------------------------------------
    skeleton_bool = skeletonize(mask > 0)
    skeleton = (skeleton_bool.astype(np.uint8)) * 255
    debug["skeleton"] = _encode_image_base64(skeleton)

    # 6. Extract contours → polylines ------------------------------------
    contours, _ = cv2.findContours(
        skeleton, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE,
    )

    walls: list[WallObject] = []
    for idx, cnt in enumerate(contours):
        area = cv2.contourArea(cnt)
        arc_len = cv2.arcLength(cnt, closed=False)
        if arc_len < 1:
            continue

        epsilon = 0.01 * arc_len
        approx = cv2.approxPolyDP(cnt, epsilon, closed=False)
        polyline = [Point(x=float(pt[0][0]), y=float(pt[0][1])) for pt in approx]
        if len(polyline) < 2:
            continue

        x, y, w, h = cv2.boundingRect(cnt)
        walls.append(
            WallObject(
                wall_id=idx,
                polyline=polyline,
                bounding_box=BoundingBox(x=float(x), y=float(y), width=float(w), height=float(h)),
                area=float(area),
                length_pixels=_polyline_length(polyline),
            )
        )

    # Re-number wall IDs sequentially
    for seq, wall in enumerate(walls):
        wall.wall_id = seq

    mask_preview_b64 = _encode_image_base64(mask)
    return walls, mask_preview_b64, debug


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _fill_holes(mask: np.ndarray) -> np.ndarray:
    """Fill interior holes via flood-fill from the border."""
    h, w = mask.shape[:2]
    flood = mask.copy()
    fill_mask = np.zeros((h + 2, w + 2), dtype=np.uint8)
    cv2.floodFill(flood, fill_mask, (0, 0), 255)
    inv = cv2.bitwise_not(flood)
    return mask | inv


def _remove_small_components(mask: np.ndarray, min_area: int) -> np.ndarray:
    """Zero-out connected components smaller than *min_area*."""
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    out = np.zeros_like(mask)
    for i in range(1, num_labels):
        if stats[i, cv2.CC_STAT_AREA] >= min_area:
            out[labels == i] = 255
    return out
