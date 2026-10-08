# syntax=docker/dockerfile:1

# ==============================================================================
# Stage 1: Dependency Compiler & Wheel Builder
# ==============================================================================
FROM python:3.12-slim-bookworm AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --prefix=/install -r requirements.txt

# ==============================================================================
# Stage 2: Production Hardened Runtime
# ==============================================================================
FROM python:3.12-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PATH="/home/syncfolio/.local/bin:$PATH"

WORKDIR /app

# Install minimal operational utilities for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-compiled dependencies from builder stage into system python
COPY --from=builder /install /usr/local

# Security: Create non-root unprivileged service account (principle of least privilege)
RUN groupadd -g 10001 syncfolio && \
    useradd -u 10001 -g syncfolio -s /bin/bash -m syncfolio

# Copy application source code with non-root ownership
COPY --chown=syncfolio:syncfolio . /app

USER syncfolio

EXPOSE 8000

# Docker-level liveness probe
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health/live || exit 1

# Default production entrypoint
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]