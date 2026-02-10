"""Deterministic label placement along wall polylines.

Labels are placed at fixed metre intervals (0, X, 2X, 3X …) along each wall.
If the remaining distance after the last placed label is less than
``min_remaining_fraction × spacing``, the final label is skipped.

Each label is oriented **perpendicular** to the local wall direction and
includes callout geometry (a short line from the wall centreline to the label
position).
"""

from __future__ import annotations

import math
from typing import Sequence

from models import CalloutGeometry, Point, WallLabel, WallObject


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

# Distance conversion helpers

def pixels_to_metres(pixels: float, scale: float) -> float:
    """Convert a pixel distance to metres.

    Parameters
    ----------
    pixels:
        Distance in pixels.
    scale:
        Metres per pixel.
    """
    return pixels * scale


def metres_to_pixels(metres: float, scale: float) -> float:
    """Convert a metre distance to pixels.

    Parameters
    ----------
    metres:
        Distance in metres.
    scale:
        Metres per pixel.
    """
    if scale <= 0:
        raise ValueError("scale must be > 0")
    return metres / scale


def format_label(prefix: str, wall_num: int, label_num: int) -> str:
    """Format a label string.

    Returns a string of the form ``{prefix}-{wall_num:02d}-{label_num:03d}``.
    """
    return f"{prefix}-{wall_num:02d}-{label_num:03d}"


# ---------------------------------------------------------------------------
# Core placement
# ---------------------------------------------------------------------------

_CALLOUT_LENGTH_PX = 20  # length of the callout line in pixels
_EPSILON = 1e-9  # floating-point comparison tolerance


def place_labels(
    walls: list[WallObject],
    scale_metres_per_pixel: float,
    spacing_metres: float = 1.0,
    prefix: str = "RW",
    min_remaining_fraction: float = 0.5,
) -> list[WallLabel]:
    """Place labels deterministically along wall polylines.

    Parameters
    ----------
    walls:
        Wall objects with polyline geometry.
    scale_metres_per_pixel:
        Conversion factor (metres per pixel).
    spacing_metres:
        Interval between labels in metres.
    prefix:
        Label text prefix (e.g. ``"RW"``).
    min_remaining_fraction:
        If the remaining wall length after the last candidate label is less
        than ``min_remaining_fraction × spacing_metres``, that label is
        **skipped**.

    Returns
    -------
    list[WallLabel]
    """
    if scale_metres_per_pixel <= 0:
        raise ValueError("scale_metres_per_pixel must be > 0")
    if spacing_metres <= 0:
        raise ValueError("spacing_metres must be > 0")

    spacing_px = metres_to_pixels(spacing_metres, scale_metres_per_pixel)
    labels: list[WallLabel] = []

    for wall in walls:
        wall_labels = _place_labels_on_polyline(
            polyline=wall.polyline,
            wall_id=wall.wall_id,
            spacing_px=spacing_px,
            prefix=prefix,
            min_remaining_fraction=min_remaining_fraction,
        )
        labels.extend(wall_labels)

    # Anti-overlap offset: nudge labels that are too close together
    _apply_anti_overlap(labels, min_distance_px=15)

    return labels


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _segment_lengths(polyline: list[Point]) -> list[float]:
    """Return lengths of each consecutive segment in the polyline."""
    lengths: list[float] = []
    for i in range(1, len(polyline)):
        dx = polyline[i].x - polyline[i - 1].x
        dy = polyline[i].y - polyline[i - 1].y
        lengths.append(math.hypot(dx, dy))
    return lengths


def _interpolate_along_polyline(
    polyline: list[Point],
    distance_px: float,
) -> tuple[Point, float]:
    """Walk *distance_px* along the polyline and return (point, direction_angle).

    The direction angle is in **degrees**, measured counter-clockwise from the
    positive X axis (standard math convention).
    """
    remaining = distance_px
    for i in range(1, len(polyline)):
        dx = polyline[i].x - polyline[i - 1].x
        dy = polyline[i].y - polyline[i - 1].y
        seg_len = math.hypot(dx, dy)
        if seg_len == 0:
            continue
        if remaining <= seg_len:
            t = remaining / seg_len
            px = polyline[i - 1].x + t * dx
            py = polyline[i - 1].y + t * dy
            angle = math.degrees(math.atan2(dy, dx))
            return Point(x=px, y=py), angle
        remaining -= seg_len

    # Past the end – clamp to last point
    if len(polyline) >= 2:
        dx = polyline[-1].x - polyline[-2].x
        dy = polyline[-1].y - polyline[-2].y
        angle = math.degrees(math.atan2(dy, dx))
    else:
        angle = 0.0
    return polyline[-1], angle


def _place_labels_on_polyline(
    polyline: list[Point],
    wall_id: int,
    spacing_px: float,
    prefix: str,
    min_remaining_fraction: float,
) -> list[WallLabel]:
    """Place labels along a single polyline."""
    if len(polyline) < 2:
        return []

    total_length = sum(_segment_lengths(polyline))
    if total_length == 0:
        return []

    # Candidate distances: 0, spacing, 2*spacing, …
    eps = _EPSILON
    candidate_distances: list[float] = []
    d = 0.0
    while d <= total_length + eps:
        candidate_distances.append(d)
        d += spacing_px

    # Drop last candidate if remaining < fraction × spacing.
    # Exception: keep the label if it falls on (or very near) the wall end.
    if len(candidate_distances) > 1:
        last = candidate_distances[-1]
        remaining = total_length - last
        if remaining > eps and remaining < min_remaining_fraction * spacing_px:
            candidate_distances.pop()

    labels: list[WallLabel] = []
    for label_idx, dist in enumerate(candidate_distances):
        pt, wall_angle = _interpolate_along_polyline(polyline, dist)
        perp_angle = wall_angle + 90.0  # perpendicular

        # Callout geometry (short perpendicular line)
        rad = math.radians(perp_angle)
        callout_end = Point(
            x=pt.x + _CALLOUT_LENGTH_PX * math.cos(rad),
            y=pt.y + _CALLOUT_LENGTH_PX * math.sin(rad),
        )
        callout = CalloutGeometry(start=pt, end=callout_end)

        text = format_label(prefix, wall_id, label_idx)
        labels.append(
            WallLabel(
                text=text,
                position=callout_end,
                angle_degrees=perp_angle,
                wall_id=wall_id,
                callout=callout,
            )
        )

    return labels


def _apply_anti_overlap(labels: list[WallLabel], min_distance_px: float) -> None:
    """Nudge overlapping labels outward along their callout direction.

    This mutates *labels* in place.  Labels are processed in order; when two
    labels are closer than *min_distance_px*, the second one is pushed further
    along its perpendicular direction.
    """
    for i in range(1, len(labels)):
        for j in range(i):
            dx = labels[i].position.x - labels[j].position.x
            dy = labels[i].position.y - labels[j].position.y
            dist = math.hypot(dx, dy)
            if dist < min_distance_px:
                rad = math.radians(labels[i].angle_degrees)
                offset = min_distance_px - dist
                labels[i].position = Point(
                    x=labels[i].position.x + offset * math.cos(rad),
                    y=labels[i].position.y + offset * math.sin(rad),
                )
                labels[i].callout = CalloutGeometry(
                    start=labels[i].callout.start,
                    end=labels[i].position,
                )
