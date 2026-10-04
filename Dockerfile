FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy all codebase, detection rules, data, and scripts
COPY backend ./backend
COPY detection-rules ./detection-rules
COPY data ./data
EXPOSE 8000

ENV ENVIRONMENT=production
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Use $PORT provided by Render/Cloud platforms (defaults to 8000 if not set)
CMD ["sh", "-c", "python -m uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
