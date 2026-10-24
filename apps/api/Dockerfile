FROM node:20-bookworm-slim AS build

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/extension/package.json apps/extension/package.json

RUN npm ci --workspace=apps/api --include-workspace-root=false

COPY apps/api ./apps/api

RUN npm run db:generate --workspace=apps/api \
  && npm run build --workspace=apps/api

FROM node:20-bookworm-slim AS production

ENV NODE_ENV=production
WORKDIR /workspace

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/extension/package.json apps/extension/package.json
COPY apps/api/prisma ./apps/api/prisma

RUN npm ci --omit=dev --workspace=apps/api --include-workspace-root=false \
  && npm run db:generate --workspace=apps/api \
  && npm cache clean --force \
  && chown -R node:node /workspace

COPY --from=build --chown=node:node /workspace/apps/api/dist ./apps/api/dist

USER node
WORKDIR /workspace/apps/api

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "run", "start:prod"]
