# ── Stage 1: Build ──────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build-time dependencies for compiled packages (e.g. bcrypt, pymysql)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libffi-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Runtime ───────────────────────────────────────────
FROM python:3.12-slim

LABEL maintainer="Modelyx Team"
LABEL description="Modelyx – AI-Powered Jersey Design Platform"

WORKDIR /app

COPY --from=builder /install /usr/local

COPY app/        ./app/
COPY static/     ./static/
COPY templates/  ./templates/
COPY requirements.txt .


RUN addgroup --system appgroup && \
    adduser  --system --ingroup appgroup appuser && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 9100
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:9100/api')" || exit 1


CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9100"]
