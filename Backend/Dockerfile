# Development image: code is mounted from the host and uvicorn reloads on save.
# A production image (no --reload, no dev deps, non-root) comes at deploy time.
FROM python:3.14-slim

# Same uv version as on the host, copied in as a single binary.
COPY --from=ghcr.io/astral-sh/uv:0.12.24 /uv /uvx /bin/

# The venv lives outside /app, so mounting the code over /app doesn't hide it.
ENV UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencies first: this layer is reused until pyproject.toml or uv.lock change.
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project

COPY . .

EXPOSE 8000
