FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /srv

RUN groupadd --system app && useradd --system --gid app --home-dir /srv app

COPY backend/requirements.txt /srv/backend/requirements.txt
RUN pip install --requirement /srv/backend/requirements.txt

COPY backend /srv/backend
COPY models /srv/models

RUN mkdir -p /srv/data \
    && chmod +x /srv/backend/docker-entrypoint.sh \
    && chown -R app:app /srv
USER app

EXPOSE 8000
ENTRYPOINT ["/srv/backend/docker-entrypoint.sh"]
# Render (and similar hosts) inject PORT; fall back to 8000 for local Docker/compose.
CMD ["sh", "-c", "exec python -m uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]
