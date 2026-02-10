"""Unit tests for deterministic label placement along wall polylines."""

from __future__ import annotations

import math
import sys
import os

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from label_placement import place_labels, _segment_lengths, _interpolate_along_polyline
from models import BoundingBox, Point, WallObject


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_wall(
    wall_id: int,
    polyline: list[Point],
) -> WallObject:
    """Create a minimal ``WallObject`` for testing."""
    xs = [p.x for p in polyline]
    ys = [p.y for p in polyline]
    length = 0.0
    for i in range(1, len(polyline)):
        dx = polyline[i].x - polyline[i - 1].x
        dy = polyline[i].y - polyline[i - 1].y
        length += math.hypot(dx, dy)
    return WallObject(
        wall_id=wall_id,
        polyline=polyline,
        bounding_box=BoundingBox(
            x=min(xs), y=min(ys),
            width=max(xs) - min(xs), height=max(ys) - min(ys),
        ),
        area=0.0,
        length_pixels=length,
    )


def _horizontal_wall(length_px: float, wall_id: int = 0) -> WallObject:
    """A simple horizontal wall from (0,0) to (length_px, 0)."""
    return _make_wall(wall_id, [Point(x=0, y=0), Point(x=length_px, y=0)])


# ---------------------------------------------------------------------------
# _segment_lengths
# ---------------------------------------------------------------------------


class TestSegmentLengths:
    def test_single_segment(self) -> None:
        pts = [Point(x=0, y=0), Point(x=3, y=4)]
        assert _segment_lengths(pts) == [pytest.approx(5.0)]

    def test_multi_segment(self) -> None:
        pts = [Point(x=0, y=0), Point(x=10, y=0), Point(x=10, y=5)]
        lengths = _segment_lengths(pts)
        assert lengths == [pytest.approx(10.0), pytest.approx(5.0)]

    def test_empty_polyline(self) -> None:
        assert _segment_lengths([]) == []

    def test_single_point(self) -> None:
        assert _segment_lengths([Point(x=0, y=0)]) == []


# ---------------------------------------------------------------------------
# _interpolate_along_polyline
# ---------------------------------------------------------------------------


class TestInterpolate:
    def test_start(self) -> None:
        pts = [Point(x=0, y=0), Point(x=100, y=0)]
        pt, angle = _interpolate_along_polyline(pts, 0)
        assert pt.x == pytest.approx(0)
        assert pt.y == pytest.approx(0)
        assert angle == pytest.approx(0)

    def test_midpoint(self) -> None:
        pts = [Point(x=0, y=0), Point(x=100, y=0)]
        pt, angle = _interpolate_along_polyline(pts, 50)
        assert pt.x == pytest.approx(50)
        assert pt.y == pytest.approx(0)

    def test_end(self) -> None:
        pts = [Point(x=0, y=0), Point(x=100, y=0)]
        pt, _ = _interpolate_along_polyline(pts, 100)
        assert pt.x == pytest.approx(100)

    def test_past_end_clamps(self) -> None:
        pts = [Point(x=0, y=0), Point(x=10, y=0)]
        pt, _ = _interpolate_along_polyline(pts, 999)
        assert pt.x == pytest.approx(10)

    def test_diagonal_angle(self) -> None:
        pts = [Point(x=0, y=0), Point(x=10, y=10)]
        _, angle = _interpolate_along_polyline(pts, 5)
        assert angle == pytest.approx(45.0)


# ---------------------------------------------------------------------------
# place_labels – deterministic behaviour
# ---------------------------------------------------------------------------


class TestPlaceLabels:
    """Core tests for ``place_labels``."""

    def test_single_wall_basic_count(self) -> None:
        """A 100-px wall with spacing=50 px (scale=1) → labels at 0, 50, 100."""
        wall = _horizontal_wall(100)
        labels = place_labels(
            [wall],
            scale_metres_per_pixel=1.0,
            spacing_metres=50.0,
            prefix="RW",
        )
        assert len(labels) == 3

    def test_labels_at_expected_distances(self) -> None:
        """Labels should appear at 0, 50, 100 px along a 100-px wall."""
        wall = _horizontal_wall(100)
        labels = place_labels(
            [wall],
            scale_metres_per_pixel=1.0,
            spacing_metres=50.0,
        )
        # The callout *start* is on the wall; check x-coords
        starts = [l.callout.start.x for l in labels]
        assert starts == [pytest.approx(0), pytest.approx(50), pytest.approx(100)]

    def test_skip_last_label_when_remaining_small(self) -> None:
        """Wall=100, spacing=60 → candidates at 0, 60.  Remaining=40 < 0.5*60=30?
        No → label at 60 kept.  But 120 > 100, so only 0 and 60."""
        wall = _horizontal_wall(100)
        labels = place_labels(
            [wall],
            scale_metres_per_pixel=1.0,
            spacing_metres=60.0,
            min_remaining_fraction=0.5,
        )
        starts_x = [l.callout.start.x for l in labels]
        # 0 and 60 should remain
        assert len(labels) == 2
        assert starts_x[0] == pytest.approx(0)
        assert starts_x[1] == pytest.approx(60)

    def test_skip_last_when_fraction_triggers(self) -> None:
        """Wall=100, spacing=70 → candidates 0, 70.  Remaining=30 < 0.5*70=35 → skip 70."""
        wall = _horizontal_wall(100)
        labels = place_labels(
            [wall],
            scale_metres_per_pixel=1.0,
            spacing_metres=70.0,
            min_remaining_fraction=0.5,
        )
        assert len(labels) == 1
        assert labels[0].callout.start.x == pytest.approx(0)

    def test_deterministic_repeated_calls(self) -> None:
        """Calling ``place_labels`` twice yields identical results."""
        wall = _horizontal_wall(200)
        args = dict(
            walls=[wall],
            scale_metres_per_pixel=0.05,
            spacing_metres=2.0,
        )
        a = place_labels(**args)
        b = place_labels(**args)
        assert len(a) == len(b)
        for la, lb in zip(a, b):
            assert la.text == lb.text
            assert la.position.x == pytest.approx(lb.position.x)
            assert la.position.y == pytest.approx(lb.position.y)

    def test_multiple_walls(self) -> None:
        """Labels from different walls get different wall_id values."""
        w0 = _horizontal_wall(100, wall_id=0)
        w1 = _horizontal_wall(100, wall_id=1)
        labels = place_labels(
            [w0, w1],
            scale_metres_per_pixel=1.0,
            spacing_metres=100.0,
        )
        wall_ids = {l.wall_id for l in labels}
        assert wall_ids == {0, 1}

    def test_perpendicular_orientation(self) -> None:
        """Labels on a horizontal wall should be oriented at ~90°."""
        wall = _horizontal_wall(100)
        labels = place_labels(
            [wall],
            scale_metres_per_pixel=1.0,
            spacing_metres=50.0,
        )
        for l in labels:
            assert l.angle_degrees == pytest.approx(90.0)

    def test_empty_walls_list(self) -> None:
        assert place_labels([], scale_metres_per_pixel=1.0) == []

    def test_invalid_scale(self) -> None:
        with pytest.raises(ValueError):
            place_labels([], scale_metres_per_pixel=0)

    def test_invalid_spacing(self) -> None:
        with pytest.raises(ValueError):
            place_labels([], scale_metres_per_pixel=1.0, spacing_metres=0)

    def test_short_wall_single_label(self) -> None:
        """A wall shorter than spacing gets only one label (at distance 0)."""
        wall = _horizontal_wall(5)
        labels = place_labels(
            [wall],
            scale_metres_per_pixel=1.0,
            spacing_metres=100.0,
        )
        assert len(labels) == 1
        assert labels[0].callout.start.x == pytest.approx(0)

    def test_multi_segment_wall(self) -> None:
        """Labels are placed correctly along an L-shaped polyline."""
        polyline = [Point(x=0, y=0), Point(x=100, y=0), Point(x=100, y=100)]
        wall = _make_wall(0, polyline)
        labels = place_labels(
            [wall],
            scale_metres_per_pixel=1.0,
            spacing_metres=50.0,
        )
        # Total length = 200; labels at 0,50,100,150,200 → 5 labels
        assert len(labels) == 5
