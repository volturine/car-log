# syntax=docker/dockerfile:1

FROM node:25-alpine AS build

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build \
	&& npm prune --omit=dev

FROM alpine:3.24 AS runtime

COPY --from=node:24-alpine /usr/local/bin/node /usr/local/bin/node

ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=3000 \
	BODY_SIZE_LIMIT=220M \
	DATABASE_URL=/data/car-log.db

WORKDIR /app

COPY --from=build --chown=node:node /app/build ./build
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --chmod=755 docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint

RUN apk add --no-cache libstdc++ libgcc setpriv \
	&& addgroup -g 1000 -S node \
	&& adduser -S -D -H -u 1000 -G node node \
	&& mkdir -p /data /app/uploads \
	&& chown -R node:node /data /app/uploads

VOLUME ["/data", "/app/uploads"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT || 3000}/health/ready`).then(response => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1))"]

ENTRYPOINT ["docker-entrypoint"]
