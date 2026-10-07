# syntax=docker/dockerfile:1
FROM python:3.12-slim-bookworm

# Prevent Python from writing .pyc files to disk and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

WORKDIR /app

# Install security updates and operational utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Leverage Docker cache layer: copy only dependencies first
COPY requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Create a non-privileged user and group for security compliance
RUN groupadd -g 10001 syncfolio && \
    useradd -u 10001 -g syncfolio -s /bin/bash -m syncfolio

# Copy application source code with correct ownership
COPY --chown=syncfolio:syncfolio . /app

# Drop root privileges
USER syncfolio

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]