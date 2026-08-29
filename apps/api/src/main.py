"""
Corpus Christi STR — Pricing Engine API (FastAPI)

Run with: uvicorn src.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.pricing.routes import router as pricing_router
from src.ml.server import app as ml_app
from src.sentry_setup import init_sentry

# Initialize Sentry before the app is built (no-op unless SENTRY_DSN is set).
init_sentry()

app = FastAPI(
    title="CC Ops — Pricing Engine",
    description="Dynamic pricing for Corpus Christi short-term rentals",
    version="0.1.0",
)

# CORS — allow the Next.js frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(pricing_router)
app.mount("/ml", ml_app)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "pricing-engine"}


@app.get("/")
async def root():
    return {
        "app": "CC Ops Pricing Engine",
        "version": "0.1.0",
        "endpoints": {
            "calculate_rate": "POST /api/pricing/calculate",
            "forecast": "POST /api/pricing/forecast",
            "seasonal_multipliers": "GET /api/pricing/seasonal-multipliers",
            "events": "GET /api/pricing/events",
            "ml_price": "POST /ml/price",
            "ml_forecast": "POST /ml/forecast",
            "ml_models": "GET /ml/models",
            "ml_promote": "POST /ml/models/{model_id}/promote",
        },
    }
