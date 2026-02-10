"""Unit tests for label formatting (e.g. RW-01-001)."""

from __future__ import annotations

import sys
import os

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from label_placement import format_label


class TestFormatLabel:
    """Tests for ``format_label``."""

    def test_default_format(self) -> None:
        assert format_label("RW", 1, 1) == "RW-01-001"

    def test_zero_padded_wall(self) -> None:
        assert format_label("RW", 0, 0) == "RW-00-000"

    def test_large_numbers(self) -> None:
        assert format_label("RW", 99, 999) == "RW-99-999"

    def test_wall_padding(self) -> None:
        assert format_label("RW", 5, 42) == "RW-05-042"

    def test_custom_prefix(self) -> None:
        assert format_label("WALL", 3, 7) == "WALL-03-007"

    def test_single_char_prefix(self) -> None:
        assert format_label("W", 10, 100) == "W-10-100"

    def test_empty_prefix(self) -> None:
        assert format_label("", 1, 2) == "-01-002"

    def test_first_wall_first_label(self) -> None:
        assert format_label("RW", 0, 0) == "RW-00-000"

    def test_sequential_labels(self) -> None:
        labels = [format_label("RW", 1, i) for i in range(5)]
        assert labels == [
            "RW-01-000",
            "RW-01-001",
            "RW-01-002",
            "RW-01-003",
            "RW-01-004",
        ]

    def test_sequential_walls(self) -> None:
        labels = [format_label("RW", w, 0) for w in range(4)]
        assert labels == [
            "RW-00-000",
            "RW-01-000",
            "RW-02-000",
            "RW-03-000",
        ]

    def test_three_digit_wall_exceeds_padding(self) -> None:
        """Wall numbers > 99 overflow the 2-digit field but remain valid."""
        result = format_label("RW", 100, 0)
        assert result == "RW-100-000"

    def test_four_digit_label_exceeds_padding(self) -> None:
        """Label numbers > 999 overflow the 3-digit field but remain valid."""
        result = format_label("RW", 0, 1000)
        assert result == "RW-00-1000"

    def test_hyphenated_prefix(self) -> None:
        assert format_label("EXT-RW", 2, 5) == "EXT-RW-02-005"

    def test_format_is_deterministic(self) -> None:
        """Same inputs always produce the same output."""
        a = format_label("RW", 7, 42)
        b = format_label("RW", 7, 42)
        assert a == b == "RW-07-042"
