# syntax=docker/dockerfile:1

FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1-slim AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1-slim AS runtime

ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=3000 \
	BODY_SIZE_LIMIT=220M \
	DATABASE_URL=/data/car-log.db

WORKDIR /app

COPY --from=build --chown=bun:bun /app/build ./build
COPY --from=deps --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/package.json ./package.json
COPY --chmod=755 docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint

RUN mkdir -p /data /app/uploads \
	&& chown -R bun:bun /data /app/uploads

VOLUME ["/data", "/app/uploads"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD ["bun", "-e", "fetch(`http://127.0.0.1:${process.env.PORT || 3000}/health/ready`).then(r => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"]

ENTRYPOINT ["docker-entrypoint"]
