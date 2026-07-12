from datetime import datetime
from zoneinfo import ZoneInfo

import pytest
from freezegun import freeze_time

from services.planner import PlannerService

AUCKLAND = ZoneInfo("Pacific/Auckland")


@pytest.fixture
def planner():
    return PlannerService()


def test_missing_arrival_time_returns_none(planner):
    assert planner._compute_target_departure(None, 20) is None


def test_missing_estimate_returns_none(planner):
    assert planner._compute_target_departure("09:00", None) is None


def test_malformed_arrival_time_returns_none(planner):
    assert planner._compute_target_departure("not-a-time", 20) is None


# Freezes "now" to 2026-07-07 08:00:00 in Auckland (NZST, UTC+12 — July is
# winter, no daylight saving offset to worry about). Every test below reasons
# from that fixed point instead of the real wall clock.
@freeze_time("2026-07-07 08:00:00+12:00")
def test_arrival_later_today_stays_on_today(planner):
    result = planner._compute_target_departure("09:00", estimated_travel_minutes=20)

    # 09:00 target arrival, minus 20 min travel time, same day as "now".
    assert result == datetime(2026, 7, 7, 8, 40, tzinfo=AUCKLAND)


@freeze_time("2026-07-07 08:00:00+12:00")
def test_arrival_already_passed_today_rolls_over_to_tomorrow(planner):
    # 07:00 has already happened relative to "now" (08:00), so this must be
    # read as tomorrow's 07:00 — this is the exact behavior Calendar auto-fill
    # relies on: planning in the evening for the next morning's first event.
    result = planner._compute_target_departure("07:00", estimated_travel_minutes=15)

    assert result == datetime(2026, 7, 8, 6, 45, tzinfo=AUCKLAND)


@freeze_time("2026-07-07 08:00:00+12:00")
def test_arrival_exactly_equal_to_now_does_not_roll_over(planner):
    # Boundary case: target_arrival == now (not "less than" now), so the
    # rollover condition (`target_arrival < now`) is False and it stays today.
    result = planner._compute_target_departure("08:00", estimated_travel_minutes=10)

    assert result == datetime(2026, 7, 7, 7, 50, tzinfo=AUCKLAND)
