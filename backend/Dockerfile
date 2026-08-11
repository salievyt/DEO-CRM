FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=config.settings.docker

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements/ ./requirements/
RUN pip install --no-cache-dir -r requirements/prod.txt

# Copy project
COPY . .

RUN chmod +x /app/docker-entrypoint.sh

# Expose port
EXPOSE 8000

# Run daphne (ASGI) — serves both HTTP and WebSockets (realtime notifications).
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["daphne", "config.asgi:application", "--bind", "0.0.0.0:8000"]
