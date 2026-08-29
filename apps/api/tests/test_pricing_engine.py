"""Characterization tests for the Corpus Christi STR dynamic pricing engine.

These pin the *observed* behavior of calculate_nightly_rate so future edits
can't silently change pricing. Run: pytest apps/api/tests -q
"""

from datetime import date
from decimal import Decimal

import pytest

from src.pricing.engine import calculate_nightly_rate, generate_forecast


def rate(base: Decimal, d: date, **kw) -> Decimal:
    return calculate_nightly_rate(base, d, **kw).final_rate


# --- Seasonal multiplier (July peak = 1.30) ---
def test_july_peak_seasonal_multiplier():
    result = calculate_nightly_rate(Decimal("200"), date(2026, 7, 15))
    assert result.seasonal_multiplier == Decimal("1.30")


def test_january_low_seasonal_multiplier():
    result = calculate_nightly_rate(Decimal("200"), date(2026, 1, 15))
    assert result.seasonal_multiplier == Decimal("0.75")


# --- Day-of-week multiplier (Friday = 1.25) ---
def test_friday_dow_multiplier():
    # 2026-07-17 is a Friday
    result = calculate_nightly_rate(Decimal("200"), date(2026, 7, 17))
    assert result.dow_multiplier == Decimal("1.25")


# --- Event multiplier (July 4 week) ---
def test_july_fourth_event_multiplier():
    result = calculate_nightly_rate(Decimal("200"), date(2026, 7, 4))
    assert result.event_multiplier > Decimal("1.0")


# --- Occupancy urgency bands ---
def test_high_occupancy_boosts_rate():
    low = rate(Decimal("200"), date(2026, 7, 15), upcoming_occupancy_rate=0.2)
    high = rate(Decimal("200"), date(2026, 7, 15), upcoming_occupancy_rate=0.95)
    assert high > low


def test_occupancy_above_90_gives_1_30():
    result = calculate_nightly_rate(
        Decimal("200"), date(2026, 7, 15), upcoming_occupancy_rate=0.95
    )
    assert result.occupancy_multiplier == Decimal("1.30")


# --- Floor / ceiling clamp ---
def test_rate_respects_floor():
    # Base so low that even peak multipliers stay under the floor
    base = Decimal("10")
    # STANDARD 2BR floor = 80 + 1*35 = 115
    result = calculate_nightly_rate(base, date(2026, 1, 1), property_type="STANDARD", bedrooms=2)
    assert result.final_rate >= Decimal("115")


def test_rate_respects_ceiling():
    # Huge base should be clamped to floor * 3.5
    base = Decimal("100000")
    result = calculate_nightly_rate(base, date(2026, 7, 4), property_type="STANDARD", bedrooms=2)
    expected_ceiling = Decimal("115") * Decimal("3.5")
    assert result.final_rate <= expected_ceiling


# --- Custom rules ---
def test_percentage_custom_rule_applies():
    base = Decimal("200")
    before = calculate_nightly_rate(base, date(2026, 7, 15))
    rule = [{"adjustment_type": "PERCENTAGE", "adjustment_value": 10, "is_active": True}]
    after = calculate_nightly_rate(base, date(2026, 7, 15), custom_rules=rule)
    # Compare pre-rounding rate: +10% on the calculated value
    assert after.calculated_rate == before.calculated_rate * Decimal("1.1")


def test_fixed_custom_rule_adds():
    base = Decimal("200")
    rule = [{"adjustment_type": "FIXED", "adjustment_value": 50, "is_active": True}]
    after = rate(base, date(2026, 7, 15), custom_rules=rule)
    # before-peaks then +50, before re-clamp
    assert after >= rate(base, date(2026, 7, 15))


def test_inactive_custom_rule_skipped():
    base = Decimal("200")
    rule = [{"adjustment_type": "PERCENTAGE", "adjustment_value": 50, "is_active": False}]
    assert rate(base, date(2026, 7, 15), custom_rules=rule) == rate(base, date(2026, 7, 15))


# --- Rounding to nearest $10 ---
def test_final_rate_rounded_to_nearest_10():
    result = calculate_nightly_rate(Decimal("203"), date(2026, 7, 15))
    assert result.final_rate % Decimal("10") == Decimal("0")


# ============================================================
# generate_forecast
# ============================================================

def test_forecast_length_matches_days():
    fc = generate_forecast(Decimal("200"), start_date=date(2026, 7, 1), days=14)
    assert len(fc) == 14


def test_forecast_dates_are_sequential_iso():
    fc = generate_forecast(Decimal("200"), start_date=date(2026, 7, 1), days=5)
    assert [item.date for item in fc] == [
        d.isoformat() for d in [date(2026, 7, 1 + i) for i in range(5)]
    ]


def test_forecast_marks_booked_days_zero_rate():
    bookings = [{"check_in": date(2026, 7, 3), "check_out": date(2026, 7, 5)}]
    fc = generate_forecast(
        Decimal("200"), start_date=date(2026, 7, 1), days=7, existing_bookings=bookings
    )
    booked = {item.date for item in fc if item.is_booked}
    assert date(2026, 7, 3).isoformat() in booked
    assert date(2026, 7, 4).isoformat() in booked
    # Booked days carry rate 0
    assert all(item.rate == 0 for item in fc if item.is_booked)


def test_forecast_unbooked_days_have_positive_rate():
    fc = generate_forecast(Decimal("200"), start_date=date(2026, 7, 1), days=7)
    assert all(item.rate > 0 for item in fc if not item.is_booked)


def test_forecast_peak_day_exceeds_low_day():
    # July (peak) should price higher than January for same base
    july = generate_forecast(Decimal("200"), start_date=date(2026, 7, 1), days=1)[0]
    jan = generate_forecast(Decimal("200"), start_date=date(2026, 1, 1), days=1)[0]
    assert july.rate > jan.rate


def test_forecast_factors_expose_multipliers():
    fc = generate_forecast(Decimal("200"), start_date=date(2026, 7, 4), days=1)[0]
    assert fc.factors["event"] > 1.0
    assert "seasonal" in fc.factors
