"""
ML Model Server — Corpus Christi STR Dynamic Pricing

FastAPI service that loads trained models and serves pricing predictions.
Replaces the static engine.py with ML-powered inference.
"""

import os
import asyncio
import json
import joblib
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pathlib import Path

from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
import numpy as np
import pandas as pd
from prisma import Prisma

# Import pricing constants from the engine (for fallback and feature parity)
from src.pricing.engine import (
    SEASONAL_MULTIPLIERS,
    DOW_MULTIPLIERS,
    MAJOR_EVENTS,
    PRICING_FLOORS,
    PricingFactors,
    PricingForecastItem,
    calculate_nightly_rate as static_calculate_nightly_rate,
    generate_forecast as static_generate_forecast,
)

# Initialize Prisma client
prisma = Prisma(auto_register=True)

app = FastAPI(title="Corpus Christi STR ML Pricing API", version="1.0.0")

# Global model cache
model_cache: Dict[str, Any] = {}


class PricingRequest(BaseModel):
    base_rate: float = Field(..., description="Property's base nightly rate")
    target_date: str = Field(..., description="Date to calculate pricing for (YYYY-MM-DD)")
    property_type: str = Field(default="STANDARD", description="BEACHFRONT, WATERFRONT, STANDARD, BUDGET")
    bedrooms: int = Field(default=2, ge=1, le=10)
    upcoming_occupancy_rate: float = Field(default=0.5, ge=0.0, le=1.0)
    custom_rules: Optional[List[Dict]] = Field(default=None)
    model_version: Optional[str] = Field(default=None, description="Specific model version to use")


class PricingResponse(BaseModel):
    base_rate: float
    seasonal_multiplier: float
    dow_multiplier: float
    event_multiplier: float
    occupancy_multiplier: float
    calculated_rate: float
    floor: float
    ceiling: float
    final_rate: float
    model_used: str
    model_version: str
    booking_probability: Optional[float] = None


class ForecastRequest(BaseModel):
    base_rate: float
    property_type: str = "STANDARD"
    bedrooms: int = 2
    start_date: Optional[str] = None
    days: int = 30
    existing_bookings: Optional[List[Dict]] = None
    custom_rules: Optional[List[Dict]] = None
    model_version: Optional[str] = None


class ForecastResponse(BaseModel):
    forecast: List[Dict]
    model_used: str
    model_version: str


async def get_production_model() -> Dict[str, Any]:
    """Get the current production model from database."""
    await prisma.connect()
    try:
        model = await prisma.mlmodel.find_first(
            where={"status": "PRODUCTION"},
            order={"deployedAt": "desc"},
        )
        if not model:
            # Fallback to latest staging
            model = await prisma.mlmodel.find_first(
                where={"status": "STAGING"},
                order={"createdAt": "desc"},
            )
        return model
    finally:
        await prisma.disconnect()


def load_model_artifacts(artifact_path: str) -> Dict[str, Any]:
    """Load model artifacts from disk."""
    path = Path(artifact_path)
    
    reg_model = joblib.load(path / "regressor.pkl")
    clf_model = joblib.load(path / "classifier.pkl")
    label_encoder = joblib.load(path / "label_encoder.pkl")
    
    with open(path / "metadata.json") as f:
        metadata = json.load(f)
    
    return {
        "regressor": reg_model,
        "classifier": clf_model,
        "label_encoder": label_encoder,
        "feature_columns": metadata["feature_columns"],
        "metadata": metadata,
    }


async def get_or_load_model(model_version: Optional[str] = None) -> Dict[str, Any]:
    """Get model from cache or load from database/disk."""
    cache_key = model_version or "latest"
    
    if cache_key in model_cache:
        return model_cache[cache_key]
    
    await prisma.connect()
    try:
        if model_version:
            model = await prisma.mlmodel.find_first(
                where={"version": model_version}
            )
        else:
            model = await prisma.mlmodel.find_first(
                where={"status": "PRODUCTION"},
                order={"deployedAt": "desc"},
            )
            if not model:
                model = await prisma.mlmodel.find_first(
                    where={"status": "STAGING"},
                    order={"createdAt": "desc"},
                )
        
        if not model:
            raise HTTPException(status_code=503, detail="No trained model available")
        
        # Load artifacts
        artifacts = load_model_artifacts(model.artifactPath)
        artifacts["model_id"] = model.id
        artifacts["model_version"] = model.version
        artifacts["model_name"] = model.name
        
        model_cache[cache_key] = artifacts
        return artifacts
        
    finally:
        await prisma.disconnect()


def prepare_inference_features(
    request: PricingRequest,
    property_type_encoder,
) -> np.ndarray:
    """Prepare features for model inference."""
    target_date = datetime.strptime(request.target_date, "%Y-%m-%d").date()
    
    # Calculate same features as training
    seasonal_mult = float(SEASONAL_MULTIPLIERS.get(str(target_date.month), Decimal("1.0")))
    dow_mult = float(DOW_MULTIPLIERS.get(target_date.weekday(), Decimal("1.0")))
    
    # Event multiplier
    event_mult = 1.0
    for event in MAJOR_EVENTS:
        start = date(target_date.year, event["start_month"], event["start_day"])
        end_month = event["end_month"]
        end_day = event["end_day"]
        if end_month < event["start_month"]:
            end = date(target_date.year + 1, end_month, end_day)
        else:
            end = date(target_date.year, end_month, end_day)
        if start <= target_date <= end:
            event_mult = max(event_mult, float(event["multiplier"]))
    
    # Occupancy multiplier (mirror static engine logic)
    occ_rate = request.upcoming_occupancy_rate
    if occ_rate >= 0.9:
        occ_mult = 1.30
    elif occ_rate >= 0.8:
        occ_mult = 1.15
    elif occ_rate >= 0.5:
        occ_mult = 1.0
    elif occ_rate >= 0.3:
        occ_mult = 0.90
    else:
        occ_mult = 0.80
    
    # Encode property type
    prop_type_encoded = property_type_encoder.transform([request.property_type])[0]
    
    # Build feature vector matching training columns
    features = {
        "propertyType": prop_type_encoded,
        "bedrooms": request.bedrooms,
        "baseRate": request.base_rate,
        "dayOfWeek": target_date.weekday(),
        "month": target_date.month,
        "isHoliday": 1 if event_mult > 1.0 else 0,
        "eventMultiplier": event_mult,
        "occupancyRate14d": occ_rate,
    }
    
    # Create DataFrame with correct column order
    feature_cols = [
        "propertyType", "bedrooms", "baseRate", "dayOfWeek", "month",
        "isHoliday", "eventMultiplier", "occupancyRate14d"
    ]
    
    return np.array([[features[col] for col in feature_cols]])


@app.on_event("startup")
async def startup():
    """Initialize database connection on startup."""
    await prisma.connect()


@app.on_event("shutdown")
async def shutdown():
    """Close database connection on shutdown."""
    await prisma.disconnect()


@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.get("/models")
async def list_models():
    """List all registered models."""
    await prisma.connect()
    try:
        models = await prisma.mlmodel.find_many(
            order={"createdAt": "desc"},
            take=20,
        )
        return {
            "models": [
                {
                    "id": m.id,
                    "name": m.name,
                    "version": m.version,
                    "framework": m.framework,
                    "status": m.status,
                    "metrics": m.metrics,
                    "deployedAt": m.deployedAt.isoformat() if m.deployedAt else None,
                    "createdAt": m.createdAt.isoformat(),
                }
                for m in models
            ]
        }
    finally:
        await prisma.disconnect()


@app.post("/models/{model_id}/promote")
async def promote_model(model_id: str):
    """Promote a model to PRODUCTION status."""
    await prisma.connect()
    try:
        # Demote current production
        await prisma.mlmodel.update_many(
            where={"status": "PRODUCTION"},
            data={"status": "ARCHIVED"}
        )
        
        # Promote target
        model = await prisma.mlmodel.update(
            where={"id": model_id},
            data={"status": "PRODUCTION", "deployedAt": datetime.utcnow()}
        )
        
        # Clear cache
        model_cache.clear()
        
        return {"status": "promoted", "model": model.id, "version": model.version}
    finally:
        await prisma.disconnect()


@app.post("/price", response_model=PricingResponse)
async def calculate_price(request: PricingRequest):
    """
    Calculate optimal nightly rate using ML model.
    Falls back to static engine if no model available.
    """
    try:
        artifacts = await get_or_load_model(request.model_version)
    except HTTPException:
        # Fallback to static engine
        factors = static_calculate_nightly_rate(
            base_rate=Decimal(str(request.base_rate)),
            target_date=datetime.strptime(request.target_date, "%Y-%m-%d").date(),
            property_type=request.property_type,
            bedrooms=request.bedrooms,
            upcoming_occupancy_rate=request.upcoming_occupancy_rate,
            custom_rules=request.custom_rules,
        )
        return PricingResponse(
            base_rate=float(factors.base_rate),
            seasonal_multiplier=float(factors.seasonal_multiplier),
            dow_multiplier=float(factors.dow_multiplier),
            event_multiplier=float(factors.event_multiplier),
            occupancy_multiplier=float(factors.occupancy_multiplier),
            calculated_rate=float(factors.calculated_rate),
            floor=float(factors.floor),
            ceiling=float(factors.ceiling),
            final_rate=float(factors.final_rate),
            model_used="static-engine",
            model_version="fallback",
        )
    
    # Prepare features
    X = prepare_inference_features(request, artifacts["label_encoder"])
    
    # Predict
    predicted_rate = float(artifacts["regressor"].predict(X)[0])
    booking_prob = float(artifacts["classifier"].predict_proba(X)[0][1])
    
    # Apply floor/ceiling (same as static engine)
    target_date = datetime.strptime(request.target_date, "%Y-%m-%d").date()
    floor_config = PRICING_FLOORS.get(request.property_type, PRICING_FLOORS["STANDARD"])
    floor = float(floor_config["one_bedroom"] + (request.bedrooms - 1) * floor_config["per_bedroom"])
    ceiling = floor * 3.5
    
    final_rate = max(min(predicted_rate, ceiling), floor)
    final_rate = round(final_rate / 10) * 10  # Round to nearest $10
    
    # Also calculate static multipliers for transparency
    seasonal_mult = float(SEASONAL_MULTIPLIERS.get(str(target_date.month), Decimal("1.0")))
    dow_mult = float(DOW_MULTIPLIERS.get(target_date.weekday(), Decimal("1.0")))
    
    event_mult = 1.0
    for event in MAJOR_EVENTS:
        start = date(target_date.year, event["start_month"], event["start_day"])
        end_month = event["end_month"]
        end_day = event["end_day"]
        if end_month < event["start_month"]:
            end = date(target_date.year + 1, end_month, end_day)
        else:
            end = date(target_date.year, end_month, end_day)
        if start <= target_date <= end:
            event_mult = max(event_mult, float(event["multiplier"]))
    
    occ_rate = request.upcoming_occupancy_rate
    if occ_rate >= 0.9:
        occ_mult = 1.30
    elif occ_rate >= 0.8:
        occ_mult = 1.15
    elif occ_rate >= 0.5:
        occ_mult = 1.0
    elif occ_rate >= 0.3:
        occ_mult = 0.90
    else:
        occ_mult = 0.80
    
    calculated = request.base_rate * seasonal_mult * dow_mult * event_mult * occ_mult
    
    return PricingResponse(
        base_rate=request.base_rate,
        seasonal_multiplier=seasonal_mult,
        dow_multiplier=dow_mult,
        event_multiplier=event_mult,
        occupancy_multiplier=occ_mult,
        calculated_rate=calculated,
        floor=floor,
        ceiling=ceiling,
        final_rate=final_rate,
        model_used=f"{artifacts['model_name']}-ml",
        model_version=artifacts["model_version"],
        booking_probability=booking_prob,
    )


@app.post("/forecast", response_model=ForecastResponse)
async def generate_ml_forecast(request: ForecastRequest):
    """Generate pricing forecast using ML model."""
    try:
        artifacts = await get_or_load_model(request.model_version)
    except HTTPException:
        # Fallback to static engine
        start = datetime.strptime(request.start_date, "%Y-%m-%d").date() if request.start_date else date.today()
        bookings = request.existing_bookings or []
        forecast = static_generate_forecast(
            base_rate=Decimal(str(request.base_rate)),
            property_type=request.property_type,
            bedrooms=request.bedrooms,
            start_date=start,
            days=request.days,
            existing_bookings=bookings,
            custom_rules=request.custom_rules,
        )
        return ForecastResponse(
            forecast=[{
                "date": f.date,
                "rate": f.rate,
                "is_booked": f.is_booked,
                "factors": f.factors,
            } for f in forecast],
            model_used="static-engine",
            model_version="fallback",
        )
    
    start = datetime.strptime(request.start_date, "%Y-%m-%d").date() if request.start_date else date.today()
    bookings = request.existing_bookings or []
    
    forecast_items = []
    
    for i in range(request.days):
        target = start + timedelta(days=i)
        
        # Check if booked
        is_booked = any(
            datetime.strptime(b["check_in"], "%Y-%m-%d").date() <= target < 
            datetime.strptime(b["check_out"], "%Y-%m-%d").date()
            for b in bookings
        )
        
        # Calculate upcoming occupancy
        next_14_booked = 0
        for j in range(14):
            check = target + timedelta(days=j)
            if any(
                datetime.strptime(b["check_in"], "%Y-%m-%d").date() <= check < 
                datetime.strptime(b["check_out"], "%Y-%m-%d").date()
                for b in bookings
            ):
                next_14_booked += 1
        upcoming_occ = next_14_booked / 14 if not is_booked else 1.0
        
        # Build pricing request for this day
        day_request = PricingRequest(
            base_rate=request.base_rate,
            target_date=target.isoformat(),
            property_type=request.property_type,
            bedrooms=request.bedrooms,
            upcoming_occupancy_rate=upcoming_occ,
            custom_rules=request.custom_rules,
            model_version=request.model_version,
        )
        
        # Get ML prediction
        day_response = await calculate_price(day_request)
        
        forecast_items.append({
            "date": target.isoformat(),
            "rate": day_response.final_rate if not is_booked else 0,
            "is_booked": is_booked,
            "factors": {
                "base_rate": day_response.base_rate,
                "seasonal": day_response.seasonal_multiplier,
                "dow": day_response.dow_multiplier,
                "event": day_response.event_multiplier,
                "occupancy": day_response.occupancy_multiplier,
                "floor": day_response.floor,
                "ceiling": day_response.ceiling,
                "booking_probability": day_response.booking_probability,
            },
        })
    
    return ForecastResponse(
        forecast=forecast_items,
        model_used=f"{artifacts['model_name']}-ml",
        model_version=artifacts["model_version"],
    )


@app.post("/feedback")
async def record_feedback(
    property_id: str,
    stay_date: str,
    predicted_rate: float,
    predicted_prob: float,
    model_id: str,
    model_version: str,
):
    """Record prediction feedback for online learning."""
    await prisma.connect()
    try:
        feedback = await prisma.pricingfeedback.create(
            data={
                "propertyId": property_id,
                "stayDate": datetime.strptime(stay_date, "%Y-%m-%d"),
                "predictedRate": Decimal(str(predicted_rate)),
                "predictedProb": Decimal(str(predicted_prob)),
                "modelId": model_id,
                "modelVersion": model_version,
            }
        )
        return {"status": "recorded", "feedback_id": feedback.id}
    finally:
        await prisma.disconnect()


@app.post("/feedback/{feedback_id}/outcome")
async def record_outcome(
    feedback_id: str,
    actual_booked: bool,
    actual_rate: Optional[float] = None,
):
    """Record actual outcome for a prediction."""
    await prisma.connect()
    try:
        feedback = await prisma.pricingfeedback.update(
            where={"id": feedback_id},
            data={
                "actualBooked": actual_booked,
                "actualRate": Decimal(str(actual_rate)) if actual_rate else None,
                "processedAt": datetime.utcnow(),
                "processed": True,
            }
        )
        return {"status": "updated", "feedback_id": feedback.id}
    finally:
        await prisma.disconnect()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)