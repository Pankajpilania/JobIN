FROM node:20-bookworm-slim AS build

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/extension/package.json apps/extension/package.json

RUN npm ci --workspace=apps/web --include-workspace-root=false

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_AUTH_PROVIDER
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_URL
ARG NEXT_PUBLIC_SENTRY_DSN

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_AUTH_PROVIDER=${NEXT_PUBLIC_AUTH_PROVIDER}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_URL=${NEXT_PUBLIC_URL}
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}

COPY apps/web ./apps/web

RUN npm run build --workspace=apps/web

FROM node:20-bookworm-slim AS production

ENV NODE_ENV=production
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/extension/package.json apps/extension/package.json

RUN npm ci --omit=dev --workspace=apps/web --include-workspace-root=false \
  && npm cache clean --force \
  && chown -R node:node /workspace

COPY --from=build --chown=node:node /workspace/apps/web/.next ./apps/web/.next
COPY --from=build --chown=node:node /workspace/apps/web/public ./apps/web/public
COPY --from=build --chown=node:node /workspace/apps/web/next.config.mjs ./apps/web/next.config.mjs

USER node
WORKDIR /workspace/apps/web

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "start"]
