# apps/api/Dockerfile
# Python 3.12 slim base image
FROM python:3.12-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY apps/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# =========================================================
# Production stage
# =========================================================
FROM python:3.12-slim AS runner

# Install runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy installed packages from base stage
COPY --from=base /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=base /usr/local/bin /usr/local/bin

# Copy application code
COPY apps/api/src ./src
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db

# Create non-root user
RUN useradd --create-home --shell /bin/bash appuser
USER appuser

# Environment
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    PYTHONPATH=/app

EXPOSE 8000

# Run the FastAPI app with uvicorn
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]