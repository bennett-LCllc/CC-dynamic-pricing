"""Tests for Sentry initialization in the pricing engine.

These pin the no-op-unless-DSN behavior so a missing DSN in dev/local never
raises, and a present DSN actually wires Sentry.
"""

import pytest

import src.sentry_setup as sentry_setup


def test_init_sentry_no_dsn_is_noop(monkeypatch):
    monkeypatch.delenv("SENTRY_DSN", raising=False)
    # Should return False and not raise
    assert sentry_setup.init_sentry() is False


def test_init_sentry_with_dsn_initializes(monkeypatch):
    monkeypatch.setenv("SENTRY_DSN", "https://abc@o1.ingest.sentry.io/123")
    monkeypatch.setenv("NODE_ENV", "development")
    assert sentry_setup.init_sentry() is True
    # Sentry client should now be active
    import sentry_sdk

    assert sentry_sdk.get_client().options["dsn"] == (
        "https://abc@o1.ingest.sentry.io/123"
    )


def test_init_sentry_reads_release(monkeypatch):
    monkeypatch.setenv("SENTRY_DSN", "https://abc@o1.ingest.sentry.io/123")
    monkeypatch.setenv("RELEASE", "cc-ops-pricing@deadbeef")
    sentry_setup.init_sentry()
    import sentry_sdk

    assert sentry_sdk.get_client().options["release"] == "cc-ops-pricing@deadbeef"


def test_init_sentry_is_idempotent_without_dsn(monkeypatch):
    # Calling repeatedly without a DSN must stay a safe no-op (mirrors how
    # main.py invokes init_sentry() once at import time, before the Prisma
    # client / routers are constructed).
    monkeypatch.delenv("SENTRY_DSN", raising=False)
    assert sentry_setup.init_sentry() is False
    assert sentry_setup.init_sentry() is False
