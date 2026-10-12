# Development image: code is mounted from the host and `next dev` reloads on save.
# A production image (next build, standalone output) comes at deploy time.
# Node 22 like the host: bun installs packages and starts scripts, but Next's
# launcher runs on Node.
FROM node:22-slim

COPY --from=oven/bun:1.4.2 /usr/local/bin/bun /usr/local/bin/bun

WORKDIR /app

# Dependencies first: this layer is reused until package.json or bun.lock change.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000
