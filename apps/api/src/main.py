"""
Corpus Christi STR — Pricing Engine API (FastAPI)

Run with: uvicorn src.main:app --reload --port 8000
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
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

# Rate limiting — protects against brute force and DoS
limiter = Limiter(
    get_remote_address,
    default_limits=["1000/minute"],
    headers_enabled=True,
)
app.state.limiter = limiter
app.add_exception_handler(429, _rate_limit_exceeded_handler)

# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# CORS — allow configured origins (comma-separated env var), defaults to localhost
_allowed = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Csrf-Token"],
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
