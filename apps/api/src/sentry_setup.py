"""Sentry error/performance monitoring for the FastAPI pricing engine.

Mirrors the Node api-node pattern: initialization is a no-op unless
SENTRY_DSN is set, so local/dev runs never require a DSN.
"""

import os

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration


def init_sentry() -> bool:
    """Initialize Sentry if SENTRY_DSN is configured.

    Returns True if Sentry was initialized, False if skipped (no DSN).
    Safe to call once at app startup.
    """
    dsn = os.environ.get("SENTRY_DSN")
    if not dsn:
        return False

    environment = os.environ.get("PYTHON_ENV") or os.environ.get(
        "NODE_ENV", "development"
    )
    is_prod = environment == "production"

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        release=os.environ.get("RELEASE", "cc-ops-pricing@local"),
        attach_stacktrace=True,
        traces_sample_rate=1.0 if is_prod else 0.1,
        profiles_sample_rate=1.0 if is_prod else 0.1,
        integrations=[
            FastApiIntegration(),
            StarletteIntegration(),
        ],
    )
    return True
