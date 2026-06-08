"""
Pricing API Routes — FastAPI
"""

from datetime import date
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field

from .engine import calculate_nightly_rate, generate_forecast

router = APIRouter(prefix="/api/pricing", tags=["pricing"])


# ============================================================
# Request/Response Models
# ============================================================

class RateRequest(BaseModel):
    base_rate: float = Field(..., gt=0, description="Base nightly rate in USD")
    target_date: date = Field(..., description="Date to calculate rate for")
    property_type: str = Field(default="STANDARD", description="BEACHFRONT, WATERFRONT, STANDARD, BUDGET")
    bedrooms: int = Field(default=2, ge=1, le=10)
    upcoming_occupancy_rate: float = Field(default=0.5, ge=0.0, le=1.0)

    class Config:
        json_schema_extra = {
            "example": {
                "base_rate": 175.00,
                "target_date": "2026-07-04",
                "property_type": "STANDARD",
                "bedrooms": 3,
                "upcoming_occupancy_rate": 0.85,
            }
        }


class RateResponse(BaseModel):
    base_rate: float
    seasonal_multiplier: float
    dow_multiplier: float
    event_multiplier: float
    occupancy_multiplier: float
    calculated_rate: float
    floor: float
    ceiling: float
    final_rate: float


class ForecastRequest(BaseModel):
    base_rate: float = Field(..., gt=0)
    property_type: str = Field(default="STANDARD")
    bedrooms: int = Field(default=2, ge=1, le=10)
    start_date: Optional[date] = Field(default=None)
    days: int = Field(default=30, ge=1, le=365)
    existing_bookings: list[dict] = Field(default_factory=list)

    class Config:
        json_schema_extra = {
            "example": {
                "base_rate": 175.00,
                "property_type": "STANDARD",
                "bedrooms": 3,
                "days": 30,
                "existing_bookings": [
                    {"check_in": "2026-06-15", "check_out": "2026-06-20"},
                ],
            }
        }


class ForecastItem(BaseModel):
    date: str
    rate: float
    is_booked: bool
    factors: dict


class ForecastResponse(BaseModel):
    property_type: str
    bedrooms: int
    base_rate: float
    forecast: list[ForecastItem]
    summary: dict


# ============================================================
# Routes
# ============================================================

@router.post("/calculate", response_model=RateResponse)
async def calculate_rate(request: RateRequest):
    """
    Calculate the optimal nightly rate for a specific date.
    Applies seasonal, day-of-week, event, and occupancy-based adjustments.
    """
    try:
        result = calculate_nightly_rate(
            base_rate=Decimal(str(request.base_rate)),
            target_date=request.target_date,
            property_type=request.property_type,
            bedrooms=request.bedrooms,
            upcoming_occupancy_rate=request.upcoming_occupancy_rate,
        )
        return RateResponse(
            base_rate=float(result.base_rate),
            seasonal_multiplier=float(result.seasonal_multiplier),
            dow_multiplier=float(result.dow_multiplier),
            event_multiplier=float(result.event_multiplier),
            occupancy_multiplier=float(result.occupancy_multiplier),
            calculated_rate=float(result.calculated_rate),
            floor=float(result.floor),
            ceiling=float(result.ceiling),
            final_rate=float(result.final_rate),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/forecast", response_model=ForecastResponse)
async def get_forecast(request: ForecastRequest):
    """
    Generate a pricing forecast for the next N days.
    Accounts for existing bookings and upcoming occupancy.
    """
    try:
        bookings = [
            {
                "check_in": date.fromisoformat(b["check_in"]) if isinstance(b["check_in"], str) else b["check_in"],
                "check_out": date.fromisoformat(b["check_out"]) if isinstance(b["check_out"], str) else b["check_out"],
            }
            for b in request.existing_bookings
        ]

        forecast = generate_forecast(
            base_rate=Decimal(str(request.base_rate)),
            property_type=request.property_type,
            bedrooms=request.bedrooms,
            start_date=request.start_date or date.today(),
            days=request.days,
            existing_bookings=bookings,
        )

        # Calculate summary
        available_rates = [f.rate for f in forecast if not f.is_booked and f.rate > 0]
        booked_count = sum(1 for f in forecast if f.is_booked)

        return ForecastResponse(
            property_type=request.property_type,
            bedrooms=request.bedrooms,
            base_rate=request.base_rate,
            forecast=[
                ForecastItem(
                    date=f.date,
                    rate=f.rate,
                    is_booked=f.is_booked,
                    factors=f.factors,
                )
                for f in forecast
            ],
            summary={
                "total_days": len(forecast),
                "booked_days": booked_count,
                "available_days": len(forecast) - booked_count,
                "avg_rate": round(sum(available_rates) / len(available_rates), 2) if available_rates else 0,
                "min_rate": min(available_rates) if available_rates else 0,
                "max_rate": max(available_rates) if available_rates else 0,
                "projected_revenue": round(sum(available_rates), 2),
            },
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/seasonal-multipliers")
async def get_seasonal_multipliers():
    """Return the seasonal multiplier table for reference."""
    from .engine import SEASONAL_MULTIPLIERS
    return {
        month: float(mult)
        for month, mult in SEASONAL_MULTIPLIERS.items()
    }


@router.get("/events")
async def get_events():
    """Return the major events calendar."""
    from .engine import MAJOR_EVENTS
    return MAJOR_EVENTS
