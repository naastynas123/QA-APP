"""Unit tests for pixel ↔ metre distance conversion."""

from __future__ import annotations

import math
import sys
import os

import pytest

# Ensure the backend package is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from label_placement import metres_to_pixels, pixels_to_metres


# ---------------------------------------------------------------------------
# pixels_to_metres
# ---------------------------------------------------------------------------


class TestPixelsToMetres:
    """Tests for ``pixels_to_metres``."""

    def test_zero_pixels(self) -> None:
        assert pixels_to_metres(0, scale=0.01) == 0.0

    def test_positive_distance(self) -> None:
        # 100 px at 0.05 m/px → 5.0 m
        assert pixels_to_metres(100, scale=0.05) == pytest.approx(5.0)

    def test_fractional_scale(self) -> None:
        assert pixels_to_metres(200, scale=0.003) == pytest.approx(0.6)

    def test_large_distance(self) -> None:
        assert pixels_to_metres(10_000, scale=0.01) == pytest.approx(100.0)

    def test_unity_scale(self) -> None:
        assert pixels_to_metres(42, scale=1.0) == pytest.approx(42.0)

    def test_small_scale(self) -> None:
        result = pixels_to_metres(1, scale=0.001)
        assert result == pytest.approx(0.001)


# ---------------------------------------------------------------------------
# metres_to_pixels
# ---------------------------------------------------------------------------


class TestMetresToPixels:
    """Tests for ``metres_to_pixels``."""

    def test_zero_metres(self) -> None:
        assert metres_to_pixels(0, scale=0.01) == 0.0

    def test_positive_distance(self) -> None:
        # 5 m at 0.05 m/px → 100 px
        assert metres_to_pixels(5.0, scale=0.05) == pytest.approx(100.0)

    def test_fractional_result(self) -> None:
        result = metres_to_pixels(1.0, scale=0.3)
        assert result == pytest.approx(1.0 / 0.3)

    def test_large_distance(self) -> None:
        assert metres_to_pixels(100.0, scale=0.01) == pytest.approx(10_000.0)

    def test_invalid_zero_scale(self) -> None:
        with pytest.raises(ValueError, match="scale must be > 0"):
            metres_to_pixels(10, scale=0)

    def test_invalid_negative_scale(self) -> None:
        with pytest.raises(ValueError, match="scale must be > 0"):
            metres_to_pixels(10, scale=-0.5)


# ---------------------------------------------------------------------------
# Round-trip consistency
# ---------------------------------------------------------------------------


class TestRoundTrip:
    """Verify that converting back and forth is lossless (within float precision)."""

    @pytest.mark.parametrize("px, scale", [
        (0, 0.01),
        (1, 0.05),
        (123.456, 0.002),
        (9999, 1.0),
    ])
    def test_round_trip_pixels(self, px: float, scale: float) -> None:
        metres = pixels_to_metres(px, scale)
        back = metres_to_pixels(metres, scale)
        assert back == pytest.approx(px)

    @pytest.mark.parametrize("m, scale", [
        (0, 0.01),
        (1, 0.05),
        (7.77, 0.003),
    ])
    def test_round_trip_metres(self, m: float, scale: float) -> None:
        px = metres_to_pixels(m, scale)
        back = pixels_to_metres(px, scale)
        assert back == pytest.approx(m)
